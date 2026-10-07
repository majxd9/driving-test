# Release Rollback Runbook

تاريخ التوثيق: 2026-10-08
Repository: `majxd9/driving-test`
الإنتاج: GitHub `main` → Render API / Cloudflare Pages frontend

## قاعدة أساسية
لا تستخدم `git push --force` على `main`.
Rollback يجب أن يكون commit عادي أو Render rollback إلى deployment سابق معروف، مع إبقاء Git history سليماً.

## 1. قبل أي rollback
1. حدّد آخر commit/Deployment سليم.
2. ثبّت سبب rollback والخلل الذي تريد إيقافه.
3. افحص Health Monitor وrelease-check وأي failure events.
4. إذا كان الخلل في قاعدة البيانات أو migration، أوقف أي إصلاح آلي قبل تقييم schema/data compatibility.

## 2. Application-only rollback
الاستخدام المفضل عندما يكون الخلل في application code فقط:
1. حدّد commit السليم على `main`.
2. أنشئ revert commit للتغييرات غير السليمة بدلاً من إعادة كتابة التاريخ.
3. ادفع commit إلى `main`.
4. راقب release-check.
5. تحقق من Render deployment الجديد و`/api/healthz`.
6. تحقق من الواجهة إذا كان التغيير frontend.
7. سجّل القرار والـcommit والنتيجة في سجل الإصدار.

## 3. Render deployment rollback
عند توفر deployment سابق سليم في Render:
1. سجّل deployment الحالي والنسخة السليمة المستهدفة.
2. نفّذ rollback من Render إلى النسخة السابقة السليمة.
3. تحقق من `/api/healthz`.
4. تحقق من أن التطبيق يعمل بالـcommit المتوقع.
5. أصلح السبب في Git قبل العودة إلى المسار الطبيعي على `main`.

## 4. Database rollback
لا يتم التعامل مع قاعدة البيانات كأنها application deployment.
- لا تحاول عكس migration عشوائياً في الإنتاج.
- عند تغييرات schema/data، استخدم backup/restore أو migration forward-fix وفق حالة البيانات.
- يجب أن يسبقه backup صالح وrestore drill مثبت قبل اعتماد أي خطة DB rollback.

## 5. بعد rollback
تحقق من:
- API health.
- تسجيل الدخول.
- Student/Admin authorization.
- بدء/استكمال/إنهاء اختبار.
- نتيجة الاختبار.
- الصور والصوت.
- AI generation remains disabled unless explicitly enabled by Admin.
- لا يوجد تغيير في Device Binding أو Exam UI/logic.

## 6. متى لا نعمل rollback؟
- إذا كان rollback سيكسر migration أحدث أو يسبب فقدان بيانات.
- إذا كان السبب غير معروف ويمكن احتواؤه بدون الرجوع لنسخة قديمة.
- إذا كان deployment السابق غير معروف بأنه سليم.

## 7. Evidence
لكل rollback يجب تسجيل:
- وقت UTC.
- commit الحالي.
- commit/deployment المستهدف.
- السبب.
- health result.
- release-check result.
- نتيجة smoke/E2E التي أمكن تنفيذها.
- الإجراء اللاحق: rollback نهائي أو forward-fix.

## حالة هذا الدليل
تم إنشاء runbook وتدقيقه، لكن لم يتم تنفيذ rollback drill على الإنتاج لأن ذلك قد يغيّر حالة الخدمة الحية دون incident فعلي.
