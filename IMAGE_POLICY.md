# Image policy

The bundled `Traffic_Signals_Images` reference pack is the canonical source for all matching traffic-sign images.

- Matching filenames (`sign_01` ... `sign_99`, `sign_200` ... `sign_214`) use the reference PNG exactly as supplied.
- A WebP derivative is bundled beside each reference PNG for fast delivery.
- Older V1 images remain only when the reference pack has no matching image.
- The Admin "Upload images" area was removed because production content uses the bundled, controlled image library. This avoids accidental mismatches and unnecessary storage/uploads.
- Question editing still accepts an image path so existing/custom content remains compatible; use paths from `/signs/`.


## Runtime image optimization (2026-09-13)
The supplied image archive remains the canonical source for image selection. The deployed client keeps optimized WebP derivatives for runtime; duplicate PNG staging copies are not shipped. SVG diagram assets are retained. Exact duplicate mechanic/sign assets 210-214 are represented once under the canonical signs library.
