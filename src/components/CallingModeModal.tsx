import React, { useState, useEffect, useRef } from 'react';
import { AssistantState, ProviderConfig, AssistantSettings } from '../types';
import { MascotOrb } from './MascotOrb';
import { AiService } from '../services/aiService';
import { Mic, MicOff, Volume2, PhoneOff, AlertCircle } from 'lucide-react';

interface CallingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ProviderConfig;
  settings: AssistantSettings;
  systemPrompt: string;
  onNewUserTurn?: (text: string) => void;
  onNewAssistantTurn?: (text: string) => void;
}

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
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; text: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const turnsCountRef = useRef<number>(0);

  // Stop speaking instantly for barge-in
  const triggerBargeIn = () => {
    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
      cancelSpeechRef.current = null;
    }
    setState('INTERRUPTED');
    setTimeout(() => {
      setState('LISTENING');
      startListening();
    }, 300);
  };

  // Start Mic Audio Analyzer (for visualizer & amplitude)
  const initAudioAnalyser = async () => {
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

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setMicAmplitude(avg);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err: any) {
      console.warn('Microphone permission / stream error:', err);
    }
  };

  // Continuous Speech Recognition loop
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition not supported in this browser. Try Chrome or Edge.');
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
    recognition.lang = settings.language === 'hindi' ? 'hi-IN' : 'en-IN'; // Indian English / Hindi for natural Hinglish

    recognition.onstart = () => {
      setState('LISTENING');
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart;
        } else {
          interim += transcriptPart;
        }
      }

      const currentSpeech = (final || interim).trim();
      setLiveTranscript(currentSpeech);

      // Barge-in check: If assistant is speaking and user says anything or "stop"
      if (state === 'SPEAKING' && currentSpeech.length > 0) {
        triggerBargeIn();
        return;
      }

      // Check voice command for stop
      if (currentSpeech.toLowerCase().includes('stop') || currentSpeech.toLowerCase().includes('mitu stop')) {
        triggerBargeIn();
        return;
      }

      // If we got a final phrase, process turn
      if (final.trim().length > 0) {
        processUserTurn(final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error);
      }
    };

    recognition.onend = () => {
      // Keep listening if in LISTENING state and not muted
      if (isOpen && state === 'LISTENING' && !micMuted) {
        try {
          recognition.start();
        } catch (_e) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (_err) {}
  };

  // Process a completed user spoken turn
  const processUserTurn = async (userText: string) => {
    turnsCountRef.current++;
    setConversationHistory((prev) => [...prev, { role: 'user', text: userText }]);
    if (onNewUserTurn) onNewUserTurn(userText);

    // Switch to THINKING
    setState('THINKING');
    setLiveTranscript('');

    // Send to AI
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

    const result = await AiService.sendChatMessage(
      historyPayload,
      systemPrompt,
      activeProvider
    );

    if (result.error || !result.text) {
      setState('ERROR');
      setErrorMessage(result.error || 'Could not get response');
      setTimeout(() => {
        setState('LISTENING');
        startListening();
      }, 3000);
      return;
    }

    const aiReply = result.text;
    setConversationHistory((prev) => [...prev, { role: 'assistant', text: aiReply }]);
    if (onNewAssistantTurn) onNewAssistantTurn(aiReply);

    // Speak response
    setState('SPEAKING');
    setLiveTranscript(aiReply);

    cancelSpeechRef.current = await AiService.speak(
      aiReply,
      settings.voice,
      settings.speechSpeed,
      () => {
        setState('SPEAKING');
      },
      () => {
        // Speech ended -> seamless loop: immediately resume listening hands-free!
        setState('LISTENING');
        setLiveTranscript('');
        startListening();
      },
      (amp) => {
        setMicAmplitude(amp);
      }
    );
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      initAudioAnalyser();
      startListening();
    } else {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_e) {}
      }
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_e) {}
      }
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A2B]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFF8F0] dark:bg-[#1E1A2B] border border-[#9B8CFF]/25 rounded-[32px] p-6 shadow-2xl flex flex-col items-center justify-between min-h-[580px] overflow-hidden">
        {/* Top Status Bar */}
        <div className="w-full flex items-center justify-between text-xs font-semibold text-[#6B6380] dark:text-[#A39BB8]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8E6CF] animate-pulse" />
            <span className="tracking-wide">CALLING MODE</span>
            <span className="text-[#9B8CFF] font-mono">({activeProvider.type.toUpperCase()})</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#9B8CFF]">
            <span>Turn {turnsCountRef.current}</span>
          </div>
        </div>

        {/* Mascot Centerpiece */}
        <div className="my-auto flex flex-col items-center text-center">
          <MascotOrb
            state={state}
            size={180}
            audioAmplitude={micAmplitude}
            onClick={state === 'SPEAKING' ? triggerBargeIn : undefined}
          />

          <h3 className="text-xl font-bold font-display mt-4 text-[#2B2540] dark:text-[#F5F0FF]">
            {state === 'LISTENING' && 'Listening to you...'}
            {state === 'THINKING' && 'Mitu is thinking...'}
            {state === 'SPEAKING' && 'Mitu is speaking...'}
            {state === 'INTERRUPTED' && 'Barge-in: Listening!'}
            {state === 'ERROR' && 'Connection issue'}
          </h3>

          <p className="text-xs text-[#6B6380] dark:text-[#A39BB8] mt-1 max-w-[280px]">
            {state === 'SPEAKING'
              ? 'Say "stop" or tap mascot to interrupt anytime'
              : 'Speak hands-free in Hindi, English, or Hinglish'}
          </p>

          {/* Live Transcript / Subtitle bubble */}
          <div className="mt-5 w-full min-h-[72px] max-h-28 overflow-y-auto px-4 py-2.5 bg-white/70 dark:bg-[#272238]/70 border border-[#9B8CFF]/20 rounded-2xl text-sm text-[#2B2540] dark:text-[#F5F0FF] shadow-sm flex items-center justify-center text-center">
            {liveTranscript ? (
              <span className="animate-in fade-in duration-150 italic">"{liveTranscript}"</span>
            ) : (
              <span className="text-xs text-[#6B6380]/70 dark:text-[#A39BB8]/70">
                {state === 'LISTENING' ? 'Awaiting your voice...' : '...'}
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[#FF7A7A]">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-around pt-4 border-t border-[#9B8CFF]/15">
          {/* Mute Mic Toggle */}
          <button
            onClick={() => {
              setMicMuted(!micMuted);
              if (recognitionRef.current) {
                if (!micMuted) recognitionRef.current.abort();
                else startListening();
              }
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
              micMuted ? 'bg-[#FF7A7A] text-white' : 'bg-white dark:bg-[#272238] text-[#2B2540] dark:text-white border border-[#9B8CFF]/30'
            }`}
            title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-[#FF7A7A] hover:bg-[#ff6464] text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
            title="End Calling Mode"
          >
            <PhoneOff size={26} />
          </button>

          {/* Barge-in Stop Button */}
          <button
            onClick={triggerBargeIn}
            disabled={state !== 'SPEAKING'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
              state === 'SPEAKING'
                ? 'bg-[#FFD966] text-[#2B2540] ring-2 ring-[#FFD966]/50'
                : 'bg-white dark:bg-[#272238] text-[#6B6380]/40 dark:text-[#A39BB8]/40 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
            }`}
            title="Interrupt Mitu"
          >
            <Volume2 size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
