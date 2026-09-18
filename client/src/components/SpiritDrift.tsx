import { useRef, useState } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

export default function SpiritDrift({ onStateChange }: { onStateChange?: (active: boolean) => void }) {
  const [drifting, setDrifting] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);

  const getAudio = async () => {
    const Ctx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = contextRef.current ?? new Ctx();
    contextRef.current = ctx;
    if (ctx.state !== 'running') await ctx.resume();
    return ctx;
  };

  const startAudio = async () => {
    const ctx = await getAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const end = now + 1.35;

    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -26;
    compressor.knee.value = 10;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.09;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.42, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, end);
    master.connect(compressor).connect(ctx.destination);

    // Engine rev: two detuned oscillators with a realistic pitch rise/fall.
    for (const [detune, level] of [[0, 0.18], [7, 0.10]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(205, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.68);
      osc.frequency.exponentialRampToValueAtTime(255, end - 0.12);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
      filter.frequency.exponentialRampToValueAtTime(1300, end);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.035);
      gain.gain.setValueAtTime(level, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(filter).connect(gain).connect(master);
      osc.start(now);
      osc.stop(end + 0.03);
    }

    // Tire squeal: shaped broadband friction, brighter during the hardest part of the slide.
    const duration = 1.28;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const t = i / data.length;
      const envelope = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.58);
      const texture = 0.65 + 0.35 * Math.sin(t * 83);
      data[i] = (Math.random() * 2 - 1) * envelope * texture;
    }
    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const tyreGain = ctx.createGain();
    source.buffer = buffer;
    band.type = 'bandpass';
    band.Q.value = 2.2;
    band.frequency.setValueAtTime(720, now + 0.02);
    band.frequency.exponentialRampToValueAtTime(2600, now + 0.58);
    band.frequency.exponentialRampToValueAtTime(1500, end - 0.08);
    tyreGain.gain.setValueAtTime(0.0001, now);
    tyreGain.gain.exponentialRampToValueAtTime(0.52, now + 0.08);
    tyreGain.gain.setValueAtTime(0.48, now + 0.58);
    tyreGain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(band).connect(tyreGain).connect(master);
    source.start(now);
    source.stop(end);

    // Short turbo/pressure hiss on the exit of the slide.
    const hissBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.30), ctx.sampleRate);
    const hiss = hissBuffer.getChannelData(0);
    for (let i = 0; i < hiss.length; i += 1) {
      const t = i / hiss.length;
      hiss[i] = (Math.random() * 2 - 1) * (1 - t) * (0.45 + 0.55 * Math.random());
    }
    const hissSource = ctx.createBufferSource();
    const hissFilter = ctx.createBiquadFilter();
    const hissGain = ctx.createGain();
    hissSource.buffer = hissBuffer;
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 1700;
    hissGain.gain.setValueAtTime(0.0001, now + 0.92);
    hissGain.gain.exponentialRampToValueAtTime(0.16, now + 1.00);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    hissSource.connect(hissFilter).connect(hissGain).connect(master);
    hissSource.start(now + 0.92);
    hissSource.stop(now + 1.25);
  };

  const playDrift = async () => {
    if (drifting) return;
    setDrifting(true);
    onStateChange?.(true);

    try {
      await startAudio();
    } catch (error) {
      console.error('Unable to play drift audio:', error);
    } finally {
      window.setTimeout(() => {
        setDrifting(false);
        onStateChange?.(false);
      }, 1400);
    }
  };

  return (
    <button
      type="button"
      className={`models-drift-control ${drifting ? 'is-drifting' : ''}`}
      onPointerDown={() => { void getAudio(); }}
      onClick={() => { void playDrift(); }}
      aria-pressed={drifting}
      aria-label="تفحيط السيارة"
      title="تفحيط السيارة"
    >
      <span className="models-drift-icon" aria-hidden="true">↗</span>
      <span>{drifting ? 'تفحيط!' : 'تفحيط'}</span>
    </button>
  );
}
