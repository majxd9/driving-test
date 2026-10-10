# AI PROJECT HANDOFF — رخصتي (Driving Test)

> هذا الملف هو مرجع الاستمرارية العملي لأي محادثة أو AI agent يعمل على المشروع.
> اقرأه قبل أي تغيير، ثم ارجع إلى `PROJECT_MASTER_SPEC.md` للتفاصيل الأوسع.
>
> آخر تحديث موثق: 2026-10-09
> **المصدر الحالي لتدقيق الإنتاج:** [PRODUCTION_AUDIT_1_100_REVALIDATION.md](PRODUCTION_AUDIT_1_100_REVALIDATION.md).
> هذا التقرير يحتوي الحالة الأحدث لكل مهمة 1–100 وقائمة الإغلاق اليدوية. الأعداد والنتائج الأقدم أدناه تاريخية، ولا يجوز استخدامها لإعلان Production-Cleared.

---

## 1. المشروع

- Repository: `majxd9/driving-test`
- Name: Driving Test — رخصتي
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: ASP.NET Core Web API
- Database: PostgreSQL / Supabase
- Frontend hosting: Cloudflare Pages
- Backend hosting: Render
- AI/media integrations موجودة في المشروع
- الهدف: Production حقيقي للعملاء، بتكلفة حالية $0 قدر الإمكان.

---

## 2. قواعد عمل ثابتة

### لا تغيّر هذه الأشياء بدون موافقة صريحة

- Business rules الخاصة بالمنتج.
- Exam logic.
- Question Bank.
- Models 7–8 logic/policy.
- Student Device Recovery policy.
- Authentication behavior إذا كان التغيير مرئياً/وظيفياً.
- Question content.
- الصور التعليمية المعتمدة.
- Audio behavior.
- Feature additions.
- Major architecture changes.
- UI redesign كبير.

### Exam/UI Freeze

- صفحة Exam مجمّدة أثناء تدقيق Production.
- لا تعدّل CSS أو layout أو behavior للـExam أثناء هذا التدقيق.
- أي UI redesign يُرحّل لمرحلة UI/UX مستقلة وبعد موافقة المالك.

### Study

- Study يمكن تدقيقه تقنياً، لكن أي تغيير بصري جوهري يحتاج موافقة.
- حدثت مشاكل سابقة بسبب CSS overrides أثرت على Exam؛ لذلك يجب عزل أي تعديل Study عن Exam.

### Device Binding — قرار المالك

تمت الموافقة على الإبقاء على السياسة الحالية:

- Admin: device-independent.
- Student: مربوط بجهاز واحد.
- إعادة الربط/الاسترداد عند فقدان الجهاز تُدار من Admin.
- لا نعيد تصميم Device Binding حالياً.

---

## 3. Production URLs المعروفة

- Frontend: https://driving-test-7en.pages.dev/
- Backend: https://driving-test-evd0.onrender.com/

يجب التحقق من الحالة الحية وقت الحاجة وعدم الاعتماد على نتائج قديمة.

---

## 4. الحالة الفعلية التي تم التحقق منها

### Database Production

آخر فحوصات مباشرة أثبتت:

- Questions: 397
- QuestionAudios: 397
- ExamAttempts: 25
- ExamResults: 9
- AiGenerationJobs: 825
- AiTestRuns: 5

سلامة البيانات:

- duplicate Question IDs: 0
- orphan QuestionAudios: 0
- orphan ExamAttempts: 0
- orphan ExamResults: 0
- orphan QuestionAiImages: 0
- invalid answer indexes: 0
- empty question text: 0
- invalid category: 0
- empty/insufficient options: 0
- duplicate question-content groups بالمقارنة الحالية: 0

### Question Bank

التصنيف الحالي المعروف:

- Ser
- Ishara
- Mechanic

البنك الفعلي في Production = 397 وليس مجرد رقم من README.

### Audio

- 397/397 QuestionAudios موجودة في آخر تحقق.
- القاعدة: click-to-play، وليس autoplay.
- لا نضيف audio infrastructure جديد بدون ضرورة/موافقة.

### AI Generation

- التوليد لا يبدأ تلقائياً من Study/Exam.
- الصور غير المعتمدة لا تظهر للطلاب.
- حماية ContentHash للصور القديمة موجودة.
- Image generation متوقف عند الحاجة من Admin.
- ZIP import داخل AI Generation موجود عمداً، وليس Upload Images القديم.

---

## 5. Build / CI

آخر Release Check تم التحقق منه على commit المشار إليه أثناء التدقيق:

`91763f51ca95fa386d33733474a3169c384af4cb`

ونجح فيه:

- TypeScript build
- Vite production build
- .NET Release build
- NuGet vulnerability check
- `npm audit --omit=dev` = 0 runtime vulnerabilities

لكن npm dependency tree الكاملة أظهرت:

- 2 moderate
- 6 high

لذلك dependency audit لم يُغلق نهائياً.

مهم:
- لا تدمج فرع `fix/npm-braces-audit` بشكل أعمى؛ تمت مراجعته وكان متأخراً عن `main`.

---

## 6. Security — الوضع الحالي

الموجود والمتحقق منه:

