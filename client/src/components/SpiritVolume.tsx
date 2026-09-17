import { useEffect, useState } from 'react';
import {
  SPIRIT_VOLUME_EVENT,
  cycleSpiritVolume,
  getSpiritVolume,
  setSpiritVolume,
} from '../utils/spiritVolume';

export default function SpiritVolume({ className = '' }: { className?: string }) {
  const [volume, setVolume] = useState(getSpiritVolume);

  useEffect(() => {
    const onChange = () => setVolume(getSpiritVolume());
    window.addEventListener(SPIRIT_VOLUME_EVENT, onChange);
    return () => window.removeEventListener(SPIRIT_VOLUME_EVENT, onChange);
  }, []);

  const nextVolume = () => {
    const next = cycleSpiritVolume(volume);
    setVolume(next);
    setSpiritVolume(next);
  };

  const label = volume === 0 ? 'الصوت مكتوم' : volume === 0.6 ? 'الصوت متوسط' : 'الصوت مرتفع';

  return (
    <button
      type="button"
      className={`spirit-volume-control ${volume === 0 ? 'is-muted' : ''} ${className}`}
      onClick={nextVolume}
      aria-label={`${label} — اضغط لتغيير مستوى الصوت`}
      title={`${label} — اضغط للتبديل`}
      aria-pressed={volume > 0}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {volume === 0 ? (
          <>
            <path d="M5 9h4l4-3v12l-4-3H5z" />
            <path d="m17 9 4 6M21 9l-4 6" />
          </>
        ) : (
          <>
            <path d="M5 9h4l4-3v12l-4-3H5z" />
            <path d={volume === 0.6 ? 'M17 10.2a3 3 0 0 1 0 3.6' : 'M17 8.5a5 5 0 0 1 0 7M20 6a8 8 0 0 1 0 12'} />
          </>
        )}
      </svg>
    </button>
  );
}
