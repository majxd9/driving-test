# DrivingTestApi — الـ Backend

مشروع ASP.NET Core Web API. هاد أول جزء من إعادة البناء: الحسابات، الأدوار (Admin/Student)، ربط الجهاز، والتسجيل. الأسئلة والامتحانات رح تنضاف بالمرحلة الجاية.

## ⚠️ ملاحظة مهمة
هاد المشروع اتكتب هون بدون تشغيل فعلي، لأنه بيئة الكتابة الحالية ما عندها اتصال بـ NuGet ولا .NET SDK مثبّت فيها. لازم تجربه عندك محلياً (أو عبر Claude Code) قبل النشر.

## المتغيرات المطلوبة (لا تُكتب بالكود أبداً)

| المتغيّر | الوصف | مثال |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | رابط الاتصال بقاعدة PostgreSQL | `Host=...;Database=...;Username=...;Password=...` |
| `Jwt__Key` | مفتاح سري طويل وعشوائي لتوقيع الجلسات | نص عشوائي ٣٢ حرف فأكثر |
| `Jwt__Issuer` | اختياري، افتراضياً `DrivingTestApi` | |
| `FrontendOrigin` | رابط الواجهة الأمامية (لـ CORS) | `http://localhost:5173` |
| `SeedAdmin__UserName` | اسم مستخدم أول حساب Admin (مرة وحدة فقط) | |
| `SeedAdmin__Password` | كلمة سر أول حساب Admin (مرة وحدة فقط) | |

**محلياً**، أسهل طريقة:
```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..."
dotnet user-secrets set "Jwt:Key" "..."
dotnet user-secrets set "SeedAdmin:UserName" "admin"
dotnet user-secrets set "SeedAdmin:Password" "..."
```

## التشغيل
```bash
dotnet restore
dotnet ef migrations add InitialCreate   # أول مرة فقط
dotnet run
```

بعد أول تشغيل ناجح، رح يصير عندك حساب Admin واحد جاهز (بالبيانات يلي حطيتها بـ SeedAdmin)، وتقدر من خلاله تضيف حسابات الطلاب عبر `/api/admin/students`.

## كيف يشتغل ربط الجهاز (باختصار)
- الفرونت إند بيولّد رقم عشوائي مرة وحدة (Device ID) ويخزّنه بذاكرة الجهاز.
- أول تسجيل دخول ناجح لأي حساب بيربطه تلقائياً بهاد الرقم.
- أي محاولة دخول لنفس الحساب من رقم جهاز مختلف تُرفض وتُسجَّل بجدول AuthLogs.
- إذا الطالب بدّل جواله فعلاً، الحل من لوحة الأدمن: `POST /api/admin/students/{id}/reset-device`.
- هاد قفل "على مستوى المتصفح/التطبيق"، مو قفل هاردوير فعلي — مسح بيانات المتصفح بيصفّره. هاد الحد الطبيعي لأي حل مبني على موقع ويب.
