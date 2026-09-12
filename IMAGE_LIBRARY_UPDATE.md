# Image Library Update — V5

- Source archive: `Downloaded_Site_Images.zip`
- Canonical source images: 163 PNGs.
- Canonical traffic-sign images: 137.
- Canonical mechanic images: 26.
- WebP derivatives generated for every canonical image.
- Existing question image references were normalized to canonical WebP paths where the source archive contains the same numbered image.
- Missing source-only legacy references 236–245 are retained as fallback because the new archive does not contain those exact images.
- Added relevant canonical images to questions that previously had no image when a direct visual match existed.

## Question image coverage

| Category | Questions | With image |
|---|---:|---:|
| قواعد السير | 178 | 43 |
| الإشارات المرورية | 156 | 156 |
| الميكانيك | 63 | 48 |
| **Total** | **397** | **247** |

## UI count

The home page now displays:
- قواعد السير: 178 سؤال
- الإشارات المرورية: 156 سؤال
- الميكانيك: 63 سؤال
- Total: 397 سؤالاً

## Image policy

The uploaded image archive is the primary bundled image library. Images are served as WebP for performance while the original PNGs are retained as canonical source assets. Legacy images are used only when the requested exact image is absent from the new source archive.
