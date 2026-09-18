import { useRef, useState } from 'react';

type SpiritHornProps = {
  variant?: 'deep' | 'default' | string;
  className?: string;
};

/**
 * A user-initiated, layered horn synthesized with Web Audio.
 * Creating/resuming the AudioContext inside the click handler avoids autoplay
 * restrictions and does not depend on a remotely hosted audio asset.
 */
export default function SpiritHorn({ variant = 'default', className = '' }: SpiritHornProps) {
  const contextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const playHorn = async () => {
    // Ignore repeated taps while the short horn burst is active.
    if (playing) return;
    setPlaying(true);

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported');

      const ctx = contextRef.current ?? new AudioContextClass();
      contextRef.current = ctx;
      if (ctx.state !== 'running') await ctx.resume();

      const now = ctx.currentTime;
      const duration = variant === 'deep' ? 0.78 : 0.62;
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, now);
      compressor.knee.setValueAtTime(16, now);
      compressor.ratio.setValueAtTime(5, now);
      compressor.attack.setValueAtTime(0.004, now);
      compressor.release.setValueAtTime(0.16, now);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.72, now + 0.035);
      master.gain.setValueAtTime(0.64, now + duration * 0.58);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      const fundamentals = variant === 'deep' ? [220, 277.18, 440] : [247, 311.13, 493.88];
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];
      fundamentals.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === 2 ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);
        // Tiny pitch bend gives the chord a more horn-like attack.
        osc.frequency.setValueAtTime(frequency * 1.018, now + 0.045);
        osc.frequency.setTargetAtTime(frequency, now + 0.075, 0.055);
        gain.gain.setValueAtTime(index === 2 ? 0.12 : 0.22, now);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.03);
        oscillators.push(osc);
        gains.push(gain);
      });

      const timer = window.setTimeout(() => {
        setPlaying(false);
        stopRef.current = null;
      }, duration * 1000 + 80);
      stopRef.current = () => {
        window.clearTimeout(timer);
        oscillators.forEach(osc => { try { osc.stop(); } catch { /* already stopped */ } });
        gains.forEach(gain => { try { gain.disconnect(); } catch { /* already disconnected */ } });
        try { master.disconnect(); compressor.disconnect(); } catch { /* already disconnected */ }
        setPlaying(false);
      };
    } catch (error) {
      console.error('Unable to play the driving horn:', error);
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={playHorn}
      aria-label={playing ? 'الزمور يعمل' : 'تشغيل زمور السيارة'}
      title="تشغيل زمور السيارة"
      aria-pressed={playing}
      disabled={playing}
      style={{ cursor: playing ? 'default' : 'pointer', touchAction: 'manipulation' }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.2em', lineHeight: 1 }}>📢</span>
    </button>
  );
}
