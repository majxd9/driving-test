# Driving Test — Overhaul / Repair

This package is based on the latest project state supplied for this task and includes the following repairs:

- Fixed the TypeScript build issue in AdminDashboard caused by `null` vs `undefined` question media fields.
- Added validation before creating/updating questions so empty options cannot be saved.
- Added automatic database repair for incomplete/blank question options on server startup.
- Added automatic migration of existing mechanic image URLs (`sign_210..235`) to dedicated cropped mechanic assets.
- Added dedicated, cropped WebP mechanic images generated from the original assets.
- Improved Study/Exam image presentation to use larger, non-cropping containers with `object-contain`.
- Added lazy loading, async decoding, WebP source selection, preload of nearby question images, skeleton loading and image fallback.
- Added SPA `_redirects` and static asset caching `_headers` for Cloudflare Pages.
- Preserved the 347-question seed bank and validated all question options/correct-answer indexes and referenced assets.
- Preserved the Admin Dashboard, question CRUD, media upload, analytics, exam-result storage, and diagram fields.

## Cloudflare Pages
Set the client directory as the project root if your repository contains both `client` and `server` directories.

Build command:
`npm run build`

Output directory:
`dist`

The server remains a separate ASP.NET Core 8 deployment and must expose the API URL through `VITE_API_URL` on the client build.
