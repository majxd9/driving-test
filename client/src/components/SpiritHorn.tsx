import { useRef, useState } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

export default function SpiritHorn({ className = '' }: { className?: string }) {
  const audioRef = useRef<AudioContext | null>(null);
  const [pressed, setPressed] = useState(false);

  const honk = () => {
    const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
    if (!Ctx) return;
    const ctx = audioRef.current ?? new Ctx();
    audioRef.current = ctx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.085, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    master.connect(ctx.destination);

    [[220, 0], [277.18, 0.012]].forEach(([frequency, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(0.48, now + offset);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + 0.24);
    });

    setPressed(true);
    window.setTimeout(() => setPressed(false), 170);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <button
      type="button"
      className={`spirit-horn-control spirit-horn-icon-only ${pressed ? 'is-pressed' : ''} ${className}`}
      onClick={honk}
      aria-label="تشغيل الزمور"
      title="زمور"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12h3l4-3v6l-4-3H4z" />
        <path d="M15 9.5c1 .6 1.6 1.4 1.6 2.5s-.6 1.9-1.6 2.5M18 7.5c1.8 1.1 2.8 2.7 2.8 4.5s-1 3.4-2.8 4.5" />
      </svg>
    </button>
  );
}
