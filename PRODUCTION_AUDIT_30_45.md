# Production Audit — Tasks 30–45

تاريخ التنفيذ: 2026-10-08
Repository: `majxd9/driving-test`
Branch: `main`
Baseline قبل هذه المرحلة: `25ca884d5bbcacf86791d17b3c3dcce5cfaf4ff2`

> هذه المرحلة لا تعيد فتح قرارات 1–29. لا تغيير على Exam UI/logic أو Question Bank أو Device Binding policy أو Models 7–8 أو Audio click-to-play أو AI approval gate.

## 30 — Dependencies / Supply Chain
الحالة: 🟡
- تم فحص release-check الحالي.
- تم تشديد CI في commit `f10b357bab7cb0bd0916573282c7d3438fb99bf0`.
- تم إزالة `contents: write` من release-check.
- تم إلغاء تعديل `package-lock.json` والدفع التلقائي من CI.
- أصبح `npm ci` هو مسار التثبيت.
- أصبح `npm audit --omit=dev --audit-level=moderate` فحصاً حاجزاً لـ runtime.
- أضيف تقرير كامل للتبعيات dev عبر artifact.
- أضيف فحص NuGet transitive مع فشل صريح عند اكتشاف حزم vulnerable.
- الإغلاق النهائي يحتاج نجاح آخر run وقراراً على أي advisories في dev tree.

## 31 — Secrets / Secret History
الحالة: 🟡
- المراجعة الحالية تؤكد اعتماد runtime secrets على environment/GitHub secrets في المسارات المعروفة.
- لا توجد مفاتيح runtime مطلوبة داخل source configuration بحسب المراجعة الحالية.
- لا يمكن إثبات full historical secret scan من واجهة GitHub المتاحة في هذه الجلسة.
- الإغلاق النهائي يحتاج history-capable secret scan أو GitHub secret-scanning evidence.

## 32 — CSRF / Session Security
الحالة: 🟡
- state-changing cookie requests محمية بفحص Origin/Referer مقابل FrontendOrigin.
- JWT داخل HttpOnly + Secure cookie ومدة 12h.
- SameSite=None مستخدمة لأن الواجهة والـAPI على أصلين مختلفين وWebView يعتمد cookie cross-site.
- بقي browser-level CSRF test وsession replay/concurrent-session test ضمن الاختبارات الحية.

## 33 — Rate Limiting / Abuse Controls
الحالة: 🟢 برمجياً
- login fixed-window = 8 محاولات لكل client IP خلال دقيقة.
- ASP.NET Identity lockout = 5 محاولات فاشلة / 15 دقيقة.
- Rate-limit يعيد 429 وRetry-After.
- لا حاجة لإضافة rate limits عامة على كل endpoint دون قياس أو حاجة تشغيلية.

## 34 — Observability / Health
الحالة: 🟢
- `/api/healthz` يفحص اتصال PostgreSQL فعلياً.
- Render Health Check مضبوط على `/api/healthz`.
- GitHub API Health Monitor يعمل كل 15 دقيقة مع 3 محاولات وإمهال مناسب.
- لا يوجد رقم latency مخترع؛ p50/p95/p99 ما زالت تحتاج قياساً حقيقياً من traffic production.

## 35 — Database Backup / Restore
الحالة: 🟡
- workflow الحالي `project-backup.yml` هو source snapshot وليس PostgreSQL backup.
- تم التحقق من مشروع Supabase الحالي: `stwikgqvbadpwbqtfrpf` وحالته ACTIVE_HEALTHY.
- الإجراء الصحيح يتطلب dump roles + schema + data ثم restore إلى قاعدة/مشروع اختبار منفصل.
- لا تم وضع database dump في GitHub repository أو artifact عام.
- لا يمكن إغلاق restore drill دون secret/connection credentials وtarget مستقل مناسب للاختبار.
- Supabase توثق حالياً `supabase db dump` للـroles/schema/data ومسار restore منفصل.

## 36 — Capacity / Cost
الحالة: 🟢
- وثيقة `CAPACITY_AND_COSTS.md` موجودة وتفصل السعة عن حدود المزود.
- قاعدة البيانات الحالية ما زالت ضمن الحد المعروف للمشروع.
- لا توجد ترقية أو خدمة مدفوعة أُجريت.
- سياسة التكلفة الحالية = $0 محفوظة.
- الحاجة المستقبلية للـobject storage/CDN والتوسع مرتبطة بحدود الحجم/egress الفعلية وليس بعدد الحسابات وحده.

## 37 — Database Integrity / Schema
الحالة: 🟢
تم التحقق مباشرة من Supabase:
- Questions = 397.
- QuestionAudios = 397.
- CorrectAnswerIndex غير صالح = 0.
- عدد الخيارات غير الصحيح = 0.
- Orphan QuestionAudios = 0.
- Orphan QuestionAiImages = 0.
- Orphan AiImageReviews = 0.
- Orphan AiGenerationJobs = 0.
- RLS مفعّل على 20 جدولاً في public.
- يوجد migration مسجل حالياً: `20261005155602_repair_audio_current_hashes`.
- لا توجد حاجة لتغيير schema في هذه المرحلة.

