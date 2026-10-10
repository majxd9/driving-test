# AI CONTINUITY REFERENCE

> اقرأ `AI_PROJECT_HANDOFF.md` أولاً عند بدء محادثة جديدة أو استلام المشروع.
> يحتوي على آخر حالة عملية، القرارات المحسومة، المهام غير المكتملة، وقواعد الاستمرارية.
> ثم استخدم هذا الملف كمواصفات المشروع الشاملة.

---

# PROJECT_MASTER_SPEC.md

## 1. الحالة
- تاريخ المواصفات الأصلية: 2026-10-06؛ آخر إعادة تحقق موثقة: 2026-10-09
- الفرع الإنتاجي: `main`
- آخر commit قبل وثيقة التدقيق: `1b0e5b9c6b991cafb4687fab73d7f4ffc171ae85`
- الواجهة: Cloudflare Pages
- الـAPI: ASP.NET Core على Render
- قاعدة البيانات: Supabase PostgreSQL
- الهدف المالي الحالي: $0؛ لا توجد موافقة على أي خدمة مدفوعة.

## 2. قرارات المالك المعتمدة
- D1: الديمو عام بدون تسجيل دخول.
- D2 (تحديث سلوك التنفيذ في PR #73 — 2026-10-09): كل دخول جديد إلى صفحة الاختبار أو تحديثها يبدأ محاولة نظيفة بمدة 15 دقيقة وإجابات فارغة، مع إعادة استخدام صف المحاولة النشطة لمنع تراكم المحاولات المتروكة. اختيارات الإجابة تظهر محلياً فوراً وتُرسل عند إنهاء الاختبار، ويبقى التحقق والتصحيح من الخادم. هذا هو السلوك المنشور حالياً؛ لا يُغيّر أثناء تدقيق الإنتاج.
- D3: استرجاع/فك ربط الجهاز يتم من Admin فقط.
- D4: الجهاز الثاني يُرفض ولا ينقل الربط.
- D5: الاختبارات الحالية، بما فيها Models 7–8 واختياراتها، تبقى كما هي تماماً. لا يوجد طلب لتغيير الأسئلة أو الاختيارات أو منطق الاختبار.
- D6 (updated 2026-10-09): رسالة الدخول الأولى تُعرض عند الدخول من زر داخل الموقع. ضغط Play يفعّل الصوت المستمر، ويُشغّل صوت كل سؤال عند الانتقال حتى Stop؛ فشل الصوت لا يجوز أن يمنع التدريب/الاختبار أو اختيار الإجابات.
- D7: إصلاحات أخطاء/أداء/استقرار UI آمنة مسموحة، أما إعادة التصميم أو تغيير التنقل أو بنية الصفحات فتحتاج موافقة.
- إدارة الحسابات: يوجد تبويب **حسابات واحد** يجمع الطلاب والأدمن. الأدمن فقط يضيف ويعدّل حسابات الطلاب والأدمن، بما في ذلك اسم المستخدم، الاسم، كلمة المرور، الصلاحية، الحالة ومدة الوصول. لا يوجد endpoint إداري متاح للطالب.
- Models 7–8: لا يوجد حالياً تغيير مطلوب في الاختيارات أو مستوى الصعوبة؛ يتم الحفاظ على الاختبارات الحالية كما هي.

## 3. المعمارية
### Frontend
- React + TypeScript + Vite + Tailwind.
- React Router.
- صفحات عامة، طالب، وإدارة.
- lazy loading للمسارات الرئيسية.
- الكاش/تهيئة الوسائط موجودة في طبقة العميل.
- الواجهة RTL عربية.

### Backend
- ASP.NET Core Web API.
- ASP.NET Core Identity.
- Cookie authentication مع HttpOnly/Secure.
- Role-based authorization: Admin / Student.
- Entity Framework Core + PostgreSQL.
- خدمات توليد AI تعمل عبر background workers وqueue داخل PostgreSQL.

### Data
- Question bank.
- QuestionAudios.
- QuestionAiImages / AiImageReviews.
- AiGenerationJobs / AiGenerationUsage / AiGenerationControl.
- ExamAttempts / AuthLogs / Identity tables.

## 4. قواعد الاختبار
- 30 سؤالاً لكل اختبار: 12 قواعد + 12 إشارات + 6 ميكانيك.
- مدة الاختبار 15 دقيقة.
- الـserver هو مصدر الحقيقة للأسئلة والوقت والنتيجة.
- السؤال والإجابة المختارة يحفظان تدريجياً.
- بعد انتهاء الوقت لا يُقبل تعديل جديد غير محفوظ قبل deadline.
- لا يتم كشف الإجابة الصحيحة أو الشرح من endpoint الاختبار النشط.
- نتيجة الاختبار تُحسب من CorrectAnswerIndex الموجود على الخادم.
- لا يوجد أكثر من جلسة غير مكتملة للطالب؛ تغيير النموذج أثناء جلسة نشطة مرفوض.
- العودة إلى الاختبار تعيد الجلسة نفسها وتنتقل إلى أول سؤال غير مجاب.

## 5. الحسابات والأجهزة
- Admin غير مربوط بجهاز.
- Student يثبت DeviceId عند أول تسجيل ناجح.
- تسجيل الدخول من DeviceId مختلف مرفوض.
- إعادة ضبط الجهاز من Admin فقط.
- لا يتم تخزين كلمات المرور أو الأسرار في هذه الوثيقة.

## 6. الوسائط
- الصور الأصلية هي المصدر المرجعي.
- أسئلة الإشارات والميكانيك قد تشترك في النص والخيارات بينما تختلف بالصورة؛ لذلك الصورة تدخل في هوية السؤال.
- الصور التي تعتمد عليها صياغة السؤال لا تُخفى قبل الإجابة إلا وفق سياسة المشروع الحالية.
- صور AI لا تعرض للطالب قبل موافقة الإدارة.
- الصوت الأساسي محفوظ داخل QuestionAudios؛ تشغيله لا يتطلب إعادة توليد.
- رسائل الصوت النظامية الثلاث محفوظة عبر SystemAudioPromptService.

## 7. الأمان
- كل مسارات Admin محمية بـ Admin role.
- مسارات جلسة الاختبار تسمح بـ Student وAdmin للاختبار/الدعم؛ الجلسة مرتبطة بهوية الحساب الحالي، والخادم يبقى مصدر الحقيقة للتصحيح.
- state-changing cookie requests تتحقق من Origin/Referer مقابل frontend origin.
- healthz يفحص اتصال PostgreSQL فعلياً بمهلة قصيرة.
- login عليه rate limiting.
- CORS مقيد بالـfrontend origin.
- RLS مفعّل مع وصول التطبيق عبر backend؛ لا توجد سياسات عامة تسمح بالقراءة المباشرة.

## 8. النشر
- Render: Web Service واحد مجاني، Docker، instance واحد.
- Free Render قد يتوقف بعد 15 دقيقة دون inbound traffic؛ startup بعد ذلك قد يتطلب حوالي دقيقة.
- Cloudflare Pages يخدم الواجهة الثابتة.
- Supabase Free هو مصدر PostgreSQL.
- Git push إلى main هو مسار الإصدار الأساسي.

## 9. ممنوعات
- لا تغيير بصري غير معتمد.
- لا إعادة إدخال Admin media upload الذي أزيل.
- لا استبدال الصور الأصلية تلقائياً بصور V1 قديمة.
- لا بدء AI generation من Study/Exam.
- لا عرض AI image غير معتمدة للطلاب.
- لا دفع أو ترقية أو تفعيل خدمة مدفوعة دون موافقة مالك المشروع.

## 10. بنود تحتاج قراراً مستقبلياً
1. إعداد healthCheckPath في Render إلى `/api/healthz`.
2. استراتيجية backup عملية على Free Supabase.
3. فصل الوسائط الكبيرة عن PostgreSQL عند اقتراب حد 500MB.
4. اختبار E2E مصادق عليه بحسابات اختبار مخصصة.



## 13. إدارة الحسابات — القرار والتنفيذ
- تم إضافة قسم **الحسابات** داخل لوحة الإدارة.
- الأدمن يستطيع إنشاء حساب طالب أو حساب Admin جديد.
- الأدمن يستطيع تعديل اسم المستخدم، الاسم الكامل، الصلاحية، الحالة، كلمة المرور ومدة الوصول.
- حسابات الطلاب تبقى مرتبطة بجهاز واحد وفق القاعدة الحالية، مع زر إعادة ضبط الجهاز للأدمن فقط.
- تغيير الصلاحية أو تعطيل حساب لا يسمح بإسقاط آخر Admin نشط.
- الأدمن لا يستطيع تعطيل حسابه أو خفض صلاحيته من الجلسة الحالية.
- كلمات المرور لا تُخزن كنص صريح؛ التحديث يتم عبر ASP.NET Core Identity.
- لم يتم إنشاء جدول حسابات جديد ولم يتغير مخطط قاعدة البيانات.


## 14. Performance — Login
تم إزالة warmup الشبكي المؤجل من صفحة تسجيل الدخول لأن الطلب كان يمكن أن يتزامن مع محاولة الدخول على الأجهزة البطيئة، بينما تسجيل الدخول نفسه هو الطلب المطلوب لتشغيل الـAPI عند الحاجة.


## 15. الحالة التشغيلية — 2026-10-06
- Render healthCheckPath مفعّل على `/api/healthz`.
- آخر backend deployment ناجح بعد إصلاحات startup/EF: `bc7a04925312e500aa6812fbdf0566fae66c7e3b`.
- Cloudflare Pages production deployment على آخر main نجح.
- آخر release-check على snapshot النهائي نجح.
- AI Image generation متوقف حالياً من مركز التحكم؛ توجد 98 مهمة image pending لكنها مؤجلة حتى يُفعّلها Admin.
- `AiTestRuns` queued حالياً = 0.
- QuestionAudios مكتملة = 397/397.
- لا يتم تشغيل AI generation تلقائياً من Study/Exam؛ المسارات تستدعي فقط إرفاق روابط الوسائط.


## 16. E2E — Student/Admin/Device — 2026-10-07
الحالة: **موثقة، غير منفذة حياً ✅/⚠️**
- تم تثبيت مسارات الاختبار المطلوبة: Student login، Admin login، رفض الطالب لمسارات Admin، إنشاء/تعديل الحسابات من Admin، DeviceId ثانٍ، reset-device، بدء الاختبار، الحفظ، refresh/resume، انتهاء الوقت، submit مرة واحدة ومنع الإرسال المتكرر.
- الكود الحالي ومسارات التفويض متوافقة مع هذه القواعد وفق تدقيق API السابق.
- لم يتم تسجيل نجاح E2E شبكي حي بحسابات فعلية داخل بيئة التدقيق؛ لذلك لا نعتبر هذه المهمة مغلقة كاختبار قبول إنتاجي.
- لا حاجة لتغيير الكود فقط لإغلاقها؛ المطلوب هو اختبار حي مصادق عليه.

## 17. Supabase Backup / Restore Drill — 2026-10-07
الحالة: **غير مكتملة — مطلوبة قبل Production-Cleared ⚠️**
- تم التحقق أن `.github/workflows/project-backup.yml` الموجود في المشروع يحفظ **source-code snapshot** فقط، وليس PostgreSQL/Supabase dump.
- لذلك لا يُحتسب هذا workflow كنسخة احتياطية لقاعدة البيانات.
- وفق مسار Supabase الرسمي، النسخة المطلوبة للاختبار يجب أن تشمل roles/schema/data ثم تُستعاد إلى مشروع/قاعدة هدف منفصلة، وبعدها تُراجع الجداول والعلاقات والبيانات الحرجة. citeturn347747search0
- لا يجوز وضع dump قاعدة الإنتاج في مستودع GitHub عام أو artifact عام؛ نحتاج وجهة تخزين خاصة/آمنة.
- المتبقي: إنشاء dump فعلي من Supabase، حفظه خارج المستودع العام، تنفيذ restore على قاعدة اختبار منفصلة، ثم التحقق من Questions/QuestionAudios/ExamAttempts/Identity والعلاقات.
- لا نعتبر 17 مكتملة حتى ينجح restore verification فعلياً.

## 18. Final UI Acceptance — Mobile/Desktop — 2026-10-07
الحالة: **تم إصلاح هندسة Study وقيد التحقق البصري النهائي ⚠️**
- سبب الخلل المثبت: CSS سابق كان يحجز للصورة نحو 112px على الهاتف و120px في القاعدة العامة، بدلاً من جعلها تستهلك المساحة المتبقية.
- تم تطبيق responsive geometry جديدة في commit `f871001e6cd9262afd37f56d9142887bd9245a44`.
- القاعدة الجديدة: الصورة تأخذ المساحة المرنة المتبقية، بينما صندوق السؤال ومنطقة الخيارات وأزرار التنقل لها ارتفاعات ثابتة؛ وهذا ينطبق على Desktop وMobile.
- تم الحفاظ على عدم وجود scroll داخل السؤال/الخيارات وبنية التنقل الحالية، مع إبقاء أهداف اللمس ضمن أحجام مريحة. WCAG 2.2 يضع حداً أدنى 24×24 CSS px للأهداف، بينما Apple توصي عموماً بـ44×44 pt للأزرار. citeturn146840search0turn146840search1
- تعذر تشغيل build محلي من بيئة التدقيق الحالية بسبب فشل DNS للوصول إلى GitHub؛ لذلك لا ندّعي نجاح build محلي من هذه الجلسة.
- يجب اعتبار القبول النهائي بعد نجاح CI/النشر ثم فحص فعلي على الهاتف وDesktop.

## 19. AI Generation Safety / Review Gate — 2026-10-07
الحالة: **مكتملة من ناحية الحماية التشغيلية ✅**
- Image generation متوقف حالياً من مركز التحكم.
- لا يبدأ AI generation تلقائياً من Study/Exam.
- صور AI غير المعتمدة لا تُعرض للطلاب.
- حماية stale AI images مطبقة على مسار الوسائط والـendpoint.
- حالة baseline السابقة: Audio jobs مكتملة، image generation متوقف، والـpending image jobs مؤجلة حتى تشغيل Admin.
- أي تفعيل مستقبلي يجب أن يبقى عبر مركز التحكم والمراجعة الإدارية، ولا يتم تجاوز quota/control أو استبدال الصور الأصلية تلقائياً.

## 20. Final Release Readiness — 2026-10-07
الحالة: **CONDITIONAL / غير Production-Cleared بالكامل ⚠️**
تم إغلاق/إثبات البنود البرمجية الأساسية، بما فيها:
- سلامة الاختبار.
- أمان الـAPI.
- سلامة قاعدة البيانات والوسائط.
- Render health check والاستقرار.
- إدارة الحسابات.
- ضوابط AI.
- الأداء الأساسي لصفحة Login.
- إصلاح هندسة Study responsive في commit `f871001e6cd9262afd37f56d9142887bd9245a44`.

المتبقي لإعلان Production-Cleared:
1. E2E حي Student/Admin/Device.
2. Supabase PostgreSQL dump + restore drill حقيقي وآمن.
3. قبول UI نهائي على الهاتف وDesktop بعد النسخة الأخيرة.
4. التحقق من CI/release للنشر الأخير.

لا يوجد في هذه المهام سبب لتغيير أسئلة الاختبار أو الاختيارات أو منطق Models 7–8، ولا تغيير بنية الموقع أو التنقل.


---

## 21. Production Audit Tasks 21–30 — 2026-10-08

هذه المرحلة تواصلت من baseline المهام 1–20 ولا تعيد فتح القرارات المثبتة.

### 21 — Exam Integrity
**الحالة: 🟡**
- server-authoritative scoring مؤكد.
- session ownership وquestion membership وanswer-index validation موجودة.
- DB active-attempt uniqueness موجودة.
- live authenticated tampering/BOLA/IDOR/E2E ما زال مطلوباً لإغلاق المهمة نهائياً.

### 22 — Result System
**الحالة: 🟢**
تم إصلاح refresh robustness دون تغيير Exam UI/logic:
- GET /api/exam-attempts/{id}/result يعيد النتيجة من الخادم للطالب المالك فقط وبعد اكتمال الجلسة.
- العميل يحتفظ برقم attempt فقط ويستعيد النتيجة بعد refresh.
- CI على commit 9b4b594896113e06e5e99a972638ef457c99c038: Client build نجح وnpm audit --omit=dev --audit-level=moderate نجح.

### 23 — Study
**الحالة: 🟡**
- state/data/audio flow تمت مراجعته.
- click-to-play محفوظ.
- لا redesign.
- visual/device acceptance تبقى معلقة.

### 24 — Models
**الحالة: 🟢**
- Models 1–8 مثبتة.
- 7–8 advanced في العرض.
- لا algorithm منفصل مثبت لفرض difficulty مختلفة.
- لا تغييرات على policy أو المحتوى.

### 25 — Admin
**الحالة: 🟢/🟡**
- Admin authorization/account management/device reset مضبوط.
- منع إسقاط آخر Admin نشط مثبت.
- pagination/performance لقوائم كبيرة متابعة مستقبلية، وليست blocker حالياً.

### 26 — Media Upload
**الحالة: 🟢**
- AI ZIP importer فقط ضمن المسار المقصود.
- extension/path/size/count/WebP signature/hash validations موجودة.
- old public uploader غير موجود.

### 27 — Accessibility
**الحالة: 🟡**
- ARIA الأساسية وroles وreduced-motion موجودة.
- keyboard/focus/screen-reader acceptance الكامل لم يُنفذ حياً.

### 28 — Mobile
**الحالة: 🟡**
- responsive breakpoints وdvh/svh موجودة.
- real device/browser matrix pending.
- Exam UI frozen.

### 29 — Browser Compatibility
**الحالة: 🟡**
- build target = es2020.
- browser floor وmatrix غير مغلقين باختبار فعلي.

### 30 — Dependencies
**الحالة: 🟡**
- runtime npm audit على commit 9b4b594 نجح.
- Dependabot أسبوعي لـ npm/NuGet موجود.
- full dev dependency review وserver transitive vulnerability result ما زالا غير مغلقين لحظة هذا التوثيق.

### Evidence / Security baseline
تدقيق الأمن في هذه المرحلة يعتمد على:
- OWASP Top 10:2025.
- OWASP API Security Top 10 (الإصدار المنشور الحالي المتاح للمشروع: 2023).

### Production gate after 30
المشروع **لم يصبح Production-Cleared بالكامل** من هذه المراجعة وحدها.
المتبقي المؤكد:
1. live authenticated E2E/security tampering tests.
2. final UI/device/browser acceptance.
3. backup/restore drill الحقيقي.
4. إغلاق dependency/server vulnerability verification.
5. final release gate بعد نجاح CI والنشر الأخير.

لا تغيير في:
- Exam UI/logic.
- Study redesign.
- Device Binding policy.
- Models 7–8 policy.
- Question bank/content.
- Audio click-to-play behavior.
- AI approval gate.


## 22. Production Audit Continuation — Tasks 30–45 — 2026-10-08

المرجع التفصيلي: `PRODUCTION_AUDIT_30_45.md`

- 30 Dependencies: 🟢 — release-check run `37697436882` على HEAD `2b1485c45c2854ee99ffd3e9e89b66155f679e71` نجح بالكامل؛ client/server dependency gates وbuilds نجحت.
- 31 Secrets/history: 🟢 — full-history Gitleaks scan passed في run `37698530099`.
- 32 CSRF/session: 🟡 — الحماية البرمجية موجودة؛ browser-level CSRF/replay tests pending.
- 33 Rate limiting: 🟢 — login 8/min/IP + Identity lockout 5/15m.
- 34 Health/observability: 🟢 — healthz + Render Health Check + 15-minute monitor.
- 35 Backup/restore: 🟡 — source snapshot موجود، أما PostgreSQL dump/restore الحقيقي فما زال release gate.
- 36 Capacity/cost: 🟢 — لا ترقية أو تكلفة جديدة؛ سياسة $0 محفوظة.
- 37 DB integrity/schema: 🟢 — live validation: 397 Questions, 397 QuestionAudios, invalid indices/options = 0، orphan checks = 0، RLS = 20/20.
- 38 Media integrity: 🟢 — audio bytes فارغة = 0؛ 7 AI images بلا bytes وكلها Rejected.
- 39 AI safety/quota: 🟢 — ImageEnabled=false، approval gate محفوظ، لا generation من Study/Exam.
- 40 CI/CD hardening: 🟢 — release-check run `37697436882` نجح بعد hardening.
- 41 Release build/artifact integrity: 🟢 — build/vulnerability gates نجحت في run `37697436882`.
- 42 Backend performance: 🟡 — compression/retry/cache موجودة؛ لا p50/p95/p99 موثوقة.
- 43 Android wrapper: 🟢 — release APK build/upload passed في run `37698479329`، وartifact digest موثق في `PRODUCTION_AUDIT_30_45.md`.
- 44 Documentation: 🟢 — `PRODUCTION_AUDIT_30_45.md` أنشئ كمرجع لهذه المرحلة.
- 45 Final release gate: 🔴 CONDITIONAL — live E2E/UI/device/browser، backup/restore، dependency run، ثم release verification ما زالت مطلوبة.

تم التوقف عند المهمة 45 كما طلب المالك.

## 20. Production Audit Continuation — Tasks 46–65 — 2026-10-08

تمت متابعة البنود غير المكتملة دون إعادة فتح القرارات المجمدة.

### تم تنفيذ تغييرات فعلية
- Task 47: `server/Dockerfile` أصبح يستخدم .NET 8 patch images pinned by digest، وتم تشغيل runtime كـnon-root عبر `USER $APP_UID`.
- Task 47: `.github/workflows/release-check.yml` أصبح يبني Docker image ويفحص أن image user هو UID 1654.
- Task 53: تم إنشاء `RELEASE_ROLLBACK_RUNBOOK.md` مع application/Render/DB rollback rules.
- Task 61: تمت مراجعة installed PostgreSQL extensions مباشرة، واتضح أن installed فعلياً خمسة فقط؛ لا توجد قائمة كبيرة من extensions مفعلة كما أوحت القراءة السابقة لقائمة available extensions.

### البنود التي بقيت عمداً غير مكتملة
- Task 50: retention/purge لـAuthLogs يحتاج مدة احتفاظ معتمدة من المالك؛ لم يتم اختراع مدة retention.
- Tasks 51–52: لا يوجد DB backup/restore drill فعلي في هذه الجلسة؛ يلزم DB credentials/connection string وهدف restore منفصل. Supabase يوصي بـ`supabase db dump` للـFree tier، وStorage objects تحتاج معالجة منفصلة.
- Task 59: لا حذف للفهارس الخمسة ذات `idx_scan=0` دون workload evidence أطول.
- Task 63: لا توجد latency history كافية لحساب p50/p95/p99.
- Task 53: rollback drill لم ينفذ على production لأنه ليس اختباراً آمناً بلا incident.
- Task 65: ما زال Conditional حتى إغلاق live E2E، browser/session security، backup/restore، latency، mobile/browser/accessibility، deployment verification والrollback evidence.

### Security / product invariants preserved
- Exam UI/logic لم يتغير.
- Student one-device policy لم تتغير.
- Audio click-to-play فقط.
- AI images لا تنشر قبل approval.
- AI generation لا يبدأ من Study/Exam.
- لا خدمات مدفوعة جديدة.


## 22. Production Audit Revalidation — 2026-10-08

تمت إعادة التحقق من المهام 1–49 قدر الإمكان آلياً قبل الاستمرار إلى 60:
- البنود البرمجية والأمنية وقاعدة البيانات وCI التي يمكن إثباتها من GitHub/Supabase/Render بقيت ضمن حالات الإغلاق السابقة.
- البنود التي تتطلب حساباً مصادقاً أو متصفحاً/جهازاً فعلياً بقيت عمداً ضمن الاختبار اليدوي المجمع: CSRF/session replay، Student/Admin/Device E2E، mobile/browser/accessibility، وبعض اختبارات performance/rollback.
- آخر release-check موثق قبل إضافة retention كان run `37730287662`، وكل من client/server نجحا.

### Task 50 — AuthLog retention
- سياسة الاحتفاظ المعتمدة: 90 يوماً لسجلات `AuthLogs` فقط.
- تمت إضافة `AuthLogRetentionService` كعامل خلفي مستقل، ينفذ تنظيفاً عند startup ثم كل 24 ساعة.
- الحذف يتم على دفعات، ولا يتم تحميل السجلات القديمة إلى الذاكرة.
- إعداد قابل للتجاوز عبر `AuthLogs__RetentionDays` ضمن نطاق 7–3650 يوماً، مع fallback إلى 90 يوماً عند قيمة غير صالحة.
- قياس قاعدة البيانات وقت التنفيذ: 385 سجلاً، و0 سجلات أقدم من 90 يوماً.

### Tasks 51–60
- Backup/restore الحقيقي ما زال يحتاج مسار DB آمن وهدف restore منفصل.
- Rollback drill الحقيقي لم يُنفذ على الإنتاج بدون incident.
- Security Advisor: 20 INFO متوقعة لنموذج backend-only.
- Performance Advisor: 5 unused indexes؛ لا حذف بدون workload evidence أطول.
- Migration inventory متسق، ولا تغيير schema مطلوب من Task 50.



## 23. Runtime hardening follow-up — 2026-10-08

بعد استمرار التدقيق حتى المهمة 60، تم إصلاح مجموعة مشاكل runtime قابلة للإصلاح ظهرت في Render:
- AI queue transactions now run under EF Core retry execution strategy.
- raw SQL queue claims no longer trigger the EF Core `FirstOrDefault` warning.
- backend no longer attempts HTTPS redirection behind Render's TLS-terminating edge.
- unused backend StaticFileMiddleware was removed.
- Data Protection is explicitly ephemeral/application-scoped because authentication is JWT-based and the current Render service has no persistent disk.

هذه التعديلات لا تغير Exam UI/logic أو Device Binding أو محتوى الأسئلة أو سياسة الصوت/AI.
الحالة: الكود على `main`، وآخر deployment جديد قيد المعالجة؛ يحتاج فقط live verification النهائي بعد النشر.


## Correction — 2026-10-08
- Render build exposed that `SetApplicationName` is unavailable in the current Data Protection API surface; it was removed.


## Correction — 2026-10-08
- The attempted Data Protection provider override was removed because the current project dependencies do not expose the required provider API. No package was added merely to silence a startup warning.
- Current JWT authentication remains unchanged and stateless.



## 24. Final Runtime Hardening Verification — 2026-10-08

تم تثبيت آخر حالة تشغيلية مستقرة:
- Render deployment `dep-db3igeqjnfac738cu1n0` = **live**.
- الكود التشغيلي المنشور = commit `66f9021c4696156f25517848380f5ab9d5b4cdf2`.
- إصلاحات runtime الأخيرة: AI transaction retry strategy، إزالة تحذير EF raw query، إزالة StaticFileMiddleware غير المستخدم، وإزالة HTTPS redirection خلف Render edge.
- بعد النشر: لا Exceptions runtime، ولا تحذير EF raw query، ولا WebRoot warning، ولا HTTPS redirect warning. تم أيضاً تأكيد AuthLog retention وstartup maintenance.
- لم تتم إضافة أي حزمة جديدة فقط لإخفاء Data Protection warning؛ المصادقة الحالية JWT stateless، ولم يظهر Data Protection warning في نافذة التحقق الحالية.

المشروع لا يزال Conditional وليس Production-Cleared بسبب بوابات الاختبار الخارجي/اليدوي المذكورة في هذا المستند.


## 25. Production Audit Tasks 66–86 — 2026-10-08
- المرجع التفصيلي: `PRODUCTION_AUDIT_66_86.md`.
- المهام 66–82: الأدلة البرمجية الرئيسية مثبتة، ولم يظهر patch آمن جديد مطلوب.
- Task 83: source backup workflow موجود؛ ليس PostgreSQL backup.
- Task 84: DB backup + restore drill ما زال blocker.
- Task 85: DB size = 194.12 MiB، connections = 11/60، وlatency percentiles غير مثبتة تاريخياً.
- Task 86: Production Gate ما زال CONDITIONAL بسبب live E2E، browser session/CSRF replay، backup/restore، latency، mobile/browser/accessibility، وrollback drill.
- Render live backend: `d3e49484dd79921b8361db1e7ba7459a9a395f77` (deployment `dep-db45l6s9v7es73aaj8fg`, Live).
- Cloudflare production frontend: application commit `d69404244701552237d0308068a23bdc65e95cf8` is included in a successful production deployment; deployment UUID omitted because the secret scanner misclassified this public identifier.
- These deployments include the 2026-10-09 stability and AI image-review error/retry fixes.

- Remediation log for post-audit fixes: `REMEDIATION_LOG_1_85.md` (Tasks 20/23/49/6 plus the 2026-10-09 training/exam/audio/Admin-image-review stabilization).



## 26. Stabilization checkpoint — 2026-10-09
- Exam attempts now accept Student/Admin for test/support usage, restart active practice state on fresh page entry, and keep answer taps local until Finish. Server validation and scoring were preserved.
- Audio activation/continuity/Stop prompts were restored without changing the question bank.
- AI image-review fetch failures no longer remain on a spinner; they show status/error and offer retry.
- Database checks confirmed 397 non-empty plausible MP3 question audios and 298 non-empty WebP AI images (276 pending, 22 approved). Visual semantic review remains a manual Admin task.
- The original Student-side unexpected error is not claimed fully diagnosed: Render's available request logs did not expose the failing HTTP response. Client error detail improvements are live, and authenticated E2E must still be performed before Production-Cleared.
- Diagram placement and broader UI layout changes are intentionally deferred to the final visual pass.


## 27. Production Audit Tasks 87–100 — 2026-10-09

التفاصيل الكاملة: `PRODUCTION_AUDIT_87_100.md`. سجل الإصلاحات المحدث: `REMEDIATION_LOG_1_85.md` (آخر عنوان داخلي: Tasks 1–100).

- النسخة الفعلية الخلفية: Render `d3e49484dd79921b8361db1e7ba7459a9a395f77`؛ آخر main قبل هذا التحديث التوثيقي `58897c67d1c0ab79b4001b39aa905b3dc32f27ef`.
- سلامة قاعدة البيانات: 397 سؤالاً، 397 صوتاً غير فارغ، أخطاء الأسئلة الأساسية = 0؛ AI image review الحالي 275 pending / 23 approved / 7 rejected.
- اكتشاف جديد موثق: صف ExamAttempt نشط واحد وصف منتهي الصلاحية غير مكتمل؛ لم تتم الكتابة إلى أي منهما.
- قاعدة البيانات: 20/20 جدولاً عليه RLS؛ منح مباشر إلى anon/authenticated = 0. يوجد 20 تنبيه Security Advisor من نوع INFO متوقع و4 تنبيهات فهارس غير مستخدمة؛ لا تعديل بدون دليل workload.
- أكتوبر: عداد AiGenerationUsage = 704. القيمة الافتراضية في الكود للحد الشهري 600، لكن متغير البيئة قد يغيرها؛ يلزم التحقق اليدوي من القيمة الفعلية في Render. لا نستنتج فاتورة أو تجاوزاً من العداد وحده.
- ثلاثة أخطاء اتصال PostgreSQL ظهرت في Render؛ Npgsql retry موجود بالفعل؛ السبب الجذري لرسالة خطأ العميل غير مثبت.
- الإصدار البرمجي على commit التطبيق السابق اجتاز release-check. فشل Secret History Scan بسبب UUID علني لتشغيل Cloudflare طابق قاعدة cloudflare-api-key؛ تم حذف UUID من خطوط التوثيق المتأثرة، ويجب اعتماد نتيجة إعادة الفحص بعد هذا التحديث.
- Performance p50/p95/p99 غير قابلة للإثبات لأن سلسلة HTTP latency لا تُرجع بيانات. فحص الاعتماديات التشغيلية ينجح؛ شجرة dev dependency ما زالت بها نتائج مفتوحة.
- Task 100: Production-Cleared لم يُعلن. تبقى بوابة الإصدار مشروطة إلى أن تُغلق المهام اليدوية المحددة في Task 99.

## 29. Authoritative task-by-task revalidation — 2026-10-09

Latest master audit: PRODUCTION_AUDIT_1_100_REVALIDATION.md. It includes one row for every Task 1–100, a live Supabase snapshot, current CI links, and M1–M9 manual release gates.

- Current main before this doc-only checkpoint: f2ec2ce46451829877961fe29ae6ea1e0c0d6d6e; revalidation report commit: 75d6f6087c5a6e1d7b5bb07bbefa235a5ae1af5f.
- Current release-check 37910063018, Secret History Scan 37910062975 and API Health Monitor 37910063012 passed. Cloudflare production deploy for frontend commit f2ec2ce succeeded.
- Latest DB snapshot: 397 valid questions, 397 non-empty audios, 273 pending / 25 approved / 7 rejected AI image reviews, usage counter 709, DB ~206 MB, connections 24/60, 20/20 public tables RLS-enabled, direct grants to anon/authenticated = 0.
- Do not mark the project Production-Cleared until M1–M9 and the final checks in the master report are closed with evidence.

## 30. Car explorer guide assistant — 2026-10-10

- Added a small floating Arabic guide to the standalone 3D car viewer. Implementation is in `client/public/car-explorer/guide-assistant.js` and `guide-assistant.css`; it does not add a second Three.js scene, NPM dependency, or inline script.
- Five topics explain the first visit, rotation, zoom/reset, main parts, and graphics quality. Audio requires an explicit click; no voice autoplays.
- The guide uses the existing read-only `/api/questions/audio-prompt/{key}` endpoint and cached `SystemAudios` for `car-guide-welcome`, `car-guide-rotate`, `car-guide-zoom`, `car-guide-parts`, and `car-guide-quality`. Generation of these optional clips is best-effort so unavailable provider quota does not block the rest of the guide; browser speech synthesis is the fallback.
- Detailed implementation and release checklist: `CAR_EXPLORER_GUIDE_ASSISTANT.md`. `scripts/audit-car-viewer.mjs` now checks the guide files, script syntax, responsive CSS, CSP media origin, and registered audio keys.
- **Release state:** source changes are committed to `main`; do not treat the feature as production-verified until the frontend build, car-viewer audit, backend build/deploy, and manual desktop/mobile audio checks pass.


## 31. Site-wide floating help assistant — 2026-10-10

- A compact Arabic floating guide is mounted in `client/src/App.tsx`, so it is available throughout ordinary public and student pages instead of being limited to Home or the standalone car viewer.
- The assistant is intentionally lightweight and uses no new NPM packages or additional 3D scene. The provided `RobotHero/demo.tsx` excerpt is a full-screen demo wrapper, not a site-wide integration.
- Six selectable topics cover the welcome overview, training, traffic signs, exam models, practical information, and the 3D car viewer. Selecting a topic displays its text and attempts to play its cached voice clip; audio is never played on page load. The browser's Arabic speech synthesis is the fallback.
- The cached audio keys are registered through `SystemAudioCatalog` and `SystemAudioPromptService`. Anonymous playback continues using the existing read-only `GET /api/questions/audio-prompt/{key}` endpoint; missing optional clips are handled without blocking the UI.
- The minimized launcher is fixed above page content on mobile and desktop. The widget is hidden on exam, result, admin, and standalone car-viewer routes to avoid covering important controls and duplicating the car viewer's own guide.
- **Verification state:** source integration and audio-key wiring are committed together; do not call this production-verified until the client/backend builds and the deployed site are checked on desktop and mobile, including playback and the device-voice fallback.


## 32. Draggable student robot and McLaren viewer recovery — 2026-10-10

- The floating helper is now a small metallic 3D-styled robot assembled with lightweight CSS geometry (no extra WebGL context). Dragging works with mouse/touch, arrow keys move it while focused, and its position persists locally across the React app and standalone viewer.
- The SPA robot is restricted to authenticated Students and remains available on student pages including Study, Models, Exam and Result. The standalone viewer applies the same-session Student check. Admin and logged-out users do not see the helper.
- Floating-robot speech currently uses device speech only. Do not connect it to existing question/car audio; wait for the separate voice ID from the owner.
- The car viewer now uses versioned document/module/CSS/model URLs and cache revalidation. McLaren quality failures retry the remaining local qualities, never silently substituting another car.
- CI checks the three real McLaren assets, versioned viewer files, cache headers, student-only helper and separation from the current audio setup.
- Regular laptop and phone acceptance remains open until verified after deployment.


## Floating 3D Site Assistant — 2026-10-10

The floating site assistant uses a real Three.js procedural robot in the React SPA and in the standalone car viewer. Its head/pupils follow mouse pointer movement and touch pointer movement; dragging and saved position are retained. The main SPA helper appears on public/login and student pages, and is hidden on Admin routes. CSS is fallback-only for unsupported/lost WebGL and also follows the pointer. Assistant speech still uses device speech until a dedicated voice ID is supplied; do not alter question/car audio. Current car-viewer cache revision: 20261010-r4. Verify on physical desktop/mobile before marking visual acceptance complete.
