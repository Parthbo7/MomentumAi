import { useRef, useEffect } from 'react';

interface VoiceWaveformProps {
  audioAnalyser: AnalyserNode | null;
  isActive: boolean;
  variant?: 'bars' | 'circle' | 'wave';
  color?: string;
  height?: number;
  width?: number;
}

export function VoiceWaveform({
  audioAnalyser,
  isActive,
  variant = 'bars',
  color = '#8B7CF8',
  height = 40,
  width = 200,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioAnalyser || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      audioAnalyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (variant === 'bars') {
        const barCount = 32;
        const barWidth = canvas.width / barCount - 1;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const barHeight = (value / 255) * canvas.height * 0.9;
          const x = i * (barWidth + 1);
          const y = canvas.height - barHeight;

          const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color + '40');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (variant === 'wave') {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
      } else if (variant === 'circle') {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) / 4;

        ctx.beginPath();
        const points = 64;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const value = dataArray[i % bufferLength] || 0;
          const radius = baseRadius + (value / 255) * baseRadius * 0.8;
          const px = centerX + Math.cos(angle) * radius;
          const py = centerY + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fillStyle = color + '30';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioAnalyser, isActive, variant, color, height, width]);

  // Idle animation when no audio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const drawIdle = () => {
      animationRef.current = requestAnimationFrame(drawIdle);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const barCount = 32;
      const barWidth = canvas.width / barCount - 1;

      for (let i = 0; i < barCount; i++) {
        const value = Math.sin((frame * 0.02) + (i * 0.3)) * 20 + 25;
        const barHeight = Math.max(2, value);
        const x = i * (barWidth + 1);
        const y = canvas.height - barHeight;

        ctx.fillStyle = color + '20';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    drawIdle();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, color, height, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
      style={{ width, height }}
    />
  );
}
