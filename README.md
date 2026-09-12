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

## GitHub — أسهل طريقة
1. فك الضغط عن هذا الملف.
2. ادخل إلى مجلد `driving-test-main`.
3. افتح Git Bash / Terminal داخله ونفّذ:

```bash
git init
git branch -M main
git remote add origin https://github.com/majxd9/driving-test.git
git add .
git commit -m "complete driving test overhaul with bundled questions and optimized images"
git push -u origin main --force
```

إذا كان المستودع مربوطاً مسبقاً ولا تريد إعادة ضبط الـhistory، استخدم فقط:

```bash
git add .
git commit -m "fix questions images and UI"
git push origin main
```
