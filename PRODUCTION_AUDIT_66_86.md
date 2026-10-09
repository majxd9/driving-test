# Production Audit — Tasks 66–86

تاريخ التدقيق: 2026-10-08
Repository: `majxd9/driving-test`
Branch: `main`

هذه المرحلة تكمل Tasks 1–65 ولا تعيد فتح أي قرار مجمد. القاعدة الأساسية:
- لا تغيير في Exam UI/logic.
- لا تغيير في Student one-device policy.
- لا تغيير في Audio click-to-play.
- لا تغيير في AI approval gate.
- لا خدمات مدفوعة جديدة.
- لا حذف schema/index/extension بدون evidence آمن.

## ملخص المرحلة

تم إجراء مراجعة أمنية وتشغيلية إضافية للكود المنشور والـworkflows وقاعدة البيانات.
لم يظهر خلال هذه المرحلة خلل code جديد واضح يستحق patch إضافي دون مخاطرة بتغيير behavior؛ لذلك تم التركيز على إغلاق الأدلة الآلية وتثبيت ما بقي كـexternal/manual gate.

الكود التشغيلي الأخير ما زال:
- Render live deployment: `dep-db3igeqjnfac738cu1n0`
- Live application commit: `66f9021c4696156f25517848380f5ab9d5b4cdf2`
- GitHub `main` أحدث بستة commits إضافية، وجميعها documentation-only مقارنة بهذا deployment.

## 66 — Source / Deployment Boundary
الحالة: 🟢
- تم تثبيت الفرق بين code deployed على Render وبين docs-only commits اللاحقة.
- لا يوجد ادعاء بأن docs-only commits دخلت إلى backend production.
- هذا يمنع الالتباس عند مراجعة rollback أو CI.

## 67 — API Authorization Surface
الحالة: 🟢
- Admin AI controller يستخدم `[Authorize(Roles = "Admin")]`.
- لا توجد إضافة لمسارات Admin عامة.
- `AllowAnonymous` الموجود في المسح محدود إلى health/audio-prompt المقصودين.
- لا توجد إعادة إدخال للـpublic uploader القديم.

## 68 — CSRF / CORS Enforcement
الحالة: 🟢 برمجياً / 🟡 live browser
- CORS يستخدم `FrontendOrigin` المحدد فقط مع credentials.
- state-changing requests يتم فحص Origin لها.
- يوجد workflow `security-smoke.yml` لاختبار hostile origin، allowed origin، وCORS header.
- لا يعتبر browser-level CSRF/replay مغلقاً نهائياً بدون حساب فعلي ومتصفح.

## 69 — JWT / Session Lifecycle
الحالة: 🟢 برمجياً / 🟡 live replay
- JWT issuer/signature/lifetime validation مفعلة.
- التوكن داخل HttpOnly + Secure cookie.
- مدة التوكن 12 ساعة.
- حالة الحساب والصلاحية يعاد التحقق منها عبر cache قصير (30 ثانية).
- deactivation/role-change لا يعتمد على token claims وحدها.
- replay/concurrent-session/device browser acceptance ما زال ضمن live gate.

## 70 — Login Abuse Controls
الحالة: 🟢
- Fixed-window login rate limit: 8 محاولات/دقيقة لكل IP.
- ASP.NET Identity lockout: 5 محاولات فاشلة / 15 دقيقة.
- لا توجد إزالة لهذه الضوابط أثناء المرحلة.

## 71 — Error Handling / Information Leakage
الحالة: 🟢 static review
- لا توجد `TODO` أو `FIXME` runtime markers في مراجعة GitHub.
- لا يوجد تسجيل كلمات مرور داخل AuthLogs.
- أخطاء العمليات الحساسة تعاد برسائل domain مناسبة بدلاً من stack trace للعميل.
- الاستثناءات الخلفية في workers يتم تسجيلها عبر ILogger ولا توقف العامل بالكامل.

## 72 — SQL / Query Safety
الحالة: 🟢
- raw SQL queue claims بقيت محمية داخل transaction execution strategy.
- إصلاح تحذير EF السابق مكتمل: raw `LIMIT 1` queries يتم materialize ثم اختيار العنصر في الذاكرة.
- لا يوجد `FromSqlInterpolated` جديد.
- لا توجد تغييرات على Exam UI أو scoring بسبب هذا الإصلاح.

## 73 — AI Queue Concurrency / Recovery
الحالة: 🟢
- queue يستخدم `FOR UPDATE SKIP LOCKED` ومسارات transaction متوافقة مع retry strategy.
- يوجد `LockedUntil` و`NextAttemptAt`.
- stale processing jobs لها recovery/reset logic.
- worker يعيد المحاولة ضمن حد `AI_MAX_ATTEMPTS` ويحوّل الفشل النهائي إلى Failed بدلاً من الدوران اللانهائي.
- DB unique key يمنع duplicate job لنفس Question/JobType/ContentHash.

