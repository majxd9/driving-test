# Final QA Checklist

Date: 2026-09-11

## Static checks completed

- Question JSON parses successfully.
- 397 questions found: 178 rules, 156 signs, 63 mechanics.
- 0 invalid questions: every question has at least 2 options and a valid correct-answer index.
- 0 missing referenced local images.
- 104 question image references were switched to PNG files supplied in `Traffic_Signals_Images`.
- 110 supplied PNG sign images were copied into `client/public/signs`.
- Local TypeScript/TSX relative-import scan: 0 missing local imports.
- Eight exam seeds were simulated with the same deterministic algorithm used by the client: all 8 produce exactly 30 unique questions, and all 8 question sets differ.
- Exam result persistence now uses the authenticated student's identity server-side.
- Legacy `ExamResults` support was retained for compatibility.
- Existing diagram fields and the new `ExamAttempts` table are upgraded idempotently on startup.

## Runtime/build limitation

A complete runtime build could not be executed in this environment:

- .NET SDK is not installed, so the ASP.NET Core server could not be compiled here.
- The client dependency installation could not complete because the environment could not fetch an uncached npm package (`yallist@3.1.1`). Consequently `npm run build` could not reach the application TypeScript/Vite compilation stage.

The source was therefore checked statically, but this report does not claim a successful production build.

## V2 changes (2026-09-12)
- Exam loading reduced to one API call returning exactly 30 questions.
- Result screen now reviews correct / wrong / unanswered questions with correct answers and explanations.
- Admin accounts are no longer device-bound; student accounts remain one-device.
- Response compression enabled for API/static text resources.
- Upload/static media receives immutable cache headers.
- Login received animated UX polish and stronger interactive sample/guide presentation.
- Image component now includes WebP source, lazy loading, async decode, skeleton and error fallback.
- Full architecture notes: `ARCHITECTURE_V2.md`.
