import { ChatMessage, ProviderConfig } from '../types';

export class AiService {
  /**
   * Send a chat message to Gemini backend or custom provider proxy
   */
  static async sendChatMessage(
    messages: ChatMessage[],
    systemInstruction: string,
    provider: ProviderConfig,
    temperature = 0.7
  ): Promise<{ text: string; error?: string }> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          systemInstruction,
          // providerType + baseUrl are what let the server pick the right backend; without them
          // every request was served by Gemini no matter which provider Settings selected.
          providerType: provider.type,
          model: provider.model || undefined,
          baseUrl: provider.baseUrl || undefined,
          apiKey: provider.apiKey || undefined,
          temperature,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return { text: data.text };
    } catch (err: any) {
      console.error('sendChatMessage failed:', err);
      return {
        text: '',
        error: err.message || 'Network error communicating with AI model.',
      };
    }
  }

  /**
   * Verify an API key for Gemini, Groq, OpenRouter, OpenAI, Ollama or Anthropic
   */
  static async testApiKey(provider: ProviderConfig): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.type,
          apiKey: provider.apiKey,
          model: provider.model,
          baseUrl: provider.baseUrl,
        }),
      });

      const data = await response.json();
      if (response.ok && data.valid) {
        return { valid: true, message: `Key verified successfully! (HTTP ${data.status || 200})` };
      } else {
        return { valid: false, message: data.error || 'Validation failed. Check your key.' };
      }
    } catch (err: any) {
      return { valid: false, message: `Connection error: ${err.message}` };
    }
  }

  /**
   * Ask the server for one spoken-audio chunk (Gemini TTS). Returns null when unavailable so the
   * caller can fall back to Web SpeechSynthesis.
   */
  private static async fetchTtsChunk(
    text: string,
    voiceName: string
  ): Promise<{ audioBase64: string; mimeType: string } | null> {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data?.audioBase64) return null;
      return { audioBase64: data.audioBase64, mimeType: data.mimeType || 'audio/wav' };
    } catch (e) {
      console.warn('Gemini TTS unavailable, falling back to Web SpeechSynthesis', e);
      return null;
    }
  }

  /**
   * Split a reply into speakable chunks on sentence boundaries. Long answers must not be truncated,
   * so each chunk becomes its own TTS request and they play back to back.
   */
  private static splitSpeechChunks(text: string, maxLen = 220): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    const pieces = cleaned.match(/[^.!?।\n]+[.!?।]*\s*/g) || [cleaned];
    const chunks: string[] = [];
    let buffer = '';

    for (const piece of pieces) {
      if (buffer && (buffer + piece).trim().length > maxLen) {
        chunks.push(buffer.trim());
        buffer = piece;
      } else {
        buffer += piece;
      }

      // A single oversized sentence (no terminator) still has to be bounded.
      while (buffer.trim().length > maxLen) {
        const cutAt = buffer.lastIndexOf(' ', maxLen);
        const slice = buffer.slice(0, cutAt > 0 ? cutAt : maxLen).trim();
        if (slice) chunks.push(slice);
        buffer = buffer.slice(slice.length);
      }
    }

    if (buffer.trim()) chunks.push(buffer.trim());
    return chunks.filter(Boolean);
  }

  /**
   * Generate audio for the whole spoken response using server-side Gemini TTS or Web SpeechSynthesis.
   * Resolves to a cancel handle that stops playback and releases the audio graph.
   */
  static async speak(
    text: string,
    voiceName = 'Zephyr',
    speechRate = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    onAudioAmplitude?: (amp: number) => void
  ): Promise<() => void> {
    const chunks = this.splitSpeechChunks(text);
    if (chunks.length === 0) {
      if (onEnd) onEnd();
      return () => {};
    }

    // Probe the first chunk; if Gemini TTS is not usable we speak the full reply via Web Speech.
    const first = await this.fetchTtsChunk(chunks[0], voiceName);
    if (!first) {
      return this.fallbackWebSpeech(text, speechRate, onStart, onEnd, onAudioAmplitude);
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let cancelled = false;
    let animationId = 0;
    let current: HTMLAudioElement | null = null;

    const meter = () => {
      if (cancelled) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      if (onAudioAmplitude) onAudioAmplitude(sum / bufferLength / 255);
      animationId = requestAnimationFrame(meter);
    };

    const playChunk = (audio: { audioBase64: string; mimeType: string }) =>
      new Promise<void>((resolve) => {
        const element = new Audio(`data:${audio.mimeType};base64,${audio.audioBase64}`);
        element.playbackRate = speechRate;
        current = element;
        try {
          audioCtx.createMediaElementSource(element).connect(analyser);
        } catch (_e) {
          // Element already attached (shouldn't happen for freshly created Audio objects).
        }
        element.onended = () => resolve();
        element.onerror = () => resolve();
        element.play().catch(() => resolve());
      });

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      if (current) {
        current.pause();
        current = null;
      }
      if (onAudioAmplitude) onAudioAmplitude(0);
      audioCtx.close().catch(() => {});
    };

    (async () => {
      // Browsers keep the context suspended until a gesture resumes it.
      audioCtx.resume?.().catch(() => {});
      if (onStart) onStart();
      meter();

      await playChunk(first);
      for (let i = 1; i < chunks.length; i++) {
        if (cancelled) return;
        // Fetch the next chunk while the current one is still playing would need a queue; a
        // sequential loop keeps latency low enough and guarantees ordering.
        const next = await this.fetchTtsChunk(chunks[i], voiceName);
        if (next) await playChunk(next);
      }

      if (!cancelled) {
        if (onAudioAmplitude) onAudioAmplitude(0);
        if (onEnd) onEnd();
      }
      audioCtx.close().catch(() => {});
    })();

    return stop;
  }

  private static fallbackWebSpeech(
    text: string,
    speechRate = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    onAudioAmplitude?: (amp: number) => void
  ): () => void {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return () => {};
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.05;

    // Choose friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google'))
    );
    if (friendlyVoice) utterance.voice = friendlyVoice;

    let intervalId: any;
    utterance.onstart = () => {
      if (onStart) onStart();
      intervalId = setInterval(() => {
        if (onAudioAmplitude) onAudioAmplitude(0.2 + Math.random() * 0.5);
      }, 100);
    };

    utterance.onend = () => {
      clearInterval(intervalId);
      if (onAudioAmplitude) onAudioAmplitude(0);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      clearInterval(intervalId);
      if (onAudioAmplitude) onAudioAmplitude(0);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      clearInterval(intervalId);
      window.speechSynthesis.cancel();
      if (onAudioAmplitude) onAudioAmplitude(0);
    };
  }
}
