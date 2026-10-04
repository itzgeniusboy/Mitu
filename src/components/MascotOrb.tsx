import React, { useState, useEffect, useRef } from 'react';
import { AssistantState } from '../types';

interface MascotOrbProps {
  state: AssistantState;
  size?: number;
  audioAmplitude?: number; // 0.0 to 1.0
  onClick?: () => void;
  className?: string;
  showAmbientGlow?: boolean;
}

export const MascotOrb: React.FC<MascotOrbProps> = ({
  state,
  size = 160,
  audioAmplitude = 0,
  onClick,
  className = '',
  showAmbientGlow = true,
}) => {
  const [tapCount, setTapCount] = useState(0);
  const [isDizzy, setIsDizzy] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Periodic gentle blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3800 + Math.random() * 2200);

    return () => clearInterval(blinkInterval);
  }, []);

  // Subtle eye gaze tracking touch / pointer position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      setEyeOffset({
        x: Math.max(-4.5, Math.min(4.5, dx * 4.5)),
        y: Math.max(-3.5, Math.min(3.5, dy * 3.5)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Tap interaction (triple tap for dizzy)
  const handleOrbClick = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setIsDizzy(true);
        setTimeout(() => {
          setIsDizzy(false);
          setTapCount(0);
        }, 2800);
      }
      return next;
    });

    setTimeout(() => setTapCount(0), 1400);
    if (onClick) onClick();
  };

  const effectiveState = isDizzy ? 'DIZZY' : state;
  const mouthOpenHeight = 5 + Math.min(20, audioAmplitude * 28);
  const ambientGlowOpacity = 0.14 + audioAmplitude * 0.18;

  return (
    <div
      ref={containerRef}
      onClick={handleOrbClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      title="Mitu Mascot"
    >
      {/* 1. Mitu Premium Ambient Radial Glow behind the mascot */}
      {showAmbientGlow && (
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-300"
          style={{
            width: size * 1.45,
            height: size * 1.45,
            background: `radial-gradient(circle, rgba(123, 97, 255, ${ambientGlowOpacity}) 0%, rgba(123, 97, 255, 0) 70%)`,
            filter: 'blur(16px)',
          }}
        />
      )}

      {/* 2. Soft Acoustic Ripple Rings for LISTENING */}
      {effectiveState === 'LISTENING' && (
        <div
          className="absolute rounded-full border border-[#7B61FF]/40 pointer-events-none transition-all duration-150"
          style={{
            width: size * (1.08 + audioAmplitude * 0.35),
            height: size * (1.08 + audioAmplitude * 0.35),
            boxShadow: `0 0 20px rgba(123, 97, 255, ${0.25 + audioAmplitude * 0.3})`,
          }}
        />
      )}

      {/* 3. Thinking Dots */}
      {effectiveState === 'THINKING' && (
        <div className="absolute -top-3 flex items-center gap-1.5 z-20">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A] animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A] animate-bounce shadow-sm" style={{ animationDelay: '200ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A] animate-bounce shadow-sm" style={{ animationDelay: '400ms' }} />
        </div>
      )}

      {/* 4. Sleepy Zzz */}
      {effectiveState === 'SLEEPY' && (
        <div className="absolute -top-2 right-3 text-xs font-semibold text-[#7B61FF] select-none animate-pulse">
          <span className="inline-block animate-bounce text-sm">Z</span>
          <span className="inline-block animate-bounce delay-150 text-xs">z</span>
        </div>
      )}

      {/* 5. Vector Mascot Canvas */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className={`relative z-10 transition-all duration-300 ${
          effectiveState === 'STANDBY' ? 'animate-breathing' : ''
        } ${effectiveState === 'DIZZY' ? 'animate-spin' : ''}`}
      >
        <defs>
          {/* Mitu Violet squircle gradient */}
          <linearGradient id="mituBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={effectiveState === 'ERROR' ? '#FF3B30' : '#8E7BFF'} />
            <stop offset="100%" stopColor={effectiveState === 'ERROR' ? '#D32F2F' : '#7B61FF'} />
          </linearGradient>
          {/* Lighter belly highlight */}
          <linearGradient id="mituBellyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ECE9FF" stopOpacity="0.15" />
          </linearGradient>
          <filter id="mituSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Small round ears */}
        <circle cx="56" cy="54" r="21" fill={effectiveState === 'ERROR' ? '#FF3B30' : '#7B61FF'} />
        <circle cx="56" cy="54" r="13" fill="#FFB5A7" opacity="0.45" />
        <circle cx="144" cy="54" r="21" fill={effectiveState === 'ERROR' ? '#FF3B30' : '#7B61FF'} />
        <circle cx="144" cy="54" r="13" fill="#FFB5A7" opacity="0.45" />

        {/* Squircle Body (1:1 ratio, smooth continuous corners) */}
        <rect
          x="30"
          y="42"
          width="140"
          height="136"
          rx="68"
          ry="64"
          fill="url(#mituBodyGradient)"
          filter="url(#mituSoftShadow)"
        />

        {/* Belly highlight patch */}
        <ellipse cx="100" cy="120" rx="46" ry="38" fill="url(#mituBellyGradient)" />

        {/* Peach cheek blush */}
        <ellipse cx="54" cy="116" rx="13" ry="8" fill="#FFB5A7" opacity="0.85" />
        <ellipse cx="146" cy="116" rx="13" ry="8" fill="#FFB5A7" opacity="0.85" />

        {/* Glossy Eyes with highlight dot */}
        <g
          transform={`translate(${
            effectiveState === 'THINKING' ? 7 : eyeOffset.x
          }, ${
            effectiveState === 'THINKING' ? -7 : eyeOffset.y
          })`}
          className="transition-transform duration-100 ease-out"
        >
          {effectiveState === 'DIZZY' ? (
            // Dizzy crosses
            <g stroke="#1C1C1E" strokeWidth="3.5" strokeLinecap="round">
              <line x1="69" y1="93" x2="83" y2="107" />
              <line x1="83" y1="93" x2="69" y2="107" />
              <line x1="117" y1="93" x2="131" y2="107" />
              <line x1="131" y1="93" x2="117" y2="107" />
            </g>
          ) : effectiveState === 'SLEEPY' ? (
            // Sleepy arcs
            <>
              <path d="M 68 102 Q 76 110 84 102" fill="none" stroke="#1C1C1E" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 116 102 Q 124 110 132 102" fill="none" stroke="#1C1C1E" strokeWidth="3.5" strokeLinecap="round" />
            </>
          ) : blink ? (
            // Blinking slits
            <>
              <line x1="68" y1="100" x2="84" y2="100" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
              <line x1="116" y1="100" x2="132" y2="100" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            // Big glossy eyes with white highlight dot
            <>
              {/* Left Eye */}
              <circle cx="76" cy="100" r={effectiveState === 'LISTENING' ? '12' : '10.5'} fill="#1C1C1E" />
              <circle cx="73.5" cy="97.5" r="3.8" fill="#FFFFFF" />
              <circle cx="78.5" cy="102" r="1.5" fill="#FFFFFF" opacity="0.8" />

              {/* Right Eye */}
              <circle cx="124" cy="100" r={effectiveState === 'LISTENING' ? '12' : '10.5'} fill="#1C1C1E" />
              <circle cx="121.5" cy="97.5" r="3.8" fill="#FFFFFF" />
              <circle cx="126.5" cy="102" r="1.5" fill="#FFFFFF" opacity="0.8" />
            </>
          )}
        </g>

        {/* Tiny curved mouth */}
        {effectiveState === 'SPEAKING' ? (
          <ellipse
            cx="100"
            cy="119"
            rx="8.5"
            ry={mouthOpenHeight / 2}
            fill="#1C1C1E"
            className="transition-all duration-75"
          />
        ) : effectiveState === 'INTERRUPTED' ? (
          <circle cx="100" cy="119" r="6.5" fill="#1C1C1E" />
        ) : effectiveState === 'ERROR' ? (
          <path d="M 92 124 Q 100 117 108 124" fill="none" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <path d="M 93 118 Q 100 125 107 118" fill="none" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
