import { useEffect, useState } from 'react';

const STORAGE_KEY = 'driving-spirit-lights';

type Props = { className?: string; compact?: boolean; onChange?: (on: boolean) => void };

export default function SpiritLights({ className = '', compact = false, onChange }: Props) {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.spiritLights = on ? 'on' : 'off';
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // Visual preference only; ignore unavailable storage.
    }
  }, [on]);

  return (
    <button
      type="button"
      className={`spirit-lights-control ${on ? 'is-on' : 'is-off'} ${compact ? 'spirit-lights-compact' : ''} ${className}`}
      onClick={() => setOn(value => { const next = !value; onChange?.(next); return next; })}
      aria-pressed={on}
      aria-label={on ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع الهادئ'}
      title={on ? 'الوضع الليلي المضيء — اضغط للتبديل' : 'الوضع الهادئ — اضغط للتبديل'}
    >
      <span className="spirit-lights-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9h5a3 3 0 0 1 3 3v3H5z" />
          <path d="M16 9h2M16 12h3M16 15h2" />
        </svg>
      </span>
      {!compact && <span className="spirit-lights-switch" aria-hidden="true"><i /></span>}
      {!compact && <span className="spirit-lights-label">أنوار</span>}
    </button>
  );
}
