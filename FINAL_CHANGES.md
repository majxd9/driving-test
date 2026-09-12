# Final Fix Pass

- Fixed answer-state accounting in Study/Exam by keying answers by question position instead of unreliable/non-unique IDs.
- Prevented moving to the next Study question before answering the current question.
- Corrected result math so correct/wrong/unanswered cannot become negative or inflate.
- Required exactly 4 non-empty choices for every question in the admin editor and API.
- Added startup repair logic for incomplete questions and legacy mechanic image paths.
- Added client-side fallback that maps legacy mechanic `/signs/sign_210..235.webp` paths to `/mechanic/mechanic_210..235.webp`.
- Improved exam/study media containers to preserve full images with `object-fit: contain` and stable aspect ratios.
- Enhanced mechanic images with safe whitespace cropping, square framing and mild sharpening while keeping full content.
- Redesigned login screen with a prominent branded hero, feature stats and improved form UX.
- Moved the site guide to a floating external overlay rather than placing it inside the question content.
- Reworked the admin dashboard navigation, health indicators, question editor, search/filtering, error states and media uploader.
- Kept Lazy Loading, preloading, cache headers, React route lazy loading and optimized image handling.
- Validated the bundled question bank: 397 questions = 158 Ser + 141 Ishara + 48 Mechanic; all seeded questions have 4 non-empty choices and valid answer indexes; referenced local images exist.

## Cloudflare Pages
Root directory: `client`
Build command: `npm run build`
Output directory: `dist`
Environment variable: `VITE_API_URL=<your backend API URL>`
