import React from 'react';
import { AssistantState, ProviderConfig } from '../types';
import { MascotOrb } from './MascotOrb';
import { Phone, Sparkles, FileText, Terminal, MessageSquare, ShieldCheck } from 'lucide-react';

interface HomeScreenProps {
  assistantState: AssistantState;
  activeProvider: ProviderConfig;
  onStartCalling: () => void;
  onQuickAction: (prompt: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  assistantState,
  activeProvider,
  onStartCalling,
  onQuickAction,
}) => {
  const quickActions = [
    { label: 'Take a note', icon: FileText, prompt: 'Mitu, note bana do: Weekly priorities and tasks' },
    { label: 'Explain in Hinglish', icon: Sparkles, prompt: 'Explain how transformers work in natural, simple Hinglish' },
    { label: 'Check Git status', icon: Terminal, prompt: 'Termux: check git status in current workspace' },
    { label: 'Draft message', icon: MessageSquare, prompt: 'Draft a quick WhatsApp message to Rahul' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF] overflow-y-auto px-5 py-4 justify-between">
      {/* 1. Large Title collapsing header */}
      <div className="pt-2">
        <h1 className="text-[34px] font-bold leading-[41px] tracking-tight text-[#000000] dark:text-[#FFFFFF]">
          Mitu
        </h1>
        <p className="text-[15px] leading-[20px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] mt-0.5 font-medium">
          Voice AI Companion
        </p>
      </div>

      {/* 2. Centered Hero Area: Mascot Orb (~40% height) + Status */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-6">
        <MascotOrb
          state={assistantState}
          size={168}
          showAmbientGlow={true}
          onClick={onStartCalling}
        />

        {/* Subhead status */}
        <div className="mt-5 text-center">
          <p className="text-[17px] font-semibold leading-[22px] text-[#000000] dark:text-[#FFFFFF]">
            {assistantState === 'STANDBY' && 'Ready to assist'}
            {assistantState === 'LISTENING' && 'Listening to your voice...'}
            {assistantState === 'THINKING' && 'Mitu is thinking...'}
            {assistantState === 'SPEAKING' && 'Speaking...'}
            {assistantState === 'INTERRUPTED' && 'Interrupted'}
            {assistantState === 'ERROR' && 'Connection issue'}
            {assistantState === 'WAVING' && 'Namaste! Welcome back'}
            {assistantState === 'DIZZY' && 'Whoa! Take it easy :)'}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span className="text-[13px] leading-[18px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] font-medium">
              Connected to {activeProvider.name.split(' ')[0]} ({activeProvider.model.split('/').pop()})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Tonal Pills */}
      <div className="w-full mb-6">
        <div className="text-[13px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider mb-2 px-1">
          Suggestions
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button
                key={i}
                onClick={() => onQuickAction(qa.prompt)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] hover:bg-[rgba(120,120,128,0.18)] dark:hover:bg-[rgba(120,120,128,0.32)] transition-colors text-[14px] font-medium whitespace-nowrap shrink-0 text-[#000000] dark:text-[#FFFFFF] active:scale-95"
              >
                <Icon size={14} className="text-[#7B61FF] dark:text-[#8E7BFF]" />
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Primary Action: 72dp Circular Accent Button */}
      <div className="w-full flex flex-col items-center justify-center pb-2">
        <button
          onClick={onStartCalling}
          className="w-[72px] h-[72px] rounded-full bg-[#7B61FF] dark:bg-[#8E7BFF] hover:opacity-95 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(123,97,255,0.36)] transition-all duration-200 active:scale-90"
          title="Start Calling Mode"
          aria-label="Start Voice Calling Mode"
        >
          <Phone size={28} className="fill-white" />
        </button>
        <span className="text-[12px] font-semibold mt-2 text-[#606067] dark:text-[rgba(235,235,245,0.60)]">
          Tap to Call
        </span>
      </div>
    </div>
  );
};
