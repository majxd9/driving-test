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
