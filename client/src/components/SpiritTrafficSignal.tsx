export type SpiritTrafficState = 'idle' | 'pending' | 'correct' | 'wrong';

export default function SpiritTrafficSignal({ state, label = 'حالة الإجابة' }: { state: SpiritTrafficState; label?: string }) {
  const text = state === 'idle' ? 'انتظر' : state === 'pending' ? 'جاري التحقق' : state === 'correct' ? 'صحيحة' : 'خاطئة';
  return (
    <div className={`spirit-question-signal state-${state}`} role="status" aria-live="polite" aria-label={`${label}: ${text}`}>
      <span className="spirit-question-signal-housing" aria-hidden="true">
        <i className="red" />
        <i className="amber" />
        <i className="green" />
      </span>
      <span className="spirit-question-signal-label">{text}</span>
    </div>
  );
}
