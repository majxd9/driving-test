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

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -26;
    compressor.knee.value = 18;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    [[210, 0, 0.72], [263.74, 0.012, 0.55], [157.49, 0, 0.22]].forEach(([frequency, offset, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(level, now + offset);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + 0.28);
    });

    setPressed(true);
    window.setTimeout(() => setPressed(false), 190);
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <button
      type="button"
      className={`spirit-horn-control spirit-horn-icon-only ${pressed ? 'is-pressed' : ''} ${className}`}
      onPointerDown={honk}
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
