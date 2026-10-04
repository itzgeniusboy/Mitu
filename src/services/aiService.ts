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
          model: provider.model || 'gemini-3.8-flash',
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
   * Verify an API key for Gemini, Groq, OpenRouter, or Anthropic
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
   * Generate audio for spoken response using server-side Gemini TTS or Web SpeechSynthesis
   */
  static async speak(
    text: string,
    voiceName = 'Zephyr',
    speechRate = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    onAudioAmplitude?: (amp: number) => void
  ): Promise<() => void> {
    let isCancelled = false;

    // First try Gemini 3.8 Flash Lite TTS via /api/tts
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.playbackRate = speechRate;

          // Connect Web Audio API analyzer to drive Mascot mouth & rings
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(audio);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(audioCtx.destination);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let animationId: number;

          const checkVolume = () => {
            if (isCancelled || audio.paused) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength / 255;
            if (onAudioAmplitude) onAudioAmplitude(avg);
            animationId = requestAnimationFrame(checkVolume);
          };

          audio.onplay = () => {
            if (onStart) onStart();
            checkVolume();
          };

          audio.onended = () => {
            cancelAnimationFrame(animationId);
            if (onAudioAmplitude) onAudioAmplitude(0);
            if (onEnd) onEnd();
            audioCtx.close();
          };

          audio.onerror = () => {
            cancelAnimationFrame(animationId);
            if (onAudioAmplitude) onAudioAmplitude(0);
            if (onEnd) onEnd();
          };

          audio.play().catch(() => {
            this.fallbackWebSpeech(text, speechRate, onStart, onEnd, onAudioAmplitude);
          });

          return () => {
            isCancelled = true;
            cancelAnimationFrame(animationId);
            audio.pause();
            audio.currentTime = 0;
            if (onAudioAmplitude) onAudioAmplitude(0);
          };
        }
      }
    } catch (e) {
      console.warn('Gemini TTS unavailable, falling back to Web SpeechSynthesis', e);
    }

    // Fallback: Web SpeechSynthesis
    return this.fallbackWebSpeech(text, speechRate, onStart, onEnd, onAudioAmplitude);
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
