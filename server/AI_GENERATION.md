# AI Generation

هذا النظام يضيف طبقة توليد مسبق للصوت والصورة من دون تغيير مسار الطالب.

## الصوت

المزود الحالي يبقى ElevenLabs عند ضبط:

QUESTION_AUDIO_PROVIDER=elevenlabs

المزود المحلي هو Piper عبر HTTP:

QUESTION_AUDIO_PROVIDER=local
QUESTION_AUDIO_LOCAL_URL=http://127.0.0.1:5000
QUESTION_AUDIO_LOCAL_VOICE=ar_JO-kareem-medium
QUESTION_AUDIO_FFMPEG_PATH=ffmpeg
QUESTION_AUDIO_MP3_BITRATE=128k

Piper يجب تشغيله كخدمة مستقلة تبقى عاملة أثناء الـBulk Generation. الواجهة الحالية تستقبل WAV من /synthesize ثم يحولها worker إلى MP3 حتى تبقى QuestionAudio وAudio URLs الحالية كما هي.

لا يتم تضمين نموذج Piper داخل المستودع. استخدم الصوت العربي من حزمة Piper الرسمية وراجع MODEL_CARD الخاص بالصوت قبل استخدامه في منتج مدفوع؛ ترخيص المشروع وحده لا يعني أن كل voice model له الشروط نفسها.

## الصور

الافتراضي هو عدم تشغيل صور AI:

QUESTION_IMAGE_PROVIDER=none

المزود المحلي المدعوم هو ComfyUI:

QUESTION_IMAGE_PROVIDER=comfyui
QUESTION_IMAGE_COMFYUI_URL=http://127.0.0.1:8188
QUESTION_IMAGE_MODEL_FILENAME=<checkpoint-file-name>
QUESTION_IMAGE_PROMPT_NODE_ID=6
QUESTION_IMAGE_PROMPT_FIELD=text
QUESTION_IMAGE_NEGATIVE_NODE_ID=7
QUESTION_IMAGE_NEGATIVE_FIELD=text
QUESTION_IMAGE_WIDTH=768
QUESTION_IMAGE_HEIGHT=512
QUESTION_IMAGE_STEPS=24
QUESTION_IMAGE_CFG=7
QUESTION_IMAGE_TIMEOUT_SECONDS=1800
QUESTION_IMAGE_POLL_MS=2000

يمكن وضع workflow JSON مخصص في QUESTION_IMAGE_WORKFLOW_JSON إذا كان checkpoint المحلي لا يستخدم العقد الافتراضية.

لا تُستبدل ImageUrl. صور AI محفوظة مستقلة في QuestionAiImages وتظهر عبر AiImageUrl.

## Queue

AiGenerationJobs هي مصدر الحقيقة الدائم:

- QuestionId
- JobType: Audio / AiImage
- Status: Pending / Processing / Completed / Failed
- Attempts
- ContentHash
- Priority
- CreatedAt / UpdatedAt
- StartedAt / CompletedAt
- NextAttemptAt
- LockedUntil
- LastError

يوجد unique index على QuestionId + JobType + ContentHash لمنع التكرار.

كل مهمة تعاد محاولتها حتى 3 مرات بمهلة متزايدة: 30 ثانية ثم دقيقتان ثم 10 دقائق. بعد ذلك تصبح Failed.

Processing jobs ذات القفل المنتهي تعاد إلى Pending عند إعادة تشغيل worker.

## السؤال الجديد

حفظ السؤال لا ينتظر AI. بعد SaveChanges ينشأ Audio Job، وينشأ AI Image Job فقط عندما يحقق السؤال قاعدة التوليد البصري.

عند تعديل السؤال يتغير ContentHash، لذلك لا تُستخدم نتيجة قديمة للسؤال المعدل.

## التشغيل

Bulk endpoints لا تنفذ التوليد داخل HTTP request. هي تضيف Jobs فقط وتعيد النتيجة مباشرة، ثم AiGenerationWorker ينفذ Jobs تسلسلياً.

أوامر الإدارة:

GET  /api/admin/ai-generation/status
POST /api/admin/ai-generation/audio
POST /api/admin/ai-generation/image
POST /api/admin/ai-generation/all
POST /api/admin/ai-generation/resume
POST /api/admin/ai-generation/jobs/{id}/retry

التوليد لا يبدأ من Login، ولا من Study/Exam، ولا من Next/Previous.

## تخزين الصورة

الصور المولدة الحالية محفوظة في PostgreSQL مثل الصوت لتجنب الاعتماد على filesystem مؤقت. endpoint العرض:
GET /api/questions/{id}/ai-image

الصورة تُخدم فقط عندما يطابق ContentHash الحالي للسؤال.

## النماذج العربية

Piper الحالي مشروع محلي سريع لـTTS، لكن ترخيص voice model نفسه يجب مراجعته في MODEL_CARD. لا يتم نسخ النموذج أو تثبيته تلقائياً داخل Docker.

## ComfyUI

ComfyUI هو المزود المحلي للصور لأنه يوفر Queue/API/workflow architecture محلية. النموذج نفسه ليس جزءاً من المشروع؛ يجب تثبيته على الجهاز المشغل لخدمة ComfyUI ومراعاة ترخيصه.

إشارات المرور الرسمية لا يعاد رسمها كبديل عن الأصل الرسمي. Prompt الصورة يطلب سياق الطريق أو الموقف فقط ويمنع إعادة اختراع رمز رسمي.
