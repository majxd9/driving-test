# Remediation Log — Tasks 1–100 — 2026-10-09

## New fixes completed after the 66–86 audit

### Task 20 — Site Guide accessibility
Status: 🟢 code fix completed; live visual/assistive acceptance remains external.

Fixed in `client/src/components/SiteGuide.tsx`:
- Added focus trap while the dialog is open.
- Escape closes the dialog.
- Focus is restored to the original trigger only after the dialog had actually been opened.
- The initial page render does not steal focus.
- Existing `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` are preserved.
- No navigation or visual redesign was introduced.

Commits:
- `07cb9fd351d42bb33e79593bfda3b643db6e5014`
- `3cede2ddcebe7658263650abe087c2c7189d63e3`

### Task 23 / Task 49 / Task 6 — Audio behavior revalidation
Status: 🟢 code fix completed; real-device acceptance remains external.

Found in the live `Study.tsx` implementation:
- A previous effect automatically called `audio.play()` after `audioEnabled` became true.
- A previous first-entry effect could play the first-entry system prompt without a user action.

This conflicted with the frozen project rule: question audio is click-to-play and navigation must not start playback automatically.

Fixed in `client/src/pages/Study.tsx`:
- Removed the automatic question-audio playback effect.
- Removed automatic first-entry prompt playback.
- Kept preloading, which does not play audio.
- Kept user-initiated playback from the audio button.
- Kept user-initiated enabled/disabled system prompts.
- Navigation to another question now pauses/clears the audio element and waits for an explicit Play action.

Commit:
- `fc789ac01ff1f7c403a7d7c0746b24f239d36f79`

### Verification of the audio fix
Static verification of current `Study.tsx` shows only two `audio.play()` paths:
1. The system prompt helper, called by user actions.
2. The question Play button handler.

The removed autoplay effects are no longer present in the current file.

## Still not safely closable without external evidence

The following remain release gates because closing them without the required environment would be false evidence:
- authenticated Student/Admin/Device E2E and tampering tests;
- browser CSRF/session replay/concurrent-session acceptance;
- real PostgreSQL backup + restore drill;
- controlled rollback drill;
- reliable production p50/p95/p99 measurements;
- real Android/iOS/desktop/browser/accessibility acceptance;
- deleting unused indexes based only on a short `pg_stat` window;
- adding broad Supabase RLS policies only to silence INFO lints.

## Product invariants preserved

No change was made to:
- Exam UI or exam scoring logic;
- Student one-device binding policy;
- Models 1–8 policy;
- Question bank content;
- AI approval gate;
- AI generation start policy from Study/Exam;
- paid-service/cost policy.

## Current production boundary

- Render live code commit: `66f9021c4696156f25517848380f5ab9d5b4cdf2`.
- Subsequent client/document commits are not part of that Render backend deployment.
- The new Study/SiteGuide fixes are client-side and should be validated by the next frontend/release deployment checks before being marked live-verified.

## Decision

The project is still not Production-Cleared. The code-level issues discovered in this continuation were fixed and documented; the remaining blockers are evidence/environment gates rather than unaddressed code defects.


### Task 18 — Study viewport geometry
Status: 🟢 code fix completed; live frontend/device visual acceptance remains external.

Root cause found in the current CSS:
- A late override at the end of `client/src/study-premium.css` forced the image area to fixed heights (210px desktop, 185px mobile), overriding the intended flexible layout.
- This explained why the earlier responsive change did not visibly solve the reported Study layout.

Fixed:
- Removed the stale fixed-height override.
- The image/no-image area now uses the remaining flexible row.
- Question area remains fixed-height to prevent text reflow.
- Answer area keeps a bounded fixed-height appropriate for the four-option layout.
- Mobile and short-height breakpoints have dedicated geometry values.
- No navigation or Exam layout was changed.

Commit:
- `d718261b04ff5aebe9222ab2c7bc1e5a52c0a2e`