- JWT validation server-side.
- JWT داخل HttpOnly + Secure cookie.
- token lifetime = 12h.
- issuer/signature/lifetime validation.
- account active/access-duration checks.
- login IP rate limit: 8 attempts/minute.
- Identity lockout: 5 failed attempts / 15 minutes.
- Admin endpoints server-side protected.
- Exam score calculated server-side.
- exam submission validates question membership/answer index/ownership.
- active-exam duplication guarded at DB/business-logic level.
- AI admin operations protected.

### Security غير مغلق نهائياً

- live direct-API tampering tests.
- full BOLA/IDOR verification من عميل فعلي.
- CSRF browser test الكامل.
- session replay/concurrent-session test الكامل.
- full secret-history scan.
- Device Binding security hardening.

### Device Binding

الحالية تعتمد على DeviceId من client، لذلك ليست hardware binding حقيقية.
لا تغيّرها حالياً لأن المالك اختار الإبقاء على السياسة.

---

## 7. Performance — الوضع الحالي

تم التحقق من:

- frontend production build.
- route/chunk separation.
- image preload/current-next strategy موجودة.
- request dedup/cache mechanisms موجودة.
- no reason حالياً لإعادة بناء الواجهة لأسباب performance فقط.

ملاحظة:
- CSS payload كبير نسبياً قبل الضغط (~377.61KB خام / ~58.47KB gzip في القياس السابق).
- Render memory observed في إحدى النوافذ حوالي 160MB.
- لا توجد بيانات HTTP كافية لحساب p50/p95/p99 بشكل موثوق.
- لا تخترع latency numbers.

Render:
- لا تعتمد على Workspace/metrics قديمة؛ استخدم Render tool والـofficial data وقت القياس.

---

## 8. UI/UX Rules

المالك يريد:

- Arabic-first.
- Mobile-first.
- Human-designed feel.
- وضوح وثبات.
- لا AI-looking redesign.
- لا cards/gradients/glass effects بلا سبب.
- السؤال والخيارات بصناديق مستقرة.
- لا layout jumping بسبب طول السؤال.
- لا scroll غير ضروري.
- لا hiding لأي عنصر مهم.

لكن:

> لا تُطبّق UI change مرئي جوهري بدون موافقة المالك.

### Study/Exam

- Exam = FROZEN during Production audit.
- Study = يُدرس ويمكن اقتراح تحسينات، لكن لا redesign كبير بدون approval.
- حدثت سابقاً مشاكل بسبب overrides بين الصفحات، لذلك أي CSS جديد يجب أن يكون scoped بوضوح.

---

## 9. Models

- Models 1–6 موجودة.
- Models 7–8 مخصصة/موسومة Advanced/Harder.
- آخر تدقيق لم يثبت وجود algorithm مختلف فعلياً يفرض صعوبة مختلفة.
- لا تخترع policy جديدة للـ7/8 بدون قرار المالك.

---

## 10. Demo

القاعدة الحالية التي يجب التحقق منها:
- Demo = 5 questions.
- يجب ألا يستخدمه النظام لتسريب بيانات خاصة.
- لا تنشئ ExamAttempt غير ضروري.
- لا تفتح demo صلاحيات Student/Admin.

---

## 11. Media policy

### Images

- المكتبة الحالية المعتمدة هي المرجع.
- لا صور عشوائية من الإنترنت.
- لا استبدال صورة تعليمية صحيحة بصورة AI لمجرد الجمال.
- إذا الصورة غير مؤكدة الصلة، اسأل المالك.
- الصورة القديمة غير المعتمدة لا تستخدم تلقائياً.
- image question policy:
  - ضرورية لفهم السؤال → اعرضها.
  - تساعد على الفهم → اعرضها.
  - decoration فقط → لا تعرضها.
  - قد تضلل → لا تستخدمها.
  - غير مؤكدة → اسأل.
  - غير موجودة بالمصدر المعتمد → لا تخترع بديلاً من نفسك.

### Audio — آخر تحديث معتمد 2026-10-09

- عند دخول Study/Exam من زر داخل الموقع، تظهر/تُشغّل رسالة الدخول الأولى.
- ضغط Play هو تفعيل الصوت؛ بعد رسالة «الصوت سيبقى شغال حتى تضغط إيقاف» يستمر صوت السؤال تلقائياً عند الانتقال بين الأسئلة إلى أن يضغط المستخدم Stop.
- Stop يوقف صوت الأسئلة ويشغّل رسالة «الصوت متوقف».
- فشل التشغيل أو حظر autoplay من المتصفح لا يجوز أن يعطل تحميل التدريب/الاختبار أو اختيار الإجابات؛ يجب إبقاء بديل Play ورسالة خطأ مفهومة.
- لا توليد صوت جديد من Study/Exam ولا تغيير provider/الحصص دون موافقة.

---

## 12. Media findings الأخيرة

- حوالي 164 ملف WebP في repo عند آخر tree audit.
- أكبر WebP كان حوالي 53KB في القياس السابق.
- يوجد duplicate binary معروف: `sign_203.svg` و `sign_204.svg`.
- لم يتم حذف duplicate تلقائياً.
- Image optimization إلى AVIF لم يُحسم؛ يجب إجراء visual comparison قبل أي conversion جماعي.

---

## 13. مهام Production Audit 1–30

### 1 Discovery
الحالة: 🟡 جزئية
- repo tree, architecture, files, controllers, services, pages, CSS, Git, workflows تم فحصها.
- full historical secret scan ما زال يحتاج دليل أقوى.