## 74 — AI Provider / Quota Controls
الحالة: 🟢
- التحكم المركزي `AiGenerationControl` موجود.
- الحالة الحية عند التدقيق: AudioEnabled=true، ImageEnabled=false.
- Image provider الحالي محفوظ، لكن image generation لا يبدأ تلقائياً من Study/Exam.
- fallback provider logic موجودة للمسارات المقصودة.
- لا يوجد تجاوز للquota controls في المراجعة الحالية.

## 75 — AI Approval / Stale Content Gate
الحالة: 🟢
- صور AI لا تصبح منشورة للطالب مباشرة.
- approve/reject موجودان ضمن مسار Admin.
- ContentHash يستخدم لكشف تغير السؤال/staleness.
- إعادة استيراد صورة لا تلغي approval لصورة موافق عليها بشكل غير مقصود.
- imported/generated images تمر عبر review state.

## 76 — ZIP / Media Upload Hardening
الحالة: 🟢
- ZIP endpoint Admin-only.
- امتداد ZIP مفروض.
- حدود حجم request وحجم الصورة والإجمالي غير المضغوط موجودة.
- path traversal وnested path غير المسموح مرفوض.
- الصور المقبولة WebP فقط مع magic-byte validation.
- question IDs محصورة في 1–397.
- duplicate question IDs داخل ZIP مرفوضة.

## 77 — Media Hash / Dedup Integrity
الحالة: 🟢
- ImageHash يستخدم SHA-256.
- duplicate image hash عبر أسئلة مختلفة مرفوض.
- لا يوجد orphan AI image.
- لا توجد duplicate non-empty image hashes في القياس الحي.

## 78 — Database Integrity
الحالة: 🟢
الفحص الحي الحالي:
- Questions = 397
- QuestionAudios with real bytes = 397
- AI images with real bytes = 298
- orphan QuestionAudios = 0
- orphan QuestionAiImages = 0
- orphan AiImageReviews = 0
- duplicate active-exam student groups = 0
- duplicate non-empty image hashes = 0
- active AI test runs = 0

## 79 — AuthLog Retention / Data Minimization
الحالة: 🟢
- retention policy = 90 days.
- worker يعمل عند startup ثم كل 24 ساعة.
- deletion batch-based عبر ExecuteDeleteAsync.
- stale AuthLogs في القياس الحالي = 0.
- AuthLogs الحالية = 385.
- لا يتم تسجيل كلمات المرور.

## 80 — Secrets / Configuration Exposure
الحالة: 🟢
- لا توجد `VITE_SUPABASE_*` أو service-role credentials في client search.
- client يستعمل `VITE_API_URL` فقط.
- backend secrets تعتمد على environment configuration.
- Gitleaks workflow يعمل full-history.
- لا يتم وضع DB credentials أو runtime secrets داخل الوثائق.

## 81 — GitHub Actions Permissions / Workflow Hygiene
الحالة: 🟢
- release-check / secret-scan / health-monitor / Android / backup تستخدم `contents: read` حيث يلزم.
- لا يوجد repository write permission في release-check.
- secret scan يستخدم full history.
- security smoke workflow read-only.
- لا توجد خطوة CI تقوم بـ force-push أو تعديل main تلقائياً.

## 82 — Reproducible Release / Container Hardening
الحالة: 🟢
- release-check يبني client/server.
- runtime dependency audit وNuGet transitive vulnerability scan blocking.
- Docker production image build موجود.
- non-root assertion يتحقق من UID 1654.
- Docker base images مثبتة بإصدارات patch + digests.
- Render production runtime ناجح على deployment الموثق.

## 83 — Source Backup
الحالة: 🟢
- `.github/workflows/project-backup.yml` ينتج source snapshot artifact أسبوعياً ويحتفظ به 30 يوماً.
- الـartifact لا يحتوي runtime secrets.
- هذا يغطي source recovery فقط، وليس database backup.

## 84 — PostgreSQL Backup / Restore
الحالة: 🟡 / BLOCKER
- ما زال لا يوجد restore drill حقيقي موثق.
- لا يجوز تحويل database dump الإنتاجي إلى GitHub repository أو artifact عام.
- المسار الصحيح هو logical/off-site backup آمن ثم restore إلى target منفصل.
- لم يتم تنفيذ restore في هذه المرحلة لأن ذلك يحتاج credential/target منفصلين ويشكل عملية خارجية حقيقية.
- هذا يبقى release gate.

