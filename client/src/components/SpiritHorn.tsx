import { useRef, useState } from 'react';
import { getSpiritVolume } from '../utils/spiritVolume';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

type AudioBus = {
  ctx: AudioContext;
  master: GainNode;
};

export default function SpiritHorn({ className = '' }: { className?: string }) {
  const audioRef = useRef<AudioBus | null>(null);
  const [pressed, setPressed] = useState(false);

  const getBus = () => {
    const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
    if (!Ctx) return null;

    if (!audioRef.current) {
      const ctx = new Ctx();
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 4.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      audioRef.current = { ctx, master };
    }

    return audioRef.current;
  };

  const honk = () => {
    const bus = getBus();
    if (!bus) return;

    const { ctx, master } = bus;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const volume = getSpiritVolume();
    const peak = 0.70 * volume;

    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    if (volume === 0) {
      master.gain.setValueAtTime(0.0001, now);
    } else {
      master.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + 0.018);
      master.gain.setValueAtTime(Math.max(peak, 0.0002), now + 0.20);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    }

    const tones: [number, number, number, number][] = [
      [174.61, 0.00, 0.55, 0],
      [220.00, 0.006, 0.44, 4],
      [261.63, 0.010, 0.34, -3],
      [349.23, 0.000, 0.16, 0],
      [87.31, 0.003, 0.22, 0],
    ];

    tones.forEach(([frequency, offset, level, detune]) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, now + offset);
      if (detune) osc.detune.setValueAtTime(detune * 10, now + offset);
      osc.frequency.linearRampToValueAtTime(frequency * 1.003, now + offset + 0.08);
      osc.frequency.linearRampToValueAtTime(frequency * 0.998, now + offset + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(frequency * 3.2, 1150), now + offset);
      filter.Q.value = 0.8;

      gainNode.gain.setValueAtTime(0.0001, now + offset);
      gainNode.gain.exponentialRampToValueAtTime(level, now + offset + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.47);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(master);
      osc.start(now + offset);
      osc.stop(now + 0.50);
    });

    // Short mechanical click gives the horn a more physical attack.
    if (volume > 0) {
      const clickBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.007), ctx.sampleRate);
      const clickData = clickBuf.getChannelData(0);
      for (let i = 0; i < clickData.length; i += 1) {
        clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickData.length);
      }
      const click = ctx.createBufferSource();
      const clickGain = ctx.createGain();
      click.buffer = clickBuf;
      clickGain.gain.value = 0.16 * volume;
      click.connect(clickGain);
      clickGain.connect(master);
      click.start(now);
    }

    setPressed(true);
    window.setTimeout(() => setPressed(false), 280);
    if (navigator.vibrate) navigator.vibrate([12, 18, 8]);
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