## 38 — Media Integrity
الحالة: 🟢
- empty QuestionAudios = 0.
- توجد 7 صور AI بدون bytes، وجميعها مرتبطة بحالة Rejected، لذلك ليست صوراً منشورة ناقصة.
- QuestionAiImages الحالية = 305.
- AiImageReviews: Pending 276 / Approved 22 / Rejected 7.
- الصور غير المعتمدة لا تُعرض للطلاب وفق gate الحالي.

## 39 — AI Generation Safety / Quota
الحالة: 🟢
تم التحقق من الحالة المباشرة:
- AudioEnabled = true.
- ImageEnabled = false.
- ImageProvider = comfyui.
- Image generation متوقف حالياً.
- لا توجد إعادة تفعيل تلقائية من Study/Exam.
- approval gate محفوظ.
- usage المسجل للشهر الحالي = 703 توليدات في سجل الاستخدام التاريخي؛ لا يتم تحويل هذا الرقم إلى quota جديد دون قرار مالك المشروع.

## 40 — CI/CD Security Hardening
الحالة: 🟡 → جاهز تقنياً، بانتظار run للتحقق
- release-check لا يملك write permission.
- CI لم يعد يدفع تعديلات تلقائية إلى main.
- install أصبح reproducible عبر `npm ci`.
- Question-bank audit مضاف ضمن release-check.
- dependency reports تحفظ كـartifacts قصيرة العمر.
- آخر commit لهذا التحسين: `f10b357bab7cb0bd0916573282c7d3438fb99bf0`.
- الإغلاق يتطلب نجاح workflow بعد هذا التغيير.

## 41 — Release Build / Artifact Integrity
الحالة: 🟡
- Frontend build command موجود داخل release-check.
- Server Release build موجود داخل release-check.
- NuGet vulnerability gate مضاف.
- نجاح آخر run بعد التعديل لم يُثبت بعد داخل هذه الجلسة.
- لا يتم إعلان release green اعتماداً على وجود workflow file فقط.

## 42 — Runtime / Backend Performance
الحالة: 🟡
- Response compression موجود.
- EF/Npgsql transient retry موجود.
- MemoryCache مستخدم لحالة الجلسة.
- لا توجد قياسات HTTP p50/p95/p99 حديثة موثوقة.
- لا يتم إجراء refactor performance أو تغيير query/indexes استناداً إلى التخمين.
- Supabase performance advisor أظهر 5 unused-index notices فقط؛ لا يتم حذف أي index دون workload evidence.

## 43 — Android Wrapper / Release Safety
الحالة: 🟡
- `android:allowBackup="false"` موجود.
- WebView يحتاج third-party cookies عمداً لأن auth cookie تأتي من API على origin مختلف.
- SSL error handler لا يسمح بالمتابعة عند certificate error.
- APK workflow موجود.
- build/release acceptance الحي للـAPK لم يُثبت في هذه الجلسة.

## 44 — Documentation / Continuity
الحالة: 🟢
- تم إنشاء هذا الملف كمرجع Tasks 30–45.
- سيتم ربطه من `PROJECT_MASTER_SPEC.md` و`AI_PROJECT_HANDOFF.md`.
- current HEAD يجب أن يبقى المرجع في أي جلسة لاحقة.
- المهام المعلقة التي تحتاج اختباراً يدوياً لا تُحوّل إلى 🟢 تلقائياً.

## 45 — Final Production Gate
الحالة: 🔴 CONDITIONAL
لا يمكن إعلان Production-Cleared حتى تغلق البنود التالية:
1. live Student/Admin/Device E2E وtampering/BOLA/IDOR.
2. Study/UI/mobile/desktop/manual acceptance.
3. Accessibility keyboard/focus/screen-reader acceptance.
4. Browser/device matrix.
5. Full dependency run بعد commit `f10b357...`.
6. Backup + real restore drill.
7. Final release workflow + deployment verification.

### Current evidence snapshot
- Latest documented main before this stage: `25ca884d5bbcacf86791d17b3c3dcce5cfaf4ff2`.
- CI hardening commit: `f10b357bab7cb0bd0916573282c7d3438fb99bf0`.
- Supabase project: `stwikgqvbadpwbqtfrpf`, ACTIVE_HEALTHY.
- Questions = 397.
- QuestionAudios = 397.
- Invalid answers/options = 0.
- Orphans in checked media/job relations = 0.
- RLS = enabled on all 20 public tables.
- Image generation = disabled.
- No paid service was enabled.

## توقف هذه المرحلة
تم الوصول إلى المهمة 45. لا توجد تغييرات إضافية ضمن هذا التسلسل قبل تنفيذ release gates المعلقة أعلاه.
