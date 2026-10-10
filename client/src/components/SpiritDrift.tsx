import { useRef, useState } from 'react';

const DRIFT_SOUND_URL = 'https://cdn.budgetpixel.com/audio-library/sfx/screeching-sharp-abrupt-rubbery-bujneo.mp3';

export default function SpiritDrift({ onStateChange }: { onStateChange?: (active: boolean) => void }) {
  const [drifting, setDrifting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const playDrift = () => {
    // Animation must work even when the browser blocks Web Audio.
    if (drifting) return;

    setDrifting(true);
    onStateChange?.(true);

    // Use a real recorded/produced tire screech instead of synthetic oscillator noise.
    // Source: “Hard Brake Tire Screech” by BudgetPixel AI, CC BY 4.0.
    try {
      const audio = audioRef.current ?? new Audio(DRIFT_SOUND_URL);
      audioRef.current = audio;
      audio.preload = 'none';
      audio.volume = 0.78;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Keep the animation functional if the browser/network blocks external audio.
      });
    } catch {
      // Audio is an enhancement only.
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      setDrifting(false);
      onStateChange?.(false);
    }, 1450);
  };

  return (
    <button
      type="button"
      className={`models-drift-trigger-v9 ${drifting ? 'is-drifting' : ''}`}
      onClick={playDrift}
      aria-pressed={drifting}
      aria-label="تجربة تفحيط السيارة"
      title="تجربة تفحيط السيارة"
    >
      <span className="models-drift-trigger-icon-v9" aria-hidden="true">↗</span>
      <span>{drifting ? 'تفحيط!' : 'جرب التفحيط'}</span>
    </button>
  );
}
