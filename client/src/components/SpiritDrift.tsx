import { useRef, useState } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

export default function SpiritDrift({ onStateChange }: { onStateChange?: (active: boolean) => void }) {
  const [drifting, setDrifting] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const getContext = () => {
    try {
      const Ctx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
      if (!Ctx) return null;
      contextRef.current ??= new Ctx();
      const ctx = contextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  };

  const playDrift = () => {
    // Animation must work even when the browser blocks Web Audio.
    if (drifting) return;

    setDrifting(true);
    onStateChange?.(true);

    const ctx = getContext();
    if (ctx) {
      const now = ctx.currentTime;
      const end = now + 1.32;

      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -25;
      compressor.knee.value = 10;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.08;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.46, now + 0.025);
      master.gain.exponentialRampToValueAtTime(0.0001, end);
      master.connect(compressor).connect(ctx.destination);

      for (const [offset, volume] of [[0, 0.17], [5, 0.09]] as const) {
        const engine = ctx.createOscillator();
        const engineGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        engine.type = 'sawtooth';
        engine.detune.value = offset;
        engine.frequency.setValueAtTime(90, now);
        engine.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        engine.frequency.exponentialRampToValueAtTime(430, now + 0.62);
        engine.frequency.exponentialRampToValueAtTime(250, end - 0.10);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2600, now + 0.6);
        filter.frequency.exponentialRampToValueAtTime(1200, end);
        engineGain.gain.setValueAtTime(0.0001, now);
        engineGain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
        engineGain.gain.exponentialRampToValueAtTime(volume * 0.92, now + 0.62);
        engineGain.gain.exponentialRampToValueAtTime(0.0001, end);
        engine.connect(filter).connect(engineGain).connect(master);
        engine.start(now);
        engine.stop(end + 0.02);
      }

      const tireBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.22), ctx.sampleRate);
      const tireData = tireBuffer.getChannelData(0);
      for (let i = 0; i < tireData.length; i += 1) {
        const t = i / tireData.length;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.52);
        const grit = 0.6 + 0.4 * Math.sin(t * 91);
        tireData[i] = (Math.random() * 2 - 1) * env * grit;
      }
      const tire = ctx.createBufferSource();
      const tireFilter = ctx.createBiquadFilter();
      const tireGain = ctx.createGain();
      tire.buffer = tireBuffer;
      tireFilter.type = 'bandpass';
      tireFilter.Q.value = 2.4;
      tireFilter.frequency.setValueAtTime(750, now);
      tireFilter.frequency.exponentialRampToValueAtTime(2700, now + 0.54);
      tireFilter.frequency.exponentialRampToValueAtTime(1300, end - 0.05);
      tireGain.gain.setValueAtTime(0.0001, now);
      tireGain.gain.exponentialRampToValueAtTime(0.58, now + 0.07);
      tireGain.gain.setValueAtTime(0.52, now + 0.52);
      tireGain.gain.exponentialRampToValueAtTime(0.0001, end);
      tire.connect(tireFilter).connect(tireGain).connect(master);
      tire.start(now);
      tire.stop(end);

      const hissBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.28), ctx.sampleRate);
      const hissData = hissBuffer.getChannelData(0);
      for (let i = 0; i < hissData.length; i += 1) {
        const t = i / hissData.length;
        hissData[i] = (Math.random() * 2 - 1) * (1 - t) * (0.45 + Math.random() * 0.55);
      }
      const hiss = ctx.createBufferSource();
      const hissFilter = ctx.createBiquadFilter();
      const hissGain = ctx.createGain();
      hiss.buffer = hissBuffer;
      hissFilter.type = 'highpass';
      hissFilter.frequency.value = 1800;
      hissGain.gain.setValueAtTime(0.0001, now + 0.92);
      hissGain.gain.exponentialRampToValueAtTime(0.17, now + 1.00);
      hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);
      hiss.connect(hissFilter).connect(hissGain).connect(master);
      hiss.start(now + 0.92);
      hiss.stop(now + 1.23);
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setDrifting(false);
      onStateChange?.(false);
    }, 1450);
  };

  return (
    <button
      type="button"
      className={`models-drift-control ${drifting ? 'is-drifting' : ''}`}
      onClick={playDrift}
      aria-pressed={drifting}
      aria-label="تجربة تفحيط السيارة"
      title="تجربة تفحيط السيارة"
    >
      <span className="models-drift-icon" aria-hidden="true">↗</span>
      <span>{drifting ? 'تفحيط!' : 'جرب التفحيط'}</span>
    </button>
  );
}
