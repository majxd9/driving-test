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
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(188, now);
    osc.frequency.linearRampToValueAtTime(142, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);

    setPressed(true);
    window.setTimeout(() => setPressed(false), 180);
    if (navigator.vibrate) navigator.vibrate(16);
  };

  return (
    <button
      type="button"
      className={`spirit-horn-control ${pressed ? 'is-pressed' : ''} ${className}`}
      onClick={honk}
      aria-label="زمور"
      title="زمور"
    >
      <span className="spirit-horn-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h3l4-3v6l-4-3H4z" />
          <path d="M15 9.5c1 .6 1.6 1.4 1.6 2.5s-.6 1.9-1.6 2.5M18 7.5c1.8 1.1 2.8 2.7 2.8 4.5s-1 3.4-2.8 4.5" />
        </svg>
      </span>
      <span>زمور</span>
    </button>
  );
}
