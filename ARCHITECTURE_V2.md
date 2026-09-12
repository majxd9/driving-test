# Driving Test V2 — Architecture & QA Notes

## Frontend structure
- `App.tsx`: lazy route splitting so the admin and exam bundles are not downloaded on login.
- `pages/Home.tsx`: premium dashboard / training entry point.
- `pages/Login.tsx`: secure login + animated 5-question sample.
- `pages/Exam.tsx`: one API call for exactly 30 questions, instant next-image preloading, timer and answer map.
- `pages/Result.tsx`: complete post-exam review: correct, wrong, unanswered, correct answer and explanation.
- `components/OptimizedImage.tsx`: WebP `<picture>` source, lazy loading, async decoding, skeleton and fallback.
- `components/SiteGuide.tsx`: animated "شرح الموقع" modal.

## Admin structure
The existing admin dashboard stays role-protected at `/admin` and contains:
1. KPI / analytics overview.
2. Student management.
3. Login security logs.
4. Exam attempt history.
5. Question bank editor.
6. Question media upload and diagram metadata.

## Performance changes actually implemented
1. Exam questions are fetched from `/api/questions/exam/{modelId}` in one request instead of three category requests returning the whole 397-question bank.
2. Exam selection is deterministic per model with a fixed 12/12/6 split.
3. Images use WebP automatically when a matching `.webp` exists, with native `loading="lazy"`, `decoding="async"` and `fetchPriority="high"` only for the current/first image.
4. Browser cache headers mark versioned/static media as immutable for one year.
5. ASP.NET Core response compression is enabled for JSON/CSS/JS/SVG.
6. Uploaded media receives long-term cache headers.
7. Skeleton states avoid layout jumps while images decode.
8. `prefers-reduced-motion` is honored for accessibility and smoother low-power devices.

## Security / device policy
- Student: first successful login binds a device id; another device is rejected until the admin resets the device.
- Admin: **not device-bound** and can authenticate from any phone/PC.
- Passwords remain under ASP.NET Core Identity hashing.
- JWT remains in an HttpOnly Secure cookie.
- Failed logins are written to `AuthLogs`.

## Result review
The test completion route passes a review payload containing every asked question and the chosen answer. The result page visibly separates:
- questions answered incorrectly;
- questions answered correctly;
- questions left unanswered;
- the correct answer and explanation for each relevant item.

This fixes the previous behavior where the result page only displayed numeric totals.

## Image strategy for future question authoring
Every question should have one canonical `ImageUrl` and, for complex reasoning questions, optional `DiagramType`, `DiagramUrl`, `DiagramTitle`, `DiagramDescription`. The admin editor can therefore store a precise visual explanation alongside the question rather than attaching generic images.

Recommended authoring rule: image/diagram must be semantically tied to the exact question. Prefer a clean sign crop, lane diagram, priority arrows, distances, or mechanical schematic over decorative stock imagery.

## Core image pattern
```tsx
<picture>
  <source srcSet={webp} type="image/webp" sizes={sizes} />
  <img
    src={src}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
  />
</picture>
```

## Interactive guide pattern
```tsx
<button className="guide-button" onClick={() => setOpen(true)}>
  <span className="guide-spark">✦</span>
  <span>شرح الموقع</span>
  <span className="guide-pulse" />
</button>
```