### 2 Architecture
الحالة: 🟡 جزئية
- architecture مفهومة.
- لا high-risk refactor بدون approval.
- توجد ملفات CSS كثيرة ومتداخلة.
- schema/runtime maintenance يحتاج توثيق/مراجعة.

### 3 Security
الحالة: 🟡 غير مكتملة
- الأساسيات قوية.
- live tampering/CSRF/BOLA/device tests ما زالت مطلوبة.

### 4 Database
الحالة: 🟢 بدرجة جيدة
- DB connectivity وintegrity checks سليمة.
- RLS advisor warnings موجودة لكن لا توجد direct anon/authenticated table grants.
- لا تغيّر policies عشوائياً.

### 5 Question Bank
الحالة: 🟢
- 397 سؤالاً.
- integrity checks نظيفة.

### 6 API Security
الحالة: 🟡
- authorization الأساسية سليمة.
- direct API abuse tests ما زالت مطلوبة.

### 7 Exam Integrity
الحالة: 🟡 قوية لكن تحتاج live tampering/E2E.
- backend authoritative.

### 8 Question/Data Integrity
الحالة: 🟢
- النتائج المذكورة أعلاه.

### 9 Image Audit
الحالة: 🟡
- references والملفات جرى جردها.
- duplicate معروف.
- visual semantic audit لم يُغلق.

### 10 Image Optimization
الحالة: 🟡
- لا conversion جماعي بدون visual evidence.

### 11 Image Loading
الحالة: 🟢 برمجياً / browser profiling pending.

### 12 Image UX
الحالة: 🟡
- geometry مستهدفة للاستقرار.
- visual acceptance pending.

### 13 Audio
الحالة: 🟢 جيد برمجياً / browser verification pending.

### 14 Frontend Performance
الحالة: 🟡
- build/chunking جيد.
- CSS size يحتاج optimization لاحقاً إن ثبتت فائدته.

### 15 Backend Performance
الحالة: 🟡
- Render memory observed.
- p50/p95/p99 غير مثبتين.

### 16 Exam Performance
الحالة: 🟡
- architecture/cache/preload جيدة.
- real network/DB profile pending.

### 17 UI/UX Audit
الحالة: 🟡
- الدراسة جارية.
- لا redesign بدون approval.

### 18 Fixed Question/Answer Panel
الحالة: 🟡
- rules موجودة.
- full visual acceptance pending.

### 19 Login/Demo
الحالة: 🟢 برمجياً / E2E pending.

### 20 Site Guide
الحالة: 🟡
- dialog موجود.
- focus trap/restoration يحتاج مراجعة.

### 21 Exam Integrity
الحالة: 🟡
- server authority جيدة.
- attack simulation pending.

### 22 Result System
الحالة: 🟡
- backend result logic جيدة.
- Result refresh robustness تحتاج مراجعة.

### 23 Study
الحالة: 🟡
- state logic جيدة.
- UI audit/approval pending.

### 24 Models
الحالة: 🟡
- 1–8 موجودة.
- policy 7/8 غير معتمدة كمنطق مختلف.

### 25 Admin
الحالة: 🟡/🟢
- authorization جيدة.
- large-list pagination/performance تحتاج متابعة عند النمو.

### 26 Media Upload
الحالة: 🟢
- old public uploader غير موجود.
- AI ZIP import موجود ومقصود.
- لا تحذفه باعتباره old upload.

### 27 Accessibility
الحالة: 🟡
- ARIA وبعض reduced-motion موجود.
- full keyboard/focus/screen-reader audit pending.

### 28 Mobile
الحالة: 🟡
- responsive code موجود.
- device/browser matrix pending.

### 29 Browser Compatibility
الحالة: 🟡
- modern APIs مستخدمة.
- browser floor يحتاج توثيق واختبار matrix.

### 30 Dependencies
الحالة: 🟡/🔴
- runtime audit = 0 vulnerabilities.
- dev tree = 2 moderate + 6 high في آخر audit.
- لا major upgrade عشوائي.

---

## 14. المهام غير المكتملة التي يجب الاحتفاظ بها

هذه يجب عدم نسيانها أو اعتبارها منجزة:

1. Full historical secret scan.
2. Direct API tampering / BOLA / IDOR E2E.
3. Full device-binding attack test.
4. Browser CSRF test الكامل.
5. Device recovery policy implementation — فقط إذا وافق المالك لاحقاً، وحالياً القرار هو عدم تغييرها.
6. Real p50/p95/p99 measurements.
7. Full exam performance profile.
8. UI/UX acceptance mobile + desktop.
9. Result refresh robustness.
10. Accessibility full audit.
11. Real device/browser matrix.
12. Database backup + actual restore drill.
13. Dev dependency vulnerabilities / supply-chain review.
14. Free-tier capacity model and official limits.
15. Final release gate.

---

## 15. أولويات العودة القادمة

بعد هذا الملف، لا تبدأ من الصفر.

التسلسل الحالي:

1. Security live verification.
2. Exam integrity / direct API tests.
3. Performance / exam flow measurement.
4. Dependency audit.
5. Backup/restore.
6. Accessibility/mobile/browser audit.
7. UI/UX study and owner approval.
8. Final regression.
9. Final documentation.
10. Release decision.

---

## 16. ممنوع إعادة النقاش

لا تعيد السؤال عن هذه القرارات إلا إذا طلب المالك تغييرها:

