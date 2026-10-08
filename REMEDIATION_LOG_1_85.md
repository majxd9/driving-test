# Remediation Log — Tasks 1–85 — 2026-10-08

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
