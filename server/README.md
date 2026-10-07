# DrivingTestApi — Backend

ASP.NET Core 8 Web API مع PostgreSQL وIdentity/JWT Cookie.

## ما تم تطويره
- إدارة الطلاب والحالات وربط الجهاز.
- CRUD كامل للأسئلة من لوحة الإدارة.
- حقول Diagram اختيارية لكل سؤال: SVG / Image / Interactive.
- لا يوجد uploader عام للصور؛ استيراد صور AI يتم عبر المسار الإداري المقيد الموثق في تدقيق الوسائط.
- نتائج الاختبارات في جدول `ExamResults`.
- Analytics endpoint للطلاب والأسئلة والاختبارات ومحاولات الدخول.
- Static files لتقديم الصور المرفوعة.
- ترقية تلقائية Idempotent للأعمدة الجديدة عند تشغيل المشروع على قاعدة موجودة.

## Environment Variables
- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `Jwt__Issuer` (اختياري)
- `FrontendOrigin`
- `SeedAdmin__UserName`
- `SeedAdmin__Password`

## ملاحظة التخزين
الوسائط المنشورة الحالية تعتمد على الملفات المعتمدة ومسارات الوسائط الحالية. لا تعيد إدخال uploader عام أو تعتمد على filesystem مؤقت لتخزين وسائط الطلاب.

## التشغيل
```bash
dotnet restore
dotnet run
```

لا توجد كلمات مرور أو مفاتيح سرية داخل الكود.


## Performance maintenance

لأن بنك الأسئلة أصبح مخزناً في ذاكرة الـAPI، لا تُشغّل صيانة seed/repair الكاملة مع كل إعادة تشغيل.
القيمة الافتراضية `Maintenance__RunOnStartup=false` تمنع عمليات القراءة/الإصلاح الشاملة أثناء الإقلاع.

عند إضافة دفعة جديدة إلى `Data/SeedData/questions.json` أو عند الحاجة إلى إصلاح بيانات قاعدة البيانات، اضبط مؤقتاً:
`Maintenance__RunOnStartup=true`
ثم أعد تشغيل الـAPI مرة واحدة، وبعد اكتمال الصيانة أعدها إلى `false`.

بعد الإقلاع يحمل الـAPI بنك الأسئلة مرة واحدة في الذاكرة. عند إضافة/تعديل/حذف سؤال من لوحة الإدارة يتم إبطال الـcache وإعادة تحميله عند الطلب التالي.
