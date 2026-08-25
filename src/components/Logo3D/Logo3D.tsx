'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import './Logo3D.css';

interface Logo3DProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  href?: string;
  className?: string;
}

export default function Logo3D({
  size = 'md',
  showText = true,
  animated = true,
  href = '/',
  className = '',
}: Logo3DProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!animated || !logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate rotation (-20 to +20 deg)
    const rotateY = (x / (rect.width / 2)) * 22;
    const rotateX = -(y / (rect.height / 2)) * 22;
    
    setTransformStyle(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08)`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle('rotateX(0deg) rotateY(0deg) scale(1)');
  };

  const logoContent = (
    <div
      ref={logoRef}
      className={`logo-3d-container logo-size-${size} ${animated ? 'is-animated' : ''} ${isHovered ? 'hovered' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="logo-3d-box"
        style={{ transform: transformStyle }}
      >
        {/* Outer Hexagon Ambient Glow */}
        <div className="logo-ambient-glow" />

        {/* 3D Orbit Ring 1 (X-axis spin) */}
        <div className="logo-orbit-ring ring-1">
          <span className="orbit-particle p1" />
        </div>

        {/* 3D Orbit Ring 2 (Y-axis spin counter) */}
        <div className="logo-orbit-ring ring-2">
          <span className="orbit-particle p2" />
        </div>

        {/* 3D Shield Vector Element */}
        <div className="logo-shield-3d">
          <svg viewBox="0 0 100 100" className="shield-svg">
            <defs>
              <linearGradient id="logoShieldFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#4facfe" />
                <stop offset="100%" stopColor="#00e676" />
              </linearGradient>

              <linearGradient id="logoShieldDepth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#002b4d" />
                <stop offset="100%" stopColor="#004d40" />
              </linearGradient>

              <linearGradient id="logoShieldFacet" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
              </linearGradient>

              <radialGradient id="logoCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#00f2fe" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Depth Extrusion Shadow */}
            <path
              d="M 50 12 L 80 26 V 52 C 80 72 50 88 50 88 C 50 88 20 72 20 52 V 26 Z"
              fill="url(#logoShieldDepth)"
              transform="translate(0, 4)"
            />

            {/* Shield Main Surface */}
            <path
              d="M 50 10 L 80 24 V 50 C 80 70 50 86 50 86 C 50 86 20 70 20 50 V 24 Z"
              fill="url(#logoShieldFront)"
            />

            {/* Facet Light Reflection */}
            <path
              d="M 50 10 L 20 24 V 50 C 20 70 50 86 50 86 Z"
              fill="url(#logoShieldFacet)"
            />

            {/* Inner Cyber Core Cutout */}
            <path
              d="M 50 22 L 70 32 V 48 C 70 60 50 72 50 72 C 50 72 30 60 30 48 V 32 Z"
              fill="#060c19"
              stroke="url(#logoShieldFront)"
              strokeWidth="1.5"
            />

            {/* Glowing AI Diamond Core */}
            <polygon points="50,30 62,45 50,60 38,45" fill="url(#logoShieldFront)" opacity="0.85" />
            <polygon points="50,33 59,45 50,57 41,45" fill="#ffffff" opacity="0.9" />
            
            {/* Sparkle Center */}
            <circle cx="50" cy="45" r="4" fill="url(#logoCoreGlow)" />
            <line x1="50" y1="36" x2="50" y2="54" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="41" y1="45" x2="59" y2="45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Shimmer Light Reflection Sweep */}
        <div className="logo-light-sweep" />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="logo-brand-text">
          <span className="brand-name">
            Chain<span className="brand-highlight">Guard</span>
          </span>
          <span className="brand-badge-ai">
            <span className="ai-text">AI</span>
            <span className="ai-pulse-dot" />
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="logo-3d-link">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
