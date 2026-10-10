import { useEffect, useRef, useState } from 'react';

const NITRO_SOUND_URL = 'https://orangefreesounds.com/wp-content/uploads/2024/02/Car-revving-sound-effect.mp3';

export default function SpiritNitro({ className = '' }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(NITRO_SOUND_URL);
    audio.preload = 'auto';
    audio.volume = 0.86;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audioRef.current = audio;
    audio.load();

    return () => {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  const playNitro = () => {
    if (playing) return;
    const audio = audioRef.current;
    if (!audio) return;

    setPlaying(true);
    audio.currentTime = 0;
    void audio.play().catch(() => setPlaying(false));
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
