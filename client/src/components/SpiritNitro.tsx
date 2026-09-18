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
      const duration = 1.18;

      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, now);
      compressor.knee.setValueAtTime(12, now);
      compressor.ratio.setValueAtTime(7, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.11, now);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.72, now + 0.018);
      master.gain.setValueAtTime(0.63, now + 0.42);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(compressor).connect(ctx.destination);

      // Low engine: a rising V6/V8-like throb with subtle harmonic layers.
      const low = ctx.createOscillator();
      const lowGain = ctx.createGain();
      low.type = 'sawtooth';
      low.frequency.setValueAtTime(68, now);
      low.frequency.exponentialRampToValueAtTime(118, now + 0.16);
      low.frequency.exponentialRampToValueAtTime(250, now + 0.57);
      low.frequency.exponentialRampToValueAtTime(175, now + 1.08);
      lowGain.gain.setValueAtTime(0.0001, now);
      lowGain.gain.exponentialRampToValueAtTime(0.30, now + 0.035);
      lowGain.gain.setValueAtTime(0.30, now + 0.46);
      lowGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      low.connect(lowGain).connect(master);
      low.start(now);
      low.stop(now + duration + 0.04);

      // Second harmonic adds mechanical weight instead of a clean synth tone.
      const mid = ctx.createOscillator();
      const midGain = ctx.createGain();
      mid.type = 'square';
      mid.frequency.setValueAtTime(136, now);
      mid.frequency.exponentialRampToValueAtTime(500, now + 0.58);
      mid.frequency.exponentialRampToValueAtTime(348, now + 1.08);
      midGain.gain.setValueAtTime(0.0001, now);
      midGain.gain.exponentialRampToValueAtTime(0.10, now + 0.045);
      midGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      mid.connect(midGain).connect(master);
      mid.start(now);
      mid.stop(now + duration + 0.04);

      // Turbo spool: high, narrow tone with an accelerating pitch bend.
      const turbo = ctx.createOscillator();
      const turboGain = ctx.createGain();
      const turboFilter = ctx.createBiquadFilter();
      turbo.type = 'sine';
      turbo.frequency.setValueAtTime(420, now + 0.10);
      turbo.frequency.exponentialRampToValueAtTime(1780, now + 0.63);
      turbo.frequency.exponentialRampToValueAtTime(950, now + 1.12);
      turboFilter.type = 'bandpass';
      turboFilter.Q.value = 7;
      turboFilter.frequency.setValueAtTime(720, now);
      turboFilter.frequency.exponentialRampToValueAtTime(1800, now + 0.62);
      turboGain.gain.setValueAtTime(0.0001, now);
      turboGain.gain.exponentialRampToValueAtTime(0.11, now + 0.16);
      turboGain.gain.setValueAtTime(0.11, now + 0.62);
      turboGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      turbo.connect(turboFilter).connect(turboGain).connect(master);
      turbo.start(now);
      turbo.stop(now + duration + 0.04);

      // Intake / boost whoosh.
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const fade = Math.sin((i / data.length) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * fade;
      }
      const whoosh = ctx.createBufferSource();
      const whooshFilter = ctx.createBiquadFilter();
      const whooshGain = ctx.createGain();
      whoosh.buffer = buffer;
      whooshFilter.type = 'bandpass';
      whooshFilter.Q.value = 0.8;
      whooshFilter.frequency.setValueAtTime(420, now);
      whooshFilter.frequency.exponentialRampToValueAtTime(3400, now + 0.56);
      whooshFilter.frequency.exponentialRampToValueAtTime(950, now + 1.10);
      whooshGain.gain.setValueAtTime(0.0001, now);
      whooshGain.gain.exponentialRampToValueAtTime(0.26, now + 0.12);
      whooshGain.gain.setValueAtTime(0.24, now + 0.55);
      whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      whoosh.connect(whooshFilter).connect(whooshGain).connect(master);
      whoosh.start(now);
      whoosh.stop(now + duration);

      // Short pressure-release burst at the end of the boost.
      const releaseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.20), ctx.sampleRate);
      const releaseData = releaseBuffer.getChannelData(0);
      for (let i = 0; i < releaseData.length; i += 1) {
        const fade = 1 - i / releaseData.length;
        releaseData[i] = (Math.random() * 2 - 1) * fade;
      }
      const psssh = ctx.createBufferSource();
      const pssshFilter = ctx.createBiquadFilter();
      const pssshGain = ctx.createGain();
      psssh.buffer = releaseBuffer;
      pssshFilter.type = 'highpass';
      pssshFilter.frequency.value = 1800;
      pssshGain.gain.setValueAtTime(0.0001, now + 0.93);
      pssshGain.gain.exponentialRampToValueAtTime(0.16, now + 0.98);
      pssshGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.14);
      psssh.connect(pssshFilter).connect(pssshGain).connect(master);
      psssh.start(now + 0.93);
      psssh.stop(now + 1.15);

      timer = window.setTimeout(() => setPlaying(false), duration * 1000 + 100);
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
