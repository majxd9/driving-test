# عارض السيارات ثلاثي الأبعاد

## السيارات المتاحة

- **McLaren Senna GTR** — السيارة الافتراضية. يحتاج العارض ملفات الجودة المضغوطة في المسارات التالية:
  - `client/public/car-explorer/mclaren-senna-gtr-low.glb.gz`
  - `client/public/car-explorer/mclaren-senna-gtr-medium.glb.gz`
  - `client/public/car-explorer/mclaren-senna-gtr-high.glb.gz`
- **Ford Mustang GT (2005)** — ملف GLB من مصدر عام مرخّص CC BY 4.0؛ راجع `MUSTANG-LICENSE.md`. يحمّله العارض من مصدره المثبّت على commit محدد.
- **Dodge Challenger 1970 R/T** — نموذج احتياطي محلي موجود مسبقاً في المستودع.

## ضغط ملفات McLaren

ملفات `.glb.gz` هي ملفات GLB مضغوطة بـ gzip. يجب إبقاء قواعد `Content-Encoding: gzip` في:
- `client/public/_headers`
- `client/_headers`

لا تعِد ضغط ملف `.glb.gz`، ولا تفك ضغطه قبل النشر؛ المتصفح يفك ضغط HTTP تلقائياً ثم يمرر بيانات GLB إلى GLTFLoader.

## الفحوص

- شغّل `node scripts/audit-car-viewer.mjs` من جذر المستودع.
- شغّل بناء الواجهة من مجلد `client` عبر `npm run build`.
- افحص الصفحة المنشورة على الحاسوب والهاتف، وجرّب تبديل السيارة ومستوى الجودة وتحريك قطعة محددة وتكبير المقصورة.

تنبيه حالة الملفات: الشيفرة تشير إلى ملفات McLaren المضغوطة بالأسماء أعلاه، لكن هذه الملفات الثنائية لم تُضمّن في هذا التعديل؛ يلزم إضافتها إلى الفرع قبل أن يظهر نموذج McLaren فعلياً. عند غيابها يفتح العارض نموذج Challenger الاحتياطي بدلاً من التعطل.
