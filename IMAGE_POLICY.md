# Image policy

The supplied/current `Downloaded_Site_Images.zip` library is the canonical source for student-facing question images.

- Traffic-sign assets: `/signs/sign_01.webp` ... `/signs/sign_131.webp` and `/signs/sign_200.webp` ... `/signs/sign_205.webp`.
- Mechanic assets: the supplied `210..235` set. In the deployed client `210..214` are served from `/signs/` and `215..235` from `/mechanic/`, using the same current uploaded source pack.
- The old V1 image library is never a fallback and is never substituted when an image is unavailable.
- AI-created explanatory visuals are a separate exception: `/signs/sign_300.svg` ... `/signs/sign_306.svg` are retained only for visual explanations.
- Traffic-sign questions whose image reference is outside the current canonical library are filtered out of Study/Exam so a student never receives an image-less sign question.
- The Admin "Upload images" area remains removed because production content uses the controlled image library.

## Runtime image optimization (2026-09-13)

- Source PNG artwork is delivered as bundled WebP derivatives for normal question images.
- The timed exam resolves images to local bundled assets, eagerly loads the current question, and preloads the next questions so changing questions does not wait for an image request.
- `/signs/*` and `/mechanic/*` are cached for one year with `immutable` cache headers.
- No legacy image fallback is used.
