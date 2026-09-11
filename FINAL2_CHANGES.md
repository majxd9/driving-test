# Rukhsati final 2 — requested improvements

- New Traffic_Signals_Images assets are the primary source for the 110 supplied sign images, converted to optimized WebP with backgrounds cleaned; the existing library remains as fallback for the rest.
- Audited every image URL referenced by the 347-question client bank: 173 referenced image files, 173/173 present and non-empty after the repair.
- Repaired `sign_21.webp`, which was previously a zero-byte file.
- Last exam navigation action ends the 30-question exam and shows an in-exam completion screen with correct / wrong / unanswered counts.
- Final result page shows the questions answered incorrectly, the student answer, correct answer, and explanation.
- Exam remains exactly 30 questions: 12 traffic rules + 12 signs + 6 mechanics.
- Login page redesigned and destination chunks are preloaded; API warm-up starts from the login page to hide a sleeping-backend cold start.
- Server enables response compression, one-week caching for static media, no-tracking question reads, and batches first-device binding with the successful login audit write to remove a DB round trip on first login.
- Image requests use a version query to avoid stale browser caches after media updates.
