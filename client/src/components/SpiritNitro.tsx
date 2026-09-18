import { useRef, useState } from 'react';

type AudioContextCtor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextCtor };

export default function SpiritNitro({ className = '' }: { className?: string }) {
  const contextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);

  const playNitro = async () => {
    if (playing) return;
    setPlaying(true);

    let timer = 0;
    try {
      const Ctx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio is not supported');

      const ctx = contextRef.current ?? new Ctx();
      contextRef.current = ctx;
      if (ctx.state !== 'running') await ctx.resume();

      const now = ctx.currentTime;
      const duration = 0.95;

      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-22, now);
      compressor.knee.setValueAtTime(14, now);
      compressor.ratio.setValueAtTime(6, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.12, now);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.66, now + 0.025);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      const engine = ctx.createOscillator();
      const engineGain = ctx.createGain();
      engine.type = 'sawtooth';
      engine.frequency.setValueAtTime(92, now);
      engine.frequency.exponentialRampToValueAtTime(290, now + 0.28);
      engine.frequency.exponentialRampToValueAtTime(205, now + 0.92);
      engineGain.gain.setValueAtTime(0.0001, now);
      engineGain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
      engineGain.gain.setValueAtTime(0.25, now + 0.42);
      engineGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      engine.connect(engineGain).connect(master);
      engine.start(now);
      engine.stop(now + duration + 0.03);

      const highEngine = ctx.createOscillator();
      const highGain = ctx.createGain();
      highEngine.type = 'triangle';
      highEngine.frequency.setValueAtTime(180, now);
      highEngine.frequency.exponentialRampToValueAtTime(630, now + 0.38);
      highEngine.frequency.exponentialRampToValueAtTime(360, now + 0.92);
      highGain.gain.setValueAtTime(0.0001, now);
      highGain.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
      highGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      highEngine.connect(highGain).connect(master);
      highEngine.start(now);
      highEngine.stop(now + duration + 0.03);

      const turbo = ctx.createOscillator();
      const turboGain = ctx.createGain();
      turbo.type = 'sine';
      turbo.frequency.setValueAtTime(620, now);
      turbo.frequency.exponentialRampToValueAtTime(1480, now + 0.5);
      turbo.frequency.exponentialRampToValueAtTime(860, now + 0.92);
      turboGain.gain.setValueAtTime(0.0001, now);
      turboGain.gain.exponentialRampToValueAtTime(0.075, now + 0.08);
      turboGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      turbo.connect(turboGain).connect(master);
      turbo.start(now);
      turbo.stop(now + duration + 0.03);

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noise.buffer = buffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.value = 0.65;
      noiseFilter.frequency.setValueAtTime(650, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.34);
      noiseFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.9);
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.20, now + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start(now);
      noise.stop(now + duration);

      timer = window.setTimeout(() => setPlaying(false), duration * 1000 + 90);
    } catch (error) {
      console.error('Unable to play the nitro sound:', error);
      setPlaying(false);
      if (timer) window.clearTimeout(timer);
    }
  };

  return (
    <button
      type="button"
      className={`spirit-nitro-control ${playing ? 'is-active' : ''} ${className}`}
      onClick={playNitro}
      disabled={playing}
      aria-label={playing ? 'النيترو يعمل' : 'تشغيل دعسة نيترو'}
      title="دعسة نيترو"
      aria-pressed={playing}
    >
      <span className="spirit-nitro-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M8.5 21c.2-3.3 2-5.4 4-7.7 1.5-1.8 2.5-3.4 2.1-6.1 2.8 2.1 4.7 5.1 4.7 8.1 0 3.4-2.4 5.7-5.8 5.7-1.2 0-2.5-.2-3.4-.6C8.9 20.2 8.6 20.6 8.5 21Z" fill="currentColor" opacity=".95"/>
          <path d="M8.1 13.1C6.2 11.8 5.4 9.7 6.4 7.2c1.2.8 2.2 1.8 2.7 3.1-.1-2.8 1.3-5 3.7-6.8.5 3.5-.1 5.8-1.7 7.6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" opacity=".9"/>
        </svg>
      </span>
      <span className="spirit-nitro-label">{playing ? 'BOOST' : 'N₂O'}</span>
    </button>
  );
}
