# Driving Test — رخصتي

نسخة كاملة من المشروع مع واجهة React/Vite، API بـ ASP.NET Core، وبنك الأسئلة والصور مضمّناً داخل المشروع.

## Frontend
- `client/`
- React 18 + TypeScript + Vite + Tailwind CSS
- بنك الأسئلة المحلي: `client/src/data/questions.json`
- الصور: `client/public/signs/`
- صور Raster محولة إلى WebP مع الحفاظ على نسخ الأسئلة الأصلية بصرياً، مع SVG للرسومات المناسبة.
- Cloudflare SPA routing: `client/public/_redirects`

## Backend
- `server/`
- ASP.NET Core Web API + PostgreSQL
- Seed data: `server/Data/SeedData/questions.json`

## Cloudflare Pages
Root directory: `client`
Build command: `npm run build`
Build output directory: `dist`
Environment variable: `VITE_API_URL=https://YOUR-API-DOMAIN`

## GitHub — مسار الإصدار الحالي

المسار الإنتاجي المعتمد هو main مع Git commits عادية. لا تستخدم --force على main ولا تعيد تهيئة المستودع.

```bash
git add .
git commit -m "describe the change"
git push origin main
```
