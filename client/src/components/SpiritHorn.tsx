import { useRef, useState } from 'react';

type SpiritHornProps = { variant?: 'deep' | 'default' | string; className?: string };

/** User-triggered dual-tone horn; AudioContext is created only after a click. */
export default function SpiritHorn({ variant = 'default', className = '' }: SpiritHornProps) {
  const contextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);

  const playHorn = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported');
      const ctx = contextRef.current ?? new AudioContextClass();
      contextRef.current = ctx;
      if (ctx.state !== 'running') await ctx.resume();

      const now = ctx.currentTime;
      const duration = variant === 'deep' ? 0.72 : 0.58;
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-22, now);
      compressor.knee.setValueAtTime(18, now);
      compressor.ratio.setValueAtTime(4, now);
      compressor.attack.setValueAtTime(0.008, now);
      compressor.release.setValueAtTime(0.18, now);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.85, now + 0.025);
      master.gain.setValueAtTime(0.78, now + duration * 0.62);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      // A warm, two-note car-horn chord with a subtle upper harmonic.
      const fundamentals = variant === 'deep' ? [196, 246.94] : [220, 277.18];
      fundamentals.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency * 0.985, now);
        osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.045);
        gain.gain.setValueAtTime(index === 0 ? 0.58 : 0.42, now);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.02);
      });
      const harmonic = ctx.createOscillator();
      const harmonicGain = ctx.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(fundamentals[0] * 2, now);
      harmonicGain.gain.setValueAtTime(0.08, now);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(master);
      harmonic.start(now);
      harmonic.stop(now + duration + 0.02);
      window.setTimeout(() => setPlaying(false), duration * 1000 + 80);
    } catch (error) {
      console.error('Unable to play the driving horn:', error);
      setPlaying(false);
    }
  };

  return (
    <button type="button" className={`${className} spirit-horn-control${playing ? ' is-pressed' : ''}`} onClick={playHorn}
      aria-label={playing ? 'الزمور يعمل' : 'تشغيل زمور السيارة'} title="تشغيل زمور السيارة" aria-pressed={playing}
      disabled={playing} style={{ cursor: playing ? 'default' : 'pointer', touchAction: 'manipulation' }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10v4h4l9 4V6l-9 4H3Z"/><path d="M7 14l1.5 5h3L10 15"/><path d="M19 9.5a4 4 0 0 1 0 5M21 7a7 7 0 0 1 0 10"/>
      </svg>
    </button>
  );
}
