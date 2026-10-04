import React, { useState, useRef } from 'react';
import { AssistantState } from '../types';
import { MascotOrb } from './MascotOrb';
import { Mic, MessageSquare, EyeOff, ExternalLink } from 'lucide-react';

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
  size = 56, // 56dp per Mitu Premium spec
}) => {
  const [position, setPosition] = useState({ x: 20, y: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGlassPillMenu, setShowGlassPillMenu] = useState(false);
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

    longPressTimerRef.current = setTimeout(() => {
      setShowGlassPillMenu(true);
    }, 550);
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

    // Edge snapping with spring
    const midPoint = window.innerWidth / 2;
    const snapX = position.x < midPoint ? 14 : window.innerWidth - size - 14;
    setPosition((prev) => ({ ...prev, x: snapX }));
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
      {/* 1. Mascot Orb (56dp, soft shadow) */}
      <div
        onPointerDown={handlePointerDown}
        onClick={() => {
          if (showGlassPillMenu) return;
          setIsExpanded(!isExpanded);
        }}
        className="cursor-grab active:cursor-grabbing hover:scale-105 transition-transform drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        <MascotOrb state={state} size={size} showAmbientGlow={true} />
      </div>

      {/* 2. Glass Pill Menu on Long Press */}
      {showGlassPillMenu && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-panel rounded-full px-3 py-1.5 shadow-xl z-50 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150 border border-white/20">
          <button
            onClick={() => {
              setShowGlassPillMenu(false);
              onStartCallingMode();
            }}
            className="w-9 h-9 rounded-full bg-[#7B61FF] text-white flex items-center justify-center transition-transform active:scale-90"
            title="Mic / Calling"
          >
            <Mic size={16} />
          </button>

          <button
            onClick={() => {
              setShowGlassPillMenu(false);
              onOpenFullApp();
            }}
            className="w-9 h-9 rounded-full bg-[rgba(120,120,128,0.2)] text-[#000000] dark:text-[#FFFFFF] flex items-center justify-center transition-transform active:scale-90"
            title="Chat"
          >
            <MessageSquare size={16} />
          </button>

          <button
            onClick={() => setShowGlassPillMenu(false)}
            className="w-9 h-9 rounded-full bg-[rgba(120,120,128,0.2)] text-[#FF3B30] flex items-center justify-center transition-transform active:scale-90"
            title="Hide"
          >
            <EyeOff size={16} />
          </button>
        </div>
      )}

      {/* 3. Mini Tap Expand: Quick Voice Action */}
      {isExpanded && !showGlassPillMenu && (
        <div
          className={`absolute top-full mt-2.5 ${
            position.x > window.innerWidth / 2 ? 'right-0' : 'left-0'
          } w-64 glass-panel rounded-[24px] p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-white/20`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(60,60,67,0.12)] dark:border-[rgba(255,255,255,0.12)]">
            <span className="text-[13px] font-semibold text-[#7B61FF] dark:text-[#8E7BFF]">Mitu Quick</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[12px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] hover:text-black dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsExpanded(false);
                onStartCallingMode();
              }}
              className="flex-1 py-2 px-3 rounded-full bg-[#7B61FF] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Mic size={14} />
              <span>Voice Call</span>
            </button>
            <button
              onClick={() => {
                setIsExpanded(false);
                onOpenFullApp();
              }}
              className="py-2 px-3 rounded-full bg-[rgba(120,120,128,0.16)] text-[13px] font-semibold hover:bg-[rgba(120,120,128,0.24)]"
            >
              Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
