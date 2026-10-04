import React, { useState, useEffect, useRef } from 'react';
import { AssistantState, ProviderConfig, AssistantSettings } from '../types';
import { MascotOrb } from './MascotOrb';
import { AiService } from '../services/aiService';
import { Mic, MicOff, Volume2, PhoneOff, VolumeX, Sparkles } from 'lucide-react';

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
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; text: string }>>([]);

  const recognitionRef = useRef<any>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Barge-in interruption
  const triggerBargeIn = () => {
    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
      cancelSpeechRef.current = null;
    }
    setState('INTERRUPTED');
    setTimeout(() => {
      setState('LISTENING');
      startListening();
    }, 280);
  };

  // Start Mic Audio Analyzer
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
      console.warn('Microphone analyzer fallback:', err);
    }
  };

  // Continuous speech recognition loop
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language === 'hindi' ? 'hi-IN' : 'en-IN';

    recognition.onstart = () => {
      setState('LISTENING');
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

      // Barge-in check
      if (state === 'SPEAKING' && currentSpeech.length > 0) {
        triggerBargeIn();
        return;
      }

      if (currentSpeech.toLowerCase().includes('stop') || currentSpeech.toLowerCase().includes('mitu stop')) {
        triggerBargeIn();
        return;
      }

      if (final.trim().length > 0) {
        processUserTurn(final.trim());
      }
    };

    recognition.onerror = (_e: any) => {};

    recognition.onend = () => {
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

  // Process completed voice turn
  const processUserTurn = async (userText: string) => {
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

    const result = await AiService.sendChatMessage(
      historyPayload,
      systemPrompt,
      activeProvider
    );

    if (result.error || !result.text) {
      setState('ERROR');
      setLiveTranscript('Connection issue. Retrying...');
      setTimeout(() => {
        setState('LISTENING');
        startListening();
      }, 2500);
      return;
    }

    const aiReply = result.text;
    setConversationHistory((prev) => [...prev, { role: 'assistant', text: aiReply }]);
    if (onNewAssistantTurn) onNewAssistantTurn(aiReply);

    setState('SPEAKING');
    setLiveTranscript(aiReply);

    if (!speakerMuted) {
      cancelSpeechRef.current = await AiService.speak(
        aiReply,
        settings.voice,
        settings.speechSpeed,
        () => setState('SPEAKING'),
        () => {
          setState('LISTENING');
          setLiveTranscript('');
          startListening();
        },
        (amp) => setMicAmplitude(amp)
      );
    } else {
      setTimeout(() => {
        setState('LISTENING');
        setLiveTranscript('');
        startListening();
      }, 2000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initAudioAnalyser();
      startListening();
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) {}
      }
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) {}
      }
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isOpen]);

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
            audioAmplitude={micAmplitude}
            onClick={state === 'SPEAKING' ? triggerBargeIn : undefined}
            showAmbientGlow={true}
          />

          <h2 className="text-[28px] font-bold leading-[34px] tracking-tight mt-6 text-white">
            {state === 'LISTENING' && 'Listening...'}
            {state === 'THINKING' && 'Thinking...'}
            {state === 'SPEAKING' && 'Speaking...'}
            {state === 'INTERRUPTED' && 'Listening'}
            {state === 'ERROR' && 'Reconnecting...'}
          </h2>

          <p className="text-[14px] text-[rgba(235,235,245,0.60)] mt-1 font-medium">
            {state === 'SPEAKING' ? 'Say "stop" or tap mascot to interrupt' : 'Hands-free voice conversation'}
          </p>

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
        </div>

        {/* 3. Row of 3 Round 64dp Controls (iOS Call Screen specification) */}
        <div className="w-full flex items-center justify-around pb-8 pt-4">
          {/* Mute Control */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                setMicMuted(!micMuted);
                if (recognitionRef.current) {
                  if (!micMuted) recognitionRef.current.abort();
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
