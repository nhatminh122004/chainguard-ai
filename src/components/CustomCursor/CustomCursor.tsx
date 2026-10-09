'use client';

import React, { useEffect, useState, useRef } from 'react';
import './CustomCursor.css';

interface Spark {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  type: 'orb' | 'star' | 'ring';
  vx: number;
  vy: number;
  opacity: number;
  rotation: number;
  vRot: number;
}

interface Shockwave {
  id: number;
  x: number;
  y: number;
  color: string;
  scale: number;
}

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [cursorType, setCursorType] = useState<'default' | 'hover' | 'text' | 'drag'>('default');
  const [clicked, setClicked] = useState(false);
  const [hoverLabel, setHoverLabel] = useState('LOCK');

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Positions for smooth spring interpolation (3 layers of inertia for x3 3D feel!)
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const ring2Pos = useRef({ x: -100, y: -100 });

  // Trail points history for fluid ribbon canvas
  const trailPoints = useRef<Array<{ x: number; y: number; alpha: number }>>([]);

  const animFrameId = useRef<number | null>(null);

  // Particles & Shockwaves
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const sparkIdCounter = useRef(0);
  const shockwaveIdCounter = useRef(0);
  const lastSparkTime = useRef(0);

  const spawnSparks = (x: number, y: number, count = 2, isExplosion = false) => {
    const colors = ['#00f2fe', '#4facfe', '#00e676', '#7f00ff', '#ff007f', '#ffffff'];
    const types: Array<'orb' | 'star' | 'ring'> = ['orb', 'star', 'ring'];

    const newSparks: Spark[] = [];

    for (let i = 0; i < count; i++) {
      sparkIdCounter.current += 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = isExplosion ? Math.random() * 6 + 2 : Math.random() * 2 + 0.5;

      newSparks.push({
        id: sparkIdCounter.current,
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        size: isExplosion ? Math.random() * 8 + 4 : Math.random() * 5 + 2,
        color,
        type,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
      });
    }

    setSparks((prev) => [...prev.slice(-40), ...newSparks]);
  };

  const triggerTripleShockwave = (x: number, y: number) => {
    const colors = ['#00f2fe', '#00e676', '#ff007f'];
    colors.forEach((color, idx) => {
      setTimeout(() => {
        shockwaveIdCounter.current += 1;
        const id = shockwaveIdCounter.current;
        setShockwaves((prev) => [...prev, { id, x, y, color, scale: 1 }]);

        setTimeout(() => {
          setShockwaves((prev) => prev.filter((sw) => sw.id !== id));
        }, 700);
      }, idx * 90);
    });
  };

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    setEnabled(true);

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      // Update instant dot position
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        const isClickable =
          target.tagName === 'A' ||
          target.tagName === 'BUTTON' ||
          target.closest('a') ||
          target.closest('button') ||
          target.closest('.btn') ||
          target.closest('[role="button"]') ||
          target.classList.contains('clickable');

        if (isText) {
          setCursorType('text');
        } else if (isClickable) {
          setCursorType('hover');
          const btnText = target.textContent?.trim().slice(0, 10).toUpperCase();
          setHoverLabel(btnText ? `AI • ${btnText}` : 'AI • SELECT');
        } else {
          setCursorType('default');
        }
      }

      // Add to ribbon trail
      trailPoints.current.push({ x: e.clientX, y: e.clientY, alpha: 1.0 });
      if (trailPoints.current.length > 20) {
        trailPoints.current.shift();
      }

      // Spawn movement spark particles (x3 frequency)
      const now = performance.now();
      if (now - lastSparkTime.current > 20) {
        lastSparkTime.current = now;
        spawnSparks(e.clientX, e.clientY, 2);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setClicked(true);
      triggerTripleShockwave(e.clientX, e.clientY);
      spawnSparks(e.clientX, e.clientY, 18, true);
    };

    const handleMouseUp = () => {
      setClicked(false);
    };

    const handleMouseLeave = () => {
      mousePos.current = { x: -100, y: -100 };
    };

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Render loop (60-120 fps)
    const renderLoop = () => {
      // 1. Interpolate ring 1 (fast lerp 0.22)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.22;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.22;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      // 2. Interpolate ring 2 (heavy 3D inertia lerp 0.09)
      ring2Pos.current.x += (mousePos.current.x - ring2Pos.current.x) * 0.09;
      ring2Pos.current.y += (mousePos.current.y - ring2Pos.current.y) * 0.09;
      if (ring2Ref.current) {
        ring2Ref.current.style.transform = `translate3d(${ring2Pos.current.x}px, ${ring2Pos.current.y}px, 0)`;
      }

      // 3. Draw Fluid Laser Ribbon Trail on Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const pts = trailPoints.current;

          if (pts.length > 2) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);

            for (let i = 1; i < pts.length - 1; i++) {
              const xc = (pts[i].x + pts[i + 1].x) / 2;
              const yc = (pts[i].y + pts[i + 1].y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }

            const grad = ctx.createLinearGradient(
              pts[0].x, pts[0].y, 
              pts[pts.length - 1].x, pts[pts.length - 1].y
            );
            grad.addColorStop(0, 'rgba(127, 0, 255, 0)');
            grad.addColorStop(0.5, 'rgba(0, 242, 254, 0.4)');
            grad.addColorStop(1, 'rgba(0, 230, 118, 0.8)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 10;
            ctx.stroke();
          }

          // Fade out trail points
          for (let i = 0; i < pts.length; i++) {
            pts[i].alpha -= 0.03;
          }
          trailPoints.current = pts.filter((p) => p.alpha > 0);
        }
      }

      // 4. Update Sparks Physics
      setSparks((prevSparks) =>
        prevSparks
          .map((spark) => ({
            ...spark,
            x: spark.x + spark.vx,
            y: spark.y + spark.vy + 0.05, // gravity drift
            opacity: spark.opacity - 0.025,
            size: Math.max(0, spark.size - 0.12),
            rotation: spark.rotation + spark.vRot,
          }))
          .filter((spark) => spark.opacity > 0 && spark.size > 0)
      );

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="custom-cursor-wrapper">
      {/* 60fps Canvas Fluid Laser Ribbon Trail */}
      <canvas ref={canvasRef} className="cursor-canvas-trail" />

      {/* Layer 0: Ultra Precision Core Dot */}
      <div
        ref={dotRef}
        className={`custom-cursor-dot type-${cursorType} ${clicked ? 'clicked' : ''}`}
      >
        <div className="cursor-core-inner" />
        <div className="cursor-cross-flare" />
      </div>

      {/* Layer 1: Primary Fast Spring HUD Ring */}
      <div
        ref={ringRef}
        className={`custom-cursor-ring ring-primary type-${cursorType} ${clicked ? 'clicked' : ''}`}
      >
        <div className="ring-pulse-aura" />
        
        {/* HUD Brackets */}
        <div className="hud-bracket b-top-left" />
        <div className="hud-bracket b-top-right" />
        <div className="hud-bracket b-bottom-left" />
        <div className="hud-bracket b-bottom-right" />

        {/* Orbit Particles */}
        <span className="ring-orbit-node node-1" />
        <span className="ring-orbit-node node-2" />
        <span className="ring-orbit-node node-3" />

        {cursorType === 'hover' && (
          <div className="ring-hud-target">
            <div className="radar-sweep-line" />
            <span className="ring-hover-badge">{hoverLabel}</span>
          </div>
        )}
      </div>

      {/* Layer 2: Heavy 3D Inertia Hexagon Ring (x3 Depth Feel!) */}
      <div
        ref={ring2Ref}
        className={`custom-cursor-ring ring-secondary type-${cursorType} ${clicked ? 'clicked' : ''}`}
      >
        <div className="cyber-hexagon-frame">
          <svg viewBox="0 0 100 100" className="hex-svg">
            <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" fill="none" stroke="url(#hexGrad)" strokeWidth="1.5" strokeDasharray="20 10" />
            <defs>
              <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#7f00ff" />
                <stop offset="100%" stopColor="#00e676" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Triple Staggered Shockwaves */}
      {shockwaves.map((sw) => (
        <div
          key={sw.id}
          className="cursor-shockwave-super"
          style={{
            left: `${sw.x}px`,
            top: `${sw.y}px`,
            borderColor: sw.color,
            boxShadow: `0 0 25px ${sw.color}`,
          }}
        />
      ))}

      {/* Supercharged Floating Sparks & Diamond Stars */}
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className={`cursor-spark-particle spark-type-${spark.type}`}
          style={{
            left: `${spark.x}px`,
            top: `${spark.y}px`,
            width: `${spark.size}px`,
            height: `${spark.size}px`,
            backgroundColor: spark.type === 'star' ? 'transparent' : spark.color,
            boxShadow: spark.type === 'star' ? 'none' : `0 0 12px ${spark.color}`,
            opacity: spark.opacity,
            transform: `translate(-50%, -50%) rotate(${spark.rotation}deg)`,
          }}
        >
          {spark.type === 'star' && (
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path
                d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
                fill={spark.color}
                filter="drop-shadow(0 0 6px currentColor)"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
