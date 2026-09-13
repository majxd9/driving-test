# Image Library Update — V6

- Source archive: `Downloaded_Site_Images.zip`
- Current uploaded source images: 163 PNGs (137 traffic-sign/road images + 26 mechanic images).
- WebP derivatives are the runtime format for fast delivery.
- Question image paths resolve only to assets present in the current uploaded library.
- Legacy/V1 images are never a fallback.
- Source-only references `236–245` are not displayed as sign-question images because those exact images are not part of the current uploaded source pack; this prevents an old/wrong image from appearing.
- AI-created explanatory visuals `300–306` remain available as a separate diagram-only set.

## Verified important mappings

- `sign_20.webp` → livestock/animal crossing warning used by the animal-crossing sign question.
- `sign_55.webp` → no trucks sign used by the question “ممنوع مرور السيارات الشاحنة”.
- `sign_213.webp` → ignition coil (البوبين) from the current uploaded mechanic source pack.
- `sign_100.webp` ... `sign_131.webp` are part of the current uploaded sign pack and are valid runtime images.
- `sign_210.webp` ... `sign_214.webp` are current mechanic-source visuals stored in the signs directory.
- `mechanic_215.webp` ... `mechanic_235.webp` are current mechanic-source visuals stored in the mechanic directory.

## Runtime image performance

The browser receives the bundled WebP derivatives instead of the large source PNGs. The timed exam eagerly loads the current question image and preloads the next questions, while immutable one-year caching is enabled for `/signs/*` and `/mechanic/*`. No legacy fallback is used.
