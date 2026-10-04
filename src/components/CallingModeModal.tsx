import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState, ProviderConfig, AssistantSettings } from '../types';
import { MascotOrb } from './MascotOrb';
import { AiService } from '../services/aiService';
import { Mic, MicOff, Volume2, PhoneOff, VolumeX, Send } from 'lucide-react';

interface CallingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ProviderConfig;
  settings: AssistantSettings;
  systemPrompt: string;
  onNewUserTurn?: (text: string) => void;
  onNewAssistantTurn?: (text: string) => void;
}

const WAKE_IDLE_MS = 20000;
const BARGE_IN_FRAMES = 3;

/** Higher sensitivity ⇒ lower mic level needed to interrupt. */
const bargeInThreshold = (sensitivity: number) => 0.45 - (Math.min(100, Math.max(0, sensitivity)) / 100) * 0.35;

/** Wake-word sensitivity relaxes the confidence the recognizer must reach. */
const wakeMinConfidence = (sensitivity: number) => (100 - Math.min(100, Math.max(0, sensitivity))) / 100;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.,!?;:"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const CallingModeModal: React.FC<CallingModeModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  settings,
  systemPrompt,
  onNewUserTurn,
  onNewAssistantTurn,
}) => {
  const [state, setState] = useState<AssistantState>('LISTENING');
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [speakAmplitude, setSpeakAmplitude] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; text: string }>>([]);
  const [srSupported, setSrSupported] = useState(true);
  const [awaitingWake, setAwaitingWake] = useState(settings.wakeWordEnabled);
  const [typedInput, setTypedInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<any>(null);

  // SpeechRecognition callbacks are created once per session, so they must read refs instead of
  // state — reading `state`/`micMuted` directly closed over the first render's values and barge-in
  // never fired.
  const stateRef = useRef<AssistantState>(state);
  const micMutedRef = useRef(micMuted);
  const isOpenRef = useRef(isOpen);
  const awaitingWakeRef = useRef(awaitingWake);
  const bargeFramesRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    awaitingWakeRef.current = awaitingWake;
  }, [awaitingWake]);

  const stopPlayback = useCallback(() => {
    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
      cancelSpeechRef.current = null;
    }
    setSpeakAmplitude(0);
  }, []);

  const armWakeWord = useCallback(() => {
    if (!settings.wakeWordEnabled) return;
    setAwaitingWake(true);
    setState('SLEEPY');
  }, [settings.wakeWordEnabled]);

  // Barge-in interruption
  const triggerBargeIn = useCallback(
    (reason: 'voice' | 'speech' | 'tap') => {
      stopPlayback();
      setState('INTERRUPTED');
      setLiveTranscript(reason === 'speech' ? 'Stopping...' : '');
      window.setTimeout(() => {
        if (!isOpenRef.current) return;
        setAwaitingWake(false);
        setState('LISTENING');
        startListeningRef.current();
      }, 280);
    },
    [stopPlayback]
  );

  const startListeningRef = useRef<() => void>(() => {});

  // Mic level meter — also the barge-in detector while Mitu is speaking.
  const initAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const threshold = bargeInThreshold(settings.bargeInSensitivity);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setMicAmplitude(avg);

        // Require a few consecutive loud frames so a single cough or echo blip does not cut Mitu off.
        if (stateRef.current === 'SPEAKING' && !micMutedRef.current && avg > threshold) {
          bargeFramesRef.current += 1;
          if (bargeFramesRef.current >= BARGE_IN_FRAMES) {
            bargeFramesRef.current = 0;
            triggerBargeIn('voice');
          }
        } else {
          bargeFramesRef.current = 0;
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err: any) {
      console.warn('Microphone analyzer fallback:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.bargeInSensitivity, triggerBargeIn]);

  // Process completed voice turn
  const processUserTurn = useCallback(
    async (userText: string) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setAwaitingWake(false);

      setConversationHistory((prev) => [...prev, { role: 'user', text: userText }]);
      if (onNewUserTurn) onNewUserTurn(userText);

      setState('THINKING');
      setLiveTranscript('');

      const historyPayload = conversationHistory.map((m) => ({
        id: Math.random().toString(),
        role: m.role as 'user' | 'assistant',
        content: m.text,
        timestamp: Date.now(),
      }));
      historyPayload.push({
        id: Math.random().toString(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      });

      const result = await AiService.sendChatMessage(historyPayload, systemPrompt, activeProvider);

      if (result.error || !result.text) {
        setState('ERROR');
        setLiveTranscript('Connection issue. Retrying...');
        window.setTimeout(() => {
          if (!isOpenRef.current) return;
          setState('LISTENING');
          startListeningRef.current();
        }, 2500);
        return;
      }

      const aiReply = result.text;
      setConversationHistory((prev) => [...prev, { role: 'assistant', text: aiReply }]);
      if (onNewAssistantTurn) onNewAssistantTurn(aiReply);

      setState('SPEAKING');
      setLiveTranscript(aiReply);

      const finishTurn = () => {
        if (!isOpenRef.current) return;
        setSpeakAmplitude(0);
        setLiveTranscript('');
        armWakeWord();
        startListeningRef.current();
      };

      if (speakerMuted) {
        window.setTimeout(finishTurn, 2000);
      } else {
        cancelSpeechRef.current = await AiService.speak(
          aiReply,
          settings.voice,
          settings.speechSpeed,
          () => setState('SPEAKING'),
          finishTurn,
          (amp) => setSpeakAmplitude(amp)
        );
      }
    },
    // conversationHistory must be current for the payload, so this stays a dependency.
    [activeProvider, armWakeWord, conversationHistory, onNewAssistantTurn, onNewUserTurn, settings.speechSpeed, settings.voice, speakerMuted, systemPrompt]
  );

  const processUserTurnRef = useRef(processUserTurn);
  useEffect(() => {
    processUserTurnRef.current = processUserTurn;
  }, [processUserTurn]);

  // Continuous speech recognition loop
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSrSupported(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language === 'hindi' ? 'hi-IN' : 'en-IN';

    const wakePhrase = normalize(settings.wakeWordPhrase);
    const minConfidence = wakeMinConfidence(settings.wakeWordSensitivity);

    recognition.onstart = () => {
      if (stateRef.current === 'LISTENING' || stateRef.current === 'SLEEPY') {
        setState(awaitingWakeRef.current ? 'SLEEPY' : 'LISTENING');
      }
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      let finalConfidence = 1;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart;
          finalConfidence = Math.min(finalConfidence, event.results[i][0].confidence ?? 1);
        } else {
          interim += transcriptPart;
        }
      }

      const currentSpeech = (final || interim).trim();
      setLiveTranscript(currentSpeech);

      // Barge-in: the mic loop already handles loudness; speech itself only needs the stop word.
      if (stateRef.current === 'SPEAKING' && currentSpeech.length > 0) {
        triggerBargeIn('speech');
        return;
      }

      const spoken = normalize(currentSpeech);

      // Wake-word gate: nothing reaches the model until the phrase is heard (with enough confidence).
      if (awaitingWakeRef.current) {
        const wakeIdx = spoken.indexOf(wakePhrase);
        if (wakeIdx < 0) {
          if (final.trim()) setLiveTranscript(`Say “${settings.wakeWordPhrase}” to wake Mitu`);
          return;
        }
        if (final.trim() && finalConfidence < minConfidence) return;

        setAwaitingWake(false);
        setState('LISTENING');
        const request = spoken.slice(wakeIdx + wakePhrase.length).trim();
        if (request.length > 0 && final.trim().length > 0) processUserTurnRef.current(request);
        return;
      }

      if (spoken === 'stop' || spoken.includes('mitu stop')) {
        triggerBargeIn('speech');
        return;
      }

      if (final.trim().length > 0) {
        processUserTurnRef.current(final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      // 'not-allowed' / 'audio-capture' otherwise leave the UI stuck claiming it is listening.
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setSrSupported(false);
      }
    };

    recognition.onend = () => {
      if (isOpenRef.current && !micMutedRef.current && stateRef.current !== 'SPEAKING' && stateRef.current !== 'THINKING') {
        try {
          recognition.start();
        } catch (_e) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (_err) {}
  }, [settings.language, settings.wakeWordPhrase, settings.wakeWordSensitivity, triggerBargeIn]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    if (isOpen) {
      setSrSupported(
        Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      );
      setAwaitingWake(settings.wakeWordEnabled);
      setState(settings.wakeWordEnabled ? 'SLEEPY' : 'LISTENING');
      initAudioAnalyser();
      startListening();
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) {}
      }
      stopPlayback();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      mediaStreamRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) {}
      }
      stopPlayback();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isOpen, initAudioAnalyser, settings.wakeWordEnabled, startListening, stopPlayback]);

  // Back to sleep when the user goes quiet, so the wake word is required again.
  useEffect(() => {
    if (!isOpen || !settings.wakeWordEnabled || awaitingWake) return;
    if (state === 'SPEAKING' || state === 'THINKING') return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(armWakeWord, WAKE_IDLE_MS);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [armWakeWord, awaitingWake, isOpen, settings.wakeWordEnabled, state]);

  const submitTypedTurn = () => {
    const text = typedInput.trim();
    if (!text) return;
    setTypedInput('');
    processUserTurnRef.current(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-[420px] h-full sm:h-[840px] bg-[#000000] text-white sm:rounded-[48px] overflow-hidden flex flex-col justify-between p-6 shadow-2xl border border-white/10 select-none">
        {/* 1. Subtle Status Chips at top (HIG clean chrome) */}
        <div className="w-full flex items-center justify-between pt-4 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-[13px] font-semibold text-[rgba(235,235,245,0.70)]">
              {activeProvider.name.split(' ')[0]} Connected
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(120,120,128,0.24)] text-[12px] font-semibold text-[rgba(235,235,245,0.80)]">
            <span>{micMuted ? 'Mic Off' : 'Mic On'}</span>
          </div>
        </div>

        {/* 2. Center Hero: Large Mascot + Title 2 Live Caption */}
        <div className="my-auto flex flex-col items-center text-center px-4">
          <MascotOrb
            state={state}
            size={200}
            audioAmplitude={state === 'SPEAKING' ? speakAmplitude : micAmplitude}
            onClick={state === 'SPEAKING' ? () => triggerBargeIn('tap') : state === 'SLEEPY' ? () => { setAwaitingWake(false); setState('LISTENING'); } : undefined}
            showAmbientGlow={true}
          />

          <h2 className="text-[28px] font-bold leading-[34px] tracking-tight mt-6 text-white">
            {state === 'LISTENING' && 'Listening...'}
            {state === 'THINKING' && 'Thinking...'}
            {state === 'SPEAKING' && 'Speaking...'}
            {state === 'INTERRUPTED' && 'Listening'}
            {state === 'SLEEPY' && `Say “${settings.wakeWordPhrase}”`}
            {state === 'ERROR' && 'Reconnecting...'}
          </h2>

          <p className="text-[14px] text-[rgba(235,235,245,0.60)] mt-1 font-medium">
            {state === 'SPEAKING'
              ? 'Say "stop" or tap mascot to interrupt'
              : state === 'SLEEPY'
                ? 'Mitu is dozing — wake word required, or tap the mascot'
                : 'Hands-free voice conversation'}
          </p>

          {/* Mic permission / unsupported browsers must say so, not sit on "Listening..." forever */}
          {!srSupported && (
            <div className="mt-4 w-full rounded-2xl bg-[rgba(255,149,0,0.16)] border border-[#FF9F0A]/40 px-4 py-3 text-left">
              <p className="text-[13px] font-semibold text-[#FFD966]">Voice input unavailable in this browser</p>
              <p className="text-[12px] text-[rgba(235,235,245,0.70)] mt-1 leading-[17px]">
                SpeechRecognition is not available here (Chrome/Edge/Safari with a microphone are required),
                or access was denied. Mitu still listens and answers — type your message below.
              </p>
            </div>
          )}

          {/* Live Caption Text (Title 2: 22/28) fading in */}
          <div className="mt-6 w-full min-h-[80px] max-h-[140px] overflow-y-auto px-4 py-3 rounded-2xl bg-[rgba(120,120,128,0.18)] border border-white/10 flex items-center justify-center text-center">
            {liveTranscript ? (
              <p className="text-[20px] leading-[26px] font-medium text-white italic animate-in fade-in duration-200">
                "{liveTranscript}"
              </p>
            ) : (
              <span className="text-[14px] text-[rgba(235,235,245,0.40)]">
                {state === 'LISTENING' ? 'Speak naturally...' : '...'}
              </span>
            )}
          </div>

          {/* Text fallback / manual turn */}
          <div className="mt-4 w-full flex items-center gap-2">
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitTypedTurn();
              }}
              placeholder={srSupported ? 'Type instead of speaking...' : 'Type your message to Mitu...'}
              className="flex-1 px-3.5 py-2.5 rounded-full bg-[rgba(120,120,128,0.24)] text-[14px] text-white placeholder:text-[rgba(235,235,245,0.40)] outline-none border border-white/10"
            />
            <button
              onClick={submitTypedTurn}
              className="w-10 h-10 rounded-full bg-[#7B61FF] text-white flex items-center justify-center active:scale-90 transition-transform"
              title="Send"
              aria-label="Send typed message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* 3. Row of 3 Round 64dp Controls (iOS Call Screen specification) */}
        <div className="w-full flex items-center justify-around pb-8 pt-4">
          {/* Mute Control */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                const next = !micMuted;
                setMicMuted(next);
                micMutedRef.current = next;
                if (recognitionRef.current) {
                  if (next) recognitionRef.current.abort();
                  else startListening();
                }
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                micMuted
                  ? 'bg-white text-black'
                  : 'bg-[rgba(120,120,128,0.28)] text-white hover:bg-[rgba(120,120,128,0.38)]'
              }`}
              title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {micMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <span className="text-[12px] font-medium text-[rgba(235,235,245,0.60)]">Mute</span>
          </div>

          {/* End Call Button (64dp, Red #FF3B30) */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-16 h-16 rounded-full bg-[#FF3B30] hover:bg-[#ff453a] text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
              title="End Calling Mode"
              aria-label="End Call"
            >
              <PhoneOff size={26} />
            </button>
            <span className="text-[12px] font-medium text-[#FF3B30]">End</span>
          </div>

          {/* Speaker Toggle Control */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => setSpeakerMuted(!speakerMuted)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                speakerMuted
                  ? 'bg-white text-black'
                  : 'bg-[rgba(120,120,128,0.28)] text-white hover:bg-[rgba(120,120,128,0.38)]'
              }`}
              title={speakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
            >
              {speakerMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <span className="text-[12px] font-medium text-[rgba(235,235,245,0.60)]">Speaker</span>
          </div>
        </div>
      </div>
    </div>
  );
};
