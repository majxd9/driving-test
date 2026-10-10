import { useEffect, useRef, useState } from 'react';

const DRIFT_SOUND_URL = 'https://orangefreesounds.com/wp-content/uploads/2023/07/Car-starts-with-tires-screeching-sound-effect.mp3';

export default function SpiritDrift({ onStateChange }: { onStateChange?: (active: boolean) => void }) {
  const [drifting, setDrifting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(DRIFT_SOUND_URL);
    audio.preload = 'auto';
    audio.volume = 0.82;
    audio.onended = () => {
      setDrifting(false);
      onStateChange?.(false);
    };
    audio.onerror = () => {
      setDrifting(false);
      onStateChange?.(false);
    };
    audioRef.current = audio;
    audio.load();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
    };
  }, [onStateChange]);

  const playDrift = () => {
    // Animation must work even when the browser blocks Web Audio.
    if (drifting) return;

    setDrifting(true);
    onStateChange?.(true);

    // “Car starts with tires screeching sound effect” by Alexander, Orange Free Sounds, CC BY-NC 4.0 (source credit kept in code, not shown in the UI).
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        setDrifting(false);
        onStateChange?.(false);
      });
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setDrifting(false);
      onStateChange?.(false);
    }, 2150);
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