- Exam UI frozen أثناء audit.
- Study لا يُعاد تصميمه تلقائياً.
- Admin device-independent.
- Student one-device policy.
- Admin handles student device reset/recovery حالياً.
- No old V1 image automatic fallback.
- No public image uploader reintroduction.
- AI generation لا يبدأ من Study/Exam.
- AI images لا تظهر قبل approval.
- Audio click-to-play.
- No feature bloat.
- No paid actions.
- Current target cost = $0.

---

## 17. قاعدة الاستمرارية عبر محادثات مختلفة

عند بدء محادثة جديدة:

1. اقرأ هذا الملف أولاً.
2. اقرأ `PROJECT_MASTER_SPEC.md`.
3. افحص HEAD الحالي من `main`.
4. لا تعتمد على commit قديم.
5. قارن أي تغييرات جديدة مع هذا الملف.
6. حدّث هذا الملف بعد كل milestone مهم.
7. لا تعتبر ملاحظة قديمة مكتملة بدون إعادة التحقق عند الحاجة.

هذا الملف مخصص ليكون مرجع handoff عملي بين المحادثات المختلفة والحسابات المختلفة، بشرط أن يكون المستودع متاحاً للمحادثة الجديدة.


---

## 18. Production Audit Continuation — Tasks 21–30 — 2026-10-08

> قاعدة هذه المرحلة: المهام 1–20 مثبتة كـ baseline ولا يعاد فتحها. لا تغيير في قرارات مجمدة، ولا تعديل على Exam UI/logic.

### 21 Exam Integrity
الحالة: 🟡 مثبتة برمجياً / live attack verification pending

تم التحقق على main من:
- Student authorization على ExamAttemptsController.
- ملكية الجلسة مرتبطة بـ StudentId.
- الإجابة لا تُحفظ إذا كان السؤال خارج QuestionIds للجلسة.
- SelectedAnswerIndex يتحقق ضمن عدد الخيارات.
- submit يعيد التحقق من membership ومن صلاحية index.
- التصحيح يتم من CorrectAnswerIndex الخادمي، وليس من العميل.
- يوجد قيد DB لمنع أكثر من active attempt للطالب مع معالجة race عند الإنشاء.
- submit المتكرر يرفض الجلسة بعد Completed.

المتبقي لإغلاق المهمة:
- اختبار حي مصادق عليه لـ tampering/BOLA/IDOR وconcurrent submit/device scenarios.

مرجع أمني خارجي:
- OWASP Top 10:2025: Broken Access Control, Authentication Failures, Software/Data Integrity.
- OWASP API Security Top 10:2023: API1 BOLA, API2 Broken Authentication, API5 Broken Function Level Authorization.

### 22 Result System
الحالة: 🟢 برمجياً بعد الإصلاح

تمت إضافة result recovery خادمي:
- endpoint: GET /api/exam-attempts/{id}/result
- الوصول مقيد بملكية الطالب للجلسة وبحالة Completed.
- النتيجة يعاد بناؤها من بيانات الخادم والأسئلة المرتبطة بالجلسة.
- العميل يحفظ رقم attempt فقط في sessionStorage ويستعيد النتيجة من الخادم بعد refresh.
- لا يتم تخزين النتيجة النهائية كاملة في المتصفح كمرجع للحقيقة.

Code milestone:
- 17714970a4c72cb52f08be187afa8fb286aacc36
- 9fae495cd46bef0267150040a1f1e6f24bf56af3
- a5b72faffc3725bc4caf0b1af5f538b80caa010b
- 9b4b594896113e06e5e99a972638ef457c99c038

CI evidence on 9b4b594:
- Client build: success.
- npm audit --omit=dev --audit-level=moderate: success.
- Server build and Cloudflare deployment were still in progress at the moment of this documentation update.

### 23 Study
الحالة: 🟡

تمت مراجعة state/data/audio flow على Study.tsx.
- تحميل الأسئلة من API حسب category.
- إدارة answer state واضحة.
- الصوت click-to-play مع preloading فقط.
- الصور التالية يتم preloaded دون autoplay للصوت.
- لا تغييرات بصرية أو redesign في هذه المرحلة.
- القبول البصري النهائي يبقى ضمن UI/device verification، وليس ضمن هذا التعديل.

### 24 Models
الحالة: 🟢 من ناحية policy/source verification

- Models 1–8 موجودة.
- Models 7–8 موسومة Advanced/Harder في الواجهة.
- picker يستخدم modelId كـ seed مختلف، لكن لا يوجد algorithm منفصل مثبت لفرض صعوبة مختلفة.
- لا تم تغيير policy أو محتوى Models 7–8.

### 25 Admin
الحالة: 🟢 authorization/account-management / 🟡 scalability follow-up

تم التحقق من:
- AdminController محمي بـ Authorize(Roles = "Admin").
- إنشاء وتعديل الحسابات وإعادة ضبط الجهاز ضمن مسارات Admin.
- منع آخر Admin نشط من السقوط.
- عدم تعطيل/خفض صلاحية الأدمن الحالي من جلسته.

المتابعة:
- pagination/list performance عند نمو عدد الحسابات والطلاب؛ لا حاجة حالية لتغيير schema أو behavior.

### 26 Media Upload
الحالة: 🟢

