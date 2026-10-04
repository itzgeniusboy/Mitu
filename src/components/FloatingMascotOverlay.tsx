import React, { useState, useRef, useEffect } from 'react';
import { AssistantState } from '../types';
import { MascotOrb } from './MascotOrb';
import { Mic, Send, X, ExternalLink, VolumeX } from 'lucide-react';

interface FloatingMascotOverlayProps {
  enabled: boolean;
  state: AssistantState;
  onOpenFullApp: () => void;
  onStartCallingMode: () => void;
  onSendQuickChat: (text: string) => void;
  opacity?: number;
  size?: number;
}

export const FloatingMascotOverlay: React.FC<FloatingMascotOverlayProps> = ({
  enabled,
  state,
  onOpenFullApp,
  onStartCallingMode,
  onSendQuickChat,
  opacity = 0.95,
  size = 64,
}) => {
  const [position, setPosition] = useState({ x: 24, y: 160 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const longPressTimerRef = useRef<any>(null);

  if (!enabled) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };

    // Long press detection for menu
    longPressTimerRef.current = setTimeout(() => {
      setShowLongPressMenu(true);
    }, 600);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }

    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - size - 8, dragStartRef.current.startX + dx)),
      y: Math.max(40, Math.min(window.innerHeight - size - 40, dragStartRef.current.startY + dy)),
    });
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (!isDragging) return;
    setIsDragging(false);

    // Snap to nearest screen edge (left or right)
    const midPoint = window.innerWidth / 2;
    const snapX = position.x < midPoint ? 16 : window.innerWidth - size - 16;
    setPosition((prev) => ({ ...prev, x: snapX }));
  };

  const handleMascotClick = () => {
    if (showLongPressMenu) return;
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className="fixed z-40 select-none touch-none transition-shadow"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 1. Mascot Orb Trigger */}
      <div
        onPointerDown={handlePointerDown}
        onClick={handleMascotClick}
        className="cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
      >
        <MascotOrb state={state} size={size} />
      </div>

      {/* 2. Long Press Quick Menu */}
      {showLongPressMenu && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#272238] border border-[#9B8CFF]/30 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 w-36 text-xs text-[#2B2540] dark:text-[#F5F0FF]">
          <button
            onClick={() => {
              setShowLongPressMenu(false);
              onOpenFullApp();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#9B8CFF]/15 transition-colors text-left"
          >
            <ExternalLink size={14} className="text-[#9B8CFF]" />
            <span>Open Mitu</span>
          </button>
          <button
            onClick={() => {
              setShowLongPressMenu(false);
              onStartCallingMode();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#9B8CFF]/15 transition-colors text-left"
          >
            <Mic size={14} className="text-[#A8E6CF]" />
            <span>Voice Call</span>
          </button>
          <button
            onClick={() => setShowLongPressMenu(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FF7A7A]/15 text-[#FF7A7A] transition-colors text-left"
          >
            <X size={14} />
            <span>Close Menu</span>
          </button>
        </div>
      )}

      {/* 3. Mini Quick-Chat Card */}
      {isExpanded && !showLongPressMenu && (
        <div
          className={`absolute top-full mt-3 ${
            position.x > window.innerWidth / 2 ? 'right-0' : 'left-0'
          } w-72 bg-[#FFF8F0] dark:bg-[#1E1A2B] border border-[#9B8CFF]/30 rounded-3xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#9B8CFF]/15">
            <span className="text-xs font-bold text-[#9B8CFF]">Mitu Quick Assistant</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#6B6380] hover:text-[#2B2540] dark:text-[#A39BB8] dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-[#6B6380] dark:text-[#A39BB8] mb-3">
            Ask Mitu anything or launch voice calling:
          </p>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl p-1.5 shadow-inner">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickInput.trim()) {
                  onSendQuickChat(quickInput.trim());
                  setQuickInput('');
                  setIsExpanded(false);
                }
              }}
              placeholder="Type in Hindi/English..."
              className="w-full text-xs px-2 bg-transparent text-[#2B2540] dark:text-[#F5F0FF] outline-none"
            />
            <button
              onClick={() => {
                if (quickInput.trim()) {
                  onSendQuickChat(quickInput.trim());
                  setQuickInput('');
                  setIsExpanded(false);
                }
              }}
              className="p-1.5 rounded-xl bg-[#9B8CFF] text-white hover:bg-[#8875FF] transition-transform active:scale-95"
            >
              <Send size={13} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setIsExpanded(false);
                onStartCallingMode();
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#9B8CFF] hover:underline"
            >
              <Mic size={13} />
              <span>Voice Call</span>
            </button>
            <button
              onClick={() => {
                setIsExpanded(false);
                onOpenFullApp();
              }}
              className="text-[11px] text-[#6B6380] dark:text-[#A39BB8] hover:underline"
            >
              Open Full App →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
