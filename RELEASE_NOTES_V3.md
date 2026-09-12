# Driving Test V3 — Content & Media Upgrade

## Question bank
- Total: 397 questions.
- Previous bank: 347 questions.
- Added: 50 new professional questions.
- New distribution: 20 Ser / 15 Ishara / 15 Mechanic.
- 15 of the new questions use the supplied reference sign images.
- Each new question has validated options and a valid correct answer index.

## Images
- The supplied `Traffic_Signals_Images` archive is the primary image source.
- 110 supplied PNG reference files were copied byte-for-byte into `client/public/signs`.
- Missing files outside that reference set remain from the previous V1/V2 asset set.
- WebP copies were generated for the supplied PNG assets so the existing optimized-image component can serve WebP first with PNG fallback.

## Database compatibility
- `DbSeeder` is now non-destructive for questions.
- On an existing database, missing questions are appended by unique question text.
- Existing questions and attempts are preserved.

## QA checks
- `questions.json` parses successfully.
- 397 entries are present.
- The 50 newly added questions are unique as a set.
- All question correct-answer indices are within option bounds.
- All referenced question images exist in the frontend public assets.
- All supplied reference images are exact copies in the project asset directory.

## Build environment note
The current execution environment does not provide the .NET SDK and does not permit completing an npm dependency installation from the network, so a full production build could not be executed here. Static/content validation was performed instead.