مسار AI ZIP الحالي ليس old public uploader.
تم التحقق من:
- امتداد ZIP.
- حدود الحجم.
- منع المسارات غير المسموحة داخل ZIP.
- قبول WebP فقط.
- أرقام الأسئلة محصورة في 1–397.
- منع التكرار.
- حد لكل صورة وحد إجمالي الحجم غير المضغوط.
- التحقق من WebP magic bytes.
- ContentHash لمنع إعادة استخدام صورة لسؤال آخر.
- لا تم إرجاع uploader العام القديم.

### 27 Accessibility
الحالة: 🟡

تم التحقق من وجود:
- aria-label وrole=group/dialog في أجزاء رئيسية.
- aria-hidden للعناصر الزخرفية.
- reduced-motion CSS.

المتبقي:
- full keyboard traversal.
- focus trap/restoration في جميع dialogs.
- screen-reader pass حقيقي.
- لا نعتبرها مكتملة من static inspection فقط.

### 28 Mobile
الحالة: 🟡

- responsive breakpoints موجودة، منها 900px و600px و430px.
- استخدام 100dvh/100svh في المسارات الحساسة.
- لا تغييرات Exam/UI أثناء هذا التدقيق.

المتبقي:
- اختبار فعلي على Android/iOS وأحجام الشاشات المختلفة.

### 29 Browser Compatibility
الحالة: 🟡

- Vite build target = es2020.
- المشروع يستخدم APIs حديثة مثل crypto.randomUUID وfetch patterns.
- لا يوجد browser matrix موثق كاختبار قبول كامل في هذا التدقيق.

المتبقي:
- تحديد browser floor صريح ثم اختبار Chrome/Edge/Firefox/Safari matrix.

### 30 Dependencies
الحالة: 🟡

تم التحقق على commit 9b4b594:
- client production build: success.
- runtime npm audit (--omit=dev): success.
- Dependabot موجود أسبوعياً لـ npm وNuGet.

غير مغلق:
- full dev dependency vulnerability review.
- server dotnet list package --vulnerable --include-transitive كان ما يزال قيد التنفيذ لحظة التوثيق.
- آخر baseline مسجل سابقاً كان 2 moderate + 6 high في dev tree؛ لا يتم إعادة اعتبارها "حالياً" قبل نتيجة الفحص الجديد.

### Current evidence / blockers
- لا يوجد account اختبار مصادق جاهز في هذه الجلسة لإغلاق live E2E الأمني.
- لا يمكن تشغيل clone/build محلياً من هذه البيئة بسبب DNS إلى GitHub؛ الاعتماد الحالي هو CI.
- لا توجد تغييرات في Exam UI, Exam logic, Study redesign, Device Binding policy أو Models 7–8 policy.
- المهمة 30 لا تُغلق نهائياً حتى اكتمال فحص server/dependency الحالي.


## 19. Production Audit Continuation — Tasks 30–45 — 2026-10-08

التفاصيل الكاملة في `PRODUCTION_AUDIT_30_45.md`.

### نتيجة المرحلة
- 30: 🟢 dependency CI hardened + clean final run verified (`37697436882`).
- 31: 🟢 full-history Gitleaks scan passed (`37698530099`).
- 32: 🟡 CSRF/session browser tests pending.
- 33: 🟢 login abuse controls verified statically.
- 34: 🟢 health/monitoring configured.
- 35: 🟡 real Supabase dump + restore drill pending.
- 36: 🟢 capacity/cost policy preserved at $0.
- 37: 🟢 live DB integrity checks passed.
- 38: 🟢 media integrity checks passed; empty AI images are rejected records only.
- 39: 🟢 AI generation disabled and approval gate preserved.
- 40: 🟢 CI hardening commit `f10b357bab7cb0bd0916573282c7d3438fb99bf0`; run `37697436882` passed.
- 41: 🟢 release validation after hardening passed on run `37697436882`.
- 42: 🟡 performance telemetry insufficient for p50/p95/p99.
- 43: 🟢 Android release APK build/upload verified (`37698479329`).
- 44: 🟢 documentation updated.
- 45: 🔴 CONDITIONAL; project is not Production-Cleared until the listed release gates are actually executed.

### Latest CI hardening change
- `release-check.yml` no longer needs repository write permission.
- CI no longer auto-commits/pushes lockfile changes.
- `npm ci` is the reproducible client install path.
- Full npm audit is exported as an artifact; runtime audit remains a blocking gate.
- NuGet transitive vulnerability detection is a blocking gate.

تم التوقف عند المهمة 45.

## Production Audit Update — Tasks 46–65 — 2026-10-08

### Current verified work
- Container hardening: pinned .NET SDK/runtime images + non-root runtime user.
- CI now builds the production Docker image and asserts runtime user UID 1654.
- Rollback runbook added at `RELEASE_ROLLBACK_RUNBOOK.md`.
- Supabase index usage rechecked directly; five advisor unused-index findings remain, but no deletion is justified without longer workload evidence.
- Supabase installed-extension inventory rechecked: only `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp` are actually installed.

### Do not mark complete
- AuthLog retention/purge: policy duration still needs owner decision.
- Real PostgreSQL backup + restore drill: not executed.
- Production latency p50/p95/p99: insufficient history.
- Live security/E2E, browser CSRF/session, mobile/browser/accessibility: still pending.
- Rollback drill: runbook exists, production drill not performed.
- Final Production Gate: still conditional.