### Task 27 — PracticalInfo mobile dialog accessibility
Status: 🟢 code fix completed; real screen-reader/device acceptance remains external.

Fixed in `client/src/pages/PracticalInfo.tsx`:
- Added modal semantics with `aria-modal="true"`.
- Added focus trap while the mobile explanation sheet is open.
- Escape closes the sheet.
- Focus returns to the element that opened the sheet.
- No visual redesign and no change to the learning content.

Commits:
- `309796c9006f3c1973f8c83e8c361c3737533de7`
- `49d4f79f4648534ec04ea221386078edac21f6ad`


## Deployment verification — 2026-10-08

### Frontend
Cloudflare Pages production deployment:
- Project: `driving-test`
- Canonical successful deployment: `ceb81bf4-6213-43f1-b697-7d403b16e546`
- Source commit: `527a9e09adb8db3bff4850924c4a2f9a2de90175`
- Build command: `npm run build`
- Build/deploy stages: all success.
- This deployment includes the SiteGuide focus fix, Study audio click-to-play fix, Study flexible image geometry fix, and PracticalInfo dialog focus fix because those commits are ancestors of the deployed commit.

A later documentation commit `82fc5760826fadc0fd3412003e59240c37e94431` triggered another Pages deployment which is still queued; it does not introduce additional application code changes.

### Backend
Render remains:
- Live deployment: `dep-db3igeqjnfac738cu1n0`
- Live backend commit: `66f9021c4696156f25517848380f5ab9d5b4cdf2`
- Health check: `/api/healthz`
- Service: one Free instance, Docker, root `./server`.

### Performance evidence recheck
Render metrics over the inspected 24-hour window returned CPU and memory samples but no HTTP request-count or HTTP latency data, including p50/p95/p99. Therefore production latency remains unproven rather than guessed.

## Current closure state of previously incomplete code items

- Task 18 Study viewport geometry: code-level issue fixed; production frontend build/deploy verified. Real-device visual acceptance remains open.
- Task 20 Site Guide focus handling: code-level accessibility gap fixed; production frontend build/deploy verified. Screen-reader acceptance remains open.
- Task 23 Study audio flow: accidental navigation/first-entry autoplay removed; production frontend build/deploy verified. Real-device audio acceptance remains open.
- Task 27 PracticalInfo mobile dialog focus: code-level accessibility gap fixed; production frontend build/deploy verified. Real-device/screen-reader acceptance remains open.


## Live Revalidation — 2026-10-09 (Tasks 1–85)

The detailed task-66–86 recheck is recorded in `PRODUCTION_AUDIT_66_86.md`. This addendum records the latest evidence without claiming external gates as complete.

- GitHub on current main before this documentation update: `release-check` run `37788431001` passed both client and server jobs; `Secret History Scan` run `37788431063` passed; `API Health Monitor` run `37850950257` passed.
- Read-only Supabase checks: 397 Questions; 397 non-empty QuestionAudios; 0 orphan QuestionAudios; 0 invalid question-core rows; 0 orphan AI images/reviews; 0 duplicate non-empty image hashes; 0 active ExamAttempts; 0 AuthLogs older than 90 days. All 20 public tables have RLS enabled and direct table grants to `anon`/`authenticated` remain absent.
- Seven empty AI-image byte/hash records are all `Rejected` reviews. No repair/delete was performed because those rows are rejected, not published.
- Current database use: about 194 MB; 11 of 60 connections, one active. AI controls remain Audio enabled / Image disabled.
- Current Performance Advisor lists four unused-index INFO findings. `IX_QuestionAiImages_ImageHash` is now observed with one scan; no index or extension was removed.
- The full npm development-tree report has 8 findings (6 high, 2 moderate), while the production/runtime-only npm audit passes. Most offered remediation requires moving from Tailwind CSS 3 to major version 4; the `braces` advisory currently has no patched package release. No major upgrade or hand-edited lockfile was applied without a reproducible local build. Treat full development dependency hygiene as still open.

