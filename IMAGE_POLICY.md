# Image policy

The supplied/current traffic-sign image library is the canonical source for question images.

- Question images may resolve only to the canonical `/signs/sign_01.webp` ... `/signs/sign_99.webp` and `/signs/sign_200.webp` ... `/signs/sign_214.webp` assets.
- Legacy V1 images are **not** a fallback and must never be returned when a canonical image is unavailable.
- Old `/mechanic/mechanic_*` and other legacy image paths are rejected at runtime; the app must not silently substitute them.
- AI-created explanatory visuals are a separate exception: `/signs/sign_300.svg` ... `/signs/sign_306.svg` are retained and rendered only as question explanations/diagrams.
- The Admin "Upload images" area remains removed because production content uses the controlled image library. This avoids accidental mismatches and unnecessary storage/uploads.
- Question editing still accepts an image path for compatibility, but unsupported/legacy paths do not render in the student experience.

## Runtime image optimization (2026-09-13)
Canonical question images use bundled WebP assets for fast delivery. The exam preloads the current question and the next questions, while AI explanatory SVGs stay lightweight and load only when their explanation is shown. No legacy image fallback is used.