### New repository references
- `PRODUCTION_AUDIT_46_55.md`
- `PRODUCTION_AUDIT_56_65.md`
- `PROJECT_MASTER_SPEC.md`
- `RELEASE_ROLLBACK_RUNBOOK.md`

Rule for future continuation: read this handoff and the two audit files, check current `main` HEAD, then continue only the still-open evidence items. Do not reopen settled decisions.


## Production Audit Update — 2026-10-08 — Revalidation through Task 60

### Revalidated
- Tasks 1–49: تمت إعادة مراجعة الأدلة الآلية المتاحة. لا توجد إعادة فتح للقرارات المجمدة. اختبارات browser/device/authenticated E2E بقيت يدوية.
- Task 50: مكتمل من ناحية التنفيذ — AuthLog retention = 90 days عبر `AuthLogRetentionService`، startup + daily cleanup، batch deletion، configurable via `AuthLogs__RetentionDays`.
- Task 56: 🟢 token least privilege.
- Task 57: 🟢 dependency automation.
- Task 58: 🟢 security advisor، مع 20 INFO RLS-without-policy متوقعة.
- Task 59: 🟡 unused indexes؛ لا حذف حالياً.
- Task 60: 🟢 migration/schema drift.

### Still intentionally open
- Tasks 32/49: live browser CSRF/session/replay/device verification.
- Tasks 35/51/52: real PostgreSQL backup + restore drill.
- Task 53: controlled rollback drill.
- Task 42/63: reliable production latency p50/p95/p99.
- Manual Student/Admin/Device E2E + mobile/browser/accessibility acceptance.

### Current code commits for Task 50
- `d02e0974e0b9a87bfc5a9e36852ca6adad57623d` — add AuthLog retention service.
- `b21a93f8f1a207db35bf29f4d77e83746181d7cc` — register scheduled retention worker.

Rule remains: do not consider production fully cleared until the live/manual release gates are completed.


## Verification Addendum — 2026-10-08 — Runtime finding during Tasks 1–60 revalidation

- أثناء التحقق الحي بعد نشر Task 50 ظهر خطأ runtime في مسارات AI queue التي تستخدم PostgreSQL transaction مع `NpgsqlRetryingExecutionStrategy`.
- تم إصلاحه باستخدام `DbContext.Database.CreateExecutionStrategy()` حول transaction في:
  - `server/Services/AiGenerationJobService.cs`
  - `server/Services/AiTestRunService.cs`
- commits الإصلاح:
  - `3739a374b32deed9d501c580a58785564aab839c`
  - `9cfb84ae0b7e8c64a1bbfacc55d1071109158866`
- Render بدأ نشر commit الإصلاح، لكن وقت هذا التوثيق لم يتم بعد تسجيل نهاية deployment الجديد؛ لذلك لا نعتبر هذا الإصلاح live-verified حتى يظهر deployment ناجحاً وتختفي exception من runtime logs.
- هذا الخلل لا يتعلق بـAuthLog retention، ولا يغير Exam UI/logic أو Device Binding أو AI approval policy.



## Runtime Cleanup Addendum — 2026-10-08

During production revalidation after Task 50, the runtime logs exposed additional fixable issues. They were corrected without changing product behavior:

1. AI queue transaction retry compatibility — fixed with EF Core execution strategies.
2. EF Core raw SQL warning from `FirstOrDefaultAsync` over a `LIMIT 1`/locking query — fixed by materializing the one-row result then selecting in memory.
3. Render backend `UseHttpsRedirection` warning — removed because Render terminates TLS before the container.
4. Unused backend `StaticFileMiddleware` warning — removed; frontend owns the bundled static assets.
5. ASP.NET Data Protection container persistence warning — explicitly switched to ephemeral, application-scoped Data Protection because current authentication is JWT-based and there is no persistent disk.

Latest fix commits:
- `3739a374b32deed9d501c580a58785564aab839c`
- `9cfb84ae0b7e8c64a1bbfacc55d1071109158866`
- `374c33ed6f34704ea08d5fa8a32b1907fce3130a`
- `2b20c56a4759083841475b7823a090bf75966efb`
- `5b5182b9bdd076a8f15de805ba99fa62dbd31f65`

The previous AI transaction fix was live-verified. The newest warning-cleanup deployment is still being processed by Render at the time of this update; do not mark the final runtime verification closed until its deployment is Live and post-deploy logs are clean.


## Correction — 2026-10-08
- Render build exposed that `SetApplicationName` is unavailable in the current Data Protection API surface; it was removed.


## Correction — 2026-10-08
- The attempted Data Protection provider override was removed because the current project dependencies do not expose the required provider API. No package was added merely to silence a startup warning.
- Current JWT authentication remains unchanged and stateless.



## Final Runtime Verification — 2026-10-08

The runtime-hardening pass is now stable in Render.

### Live evidence
- Stable deployment: `dep-db3igeqjnfac738cu1n0`
- Live code commit: `66f9021c4696156f25517848380f5ab9d5b4cdf2`
- Build/deploy: success/live.
- Post-deploy logs:
  - no InvalidOperationException,
  - no EF raw-query First/FirstOrDefault warning,
  - no missing WebRootPath warning,
  - no HTTPS redirect/port warning,
  - no Data Protection warning in the verification window,
  - AuthLog retention cleanup confirmed,
  - startup maintenance confirmed.

