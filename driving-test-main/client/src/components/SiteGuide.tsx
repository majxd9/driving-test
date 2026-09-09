import { useEffect, useState } from 'react';

const steps = [
  ['1', 'اختر القسم', 'قواعد السير أو الإشارات أو الميكانيك.'],
  ['2', 'أجب وتعلّم', 'أجب عن السؤال ثم راجع السبب عندما تخطئ.'],
  ['3', 'راجع الصور', 'ستظهر الصور والتوضيحات داخل السؤال عند الحاجة.'],
  ['4', 'جرّب النموذج', 'اختبر نفسك بـ30 سؤالاً خلال 15 دقيقة.'],
];

export default function SiteGuide({ floating = true, compact = false }: { floating?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.body.classList.add('no-scroll');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className={`guide-button ${floating ? 'guide-floating' : ''} ${compact ? 'guide-compact' : ''}`}>
        <span className="guide-spark">✦</span><span>{compact ? 'الشرح' : 'شرح الموقع'}</span>
      </button>
      {open && (
        <div className="guide-overlay" onClick={() => setOpen(false)}>
          <section className="guide-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="إغلاق">×</button>
            <div className="guide-icon">✦</div>
            <span className="eyebrow">دليل سريع</span>
            <h2 id="guide-title">كيف تستخدم رخصتي؟</h2>
            <p className="text-muted mt-2">كل شيء واضح من أول تسجيل الدخول حتى آخر سؤال.</p>
            <div className="mt-7 space-y-4">
              {steps.map(([number, title, text]) => (
                <div key={number} className="guide-step">
                  <div className="step-number">{number}</div>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </div>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="guide-start">فهمت، لنبدأ <span>←</span></button>
          </section>
        </div>
      )}
    </>
  );
}
