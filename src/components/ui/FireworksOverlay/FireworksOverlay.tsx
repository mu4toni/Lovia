import React, { useEffect, useRef } from 'react';
import './FireworksOverlay.css';

export interface FireworksOverlayProps {
  burstCount?: number;
  durationMs?: number;
  onComplete?: () => void;
}

const PALETTE = [
  '#DA0038', // ruby primary
  '#FFD166', // warm festive gold
  '#FF6B6B', // vibrant coral
  '#4ECDC4', // turquoise mint
  '#C77DFF', // bright lavender
  '#56CCF2', // neon sky blue
  '#FF85A1', // vibrant rose pink
  '#FFFFFF', // sparkling white
];

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  friction: number;
  gravity: number;
  flicker: boolean;
}

interface Rocket {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
}

export const FireworksOverlay: React.FC<FireworksOverlayProps> = ({
  burstCount = 12,
  durationMs = 4800,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    const startTime = performance.now();

    // Scale canvas for devicePixelRatio
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];

    // Schedule rocket launches staggered across the first 2.6 seconds
    const actualRockets = Math.max(8, Math.min(16, burstCount));
    const launchInterval = 2600 / actualRockets;

    for (let i = 0; i < actualRockets; i++) {
      const delay = i * launchInterval + Math.random() * 120;
      setTimeout(() => {
        if (!isRunning) return;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Spread spawn coordinates across the lower portion
        const startX = w * 0.1 + Math.random() * (w * 0.8);
        const targetX = startX + (Math.random() - 0.5) * (w * 0.3);
        const targetY = h * 0.12 + Math.random() * (h * 0.42);

        const flightDuration = 32 + Math.random() * 18;
        const vx = (targetX - startX) / flightDuration;
        const vy = (targetY - h) / flightDuration;

        rockets.push({
          x: startX,
          y: h,
          prevX: startX,
          prevY: h,
          targetY,
          vx,
          vy,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          exploded: false,
        });
      }, delay);
    }

    const explodeRocket = (rocket: Rocket) => {
      // 80 to 120 particles per burst for rich festive fireworks
      const particleCount = 80 + Math.floor(Math.random() * 40);
      const baseColor = rocket.color;
      const altColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7.5 + 1.8;
        const color = Math.random() < 0.65 ? baseColor : altColor;

        particles.push({
          x: rocket.x,
          y: rocket.y,
          prevX: rocket.x,
          prevY: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: Math.random() * 0.012 + 0.009,
          size: Math.random() * 2.6 + 1.2,
          friction: 0.965,
          gravity: 0.09,
          flicker: Math.random() > 0.35,
        });
      }
    };

    const render = (time: number) => {
      if (!isRunning) return;

      const elapsed = time - startTime;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Update & draw rockets with bright ascending trails
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (!r.exploded) {
          r.prevX = r.x;
          r.prevY = r.y;
          r.x += r.vx;
          r.y += r.vy;

          // Rocket ascending trail line
          ctx.save();
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(r.prevX, r.prevY);
          ctx.lineTo(r.x, r.y);
          ctx.stroke();

          // Rocket head
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2.8, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = r.color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();

          if (r.y <= r.targetY || r.vy >= 0) {
            r.exploded = true;
            explodeRocket(r);
            rockets.splice(i, 1);
          }
        }
      }

      // 2. Update & draw sparks/particles with luminous trails
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx *= p.friction;
        p.vy = p.vy * p.friction + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const currentAlpha = p.flicker && Math.random() < 0.2 ? p.alpha * 0.35 : p.alpha;

        ctx.save();
        ctx.globalAlpha = Math.max(0, currentAlpha);

        // Particle luminous trail
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Particle sparkling head
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Check completion
      if (elapsed >= durationMs && particles.length === 0 && rockets.length === 0) {
        isRunning = false;
        onComplete?.();
        return;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const safetyTimer = setTimeout(() => {
      if (isRunning) {
        isRunning = false;
        onComplete?.();
      }
    }, durationMs + 1000);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      clearTimeout(safetyTimer);
      window.removeEventListener('resize', updateSize);
    };
  }, [burstCount, durationMs, onComplete]);

  return <canvas ref={canvasRef} className="fireworks-overlay" aria-hidden="true" />;
};