### Important continuity note
GitHub documentation commits after the deployed code commit only updated audit/handoff documents; they did not modify backend code and Render's configured root directory is `server`.

### Remaining gates
Do not mark the project Production-Cleared until the manual/externally required gates are completed:
- live Student/Admin/Device E2E and tampering,
- browser CSRF/session/replay,
- real PostgreSQL backup + restore,
- controlled rollback drill,
- reliable production latency measurements,
- mobile/browser/accessibility acceptance.


## Continuation checkpoint — 2026-10-09

Read this checkpoint together with `PRODUCTION_AUDIT_66_86.md` and `REMEDIATION_LOG_1_85.md` before resuming work. They contain the detailed latest evidence and avoid repeating completed fixes.

### Latest read-only verification
- The application-code baseline inspected for the live recheck was `7faf3ff0e52adc1d9c7536f7e889789e2271bb95`; commits after it in this continuation are documentation-only, plus a bounded-timeout update to `.github/workflows/security-smoke.yml`; no application runtime behavior changed.
- GitHub `release-check`, `Secret History Scan`, and `API Health Monitor` had successful runs `37788431001`, `37788431063`, and `37850950257`.
- Production DB recheck: Questions 397; non-empty QuestionAudios 397; invalid question core 0; orphan audio/images/reviews 0; active attempts 0; stale AuthLogs older than 90 days 0; duplicate non-empty image hashes 0.
- Seven empty AI image records are rejected reviews only. Do not delete or repair them by inventing media.
- Database size about 194 MB; 11/60 connections, 1 active. All 20 public tables have RLS enabled; no direct table grants to `anon` or `authenticated`.
- Keep `AudioEnabled=true`, `ImageEnabled=false`, one-device Student policy, click-to-play audio, AI approval gate, question bank, Models 1–8, and frozen Exam UI/logic unchanged.

### Items that are still open
- Full npm development dependency audit has 8 findings (6 high, 2 moderate); runtime-only npm audit passes. Tailwind CSS 3.4.19 is the existing v3 line, and the current `braces` advisory has no patched package version. Do not force a Tailwind v4 major migration or hand-edit dependencies without an actual successful build/test; the local clone attempt in this session was blocked by DNS.
- Four current Supabase performance INFO findings concern indexes with zero scans in the current stats window. `IX_QuestionAiImages_ImageHash` has one scan; no index was removed. Do not add public RLS policies to silence the 20 INFO lints while direct grants remain absent.
- Still required for a fully cleared production release: authenticated Student/Admin/device E2E, browser session/CSRF replay, real off-repository PostgreSQL backup plus isolated restore, reliable Render p50/p95/p99, real browser/mobile/accessibility acceptance, and a controlled rollback drill.
- Task 86 remains CONDITIONAL. Do not mark it complete until the external evidence is genuinely collected.
- Render service-level tools require explicit confirmation of the target workspace before access. The available workspace is named `My Workspace`; ask the owner to confirm it before querying Render metrics or deploy resources.


