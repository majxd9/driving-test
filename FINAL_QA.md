# Final QA Checklist

Date: 2026-09-11

## Static checks completed

- Question JSON parses successfully.
- 347 questions found: 158 rules, 141 signs, 48 mechanics.
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
