import { useEffect, useState } from 'react';
import { getPerformanceMode, setPerformanceMode, type PerformanceMode } from '../utils/performanceMode';

const steps = [
  ['1', 'تدرّب حسب القسم', 'راجع قواعد السير أو الإشارات المرورية أو أساسيات الميكانيك.'],
  ['2', 'أجب وراجع', 'تدرّب سؤالاً بعد سؤال، وعند الإجابة يظهر التفسير والتوضيح البصري عند توفره.'],
  ['3', 'جرّب المحاكاة', 'اختر نموذجاً محاكياً يحتوي على ٣٠ سؤالاً مع مؤقت ١٥ دقيقة.'],
  ['4', 'شاهد النتيجة', 'بعد إنهاء الاختبار تظهر الإجابات الصحيحة والخاطئة والأسئلة التي لم تُجب عنها مع مراجعة واضحة للأخطاء.'],
];

export default function SiteGuide() {
  const [open, setOpen] = useState(false);
  const [performanceMode, setPerformance] = useState<PerformanceMode>('auto');
  useEffect(() => { setPerformance(getPerformanceMode()); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="guide-button group">
        <span className="guide-spark">✦</span><span>شرح الموقع</span><span className="guide-pulse" />
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section className="guide-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="إغلاق">×</button>
            <div className="guide-icon">✦</div>
            <h2 id="guide-title" className="text-2xl font-extrabold text-ink">كيف تستخدم رخصتي؟</h2>
            <p className="text-muted mt-2">كل ما تحتاجه لتفهم الموقع وتبدأ التدريب من مكان واحد.</p>
            <div className="mt-7 space-y-4">
              {steps.map(([n,title,text]) => <div key={n} className="flex gap-4 text-right">
                <div className="step-number">{n}</div><div><h3 className="font-bold text-ink">{title}</h3><p className="text-sm text-muted mt-1 leading-relaxed">{text}</p></div>
              </div>)}
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-paper/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">أداء الهاتف</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">الوضع التلقائي يخفف المؤثرات على الأجهزة أو الشبكات الأبطأ مع إبقاء كل المحتوى والوظائف.</p>
                </div>
                <select
                  value={performanceMode}
                  onChange={(e) => {
                    const mode = e.target.value as PerformanceMode;
                    setPerformanceMode(mode);
                    setPerformance(mode);
                  }}
                  className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
                  aria-label="وضع أداء الهاتف"
                >
                  <option value="auto">تلقائي</option>
                  <option value="full">كامل</option>
                  <option value="save">توفير</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="w-full mt-7 rounded-2xl bg-brand py-3.5 font-bold text-white">فهمت، لنبدأ</button>
          </section>
        </div>
      )}
    </>
  );
}
