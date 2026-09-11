import { useEffect, useState } from 'react';

const steps = [
  ['1', 'اختر القسم', 'قواعد السير أو الإشارات أو الميكانيك.'],
  ['2', 'أجب عن الأسئلة', 'تدرّب سؤالاً بعد سؤال مع صور واضحة.'],
  ['3', 'افهم الخطأ', 'بعد الإجابة يظهر لك التفسير والتوضيح البصري عند توفره.'],
  ['4', 'اختبر نفسك', 'اختم التدريب بنموذج محاكي للامتحان مع مؤقت ونتيجة.'],
];

export default function SiteGuide() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="guide-button group">
        <span className="guide-spark">✦</span><span>شرح الموقع</span><span className="guide-pulse" />
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section className="guide-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="إغلاق">×</button>
            <div className="guide-icon">✦</div>
            <h2 id="guide-title" className="text-2xl font-extrabold text-ink">كيف تستخدم رخصتي؟</h2>
            <p className="text-muted mt-2">تجربة بسيطة من أول سؤال حتى الاختبار النهائي.</p>
            <div className="mt-7 space-y-4">
              {steps.map(([n,title,text]) => <div key={n} className="flex gap-4 text-right">
                <div className="step-number">{n}</div><div><h3 className="font-bold text-ink">{title}</h3><p className="text-sm text-muted mt-1 leading-relaxed">{text}</p></div>
              </div>)}
            </div>
            <button onClick={() => setOpen(false)} className="w-full mt-7 rounded-2xl bg-brand py-3.5 font-bold text-white">فهمت، لنبدأ</button>
          </section>
        </div>
      )}
    </>
  );
}
