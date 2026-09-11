import { useState } from 'react';

export default function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="شو هيدا الموقع؟"
        className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-brand/40 flex items-center justify-center text-2xl font-bold"
      >
        <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-40" />
        <span className="relative">؟</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 text-center animate-[fadeUp_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4">
              ر
            </div>
            <h2 className="text-lg font-bold text-ink mb-2">شو هو رخصتي؟</h2>
            <p className="text-sm text-muted leading-relaxed mb-5">
              تطبيق لمراجعة أسئلة فحص إجازة السوق النظري — قواعد السير، الإشارات، والميكانيك — تماماً متل الفحص
              الحقيقي. بتقدر تدرس كل قسم لحاله وتشوف تصحيح فوري، أو تجرب اختبار كامل بوقت محدد متل يوم الامتحان.
              بعد كل اختبار بتشوف علامتك والأسئلة يلي غلطت فيها لتراجعها.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl font-bold text-white bg-brand"
            >
              فهمت، يلا نبدأ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
