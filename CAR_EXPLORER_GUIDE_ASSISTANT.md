# مساعد استوديو السيارات ثلاثي الأبعاد

## ما الذي أُضيف؟
- مساعد عربي عائم وخفيف في `/car-explorer/index.html`، مناسب للشاشة الكبيرة والهاتف.
- خمسة شروحات: البداية، تدوير السيارة، التقريب وإعادة الضبط، الأجزاء الرئيسية، وجودة العرض.
- يطلب المساعد ملفات MP3 ثابتة مولّدة مسبقاً من نظام الصوت الموجود؛ لا يبدأ توليد الصوت داخل طلب الزائر.
- إذا لم يكن ملف الصوت متاحاً، يحاول استخدام `SpeechSynthesis` في المتصفح، وإلا يبقى النص ظاهراً.
- لا توجد مكتبات NPM إضافية أو مشهد Three.js آخر، ولا تشغيل تلقائي للصوت.

## الملفات ومفاتيح الصوت
- `client/public/car-explorer/guide-assistant.js`
- `client/public/car-explorer/guide-assistant.css`
- `client/public/car-explorer/index.html`
- `client/public/_headers`
- `server/Services/SystemAudioCatalog.cs` و`SystemAudioPromptService.cs`
- `scripts/audit-car-viewer.mjs`

مفاتيح الصوت: `car-guide-welcome`, `car-guide-rotate`, `car-guide-zoom`, `car-guide-parts`, `car-guide-quality`.

يخزن النظام الصوت في `SystemAudios`. طلب `GET /api/questions/audio-prompt/{key}` للعرض فقط ولا يبدأ توليداً جديداً. توليد الرسائل المفقودة يجري من خدمة الصوت أثناء صيانة بدء تشغيل الخادم أو من مسارات الإدارة الموجودة. فشل توليد رسالة اختيارية لا يوقف صيانة رسائل المساعد الأخرى ولا يمنع عرض النصوص.

عنوان الخادم للصوت مأخوذ من `meta[name="api-base-url"]`. لا يوضع مفتاح مزود الصوت في الواجهة.

## تحقق الإصدار
1. افتح صفحة العارض على شاشة كبيرة وهاتف، وافتح المساعد وأغلقه.
2. تأكد من عدم تشغيل الصوت تلقائياً.
3. جرّب المواضيع الخمسة، بما في ذلك إيقاف الصوت.
4. اختبر غياب ملف الصوت للتأكد من استخدام صوت الجهاز أو إبقاء النص فقط.
5. تحقق من أن حالة المجسم والسيارة والقطع لا تتغير بسبب فتح المساعد.
6. نفّذ `npm run build` داخل `client` ثم `node scripts/audit-car-viewer.mjs` من جذر المستودع بعد اكتمال البناء.

## Fix for the panel not opening — 2026-10-10
The panel now uses native HTML `<details>/<summary>` disclosure. This means the help text opens when the summary is clicked even if the assistant JavaScript cannot initialize; JavaScript remains responsible for topic selection, audio playback and closing the panel via the close button/Escape.


## Lucario assistant model integration — 2026-10-10

- The main-site floating helper and the standalone car-explorer helper now have a same-origin loader path for `client/public/car-explorer/Lucario.usdz`.
- The main-site parser is dynamically imported so it does not inflate the first JavaScript bundle; the standalone page builds a local USDZ loader bundle with `client/vite.usdz-loader.config.ts`. No external CDN is introduced.
- The existing procedural 3D robot remains the fallback if the model cannot be fetched or parsed. Direct click-to-speak and long-press dragging stay unchanged; question-training/exam audio is not touched.
- **Release blocker:** the uploaded `Lucario.usdz` binary is not yet present in the GitHub repository. Until it is committed at `client/public/car-explorer/Lucario.usdz`, the assistant will continue displaying its procedural fallback rather than Lucario.
- To finish the change, add the original uploaded binary at that exact path, commit and push it to `main`, then rerun `npm run build` in `client` and `node scripts/audit-car-viewer.mjs` from the repository root. After the asset is present, visually verify model orientation, textures, mobile rendering, long-press dragging and direct speech before declaring the production rollout complete.