Still not safely closable with the available evidence: authenticated Student/Admin/device E2E, browser session/CSRF replay, real PostgreSQL backup plus restore to an isolated target, controlled production rollback drill, credible Render p50/p95/p99, and real-device/browser/screen-reader acceptance. See `PRODUCTION_AUDIT_66_86.md`; Task 86 remains CONDITIONAL.



## Incident Stabilization — 2026-10-09 (PR #73 / PR #74)

### Production versions and checks
- PR #73: https://github.com/majxd9/driving-test/pull/73
- Code commit: `d3e49484dd79921b8361db1e7ba7459a9a395f77`.
- Render deployment: `dep-db45l6s9v7es73aaj8fg`, status `live`; this is the current backend code commit.
- PR #73 release-check run `37877871537`: client and server jobs passed. API Health Monitor run `37877871548`: passed. Secret History Scan run `37877871535`: passed.
- PR #74: https://github.com/majxd9/driving-test/pull/74
- Frontend commit: `d69404244701552237d0308068a23bdc65e95cf8`.
- Cloudflare Pages production deployment: `db35973d-8bad-4897-be60-888838a01eb1`, build and deploy stages succeeded.
- The post-deployment Render app-log window from 2026-10-09 03:09–03:20 UTC showed no error-level application logs. HTTP request logs were not exposed by the available Render log query, so this does not substitute for authenticated E2E testing.

### Exam, training and audio fixes now live
- Exam session routes allow `Student` and `Admin`, matching the Admin support/test UI. Each attempt still belongs only to the authenticated identity.
- Entering or refreshing an exam sends `restart: true`; the server resets the one active attempt in place (new expiry/question IDs, empty answers) instead of restoring answers or accumulating abandoned active attempts.
- Exam answer taps update local state immediately. The client submits the answer map once on Finish; the server still validates question membership/answer indices and calculates the result from the database.
- Client API failures now preserve server messages and show meaningful status messages for 401/403/404/409/429/5xx/network failures instead of collapsing all failures to «حدث خطأ غير متوقع».
- The Study/Exam first-entry message is restored. Pressing Play activates the enabled message and continuous question audio; after activation, the next question's audio plays during navigation until Stop is pressed. Stop pauses question audio and plays the disabled message. Browser/device audio acceptance remains external.
- Data integrity check: all 397/397 question audio rows are non-empty and have a plausible MP3 header. The three system prompts are non-empty and have an ID3 header.

### AI-image review and management
- The image-review panel now uses `cache: no-store`, validates HTTP status/content type/non-empty bytes, times out after 15 seconds, and shows a useful error plus an explicit Retry action instead of leaving «جارٍ تحميل الصورة…» indefinitely.
- Database integrity snapshot: 305 AI-image rows; 298 non-empty WebP images; 276 Pending and 22 Approved with valid RIFF/WEBP signatures and review/image hashes matching; 7 Rejected rows have empty image bytes. These 7 remain rejected; do not repair/delete them or generate replacements without an explicit image review decision.
- Existing Admin controls are present for approve/reject, hide/delete AI images, and hide/remove original images. No images were auto-approved, rejected, deleted, or regenerated during this stabilization.

### Still open — do not misreport as passed
- Authenticated Student/Admin end-to-end testing on a real browser is still required. The exact original Student-side “unexpected error” could not be traced to a specific HTTP status because Render HTTP request logs were unavailable. The UI now reveals the real status/detail if it recurs; the Admin exam authorization gap is fixed.
- Real-device testing of first-entry/enable/disable audio and continuous playback is still required.
- The 276 pending images have not all been visually checked for whether they accurately depict their question. Use the one-image-at-a-time Admin review queue; approve only correct images and reject unsuitable ones.
- Diagram placement in the Exam page (currently rendered after the answer options) and other visual-layout issues remain intentionally deferred until the final UI pass, as requested.
- Task 86 / Production Gate remains CONDITIONAL pending authenticated E2E, browser/session replay, isolated PostgreSQL backup/restore, controlled rollback, trustworthy latency percentiles, and mobile/browser/accessibility acceptance.


