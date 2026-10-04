import React, { useState } from 'react';
import { Wifi, Battery, Signal, Terminal, Youtube, MessageCircle, Globe, Settings as SettingsIcon } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  activeApp: 'mitu' | 'termux' | 'whatsapp' | 'youtube' | 'browser' | 'settings';
  onSwitchApp: (app: 'mitu' | 'termux' | 'whatsapp' | 'youtube' | 'browser' | 'settings') => void;
  isOverlayActive: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  activeApp,
  onSwitchApp,
  isOverlayActive,
}) => {
  const [currentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  return (
    <div className="relative mx-auto w-full max-w-[420px] h-[860px] bg-[#12101B] rounded-[52px] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-2 ring-white/15 flex flex-col justify-between overflow-hidden select-none">
      {/* Outer Phone Bezel & Screen Inner Wrapper */}
      <div className="relative w-full h-full bg-[#161424] rounded-[44px] overflow-hidden flex flex-col border border-white/10 shadow-inner">
        {/* 1. Android 15 Status Bar with Camera Punch Hole */}
        <div className="h-10 px-6 flex items-center justify-between z-30 text-xs font-semibold text-white bg-transparent">
          {/* Time */}
          <span className="tracking-tight text-[13px] text-white">
            {currentTime}
          </span>

          {/* Camera Cutout with subtle white halo */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-4 h-4 rounded-full bg-black ring-1 ring-white/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-1.5 text-xs text-white">
            <Signal size={13} />
            <Wifi size={13} />
            <Battery size={15} />
          </div>
        </div>

        {/* 2. Main Phone Screen Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </div>

        {/* 3. Android Navigation Bar with App Dock Switcher */}
        <div className="h-14 px-4 bg-[#141220]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around z-30">
          <button
            onClick={() => onSwitchApp('mitu')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'mitu' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="MITU Assistant"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'mitu' ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <span className="text-xs font-extrabold">M</span>
            </div>
            <span className="text-[10px]">Mitu</span>
          </button>

          <button
            onClick={() => onSwitchApp('termux')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'termux' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="Termux Terminal"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'termux' ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-emerald-400'
            }`}>
              <Terminal size={14} />
            </div>
            <span className="text-[10px]">Termux</span>
          </button>

          <button
            onClick={() => onSwitchApp('whatsapp')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'whatsapp' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="WhatsApp"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'whatsapp' ? 'bg-white text-black shadow-sm' : 'bg-[#25D366] text-white'
            }`}>
              <MessageCircle size={14} />
            </div>
            <span className="text-[10px]">WhatsApp</span>
          </button>

          <button
            onClick={() => onSwitchApp('youtube')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'youtube' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="YouTube"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'youtube' ? 'bg-white text-black shadow-sm' : 'bg-[#FF0000] text-white'
            }`}>
              <Youtube size={14} />
            </div>
            <span className="text-[10px]">YouTube</span>
          </button>

          <button
            onClick={() => onSwitchApp('browser')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'browser' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="Browser"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'browser' ? 'bg-white text-black shadow-sm' : 'bg-[#4285F4] text-white'
            }`}>
              <Globe size={14} />
            </div>
            <span className="text-[10px]">Web</span>
          </button>

          <button
            onClick={() => onSwitchApp('settings')}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
              activeApp === 'settings' ? 'text-white font-bold' : 'text-[#A39BB8]'
            }`}
            title="Settings"
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              activeApp === 'settings' ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <SettingsIcon size={14} />
            </div>
            <span className="text-[10px]">Settings</span>
          </button>
        </div>

        {/* Android Gesture Bar */}
        <div className="h-4 w-full flex items-center justify-center bg-[#141220]/95">
          <div className="w-32 h-1 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
};
