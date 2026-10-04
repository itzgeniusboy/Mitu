import React, { useState, useEffect, useRef } from 'react';
import { AssistantState } from '../types';

interface MascotOrbProps {
  state: AssistantState;
  size?: number;
  audioAmplitude?: number; // 0.0 to 1.0
  onClick?: () => void;
  className?: string;
}

export const MascotOrb: React.FC<MascotOrbProps> = ({
  state,
  size = 160,
  audioAmplitude = 0,
  onClick,
  className = '',
}) => {
  const [tapCount, setTapCount] = useState(0);
  const [isDizzy, setIsDizzy] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Periodic random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3800 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Eye tracking: eyes track mouse/pointer position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      // Clamp max eye translation to 6px
      setEyeOffset({
        x: Math.max(-5, Math.min(5, dx * 5)),
        y: Math.max(-4, Math.min(4, dy * 4)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle triple tap for dizzy state
  const handleOrbClick = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setIsDizzy(true);
        setTimeout(() => {
          setIsDizzy(false);
          setTapCount(0);
        }, 3000);
      }
      return next;
    });

    // Reset tap count if no click within 1.5s
    setTimeout(() => {
      setTapCount(0);
    }, 1500);

    if (onClick) onClick();
  };

  const effectiveState = isDizzy ? 'DIZZY' : state;

  // Mascot dimensions
  const orbRadius = size * 0.40;
  const mouthOpenHeight = 6 + Math.min(22, audioAmplitude * 32);

  return (
    <div
      ref={containerRef}
      onClick={handleOrbClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      title="Tap Mitu! Tap 3 times for a surprise."
    >
      {/* 1. Acoustic Ripple Rings for LISTENING */}
      {effectiveState === 'LISTENING' && (
        <div
          className="absolute rounded-full border-2 border-[#9B8CFF]/40 pointer-events-none transition-all duration-100"
          style={{
            width: size * (1.1 + audioAmplitude * 0.4),
            height: size * (1.1 + audioAmplitude * 0.4),
            boxShadow: `0 0 24px rgba(155, 140, 255, ${0.3 + audioAmplitude * 0.4})`,
            animation: 'pulse-ring 1.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite',
          }}
        />
      )}

      {/* 2. Thinking Dots */}
      {effectiveState === 'THINKING' && (
        <div className="absolute -top-3 flex items-center gap-1.5 z-20">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD966] animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 rounded-full bg-[#FFD966] animate-bounce shadow-sm" style={{ animationDelay: '200ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD966] animate-bounce shadow-sm" style={{ animationDelay: '400ms' }} />
        </div>
      )}

      {/* 3. Sleepy "Z" marks */}
      {effectiveState === 'SLEEPY' && (
        <div className="absolute -top-2 right-4 text-xs font-bold text-[#9B8CFF]/80 select-none animate-pulse">
          <span className="inline-block animate-bounce text-sm">Z</span>
          <span className="inline-block animate-bounce delay-150 text-xs">z</span>
          <span className="inline-block animate-bounce delay-300 text-[10px]">z</span>
        </div>
      )}

      {/* 4. Main Mascot SVG Canvas */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className={`transition-all duration-300 ${
          effectiveState === 'STANDBY' ? 'animate-breathing' : ''
        } ${effectiveState === 'DIZZY' ? 'animate-spin' : ''}`}
      >
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={effectiveState === 'ERROR' ? '#FF7A7A' : '#221F30'} />
            <stop offset="100%" stopColor={effectiveState === 'ERROR' ? '#E65555' : '#14121E'} />
          </linearGradient>
          <linearGradient id="bellyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#F0EEFA" stopOpacity="0.88" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.4" />
          </filter>
          <filter id="bellyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FFFFFF" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Ears with cute fluffy inner padding */}
        <circle cx="56" cy="52" r="22" fill={effectiveState === 'ERROR' ? '#FF7A7A' : '#1E1B2B'} stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="56" cy="52" r="14" fill="#FFB5C5" opacity="0.65" />
        <circle cx="144" cy="52" r="22" fill={effectiveState === 'ERROR' ? '#FF7A7A' : '#1E1B2B'} stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="144" cy="52" r="14" fill="#FFB5C5" opacity="0.65" />

        {/* Body Squircle (Cute Dark & White Chibi) */}
        <rect
          x="30"
          y="42"
          width="140"
          height="136"
          rx="68"
          ry="64"
          fill="url(#bodyGradient)"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          filter="url(#softGlow)"
        />

        {/* Belly Patch (Target Selector 2) - Glowing Cute White Belly */}
        <ellipse
          cx="100"
          cy="122"
          rx="48"
          ry="38"
          fill="url(#bellyGradient)"
          stroke="#ECEAF8"
          strokeWidth="1.5"
          filter="url(#bellyGlow)"
          className="transition-all duration-300"
        />

        {/* Cute Tiny Heart on Belly */}
        <path
          d="M 96 117 C 96 114 93 112 90 114 C 87 116 88 120 90 122 L 96 127 L 102 122 C 104 120 105 116 102 114 C 99 112 96 114 96 117 Z"
          fill="#FFB5C5"
          opacity="0.85"
          transform="translate(4, -4) scale(0.9)"
        />

        {/* Soft Pink Blush Cheeks */}
        <ellipse cx="52" cy="114" rx="14" ry="9" fill="#FFB5C5" opacity="0.85" />
        <circle cx="54" cy="112" r="2" fill="#FFFFFF" opacity="0.8" />
        <ellipse cx="148" cy="114" rx="14" ry="9" fill="#FFB5C5" opacity="0.85" />
        <circle cx="146" cy="112" r="2" fill="#FFFFFF" opacity="0.8" />

        {/* Eyes Group with subtle offset tracking & cute double shine */}
        <g
          transform={`translate(${
            effectiveState === 'THINKING' ? 8 : eyeOffset.x
          }, ${
            effectiveState === 'THINKING' ? -8 : eyeOffset.y
          })`}
          className="transition-transform duration-100 ease-out"
        >
          {effectiveState === 'DIZZY' ? (
            // Dizzy spiral crosses
            <>
              <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round">
                <line x1="68" y1="92" x2="84" y2="108" />
                <line x1="84" y1="92" x2="68" y2="108" />
                <line x1="116" y1="92" x2="132" y2="108" />
                <line x1="132" y1="92" x2="116" y2="108" />
              </g>
            </>
          ) : effectiveState === 'SLEEPY' ? (
            // Sleepy closed eye arcs
            <>
              <path d="M 68 100 Q 76 110 84 100" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <path d="M 116 100 Q 124 110 132 100" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            </>
          ) : blink ? (
            // Blinking thin slits
            <>
              <line x1="68" y1="98" x2="84" y2="98" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="116" y1="98" x2="132" y2="98" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            </>
          ) : (
            // Ultra-cute glossy anime/chibi eyes with white star & double sparkles
            <>
              {/* Left Eye */}
              <circle
                cx="76"
                cy="96"
                r={effectiveState === 'LISTENING' ? '13.5' : '12'}
                fill="#0F0D17"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Big primary gloss highlight */}
              <circle cx="73" cy="92" r="5" fill="#FFFFFF" />
              {/* Secondary bottom twinkle */}
              <circle cx="80" cy="100" r="2.4" fill="#FFFFFF" />
              <circle cx="72" cy="101" r="1.4" fill="#FFFFFF" opacity="0.8" />

              {/* Right Eye */}
              <circle
                cx="124"
                cy="96"
                r={effectiveState === 'LISTENING' ? '13.5' : '12'}
                fill="#0F0D17"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Big primary gloss highlight */}
              <circle cx="121" cy="92" r="5" fill="#FFFFFF" />
              {/* Secondary bottom twinkle */}
              <circle cx="128" cy="100" r="2.4" fill="#FFFFFF" />
              <circle cx="120" cy="101" r="1.4" fill="#FFFFFF" opacity="0.8" />
            </>
          )}
        </g>

        {/* Mouth */}
        {effectiveState === 'SPEAKING' ? (
          <ellipse
            cx="100"
            cy="114"
            rx="9"
            ry={mouthOpenHeight / 2}
            fill="#2B2540"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
        ) : effectiveState === 'INTERRUPTED' ? (
          <circle cx="100" cy="114" r="7" fill="#2B2540" stroke="#FFFFFF" strokeWidth="1.5" />
        ) : effectiveState === 'ERROR' ? (
          <path d="M 91 120 Q 100 112 109 120" fill="none" stroke="#2B2540" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          // Cute chibi cat smile :3
          <path d="M 90 112 Q 95 118 100 112 Q 105 118 110 112" fill="none" stroke="#2B2540" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
