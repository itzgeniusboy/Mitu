import React, { useState } from 'react';
import { Wifi, Battery, Signal, Home, MessageSquare, Settings as SettingsIcon, Terminal, Smartphone } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  activeTab: 'home' | 'chat' | 'settings' | 'termux' | 'whatsapp';
  onSwitchTab: (tab: 'home' | 'chat' | 'settings' | 'termux' | 'whatsapp') => void;
  isOverlayActive: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  activeTab,
  onSwitchTab,
}) => {
  const [currentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  return (
    <div className="relative mx-auto w-full max-w-[420px] h-[860px] bg-[#12101B] dark:bg-[#000000] rounded-[52px] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.7)] ring-1 ring-black/10 dark:ring-white/10 flex flex-col justify-between overflow-hidden select-none">
      {/* Outer Phone Bezel & Screen Inner Wrapper */}
      <div className="relative w-full h-full bg-[#F2F2F7] dark:bg-[#000000] rounded-[44px] overflow-hidden flex flex-col border border-black/5 dark:border-white/10 shadow-inner">
        {/* 1. Android 15 / iOS-grade Status Bar */}
        <div className="h-11 px-7 flex items-center justify-between z-30 text-xs font-semibold text-[#000000] dark:text-[#FFFFFF] bg-transparent">
          {/* Time */}
          <span className="tracking-tight text-[14px] font-semibold text-[#000000] dark:text-[#FFFFFF]">
            {currentTime}
          </span>

          {/* Camera Cutout */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-4 h-4 rounded-full bg-black ring-1 ring-slate-800/80 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-1.5 text-xs text-[#000000] dark:text-[#FFFFFF]">
            <Signal size={13} />
            <Wifi size={13} />
            <Battery size={15} />
          </div>
        </div>

        {/* 2. Main Screen Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </div>

        {/* 3. Glass Bottom Bar: 3 Tabs (Home, Chat, Settings) as specified in Mitu Premium */}
        <div className="h-[64px] px-6 glass-panel border-t border-[rgba(60,60,67,0.14)] dark:border-[rgba(84,84,88,0.4)] flex items-center justify-around z-30">
          {/* Home Tab */}
          <button
            onClick={() => onSwitchTab('home')}
            className={`flex flex-col items-center gap-1 transition-all duration-150 active:scale-90 ${
              activeTab === 'home'
                ? 'text-[#7B61FF] dark:text-[#8E7BFF] font-semibold'
                : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
            }`}
            title="Home"
          >
            <Home size={22} strokeWidth={activeTab === 'home' ? 2.4 : 1.8} />
            <span className="text-[11px] leading-[12px] font-medium">Home</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => onSwitchTab('chat')}
            className={`flex flex-col items-center gap-1 transition-all duration-150 active:scale-90 ${
              activeTab === 'chat'
                ? 'text-[#7B61FF] dark:text-[#8E7BFF] font-semibold'
                : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
            }`}
            title="Chat"
          >
            <MessageSquare size={22} strokeWidth={activeTab === 'chat' ? 2.4 : 1.8} />
            <span className="text-[11px] leading-[12px] font-medium">Chat</span>
          </button>

          {/* Termux Tab (Dev Tools) */}
          <button
            onClick={() => onSwitchTab('termux')}
            className={`flex flex-col items-center gap-1 transition-all duration-150 active:scale-90 ${
              activeTab === 'termux'
                ? 'text-[#7B61FF] dark:text-[#8E7BFF] font-semibold'
                : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
            }`}
            title="Dev Tools"
          >
            <Terminal size={22} strokeWidth={activeTab === 'termux' ? 2.4 : 1.8} />
            <span className="text-[11px] leading-[12px] font-medium">Termux</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => onSwitchTab('settings')}
            className={`flex flex-col items-center gap-1 transition-all duration-150 active:scale-90 ${
              activeTab === 'settings'
                ? 'text-[#7B61FF] dark:text-[#8E7BFF] font-semibold'
                : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
            }`}
            title="Settings"
          >
            <SettingsIcon size={22} strokeWidth={activeTab === 'settings' ? 2.4 : 1.8} />
            <span className="text-[11px] leading-[12px] font-medium">Settings</span>
          </button>
        </div>

        {/* Android Gesture Bar */}
        <div className="h-4 w-full flex items-center justify-center bg-transparent">
          <div className="w-32 h-1 rounded-full bg-black/30 dark:bg-white/30" />
        </div>
      </div>
    </div>
  );
};