## Tasks 87–100 — Revalidation checkpoint (2026-10-09)
تفاصيل كل مهمة في `PRODUCTION_AUDIT_87_100.md`. هذه المرحلة أعادت فحوصات القراءة فقط بعد PR #73/#74، ولا تدّعي إغلاق الأدلة التي تحتاج حساباً أو جهازاً فعلياً.

- Latest pre-update main: `58897c67d1c0ab79b4001b39aa905b3dc32f27ef`; Render live app commit: `d3e49484dd79921b8361db1e7ba7459a9a395f77`; Cloudflare production deploy of frontend fixes succeeded (deployment UUID intentionally omitted after a Gitleaks false positive).
- Live database: 397 Questions; 397 non-empty QuestionAudios; invalid question-core rows 0; AI image rows 305 (298 with bytes); latest review state 275 pending / 23 approved / 7 rejected.
- Latest read-only check found 1 active exam attempt and 1 expired-incomplete attempt; no duplicate active student groups. Neither row was modified.
- RLS: all 20 public tables enabled, 0 direct table grants to anon/authenticated; Security Advisor has 20 expected INFO notices. Performance Advisor has four unused-index INFO notices; indexes preserved.
- October `AiGenerationUsage` counter = 704. Source default `AI_MONTHLY_GENERATION_LIMIT` is 600 but runtime can override it; effective environment value needs manual confirmation. Audio generation remains enabled and image generation disabled.
- Render logs contained three PostgreSQL connection errors with no HTTP request correlation. Npgsql transient retry is already configured; root cause for the original student-side error is not proven.
- Latest release-check passed; latest Secret History Scan flagged Cloudflare's public deployment UUID as a `cloudflare-api-key` false positive. The UUID was removed from the updated continuity lines; final closure depends on the new scan result.
- Remaining manual gates are gathered in Task 99 of `PRODUCTION_AUDIT_87_100.md`. Overall release gate remains CONDITIONAL.

## Authoritative revalidation after PR #78 — Tasks 1–100 — 2026-10-09

File name retained for links; latest all-task register: PRODUCTION_AUDIT_1_100_REVALIDATION.md.

- Latest code/UI baseline reviewed: f2ec2ce46451829877961fe29ae6ea1e0c0d6d6e. PR #78 changes the Home/Study/Exam presentation only; no scoring/API/database change was declared in its PR description. Manual UI acceptance is required against this current production frontend.
- Current release-check 37910063018, Gitleaks scan 37910062975, and Health Monitor 37910063012 passed. Cloudflare production deployment for f2ec2ce is success.
- Current live data: 397 valid questions, 397 non-empty QuestionAudios, 305 AI image rows (298 non-empty), reviews 273 pending / 25 approved / 7 rejected, October AiGenerationUsage=709, DB ~206 MB, connections 24/60, active ExamAttempts=0, expired-incomplete=1.
- Integrity: invalid question core=0; orphan audio/images/reviews/jobs=0; image header errors=0; review/image content-hash mismatches=0; duplicate image hash groups=0; Approved image empty=0; AuthLogs older than 90 days=0.
- RLS 20/20 public tables enabled; direct grants to anon/authenticated=0. Security Advisor has 20 INFO findings and Performance Advisor 3 unused-index INFO findings; none were silenced or auto-deleted.
- npm full development audit has 7 current findings (5 High, 2 Moderate, 0 Critical). Runtime-only npm audit passes; the full development tree is not yet fully clean.
- Overall release decision stays NOT RELEASE-READY / CONDITIONAL until the master audit's manual gates and post-checks finish.