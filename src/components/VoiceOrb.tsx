import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceMode } from '../hooks/useVoiceAssistant';

interface VoiceOrbProps {
  mode: VoiceMode;
  audioAnalyser: AnalyserNode | null;
  onClick?: () => void;
  size?: number;
}

const modeGradients: Record<VoiceMode, { inner: string; mid: string; outer: string; glow: string }> = {
  idle: {
    inner: 'radial-gradient(circle at 35% 35%, #A78BFA, #7C3AED 50%, #4C1D95)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(109, 74, 255, 0.15), transparent 60%)',
    glow: 'rgba(109, 74, 255, 0.4)',
  },
  listening: {
    inner: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.4), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.2), transparent 60%)',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  recording: {
    inner: 'radial-gradient(circle at 35% 35%, #DDD6FE, #A78BFA 50%, #7C3AED)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.35), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(196, 181, 253, 0.15), transparent 60%)',
    glow: 'rgba(167, 139, 250, 0.45)',
  },
  transcribing: {
    inner: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(109, 74, 255, 0.15), transparent 60%)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  thinking: {
    inner: 'radial-gradient(circle at 35% 35%, #A5B4FC, #818CF8 50%, #6366F1)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(129, 140, 248, 0.35), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(165, 180, 252, 0.2), transparent 60%)',
    glow: 'rgba(129, 140, 248, 0.5)',
  },
  speaking: {
    inner: 'radial-gradient(circle at 35% 35%, #C4B5FD, #A78BFA 50%, #7C3AED)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.45), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(196, 181, 253, 0.25), transparent 60%)',
    glow: 'rgba(167, 139, 250, 0.55)',
  },
  processing: {
    inner: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9)',
    mid: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
    outer: 'radial-gradient(circle at 50% 50%, rgba(109, 74, 255, 0.15), transparent 60%)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
};



function AudioRing({ audioAnalyser, isActive, color }: { audioAnalyser: AnalyserNode | null; isActive: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioAnalyser || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) / 2 - 20;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      audioAnalyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points = 128;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dataIndex = Math.floor((i / points) * bufferLength);
        const value = dataArray[dataIndex] || 0;
        const amplitude = (value / 255) * 30;
        const radius = baseRadius + amplitude;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 10, centerX, centerY, baseRadius + 35);
      gradient.addColorStop(0, color + '00');
      gradient.addColorStop(0.5, color + '30');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [audioAnalyser, isActive, color]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function Particles({ mode, color }: { mode: VoiceMode; color: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      distance: 60 + Math.random() * 40,
      size: 2 + Math.random() * 3,
    }));
  }, []);

  const show = mode === 'listening' || mode === 'speaking' || mode === 'thinking';

  return (
    <AnimatePresence>
      {show && particles.map((p) => {
        const x = Math.cos(p.angle) * p.distance;
        const y = Math.sin(p.angle) * p.distance;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: color,
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [0, x * 0.5, x],
              y: [0, y * 0.5, y],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0.5],
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </AnimatePresence>
  );
}

export function VoiceOrb({ mode, audioAnalyser, onClick, size = 160 }: VoiceOrbProps) {
  const gradient = modeGradients[mode];
  const isActive = mode === 'listening' || mode === 'speaking';
  const isThinking = mode === 'thinking';
  const isIdle = mode === 'idle';

  const orbAnimation = useMemo(() => {
    switch (mode) {
      case 'idle':
        return {
          scale: [1, 1.03, 1],
          boxShadow: [
            `0 0 30px ${gradient.glow}, 0 0 60px ${gradient.glow}40`,
            `0 0 40px ${gradient.glow}, 0 0 80px ${gradient.glow}50`,
            `0 0 30px ${gradient.glow}, 0 0 60px ${gradient.glow}40`,
          ],
        };
      case 'listening':
        return {
          scale: [1, 1.06, 1],
          boxShadow: [
            `0 0 40px ${gradient.glow}, 0 0 80px ${gradient.glow}50`,
            `0 0 60px ${gradient.glow}, 0 0 100px ${gradient.glow}60`,
            `0 0 40px ${gradient.glow}, 0 0 80px ${gradient.glow}50`,
          ],
        };
      case 'thinking':
        return {
          scale: [1, 1.04, 1],
          rotate: [0, 360],
          boxShadow: [
            `0 0 35px ${gradient.glow}, 0 0 70px ${gradient.glow}45`,
            `0 0 50px ${gradient.glow}, 0 0 90px ${gradient.glow}55`,
            `0 0 35px ${gradient.glow}, 0 0 70px ${gradient.glow}45`,
          ],
        };
      case 'speaking':
        return {
          scale: [1, 1.08, 0.98, 1.05, 1],
          boxShadow: [
            `0 0 50px ${gradient.glow}, 0 0 90px ${gradient.glow}55`,
            `0 0 70px ${gradient.glow}, 0 0 120px ${gradient.glow}65`,
            `0 0 50px ${gradient.glow}, 0 0 90px ${gradient.glow}55`,
          ],
        };
      default:
        return {
          scale: [1, 1.03, 1],
          boxShadow: `0 0 30px ${gradient.glow}`,
        };
    }
  }, [mode, gradient.glow]);

  const orbTransition = useMemo(() => {
    switch (mode) {
      case 'idle':
        return { duration: 3, repeat: Infinity, ease: 'easeInOut' };
      case 'listening':
        return { duration: 1.5, repeat: Infinity, ease: 'easeInOut' };
      case 'thinking':
        return { duration: 4, repeat: Infinity, ease: 'linear' };
      case 'speaking':
        return { duration: 0.8, repeat: Infinity, ease: 'easeInOut' };
      default:
        return { duration: 2, repeat: Infinity, ease: 'easeInOut' };
    }
  }, [mode]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      <Particles mode={mode} color={gradient.glow} />

      <AudioRing audioAnalyser={audioAnalyser} isActive={isActive} color={gradient.glow} />

      <motion.div
        className="absolute rounded-full cursor-pointer"
        style={{
          width: size,
          height: size,
          background: gradient.inner,
        }}
        animate={orbAnimation}
        transition={orbTransition as any}
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: gradient.mid }}
        />

        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle at 40% 40%, rgba(255,255,255,0.15), transparent 60%)`,
          }}
        />

        {isThinking && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${gradient.glow}40, transparent, ${gradient.glow}20, transparent)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {isIdle && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
        )}
      </motion.div>

      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 24,
          height: size + 24,
          border: `1.5px solid ${gradient.glow}30`,
        }}
        animate={{
          scale: mode === 'idle' ? [1, 1.05, 1] : [1, 1.08, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: mode === 'speaking' ? 1 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {(mode === 'listening' || mode === 'speaking') && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size + 48,
            height: size + 48,
            border: `1px solid ${gradient.glow}15`,
          }}
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{ duration: mode === 'speaking' ? 1.2 : 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
      )}
    </div>
  );
}
