# CAPACITY_AND_COSTS.md

## Assumptions
هذه الوثيقة تفصل بين:
- قدرة البنية الحالية على العمل مجاناً.
- السعة التي يمكن الوثوق بها لمستخدمين متزامنين.
- حدود provider الرسمية التي قد توقف الخدمة قبل نفاد الموارد التقنية.

## المقاسات الحالية

Supabase measured database size on 2026-10-10: **247.2 MB / 500 MB Free (~49.4%)**. Table sizes (including indexes): QuestionAudios 142.6 MB, QuestionAiImages 47.9 MB, SystemAudios 41.4 MB.

Media:
- QuestionAudios table: 142.6 MB including indexes.
- QuestionAiImages table: 47.9 MB including indexes.
- 397 questions.
- 397 audio records; 0 empty audio files.
- 297 صورة AI ذات بيانات غير فارغة من أصل 305 سجلات.
- مراجعات AI: 273 Pending، 24 Approved، 8 Rejected، 0 Hidden.
- 108 image jobs pending في لقطة 2026-10-10، وImageEnabled=false.

تقريباً:
- متوسط التخزين الخام للصوت لكل سؤال مع صوت محفوظ ≈ 0.34 MB.
- متوسط صورة AI الحالية لكل سجل ≈ 0.15 MB.

هذه المتوسطات للتقدير وليست ضماناً؛ أحجام الوسائط المستقبلية قد تختلف كثيراً.

## Official Free-tier constraints used in this assessment

### Render Free
- 750 free instance-hours/workspace/month.
- Free web service spins down بعد 15 دقيقة دون inbound traffic.
- خدمة Free لا تدعم scaling لأكثر من instance واحد.
- filesystem ephemeral.

### Supabase Free
- 500 MB database/project.
- 5 GB egress.
- 50,000 MAU.
- Free project may pause after 7 days of insufficient activity.
- Automatic backups ليست ضمن Free.

### Cloudflare Pages Free
- static asset requests مجانية وغير محدودة.
- 500 builds/month.
- build concurrency واحد.
- حتى 20,000 files للموقع.
- الحد الأقصى للملف الواحد 25 MiB.

## 0–100 users
**الحكم: مناسب حالياً مع مراقبة.**
- عدد المستخدمين نفسه ليس عنق الزجاجة.
- Free Render single instance مناسب للحمل الخفيف.
- أهم خطر: startup latency بعد idle، ثم DB egress من audio.

## 100–500 users
**الحكم: مناسب بحذر.**
- يجب مراقبة request latency وDB connections.
- توزيع الدراسة على عدة جلسات يزيد audio egress بسرعة.
- Render يبقى single-instance، لذلك peak concurrency أهم من total accounts.

## 500–1,000 users
**الحكم: منطقة إنذار.**
- إذا بقي audio داخل PostgreSQL، فالـ5GB egress قد يصبح أهم من 500MB DB.
- عدد الاختبارات اليومية يجب أن يقاس فعلياً.
- أي تفعيل واسع لتوليد AI يجب أن يبقى متوقفاً افتراضياً أو مضبوطاً بحصة صغيرة.

## 1,000–5,000 users
**الحكم: لا أوصي باعتباره production-stable على Free الحالي.**
مطلوب قبل هذا المستوى على الأقل:
- فصل الوسائط الكبيرة عن DB.
- cache/CDN مناسب للصور والصوت.
- backend قابل للتوسع أكثر من instance واحد.
- مراقبة connection pool وlatency.
- backup/restore موثوق.
- اختبار حمل حقيقي.

## 5,000+ users
**الحكم: يحتاج إعادة تخطيط للبنية.**
- database tier أعلى.
- object storage/CDN للوسائط.
- horizontal scaling للـAPI.
- queue منفصلة عن طلبات الويب للـAI.
- telemetry/alerting أقوى.
- استراتيجية recovery ذات RPO/RTO معلومة.

## تقدير egress للوسائط

متوسط الصوت الحالي يقارب 133 MB / 397 ≈ 0.34 MB للصوت الواحد.

لو استمع مستخدم إلى 30 ملف صوت في اختبار كامل:
- الاستخدام التقريبي ≈ 10 MB من بيانات الصوت.

بالتالي 5 GB تعادل تقريباً 500 اختبار كامل صوتياً عند هذا المتوسط، قبل احتساب أي egress آخر، والـbrowser caching قد يقلل هذا الاستهلاك بينما إعادة التحميل قد تزيده.

## أقرب upgrade triggers

1. DB > 350 MB: ابدأ نقل الوسائط الكبيرة خارج PostgreSQL.
2. DB > 425 MB: اعتبر فصل الوسائط شرطاً قبل إضافة محتوى كبير جديد.
3. egress > 3 GB/month: راقب الصوت/الصورة كأولوية.
4. Render startup/latency يشكل مشكلة للمستخدمين: health checks/cache/warm strategy أولاً، ثم paid/alternative runtime عند الحاجة.
5. الحاجة لأكثر من instance: Free لم يعد مناسباً.

## Cost policy

لا توجد ترقية تلقائية.
أي تكلفة يجب أن تكون قراراً مستقلاً بعد قياس:
- users/month
- exams/day
- average media downloads/user
- DB size
- egress
- peak concurrent requests