## 85 — Capacity / Storage Headroom
الحالة: 🟡
- Supabase PostgreSQL version: 17.6.1.166.
- DB size الحالي = 194.12 MiB تقريباً.
- Free Plan read-only threshold = 500 MB، وبالتالي يوجد headroom تقريبي 305.9 MiB قبل الحد.
- active connections الحالية = 11 من max_connections = 60.
- Render latency history الموثوقة لا تزال غير كافية لإثبات p50/p95/p99.
- لا يتم إعلان الأداء production-cleared من أرقام CPU/memory وحدها.

## 86 — Extended Production Gate
الحالة: 🔴 CONDITIONAL

تم إغلاق/تثبيت معظم الأدلة الآلية، لكن لا يزال هناك external/manual evidence قبل Production-Cleared الكامل:

1. live Student/Admin/Device E2E.
2. browser CSRF/session replay/concurrent-session checks.
3. real PostgreSQL backup + restore drill.
4. reliable production latency p50/p95/p99.
5. real mobile/browser/accessibility acceptance.
6. controlled rollback drill.

### ما تم إصلاحه خلال مسار 46–65 وما تم تثبيته هنا
- AuthLog retention 90 days.
- AI queue transaction retry compatibility.
- EF raw SQL warning.
- Render HTTPS redirect warning.
- unused backend static-file middleware.
- queue stale/recovery mechanisms verified.
- AI approval/content-hash protections verified.
- media ZIP hardening verified.
- source/CI/container hardening verified.

### ما لم يتم إصلاحه عمداً لأنه يحتاج evidence أو قراراً خارجياً
- backup/restore الحقيقي.
- production rollback drill.
- browser/device/manual E2E.
- reliable latency percentile history.
- حذف unused indexes الخمسة.
- إضافة RLS policies عامة فقط لإزالة INFO lint findings.

### Production decision
المشروع **ليس Production-Cleared بالكامل حتى الآن**. هذا ليس بسبب code blocker جديد، بل بسبب evidence gates حقيقية لا ينبغي تزويرها أو تنفيذها على الإنتاج بلا بيئة/حسابات مناسبة.

## Continuity
عند متابعة التدقيق:
1. اقرأ هذا الملف ثم `PROJECT_MASTER_SPEC.md` و`PRODUCTION_AUDIT_56_65.md`.
2. افحص الفرق بين live deployment commit وmain HEAD.
3. لا تعاود فتح القرارات المجمدة.
4. لا تحذف indexes/extensions أو تضف public RLS policies لمجرد lint cleanup.
5. لا تعتبر Task 86 خضراء قبل إغلاق الاختبارات الخارجية أعلاه.


## Verification Addendum — 2026-10-09

هذا الملحق يحدّث الأدلة الحية فقط؛ لا يغيّر قرار Production Gate ولا يحوّل الاختبارات اليدوية إلى نجاحات مفترضة.

### Automated GitHub checks
تم التحقق على `main` عند commit `7faf3ff0e52adc1d9c7536f7e889789e2271bb95`:
- `release-check` run `37788431001`: success؛ بناء client وserver، question-bank audit، Runtime npm audit، NuGet vulnerability scan، Docker build، وفحص non-root.
- `Secret History Scan` run `37788431063`: success.
- `API Health Monitor` run `37850950257`: success.

هذه النتائج لا تثبت وحدها جلسة طالب/مدير في متصفح حقيقي، أو restore/rollback، أو قبولاً بصرياً على هاتف.

### Read-only production database recheck
التاريخ: 2026-10-09. لم تُنفذ أي كتابة أو تغيير schema أثناء هذا التحقق.
- Questions: 397؛ QuestionAudios: 397؛ ملفات الصوت الفارغة: 0؛ الصوت اليتيم: 0.
- السؤال الفارغ أو ذو CorrectAnswerIndex خارج 0..3: 0؛ الفئات غير المتوقعة: 0.
- QuestionAiImages: 305؛ الصور اليتيمة: 0؛ مراجعات AI اليتيمة: 0؛ مجموعات ImageHash غير الفارغة المكررة: 0.
- توجد 7 سجلات صورة بلا bytes/hash، وجميعها مرتبطة بمراجعات مرفوضة Status=2؛ ليست صوراً منشورة أو معتمدة. مراجعات الصور: 276 Pending و22 Approved و7 Rejected.
- ExamAttempts النشطة: 0؛ AuthLogs الأقدم من 90 يوماً: 0.
- حجم قاعدة البيانات: نحو 194 MB؛ الاتصالات الحالية 11/60، منها اتصال نشط واحد.
- جميع الجداول العامة الـ20 لديها RLS مفعّل؛ لا توجد صلاحيات جدول مباشرة لـ`anon` أو `authenticated` في فحص grants.
- إعداد التحكم بقي كما هو: AudioEnabled=true، ImageEnabled=false، ImageProvider=comfyui. لم يتم تشغيل توليد الصور أو تغيير حصصه.

