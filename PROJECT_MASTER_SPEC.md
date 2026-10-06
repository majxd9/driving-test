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
- D5: Models 7–8 يجب أن تكون أصعب باستخدام النهجين المعتمدين؛ التنفيذ الحالي يحقق اختلافاً في الاختيار عبر seed مستقل فقط، ولا يملك بعد بنك صعوبة/metadata منفصلاً. هذه فجوة يجب عدم ملئها بتخمينات عشوائية.
- D6: صوت الأسئلة click-to-play فقط؛ لا autoplay بعد الانتقال.
- D7: إصلاحات أخطاء/أداء/استقرار UI آمنة مسموحة، أما إعادة التصميم أو تغيير التنقل أو بنية الصفحات فتحتاج موافقة.

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
1. تعريف صعوبة Models 7–8 كـmetadata/bank مستقل مع قواعد اختيار قابلة للاختبار.
2. إعداد healthCheckPath في Render إلى `/api/healthz`.
3. استراتيجية backup عملية على Free Supabase.
4. فصل الوسائط الكبيرة عن PostgreSQL عند اقتراب حد 500MB.
5. اختبار E2E مصادق عليه بحسابات اختبار مخصصة.

