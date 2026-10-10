# تدقيق الإنتاج الموحد — إعادة التحقق من المهام 1–100

## إضافة الحالة الحية — 2026-10-10

هذه الإضافة هي المرجع الأحدث للحالة الحية، وتتقدّم على اللقطات التاريخية أدناه. المستودع: `majxd9/driving-test`.

### الحكم الحالي
**الإصدار ما زال CONDITIONAL، وليس Production-Cleared بالكامل.** اجتازت فحوصات CI والنشر الآلي الحالية، لكن لا يوجد دليل كافٍ لإغلاق اختبارات القبول اليدوية، واستعادة قاعدة البيانات، واختبار rollback، وقياسات latency.

### تغييرات الكود والنشر المتحقق منها
- [آخر commit على main في هذه اللقطة](https://github.com/majxd9/driving-test/commit/0e8275fbb76b6ec2919c4560ee958320af2a8089): إصلاح استخراج روابط ملفات JS في فحص الإنتاج، وتنزيل `Zeb.usdz` فعلياً بدل الاكتفاء بـHEAD. هذا التغيير يخص المراقبة ولا يغيّر واجهات التطبيق.
- [تحصين عارض السيارات](https://github.com/majxd9/driving-test/commit/ad3ed6174b7b84ff66c257ff2fb2eaac3ae90327): حركة التفكيك بحلقة قابلة للإلغاء، تحرير مواد التحديد المؤقتة، إلغاء التبديل الصامت إلى سيارة أخرى عند فشل التحميل، أسماء رئيسية واضحة للقطع، وإعادة تحقق التخزين المؤقت.
- [release-check على main — نجاح](https://github.com/majxd9/driving-test/actions/runs/38065136737): بناء الواجهة، تدقيق بنك الأسئلة، البناء، تدقيق عارض 3D وCSP وديلي، تدقيق الاعتماديات التشغيلية، بناء .NET Release، فحص ثغرات NuGet، بناء Docker production والتحقق من مستخدم التشغيل غير root: جميعها ناجحة.
- [Secret History Scan — نجاح](https://github.com/majxd9/driving-test/actions/runs/38065136713).
- [API + Cloudflare production smoke — نجاح](https://github.com/majxd9/driving-test/actions/runs/38065136770): فحص `/api/healthz` ثم الصفحة الرئيسية وصفحة عارض السيارة المنفصلة وملفات JavaScript الحالية وملف `Zeb.usdz`. كانت أول محاولة لاختبار الواجهة تحتوي على regex لاستخراج روابط JS مكتوباً بتهريب زائد؛ أصلحناه، ثم نجح الفحص كاملاً.
- [Cloudflare Pages — نشر ناجح للالتزام الحالي](https://github.com/majxd9/driving-test/runs/114251140033).
- Render API ما زال مربوطاً بـ`main` وبنشر حي على commit `d18430a01722684ff578682093c8d0a3bc437809`، deployment `dep-db4vr8ek1f9s73dstlb0`. فحص الصحة الحي رجع `{"status":"ok","database":"ok"}`.
- قرار المساعد مثبت: `Zeb.usdz` واسمه «ديلي»؛ Lucario ملغى. لم ندمج PR #96 المتقادم لأنه متأخر عن main ويتضمن ملف تشخيص مؤقتاً؛ تم نقل الإصلاحات المطلوبة مباشرة إلى main دون جلب نسخة قديمة من الواجهة. لم تُعدّل واجهتا التدريب والاختبار في هذه الجولة.

### فحص PostgreSQL الحي — قراءة فقط
- المشروع `stwikgqvbadpwbqtfrpf` بحالة `ACTIVE_HEALTHY`.
- حجم قاعدة البيانات: **247,237,779 bytes (~247.2 MB decimal)** من حد Free البالغ 500 MB. النمو يستوجب المتابعة؛ لم يتم حذف بيانات أو تشغيل migrations.
- Questions = 397؛ QuestionAudios = 397؛ الصوت الفارغ = 0؛ محاولات اختبار نشطة غير مكتملة = 0.
- جميع الجداول العامة الـ20 عليها RLS. لا نضيف سياسات عامة عشوائية؛ Advisor يعرض 20 ملاحظة INFO عن RLS بلا policies، وهو متوافق مع نموذج وصول الخادم وعدم منح `anon` أو `authenticated` صلاحيات مباشرة على الجداول بحسب الفحص السابق.
- الصور المولدة: 305 سجلّاً؛ 297 ببيانات صورة غير فارغة. مراجعات الصور: 273 Pending و24 Approved و8 Rejected. لا تُعرض صور AI غير المعتمدة.
- ضوابط التوليد: `AudioEnabled=true` و`ImageEnabled=false` و`ImageProvider=comfyui`. لم نُفعّل توليد الصور ولم نُنشئ jobs جديدة. صفوف المهام حسب الحالة: 108 صور Pending، 642 صوتاً Completed، 164 صورة Completed، و12 صورة Failed؛ لا توجد jobs قيد Processing في لقطة الاستعلام.
- Performance Advisor: ثلاث ملاحظات INFO لفهارس غير مستخدمة. لم نحذف فهارس دون بيانات workload أوسع.

### المراقبة والأداء
- فحص سجلات Render بين 2026-10-10 09:02 و15:45 UTC: لا توجد سجلات App من مستوى error ولا طلبات HTTP بحالات 500/502/503/504 في تلك النافذة. ظهرت أخطاء اتصال PostgreSQL أثناء تغييرات النشر بين نحو 08:43 و09:01 UTC، ولم تظهر في النافذة التالية.
- Render لم يقدم سلسلة بيانات موثوقة لـHTTP latency أو request count. لذلك **p50/p95/p99 غير متاحة** ولا يصح اعتبار الأداء مقبولاً قياسياً. عينات CPU/Memory متفرقة لا تعادل اختبار تحميل.
- تدقيق npm الكامل ما زال يذكر **7 نتائج ضمن شجرة اعتماديات التطوير/البناء: 5 High و2 Moderate، دون Critical**؛ أما `npm audit --omit=dev --audit-level=moderate` فنجح. لم نُجرِ ترقية Tailwind إلى الإصدار الرئيسي 4 أو overrides غير مختبرة، لأن ذلك قد يغيّر CSS ويكسر الواجهة المجمدة. يبقى هذا بنداً يجب حسمه باختبار واعتماد موثق، وليس ادعاءً بأن كل الاعتماديات نظيفة.

### البوابات التي تمنع إعلان الإصدار النهائي
1. اختبار حيّ بحسابات Student/Admin وحساب ثانٍ: تسجيل الدخول والأدوار، ملكية `ExamAttempts`، التلاعب بطلبات API، بدء الاختبار واستكماله وإنهاؤه وانتهاء الوقت والإرسال المكرر والنتيجة بعد refresh.
2. إعادة تشغيل/إبطال الجلسات واختبارات CSRF داخل متصفح بمستخدمين حقيقيين؛ فحص CSRF/CORS الآلي وحده لا يكفي.
3. إنشاء PostgreSQL backup مستقل وآمن ثم restore حقيقي إلى هدف معزول والتحقق من عدد الأسئلة والصوت والصور والمراجعات والنتائج. لم يُنفذ ذلك، وخطة Free لا توفر ضمان نسخ تلقائي يكفي لهذا البند.
4. اختبار rollback مضبوط في بيئة معزولة، مع health check وتجربة دخول/اختبار وصوت/صور بعد الرجوع.
5. قبول بصري ووظيفي على هاتف Android/WebView وكمبيوتر، واختبار لوحة المفاتيح وقارئ الشاشة والتركيز، مع إبقاء Home/Study/Exam تحت قرار القبول المطلوب وعدم تعديلها تلقائياً.
6. توفير workload/telemetry حقيقية لاستخراج p50/p95/p99، ثم تجربة حمل قبل توثيق حدود مستخدمين متزامنين.
7. قرار موثق حول نتائج npm dev-dependency audit قبل إطلاق رسمي واسع.

**الخلاصة التنفيذية:** النسخة الحالية مبنية ومنشورة وفحوصاتها الآلية ناجحة، ومراقبة الإنتاج باتت تختبر ملفات الواجهة ونموذج ديلي فعلياً كل 15 دقيقة. لا نعلن اعتماداً إنتاجياً نهائياً قبل إغلاق البوابات السبعة أعلاه أو تسجيل استثناءات صريحة ومقبولة. لم تُعدّل بيانات PostgreSQL أو الإعدادات المالية أو حالة توليد الصور.

تاريخ اللقطة: 2026-10-09 09:39 UTC
المستودع: majxd9/driving-test
HEAD على main: f2ec2ce46451829877961fe29ae6ea1e0c0d6d6e
النشر الأمامي الحالي: Cloudflare Pages production deploy على commit f2ec2ce، حالته success.
قرار الإصدار الحالي: **NOT RELEASE-READY — CONDITIONAL**.

## كيف نقرأ هذا السجل
- هذا هو سجل الحالة الأحدث للمهام 1–100، ويعلو على أعداد/statuses القديمة داخل تقارير النطاقات السابقة.
- «مكتمل» تعني أن الكود أو الدليل الآلي الحالي يثبت البند المحدد؛ ولا تعني قبولاً يدوياً لم يجرَ.
- «جزئي» تعني وجود تنفيذ أو دليل أولي لكن القبول/القياس غير مكتمل.
- «حاجز إصدار» يعني عدم جواز إعلان Production-Cleared قبل إغلاق البند أو تسجيل قرار استثناء أمني/تشغيلي مقبول صراحة.
- «مؤجل آمن» يعني أنه ليس مطلوباً لتشغيل النسخة الحالية ما دام المسار المذكور يبقى على حالته الآمنة.
- لم تُعدّل أي بيانات PostgreSQL، ولم تُشغّل عملية توليد جديدة، ولم يتغير سلوك التطبيق خلال هذه الجولة.
- PR #78 غيّر العرض المرئي لـHome وStudy وExam/CSS على النسخة الحالية؛ لذلك أعيد فتح قبول الواجهة الحالية بدل الاعتماد على قبول بصري سابق.

## أدلة آلية جديدة
- [release-check الحالي — نجاح](https://github.com/majxd9/driving-test/actions/runs/37910063018): client build، audit للأسئلة، runtime npm audit، .NET Release build، NuGet vulnerability scan، Docker build وnon-root assertion.
- [Secret History Scan الحالي — نجاح](https://github.com/majxd9/driving-test/actions/runs/37910062975).
- [API Health Monitor الحالي — نجاح](https://github.com/majxd9/driving-test/actions/runs/37910063012).
- [CSRF/CORS Security Smoke — نجاح سابق على كود backend لم يتغير بعده](https://github.com/majxd9/driving-test/actions/runs/37872654346). هذا ليس بديلاً عن browser/session replay بمستخدمين حقيقيين.
- [واجهة الإنتاج](https://driving-test-7en.pages.dev/): Cloudflare API أكد نجاح نشر الإنتاج على HEAD f2ec2ce.
- آخر نسخة backend مؤكدة في السجل السابق كانت d3e49484؛ لم أعد التحقق من Render في هذه الجولة لأن الإجراء يتطلب تأكيد مساحة العمل أولاً.

## لقطة Supabase حيّة — 2026-10-09 09:39 UTC
- 397 سؤالاً؛ توزيع الفئات 178 / 156 / 63؛ جميعها بأربعة خيارات، ولا يوجد نص فارغ أو index إجابة غير صالح.
- 397 صف QuestionAudios، صفوف فارغة = 0، أيتام = 0.
- 305 سجلات QuestionAiImages: 298 صورة غير فارغة وصحيحة ترويسة RIFF/WEBP. لا orphan images/reviews/jobs، ولا review/image hash mismatches، ولا duplicate ImageHash groups.
- مراجعات صور AI: 273 Pending، 25 Approved، 7 Rejected. الصور السبعة الفارغة مرفوضة، وApproved image empty = 0.
- SystemAudio prompts الثلاثة غير فارغة وذات ID3 header.
- AI controls: AudioEnabled=true، ImageEnabled=false، ImageProvider=comfyui.
- Job queue: Audio 641 Completed و1 Processing؛ Image 164 Completed و107 Pending و12 Failed؛ stale Processing jobs = 0 وAiTestRuns نشطة = 0. لا تلمس job الصوت الحالية ما دامت ليست stale. تعطيل الصور محفوظ.
- عداد AiGenerationUsage لشهر أكتوبر = 709. المصدر يعرّف default للحد الشهري 600 لكن متغير البيئة قد يغيره، وبعض المزودين مستثنون من العداد الداخلي. لا يصح وصف 709 كتكلفة/تجاوز مؤكد؛ يجب تأكيد القيمة الفعلية للمتغير في Render والحد المعتمد.
- ExamAttempts النشطة = 0، صف غير مكتمل منتهي الصلاحية = 1؛ لم يتم تنظيفه. مجموعات الطلاب ذات أكثر من محاولة نشطة = 0.
- AuthLogs الأقدم من 90 يوماً = 0.
- public tables = 20، RLS disabled = 0، direct table grants لـanon/authenticated = 0.
- Security Advisor: 20 ملاحظة INFO من RLS enabled/no policy؛ لم تُضف سياسات عامة لأنها ليست علاجاً آمناً مع غياب grants مباشرة. Performance Advisor الحالي: 3 ملاحظات INFO لفهارس غير مستخدمة؛ لم يُحذف أي فهرس.
- الامتدادات المثبتة: pg_stat_statements، pgcrypto، plpgsql، supabase_vault، uuid-ossp.
- DB size = 206,072,979 bytes (حوالي 206 MB)، الاتصالات في اللقطة 24/60.
- Render سجّل في نافذة سابقة ثلاث رسائل خطأ اتصال PostgreSQL. لم يثبت ارتباطها بخطأ الواجهة السابق ولا تم الحصول على correlation لطلبات HTTP في الجولة الحالية.

## مصفوفة المهام 1–100

| # | المهمة | الحالة الحالية | الدليل / ما يبقى |
|---:|---|---|---|
| 1 | Discovery | مكتمل | تمت قراءة بنية المستودع والوثائق وسجل CI على HEAD الحالي f2ec2ce. |
| 2 | Architecture | جزئي | البنية مفهومة؛ توجد طبقات CSS متراكمة وقد تغيّرت في PR #78، لذلك يلزم قبول بصري للنسخة الحالية. |
| 3 | Security | حاجز إصدار | ضوابط JWT وRoles وRate limit وCSRF موجودة؛ اختبارات BOLA/IDOR وتلاعب API والجلسات بحسابات حقيقية لم تكتمل. |
| 4 | Database | جزئي | استعلامات سلامة القراءة فقط ناجحة؛ backup/restore لم يُثبت وسعة الوسائط تحتاج مراقبة. |
| 5 | Question Bank | مكتمل | 397 سؤالاً؛ 178 Ser و156 Ishara و63 Mechanic؛ كلها بأربعة خيارات ومؤشر إجابة صالح. |
| 6 | API Security | حاجز إصدار | مراجعة المصدر وCSRF/CORS smoke موجودة، لكن direct API tampering وملكية المحاولة والأدوار تحتاج قبولاً حياً. |
| 7 | Exam Integrity | حاجز إصدار | التحقق والتصحيح خادميان؛ بدء/اختيار/إنهاء/انتهاء وقت/إرسال متكرر/محاولة حساب آخر لم تُختبر بحسابات حقيقية. |
| 8 | Question/Data Integrity | مكتمل | نص السؤال والفئة وعدد الخيارات والمؤشرات ضمن الحدود؛ orphan media/jobs/reviews = صفر. |
| 9 | Image Audit | جزئي | 305 سجل AI image؛ 298 صورة سليمة و273 مراجعة Pending و25 Approved و7 Rejected. المراجعة الدلالية اليدوية المتبقية موثقة. |
| 10 | Image Optimization | مؤجل آمن | المكتبة الرسمية السابقة 110/110 PNG وWebP؛ لا تحويل جماعي إلى AVIF دون مقارنة بصرية. ليس حاجزاً لطرح النسخة الحالية إذا ظلت الصور صحيحة. |
| 11 | Image Loading | جزئي | تحميل الصور وإدارة الحالة محميان برمجياً؛ قياس cache/layout والقبول على المتصفح الحقيقي لم يُنفذ. |
| 12 | Image UX | حاجز إصدار | حُجز موضع الصورة في Study، لكن يلزم اختبار الواجهة الحالية بعد PR #78 والتأكد من عدم القفز أو القص. |
| 13 | Audio | حاجز إصدار | 397/397 ملف صوت سؤال غير فارغ وثلاث رسائل نظامية صالحة؛ تشغيل Play/Stop والاستمرارية يجب أن يُختبر على جهاز حقيقي. |
| 14 | Frontend Performance | جزئي | Build وaudit:questions ينجحان؛ لا توجد قياسات حالية موثقة لـLCP/INP/CLS أو profiling فعلي. |
| 15 | Backend Performance | حاجز إصدار | لم تتوفر سلسلة HTTP latency موثوقة؛ p50/p95/p99 غير مثبتة. |
| 16 | Exam Performance | حاجز إصدار | اختيار الإجابات محلي وسريع في الكود، لكن زمن رحلة الاختبار مع الشبكة وقاعدة البيانات لم يُقَس عملياً. |
| 17 | UI/UX Audit | حاجز إصدار | PR #78 غيّر العرض المرئي لـHome وStudy وExam؛ يلزم قبول المالك للنسخة المنتشرة على الهاتف والكمبيوتر. |
| 18 | Fixed Question/Answer Panel | حاجز إصدار | قواعد المقاس الثابت موجودة؛ يجب إثبات أن السؤال الطويل والصورة والمخطط والخيارات والأزرار لا تُقص على الشاشات القصيرة. |
| 19 | Login/Demo | حاجز إصدار | المسارات موجودة، لكن رحلة Login وDemo ذي الخمسة أسئلة تحتاج تجربة حية للتأكد من عدم تسريب/إنشاء جلسات غير لازمة. |
| 20 | Site Guide | جزئي | تحسينات focus trap وEscape وإرجاع التركيز موجودة؛ اختبار لوحة المفاتيح وقارئ الشاشة ما زال مطلوباً. |
| 21 | Exam Integrity — extended | حاجز إصدار | قواعد ملكية المحاولة والتحقق من السؤال ومؤشر الإجابة والتصحيح الخادمي مثبتة بالمصدر؛ اختبارات tampering/BOLA/IDOR لم تُنفذ حياً. |
| 22 | Result System | جزئي | استرجاع النتيجة من الخادم بعد refresh موجود برمجياً؛ يلزم إثباته بإنهاء اختبار ثم تحديث الصفحة وإرسال مكرر. |
| 23 | Study | حاجز إصدار | نسخة الواجهة الحالية تتضمن تعديل media slot ومركز أزرار التنقل؛ تحتاج قبولاً بصرياً ووظيفياً جديداً. |
| 24 | Models 1–8 | مكتمل | النماذج 1–8 موجودة مع إبقاء 7–8 Advanced/Harder؛ لم يثبت algorithm مستقل لفرض صعوبة مختلفة، ولا تغيير مسموح دون قرار. |
| 25 | Admin | جزئي | حماية Admin وإدارة الحسابات وإعادة ضبط الجهاز مدعومة بالمصدر؛ يلزم اختبار إنشاء/تعديل/صلاحيات/إعادة ربط بحسابات تجريبية. |
| 26 | Media Upload | جزئي | الـpublic uploader القديم غائب وZIP import محمي بفحوص الامتداد والحجم والمسارات وWebP/hash؛ لم يوثق اختبار هجومي لكل archive edge case. |
| 27 | Accessibility | حاجز إصدار | ARIA وreduced-motion وبعض إصلاحات الحوار موجودة؛ keyboard traversal وfocus عبر كل الحوارات وقارئ الشاشة لم تكتمل. |
| 28 | Mobile | حاجز إصدار | الـresponsive CSS موجود، لكن اختبار مصفوفة هاتف حقيقي/ارتفاعات قصيرة/WebView بعد PR #78 غير مثبت. |
| 29 | Browser Compatibility | حاجز إصدار | Build target ES2020؛ لا يوجد سجل قبول موثق للمتصفحات المستهدفة. |
| 30 | Dependencies / Supply Chain | حاجز إصدار | آخر artifact لـnpm audit الكامل: 7 نتائج تطوير (5 High و2 Moderate، دون Critical). بعض الإصلاحات تتطلب تحديث lockfile؛ Tailwind 4 تغيير major يجب ألا يدمج بلا build/regression أو قرار استثناء موثق. |
| 31 | Secrets / Secret History | مكتمل | Secret History Scan الحالي على HEAD f2ec2ce نجح؛ لا يعتمد الحكم على التشغيل القديم الذي أخطأ في UUID نشر عام. |
| 32 | CSRF / Session Security | حاجز إصدار | Security Smoke السابق رفض Origin عدائياً وأجاز الموثوق وCORS allowlist؛ browser CSRF/session replay/concurrent session بحساب حقيقي ما زالت مفتوحة. |
| 33 | Rate Limiting / Abuse Controls | مكتمل برمجياً | 8 محاولات login لكل IP بالدقيقة وIdentity lockout بخمس محاولات/15 دقيقة و429/Retry-After موثقة. |
| 34 | Observability / Health | مكتمل | API Health Monitor على HEAD f2ec2ce نجح، ويتحقق من /api/healthz واتصال DB. |
| 35 | Database Backup / Restore | حاجز إصدار | workflow الحالي ينسخ source فقط؛ لم يثبت PostgreSQL dump مستقل ثم restore حقيقي إلى هدف معزول. |
| 36 | Capacity / Cost | جزئي | حجم DB نحو 206 MB من حد 500 MB، وعدد الاتصالات 24/60 في لقطة التدقيق؛ egress والزمن وقت الذروة غير مثبتين. لم تُفعّل خدمة مدفوعة. |
| 37 | Database Integrity / Schema | مكتمل | 397 سؤالاً وأربعة خيارات لكل سؤال؛ orphan audio/AI image/review/job = صفر؛ migration المسجلة واحدة. |
| 38 | Media Integrity | مكتمل مع ملاحظة | 397 صوتاً غير فارغ؛ 298 صورة WebP غير فارغة وصحيحة الترويسة؛ السجلات السبعة الفارغة مرفوضة كلها ولا توجد صورة Approved فارغة. |
| 39 | AI Generation Safety / Quota | حاجز إصدار | AudioEnabled=true وImageEnabled=false؛ يوجد job صوتي واحد Processing و0 stale processing؛ عداد أكتوبر 709 والحد الفعلي بالبيئة غير معروف. |
| 40 | CI/CD Security Hardening | مكتمل | release-check يستخدم read-only permissions ومسار تثبيت npm ci ولا يدفع تغييرات تلقائية إلى main. |
| 41 | Release Build / Artifact Integrity | مكتمل | release-check الحالي 37910063018 نجح في client/server build وruntime npm audit وNuGet vulnerability scan وبناء Docker والتحقق من non-root. |
| 42 | Runtime / Backend Performance | حاجز إصدار | Render لم يوفر بيانات HTTP latency أو request-count موثوقة؛ لا يجوز اختلاق percentiles. |
| 43 | Android Wrapper / Release Safety | جزئي | يوجد مسار بناء APK وفحوص السلامة السابقة؛ تحتاج النسخة الحالية قبولاً فعلياً على Android WebView لأن الواجهة المستضافة تغيّرت. |
| 44 | Documentation / Continuity | مكتمل بعد هذا التحديث | هذا الملف سجل الحالة الأحدث لمهام 1–100، وتظل ملفات النطاقات السابقة أدلة تاريخية لا تتغلب على اللقطة الجديدة. |
| 45 | Final Production Gate | حاجز إصدار | الحالة ليست Production-Cleared بسبب البوابات اليدوية والأداء والنسخ/الاستعادة والاعتماديات المفتوحة. |
| 46 | Documentation / Configuration Drift | مكتمل جزئياً | فُحصت ملفات الإعداد العامة وفصل الأسرار؛ تمت إضافة هذا السجل الموحد لمعالجة اختلاف اللقطات القديمة. |
| 47 | Container Hardening / Image Provenance | مكتمل | آخر release-check اجتاز بناء صورة الإنتاج والتحقق أن UID runtime هو 1654. |
| 48 | HTTP Security Headers / CORS | جزئي | Headers وCORS المحدود وفحص Origin موجودة؛ Security Smoke نجح، والقبول الكامل داخل browser/session لا يزال مطلوباً. |
| 49 | Authentication / Session Lifecycle | حاجز إصدار | JWT lifetime/account/role checks وHttpOnly/Secure cookie موجودة؛ replay وconcurrent session وdevice tests غير مكتملة. |
| 50 | Logging / Audit / Data Minimization | مكتمل برمجياً | AuthLog retention موجود؛ عدد AuthLogs الأقدم من 90 يوماً في لقطة DB = صفر. |
| 51 | Backup Automation | جزئي | project-backup.yml مجدول أسبوعياً وينشئ source archive لـ30 يوماً؛ هذا لا ينسخ قاعدة البيانات ولا يغلق Task 52. |
| 52 | Disaster Recovery / Restore | حاجز إصدار | لا يوجد restore drill حقيقي موثق. يتطلب dump آمن خارج repo/artifacts العامة ثم restore وفحوص سلامة. |
| 53 | Rollback / Release Recovery | حاجز إصدار | RELEASE_ROLLBACK_RUNBOOK.md موجود، لكن drill لم ينفذ في staging/بيئة معزولة ولم يسجل دليل نجاح. |
| 54 | Monitoring / Alerting | جزئي | فحص صحة كل 15 دقيقة نجح؛ يلزم التأكد من آلية التنبيه عند فشل متكرر ومن logs/runtime على Render بعد تأكيد المساحة. |
| 55 | Extended Final Production Gate | حاجز إصدار | لا تزال البنود اليدوية وbackup/restore وrollback وlatency والـE2E تمنع الإغلاق. |
| 56 | GitHub Actions Token Least Privilege | مكتمل | ملفات workflow المعروفة تستخدم contents: read عند الحاجة ولا تحتاج صلاحيات كتابة واسعة. |
| 57 | Dependency Automation | مكتمل كإعداد | التحديث الآلي والفحص موجودان؛ ذلك لا يمحو نتائج npm audit الكامل الموثقة في Task 30/97. |
| 58 | Database Security Advisor Review | مكتمل مع INFO | RLS مفعّل على 20 جدولاً ولا توجد grants مباشرة لـanon/authenticated؛ 20 INFO من RLS enabled/no policy متوقعة لهذا النمط المعتمد على backend. |
| 59 | Database Performance Advisor | جزئي | ثلاث ملاحظات INFO لفهارس غير مستخدمة حالياً؛ لم تُحذف أي فهارس لأن نافذة الإحصاءات وحدها لا تثبت أنها آمنة للحذف. |
| 60 | Migration / Schema Drift | مكتمل ضمن الفحص المتاح | المخزون يعرض migration واحدة، وجداول public العشرون مفعّل عليها RLS؛ لم يظهر احتياج schema change في هذا التدقيق. |
| 61 | Extension Surface Review | مكتمل ضمن المخزون | الامتدادات المثبتة حالياً: pg_stat_statements وpgcrypto وplpgsql وsupabase_vault وuuid-ossp؛ لم يُحذف أي extension. |
| 62 | Runtime Error / Event Review | جزئي | اللقطات السابقة سجلت 3 أخطاء اتصال PostgreSQL؛ لا تتوفر مطابقة طلب HTTP/سبب جذري، وRender logs الحديثة تحتاج إعادة فحص بعد تأكيد المساحة. |
| 63 | Runtime Capacity Evidence | حاجز إصدار | الـCPU/DB snapshot لا يعوض latency percentiles ولا اختبار الحمل؛ p50/p95/p99 ما زالت غير مثبتة. |
| 64 | CI / Release Regression Gate | مكتمل | آخر release-check على HEAD f2ec2ce نجاح، ونجحت خطوات client/server/NuGet/Docker/non-root. |
| 65 | Extended Production Gate | حاجز إصدار | البوابات الحية لStudent/Admin/device وbackup/restore وrollback والقياس والقبول البصري لا تزال مفتوحة. |
| 66 | Source / Deployment Boundary | جزئي | Cloudflare production يؤكد commit f2ec2ce نجاحاً؛ آخر backend commit مؤكد في سجل سابق هو d3e49484. يلزم تأكيد Render لتثبيت الحالة الحية الحالية. |
| 67 | API Authorization Surface | جزئي | التحكم بالأدوار وملكية ExamAttempt موجود في المصدر؛ لا دليل حي على اختبار كل endpoint من طالب/أدمن/حساب آخر. |
| 68 | CSRF / CORS Enforcement | جزئي | Security Smoke 37872654346 نجح على كود backend الذي لم يتغير بعده؛ browser session replay الفعلي ما زال مطلوباً. |
| 69 | JWT / Session Lifecycle | حاجز إصدار | التحقق من JWT والأدوار وحالة الحساب موجود؛ إعادة استخدام جلسة/إبطالها/التزامن تحتاج اختباراً فعلياً. |
| 70 | Login Abuse Controls | مكتمل برمجياً | login limiter وIdentity lockout موجودان؛ لا يوجد ما يبرر ادعاء اختبار هجوم أو حمل حي لم يُجرَ. |
| 71 | Error Handling / Information Leakage | جزئي | العميل يعرض رسائل HTTP/network أوضح؛ سبب رسالة المستخدم الأصلية لم يثبت بسبب غياب correlation لـHTTP logs. |
| 72 | SQL / Query Safety | مكتمل ضمن مراجعة المصدر | استعلامات EF/SQL المستخدمة في المسارات الأساسية مراجعة؛ فحوص DB لم تكشف فساد سؤال/وسائط. |
| 73 | AI Queue Concurrency / Recovery | مكتمل ضمن الفحص الحالي | stale Processing jobs=0 وAiTestRuns نشطة=0؛ يوجد job صوتي واحد Processing غير قديم، و107 image jobs Pending مع ImageEnabled=false. |
| 74 | AI Provider / Quota Controls | حاجز إصدار | الصور معطلة؛ الاستخدام المسجل 709 لا يثبت تكلفة، لكن قيمة AI_MONTHLY_GENERATION_LIMIT الفعلية والاتساق مع الميزانية غير مؤكدين. |
| 75 | AI Approval / Stale Content Gate | مكتمل تقنياً | مطابقة ContentHash مع review/image = 0 mismatches، تكرار ImageHash = 0؛ الصور غير المعتمدة يجب أن تبقى محجوبة. |
| 76 | ZIP / Media Upload Hardening | مكتمل برمجياً | الاستيراد الإداري المقصود محصور بالأرشيف والملفات/الأحجام/المسارات المقبولة؛ لا يوجد uploader عام قديم. |
| 77 | Media Hash / Dedup Integrity | مكتمل | duplicate image-hash groups=0 وreview/image hash mismatches=0 في DB. |
| 78 | Database Integrity | مكتمل | الاستعلام الحي 09:39 UTC لم يكشف orphan media/jobs/reviews أو أسئلة core غير صالحة. |
| 79 | AuthLog Retention / Data Minimization | مكتمل | AuthLogs older than 90 days=0 في آخر لقطة وretention worker موجود. |
| 80 | Secrets / Configuration Exposure | مكتمل | Gitleaks history scan على HEAD f2ec2ce نجح؛ لا يلزم وضع أسرار داخل ملفات التوثيق. |
| 81 | GitHub Actions Permissions / Workflow Hygiene | مكتمل | الـworkflows الحالية تقيد permissions وتحتفظ بتقارير الفحص عبر artifacts ذات مدة محدودة. |
| 82 | Reproducible Release / Container Hardening | مكتمل | build الحالي من npm ci وبناء Release لـ.NET وDocker اجتاز CI؛ container non-root assertion نجح. |
| 83 | Source Backup | جزئي | workflow source snapshot موجود؛ هذا لا يغطي PostgreSQL ولا يستبدل نسخة بيانات خارج المستودع. |
| 84 | PostgreSQL Backup / Restore | حاجز إصدار | لا يوجد دليل dump/restore آمن إلى هدف منفصل؛ blocker أساسي للتعافي. |
| 85 | Capacity / Storage Headroom | جزئي | DB نحو 206 MB من 500 MB و24/60 اتصالاً؛ ينبغي مراقبة نمو الوسائط وقياس egress/latency، ولم يثبت اختبار سعة. |
| 86 | Extended Production Gate | حاجز إصدار | ما زال CONDITIONAL إلى حين إغلاق الاختبارات الخارجية وbackup/restore وrollback والاعتماديات/الأداء. |
| 87 | Release / Deployment Boundary | جزئي | HEAD الحالي f2ec2ce وCloudflare Production deployment success؛ لم أعد التحقق من Render في هذه الجولة قبل تأكيد My Workspace. |
| 88 | Live PostgreSQL Integrity | مكتمل في لقطة 09:39 UTC | 397 سؤالاً، 397 صوتاً غير فارغ، خيارات/إجابة صحيحة، لا orphan media/jobs/reviews، لا duplicate hashes. |
| 89 | AI Queue and Monthly Limit | حاجز إصدار | ImageEnabled=false وAudioEnabled=true؛ usage=709، قيمة الحد الفعلية غير مؤكدة، ولا توجد jobs قديمة عالقة. |
| 90 | RLS and Direct Grants | مكتمل مع INFO | 20/20 public tables RLS enabled؛ RLS disabled=0 وdirect grants إلى anon/authenticated=0. |
| 91 | Unused Index Review | جزئي | 3 unused-index INFO findings؛ أبقينا الفهارس كما هي حتى تتوفر بيانات workload أطول وقرار مدروس. |
| 92 | Database Connection Errors | جزئي | ثلاثة أخطاء سابقة مسجلة دون correlation إلى خطأ واجهة المستخدم؛ يجب مراجعة logs الحالية بعد تأكيد Render workspace. |
| 93 | Current CI and Secret Scan | مكتمل آلياً | release-check 37910063018 وGitleaks 37910062975 وAPI Health Monitor 37910063012 كلها success على HEAD f2ec2ce. |
| 94 | API Error Recovery | جزئي | رسائل HTTP أصبحت مفهومة وserver-side scoring حاضر؛ لا تُغلق حتى يجرب طالب/أدمن حقيقيان سيناريوهات البدء/التسليم/الخطأ. |
| 95 | AI Image Admin Review | جزئي | لوحة الإدارة تعرض أخطاء التحميل وتوفر Retry؛ 273 صورة Pending لم تتم مراجعتها دلالياً في هذا الفحص. |
| 96 | Audio Media Integrity | جزئي | ملفات الأسئلة ورسائل النظام سليمة بقاعدة البيانات؛ التشغيل على Android/mobile/desktop لم يُقبل يدوياً. |
| 97 | Full Dependency Audit | حاجز إصدار | الـartifact الحالي فيه 7 نتائج dev (5 High/2 Moderate/0 Critical). يجب تحديث الآمن واختبار build أو تسجيل استثناء أمني صريح قبل Sign-off. |
| 98 | Performance Evidence | حاجز إصدار | لا يوجد مصدر latency موثوق لـp50/p95/p99؛ مطلوب قياس قابل لإعادة التكرار قبل Production-Cleared وفق البوابة الحالية. |
| 99 | Manual Review List | حاجز إصدار | قائمة M1–M9 في هذا التقرير هي المرجع الموحد لكل ما يتطلب حسابات أو أجهزة أو restore/rollback أو قرار المالك. |
| 100 | Official Release Decision | حاجز إصدار | النتيجة الحالية NOT RELEASE-READY / CONDITIONAL؛ لا يعلن الجاهزية حتى إغلاق البنود الإلزامية ثم إعادة فحص CI والنشر والـDB. |

## القائمة اليدوية الموحدة قبل إصدار رسمي

### M1 — تأكيد Render ومراجعة الـAPI الحي
يلزم تأكيد مالك المشروع أن مساحة Render المقصودة هي **My Workspace**. بعد التأكيد، يعاد التحقق من آخر deployment الفعلي، commit الخلفي، /api/healthz، سجلات آخر 24–72 ساعة، أخطاء اتصال DB، قيمة AI_MONTHLY_GENERATION_LIMIT الفعلية، وبيانات الأداء المتاحة. لا تشارك كلمات مرور أو API keys أو cookies.

### M2 — E2E مصادق عليه للطالب والأدمن والجهاز
باستخدام حسابات اختبار مخصصة:
- Login على الجهاز المسجل، رفض جهاز مختلف، وإعادة الربط من Admin فقط.
- Student وAdmin: الصلاحيات الصحيحة، ورفض الطالب endpoints إدارية.
- التدريب بكل الفئات: صورة السؤال الضرورية، الاختيارات، السابق/التالي، ورسائل الأخطاء؛ فشل الصوت لا يمنع اختيار الإجابة.
- الاختبار: نماذج 1–8، 30 سؤالاً، مؤقت 15 دقيقة، الإجابات، finish/result، refresh للنتيجة، انتهاء الوقت، submit المكرر، سؤال/attempt غير مملوك، ومؤشرات إجابات مزوّرة.
- Demo: خمسة أسئلة بلا صلاحيات Student/Admin أو سجلات اختبار غير لازمة.
احتفظ بالنتائج ووقت أي خطأ فقط؛ لا ترسل بيانات الدخول.

### M3 — القبول البصري والوظيفي للواجهة الحالية
على الهاتف والكمبيوتر، وضمن Android WebView إذا كانت الحزمة ضمن الإصدار:
- Home الجديدة، Study image slot الثابت، تمركز السابق/التالي، وExam media panel بعد PR #78.
- اختبر شاشات قصيرة وطويلة، سؤالاً طويلاً، أسئلة بصورة/مخطط، وأربعة خيارات؛ لا قص للمحتوى المهم ولا تنقل مكسور ولا صفحة تتوسع بلا داعٍ.
- تحقق من الصور الأصلية الضرورية قبل اختيار الإجابة، وظهور صور AI المعتمدة فقط.
لا تغيّر CSS/Exam أثناء الاختبار؛ سجّل العيب ومكانه ثم اعتمده قبل أي تعديل جديد.

### M4 — الوصولية والمتصفحات
نفّذ keyboard-only traversal وfocus trap/restoration وEscape وإرجاع التركيز، وقارئ شاشة للحوارات وSite Guide، ثم مصفوفة browser/device المتفق عليها. لا يُغلق هذا البند من static inspection وحده.

### M5 — الصوت والصور وقرار نطاق صور AI
- Play/Stop، رسالة الدخول الأولى، رسالة التفعيل/الإيقاف، واستمرار الصوت للسؤال التالي حتى Stop على Android/موبايل/كمبيوتر.
- راجع صور AI الـ273 المعلقة صورةً صورة إذا كان المقصود تفعيلها/إظهارها للطلاب؛ لا تعتمد أو ترفض بالجملة.
- إذا كان إطلاق المنصة الأساسية أسبق من إكمال المراجعة، تبقى ImageEnabled=false وجميع Pending مخفية ولا تُسوّق تغطية AI كميزة مكتملة. لا تُقبل أي صورة غير معتمدة تلقائياً.

### M6 — إغلاق تدقيق اعتماديات التطوير
Artifact الحالي يسجل 7 نتائج npm dev dependencies: 5 High و2 Moderate و0 Critical. يجب محاولة إصلاح الترقيات غير الكبرى بأمان، ثم تشغيل build/CI كاملاً. أما ترقية Tailwind إلى v4 فهي major وتتطلب مراجعة CSS regression بعد تغييرات PR #78. إذا بقيت نتيجة غير قابلة للإصلاح دون تغيير كبير، يجب أن يكون هناك قرار استثناء صريح يشرح نطاقها ومخاطرها قبل sign-off؛ لا نعلن «كل الاعتماديات نظيفة» مع نتائج معروفة.

### M7 — Backup ثم Restore فعلي
أنشئ logical dump آمن خارج GitHub/public artifacts يشمل الأدوار/schema/data وفق الأدوات المناسبة، ثم استعده إلى قاعدة/مشروع اختبار معزول. سجّل وقت التنفيذ، عدد الجداول، وفحوص integrity بعد الاستعادة. Source snapshot الحالي ليس database backup.

### M8 — Rollback drill
في بيئة staging/معزولة أو ضمن نافذة مصرح بها، اختبر العودة إلى نسخة سابقة معروفة، ثم تحقق من health/login/training/exam/results/media. لا تنفذ rollback تجريبياً على العملاء في الإنتاج.

### M9 — الأداء والسعة والحد الشهري
- احصل على قياس قابل لإعادة التكرار لـp50/p95/p99 وrequest count، أو نفّذ اختبار حمل محدوداً ومصرحاً إذا لم تتوفر telemetry في Render.
- سجل DB size/connections/egress، وقرر حد تنبيه لنمو الوسائط.
- تحقق من قيمة AI_MONTHLY_GENERATION_LIMIT الفعلية في Render، وطابقها مع ميزانية المالك؛ لا تبدّل provider ولا تشغّل توليد صور خلال هذا التدقيق.

## كيف يتم إغلاق الإصدار بعد القائمة اليدوية
بعد إنجاز M1–M9 وتوثيق أي استثناء مصرح به:
1. أعيد فحص main لأن الشيفرة قد تكون تغيّرت منذ هذه اللقطة.
2. أشغّل/أراجع release-check وGitleaks وAPI Health Monitor وأي Security Smoke مناسب على commit النهائي.
3. أتحقق من نشر Cloudflare وRender على الـcommits المتوقعة، ثم أعيد فحص سلامة Supabase بعد أي إجراء backup/restore أو تغيير مرخّص.
4. أتأكد أن لا توجد مهام حاجزة مفتوحة، وأن الصور المعلقة إما روجعت أو ما زالت مخفية ضمن نطاق الإصدار المعتمد.
5. لا يتغير Task 100 إلى RELEASE-READY إلا إذا نجحت هذه المراجعة النهائية. أي فشل أو دليل مفقود يبقيه CONDITIONAL.

## القرار في هذه اللقطة
**ليس جاهزاً بعد للإصدار الرسمي الكامل.** فحوصات CI، سرية المستودع، الصحة، وسلامة البيانات الأساسية نجحت؛ لكن القبول المصادق عليه، النسخ/الاستعادة، rollback، الأداء، تدقيق الاعتماديات، وقبول الواجهة الحالية لا تزال بوابات حقيقية. هذا التقرير يجعل ما عليك وما سأعيد فحصه بعده محدداً ولا يعتبر عملاً يدوياً ناجحاً بلا دليل.