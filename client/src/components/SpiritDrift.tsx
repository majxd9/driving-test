import { useRef, useState } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

export default function SpiritDrift({ onStateChange }: { onStateChange?: (active: boolean) => void }) {
  const [drifting, setDrifting] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);

  const playDrift = async () => {
    if (drifting) return;
    setDrifting(true);
    onStateChange?.(true);

    try {
      const Ctx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
      if (Ctx) {
        const ctx = contextRef.current ?? new Ctx();
        contextRef.current = ctx;
        if (ctx.state !== 'running') await ctx.resume();

        const now = ctx.currentTime;
        const master = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -28;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.09;
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.42, now + 0.02);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        master.connect(compressor).connect(ctx.destination);

        // Tire squeal: filtered noise whose band rises and falls like a tyre losing grip.
        const duration = 1.12;
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          const t = i / data.length;
          const envelope = Math.sin(Math.PI * Math.min(1, t * 1.18)) ** 0.72;
          const grit = 0.72 + 0.28 * Math.sin(t * 54);
          data[i] = (Math.random() * 2 - 1) * envelope * grit;
        }

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.Q.value = 2.6;
        filter.frequency.setValueAtTime(820, now);
        filter.frequency.exponentialRampToValueAtTime(2350, now + 0.48);
        filter.frequency.exponentialRampToValueAtTime(1280, now + 1.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.70, now + 0.06);
        gain.gain.setValueAtTime(0.56, now + 0.48);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.12);
        source.connect(filter).connect(gain).connect(master);
        source.start(now);
        source.stop(now + duration);

        // Low tyre scrub adds body so it doesn't sound like plain white noise.
        const tyre = ctx.createOscillator();
        const tyreGain = ctx.createGain();
        tyre.type = 'sawtooth';
        tyre.frequency.setValueAtTime(120, now);
        tyre.frequency.exponentialRampToValueAtTime(205, now + 0.52);
        tyre.frequency.exponentialRampToValueAtTime(145, now + 1.08);
        tyreGain.gain.setValueAtTime(0.0001, now);
        tyreGain.gain.exponentialRampToValueAtTime(0.065, now + 0.03);
        tyreGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        tyre.connect(tyreGain).connect(master);
        tyre.start(now);
        tyre.stop(now + 1.13);

        // Small engine blip during the slide.
        const rev = ctx.createOscillator();
        const revGain = ctx.createGain();
        rev.type = 'triangle';
        rev.frequency.setValueAtTime(170, now);
        rev.frequency.exponentialRampToValueAtTime(340, now + 0.35);
        rev.frequency.exponentialRampToValueAtTime(240, now + 1.03);
        revGain.gain.setValueAtTime(0.0001, now);
        revGain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
        revGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.08);
        rev.connect(revGain).connect(master);
        rev.start(now);
        rev.stop(now + 1.12);
      }
    } catch {
      // Visual drift still works when Web Audio is unavailable.
    } finally {
      window.setTimeout(() => {
        setDrifting(false);
        onStateChange?.(false);
      }, 1250);
    }
  };

  return (
    <button
      type="button"
      className={`models-drift-control ${drifting ? 'is-drifting' : ''}`}
      onClick={() => void playDrift()}
      aria-pressed={drifting}
      aria-label="تفحيط السيارة"
    >
      <span className="models-drift-icon" aria-hidden="true">↻</span>
      <span>{drifting ? 'تفحّط!' : 'جرّب التفحيط'}</span>
    </button>
  );
}