### CI result after the workflow timeout guard — 2026-10-09
- Security Smoke run [37872654346](https://github.com/majxd9/driving-test/actions/runs/37872654346): all checks passed.
- Release check [37872654323](https://github.com/majxd9/driving-test/actions/runs/37872654323): client and server jobs passed.
- Secret History Scan [37872654763](https://github.com/majxd9/driving-test/actions/runs/37872654763): passed.
- API Health Monitor [37872654330](https://github.com/majxd9/driving-test/actions/runs/37872654330): passed.

The CSRF/CORS smoke test is now evidenced as passing from GitHub-hosted CI; authenticated user-session/browser replay, E2E/device acceptance, backup/restore, rollback, and p50/p95/p99 remain external gates.



### Stabilization checkpoint — 2026-10-09 (after PR #73 and #74)
- Render production backend: `d3e49484dd79921b8361db1e7ba7459a9a395f77` / deployment `dep-db45l6s9v7es73aaj8fg` (live).
- Cloudflare production frontend: application commit `d69404244701552237d0308068a23bdc65e95cf8` is included in the successful production deployment; deployment UUID omitted because the secret scanner misclassified this public identifier.
- Exam supports Admin and Student, fresh-start-on-entry resets the active attempt, answers remain local until Finish, and server-side scoring remains authoritative.
- API errors now show meaningful HTTP/network details. If the Student-side failure recurs, capture the exact new status/message; no passwords or tokens are needed.
- Admin AI-image review shows a recoverable error/retry on image fetch failure. The review queue remains manual, one image at a time; no mass approval/generation occurred.
- See `REMEDIATION_LOG_1_85.md` for verified deployment metadata, database integrity counts, and outstanding manual gates.


---

## 19. Latest continuity checkpoint — Tasks 87–100 — 2026-10-09

مرجع المهام الجديدة: `PRODUCTION_AUDIT_87_100.md`. سجل الإصلاحات المحدث: `REMEDIATION_LOG_1_85.md` (العنوان الداخلي محدث حتى المهمة 100).

- لا يوجد code patch جديد مطلوب بأمان من الفحص الساكن وحده؛ لم تتغير أسئلة أو Exam UI أو إعدادات الإنتاج خلال هذا التدقيق.
- آخر كود Render حي هو `d3e49484dd79921b8361db1e7ba7459a9a395f77`. إصلاحات التدريب/الاختبار والصوت وصور مراجعة AI منشورة. آخر تحديث main السابق للتوثيق كان `58897c67d1c0ab79b4001b39aa905b3dc32f27ef`.
- إعادة فحص قاعدة البيانات: 397 سؤالاً و397 ملف صوت غير فارغ؛ 305 AI-image rows (298 صورة غير فارغة)؛ 275 صورة Pending / 23 Approved / 7 Rejected. يوجد صف محاولة اختبار نشطة واحد وصف منتهي الصلاحية غير مكتمل؛ لم تُعدّل المحاولات.
- الصور معطلة في التحكم الحالي والصوت مفعّل. عداد الشهر 704؛ تحقق يدوياً من `AI_MONTHLY_GENERATION_LIMIT` الفعلي في Render لأن القيمة الافتراضية في المصدر 600 وقد يكون هناك override. لا تشارك أسرار البيئة ولا تبدّل المزود/الحصص دون موافقة.
- Render سجّل ثلاثة أخطاء اتصال DB بلا request log يربطها بخطأ العميل. تم التأكد من وجود retry في الكود؛ لا ندعي أن سبب خطأ الطالب حُسم.
- فشل Secret History Scan على التوثيق السابق بسبب false positive لمعرّف نشر Cloudflare العام؛ حُذف UUID من السطرين المتأثرين. لا يعتبر ماسح الأسرار مغلقاً حتى ينجح تشغيله الجديد.
- Production Gate لا يزال CONDITIONAL. الأعمال التي تحتاج حسابات، أجهزة، restore أو rollback مجمعّة في Task 99 من `PRODUCTION_AUDIT_87_100.md`.

---

## 20. Latest authoritative revalidation — Tasks 1–100 — 2026-10-09

Read first: PRODUCTION_AUDIT_1_100_REVALIDATION.md. It supersedes older task status/count snapshots.

- Current main checked: 75d6f6087c5a6e1d7b5bb07bbefa235a5ae1af5f (documentation-only revalidation commit, parent application baseline f2ec2ce46451829877961fe29ae6ea1e0c0d6d6e).
- Frontend baseline in production: Cloudflare Pages reports the f2ec2ce frontend commit as successful. PR #78 changed Home/Study/Exam presentation, so visual and device acceptance is open again.
- Current CI on f2ec2ce: release-check 37910063018, Secret History Scan 37910062975, and API Health Monitor 37910063012 all passed.
- Supabase live counts at 2026-10-09 09:39 UTC: 397 Questions, 397 non-empty QuestionAudios, 305 AI image rows / 298 non-empty, 273 pending / 25 approved / 7 rejected, October AI usage counter 709, DB ~206 MB, connections 24/60, RLS enabled on 20 public tables and zero direct grants to anon/authenticated.
- Image generation remains disabled. The effective AI monthly limit is not confirmed; do not change provider, queue, quota, or production configuration without a recorded decision.
- Render deploy/logs/metrics were not queried in this revalidation because the owner must confirm the target workspace named My Workspace first.
- The project is NOT RELEASE-READY / CONDITIONAL until the manual gates and final automated release verification in the master audit are complete.

## 21. Site-wide floating help assistant — 2026-10-10

- Root cause of the missing floating helper: the prior recent commits only wired a guide into the standalone `/car-viewer` HTML page; `client/src/App.tsx` did not mount a site-wide assistant. The shared `SiteGuide` button was only present on the Home page and opened a modal, not a floating site-wide guide.
- The global assistant is now mounted in `App.tsx` and styled in `client/src/components/floating-site-assistant.css`. It is minimized by default and provides six Arabic topics with text, click-to-play audio, stop control, and a shortcut to the relevant section.
- AI voice uses registered, cached `site-guide-*` keys from the existing audio endpoint. No playback starts automatically. Browser Arabic speech synthesis is used if an audio file cannot be played.
- No new NPM dependencies were added. The component is hidden on exams, results, admin, and the standalone 3D car viewer to avoid overlapping controls or showing two guides.
- **Still required before calling it done:** successful client and backend build/release checks, then manual Cloudflare production verification on phone and laptop. Source commit alone does not prove the deployed UI is already visible.


## 22. Draggable student robot + car-viewer recovery — 2026-10-10

- Replaced the fixed help pill with a small metallic 3D-styled robot made from lightweight CSS shapes. It can be dragged with mouse or touch, supports keyboard arrows, and shares its saved position between the SPA and standalone car viewer.
- The robot appears throughout authenticated Student routes, including Study, Models, Exam and Result, and remains hidden for logged-out visitors and Admin. The standalone car viewer checks the same-tab `drv_session` role before displaying it.
- Floating-robot speech intentionally uses the browser/device Arabic voice only for now. It no longer requests existing question/car system-audio clips or their voice. Configure its dedicated voice only after the owner supplies a separate voice ID.
- Car-viewer HTML/JS/CSS and model URLs use a fresh version query; document and script files revalidate to reduce stale-cache behavior in a normal laptop browser.
- CI checks the three local McLaren quality assets. On failure, the viewer tries other McLaren variants first rather than silently switching to the Challenger. If all variants fail, it presents the error and keeps McLaren selected.
- **Manual acceptance remains open:** verify the normal (non-incognito) laptop navigation and a phone after the deployment. CI cannot prove visual acceptance on those devices.
