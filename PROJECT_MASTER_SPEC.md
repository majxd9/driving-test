# AI CONTINUITY REFERENCE

> اقرأ `AI_PROJECT_HANDOFF.md` أولاً عند بدء محادثة جديدة أو استلام المشروع.
> يحتوي على آخر حالة عملية، القرارات المحسومة، المهام غير المكتملة، وقواعد الاستمرارية.
> ثم استخدم هذا الملف كمواصفات المشروع الشاملة.

---

# PROJECT_MASTER_SPEC.md

## 1. الحالة
- تاريخ التدقيق: 2026-10-06
- الفرع الإنتاجي: `main`
- آخر commit قبل وثيقة التدقيق: `1b0e5b9c6b991cafb4687fab73d7f4ffc171ae85`
- الواجهة: Cloudflare Pages
- الـAPI: ASP.NET Core على Render
- قاعدة البيانات: Supabase PostgreSQL
- الهدف المالي الحالي: $0؛ لا توجد موافقة على أي خدمة مدفوعة.

## 2. قرارات المالك المعتمدة
- D1: الديمو عام بدون تسجيل دخول.
- D2: الاختبار المتوقف يستأنف من الجلسة الخادمية نفسها.
- D3: استرجاع/فك ربط الجهاز يتم من Admin فقط.
- D4: الجهاز الثاني يُرفض ولا ينقل الربط.
- D5: الاختبارات الحالية، بما فيها Models 7–8 واختياراتها، تبقى كما هي تماماً. لا يوجد طلب لتغيير الأسئلة أو الاختيارات أو منطق الاختبار.
- D6: صوت الأسئلة click-to-play فقط؛ لا autoplay بعد الانتقال.
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
- مسارات الاختبار محمية بـ Student role.
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
