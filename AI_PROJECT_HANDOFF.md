# AI PROJECT HANDOFF — رخصتي (Driving Test)

> هذا الملف هو مرجع الاستمرارية العملي لأي محادثة أو AI agent يعمل على المشروع.
> اقرأه قبل أي تغيير، ثم ارجع إلى `PROJECT_MASTER_SPEC.md` للتفاصيل الأوسع.
>
> آخر تحديث موثق: 2026-10-08

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

### Audio

- click-to-play.
- لا autoplay.
- لا continuous autoplay بعد navigation.
- لا تغيير سلوك الصوت بدون موافقة.

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