### Updated Supabase advisor observations
- Security advisor: 20 ملاحظة INFO من نوع RLS-enabled-without-policy. هذا متوافق مع نموذج الوصول backend-only الحالي مع RLS مفعّل وعدم وجود table grants مباشرة للأدوار العامة؛ لم تُضف سياسات عامة لمجرد إسكات INFO.
- Performance advisor الحالي يعرض 4 ملاحظات INFO لفهارس لم تسجل استخداماً في القياس: `IX_ExamAttempts_StudentId_Completed_ExpiresAt` و`IX_AiTestRuns_QuestionId` و`IX_AspNetRoleClaims_RoleId` و`EmailIndex`. الفهرس `IX_QuestionAiImages_ImageHash` سجل استخداماً واحداً وقراءة 299 صفاً في الإحصاء الحالي؛ لم يعد ضمن قائمة advisor الحالية.
- لم يُحذف أي index؛ القياس القصير أو قلة الاستخدام لا يثبتان أن الحذف آمن لمسارات نادرة أو حساسة.

### Dependency audit — outstanding, not marked complete
أثر npm الكامل المرفوع مع `release-check` يسجل 8 تنبيهات في شجرة التطوير: 6 High و2 Moderate. فحص `npm audit --omit=dev --audit-level=moderate` اجتاز، لكن هذا لا يغلق تدقيق dev dependencies. شجرة Tailwind CSS 3 الحالية تُدخل تنبيه `braces` الذي لا يوجد له إصدار patched حسب advisory المتاح؛ اقتراح npm لإزالة السلسلة عبر Tailwind 4 يتطلب ترقية major قد تغيّر معالجة CSS. لم أفرض ترقية كبرى أو أحرر lockfile يدوياً من دون تشغيل build حقيقي؛ استنساخ المستودع في بيئة الفحص تعذر بسبب DNS. لذلك يبقى full dev-dependency audit بنداً مفتوحاً، وليس نجاحاً موثقاً.

### Remaining gates — unchanged
لا تزال المهام التالية غير مكتملة ولا يمكن تعليمها باللون الأخضر دون دليل حقيقي:
1. Student/Admin/device authenticated E2E وتلاعب الطلبات.
2. Browser-level CSRF/session replay/concurrent-session checks.
3. PostgreSQL dump آمن إلى وجهة خارج المستودع العام ثم restore إلى هدف منفصل والتحقق من البيانات.
4. قياسات Render موثوقة لـp50/p95/p99.
5. قبول يدوي على متصفح/هاتف وقارئ شاشة.
6. rollback drill مضبوط.

لم يتم إجراء backup إلى GitHub أو artifact عام، ولم تُنفذ عملية rollback على الإنتاج، ولم يتم إنشاء بيانات دخول أو تجاوز غياب جلسة اختبار فعلية. يبقى Task 86 = CONDITIONAL حتى تُغلق الأدلة أعلاه. لقراءة بيانات Render أو قياس latency، يلزم تأكيد المستخدم لاستخدام مساحة Render المسماة `My Workspace` قبل أي استدعاء لأدوات موارد Render.


## Follow-up verification — Security Smoke and release CI — 2026-10-09

بعد تحديث workflow في commit `e922b72b0cca15aac08794633817491a02c8e02d` لتحديد مهلة اتصال 10 ثوانٍ ومهلة طلب 30 ثانية لكل طلب curl، اكتملت الاختبارات الآلية التالية بنجاح على نفس commit:
- [Security Smoke run 37872654346](https://github.com/majxd9/driving-test/actions/runs/37872654346): نجح فحص `/api/healthz`، رُفض POST ذو Origin غير موثوق برمز 403، مرّ Origin الموثوق عبر فحص CSRF (ولم يرجع 403 مع بيانات دخول اختبارية غير صحيحة)، نجح CORS preflight للمصدر المسموح، ولم يحصل المصدر العدائي على `Access-Control-Allow-Origin`.
- [release-check run 37872654323](https://github.com/majxd9/driving-test/actions/runs/37872654323): نجح عميل الواجهة وخادم .NET، بما في ذلك بناء Vite/TypeScript وفحص السؤال والبناء وNuGet وDocker/non-root.
- [Secret History Scan run 37872654763](https://github.com/majxd9/driving-test/actions/runs/37872654763): success.
- [API Health Monitor run 37872654330](https://github.com/majxd9/driving-test/actions/runs/37872654330): success.

هذه الأدلة تُغلق الفحص البرمجي الآلي الحالي لـCSRF/CORS، لكنها لا تستبدل اختبار المتصفح المصادق أو session replay/concurrent session، ولا تغلق backup/restore أو rollback أو قياسات latency أو قبول الأجهزة. لا تغيّر نتيجة Task 86: تبقى CONDITIONAL.
