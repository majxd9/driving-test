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

مزود Render السحابي المدعوم هو Hugging Face Inference Providers. هذا هو الخيار المناسب عندما يكون الـAPI على Render ولا توجد خدمة ComfyUI عامة يمكن الوصول إليها:

QUESTION_IMAGE_PROVIDER=huggingface
QUESTION_IMAGE_HF_TOKEN=<your-hugging-face-token>
QUESTION_IMAGE_HF_PROVIDER=fal-ai
QUESTION_IMAGE_HF_MODEL=black-forest-labs/FLUX.1-schnell

يحتاج الـtoken إلى صلاحية Inference Providers. بالنسبة لـFLUX.1-schnell يستخدم مسار Fal مع المعرّف provider-specific model التالي: fal-ai/flux/schnell. الاستجابة تكون JSON تحتوي رابط الصورة؛ الخادم ينزّل الصورة ثم يحفظها في QuestionAiImages. لا يتم حفظ الـtoken في المستودع. 

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
QUESTION_IMAGE_STEPS=4
QUESTION_IMAGE_CFG=0
QUESTION_IMAGE_TIMEOUT_SECONDS=1800
QUESTION_IMAGE_POLL_MS=2000

يمكن وضع workflow JSON مخصص في QUESTION_IMAGE_WORKFLOW_JSON إذا كان checkpoint المحلي لا يستخدم العقد الافتراضية.

لا تُستبدل ImageUrl. صور AI محفوظة مستقلة في QuestionAiImages وتظهر عبر AiImageUrl.

## حد التوليد الشهري

يوجد حد حماية على **محاولات التوليد الفعلية** حتى لا يستهلك AI الميزانية بلا سقف. الإعداد الافتراضي هو 600 محاولة توليد شهرياً، ويمكن تغييره عبر:

AI_MONTHLY_GENERATION_LIMIT=600

العداد مستقل عن عدد الطلاب، لأن الصوت أو صورة AI تُولد مرة واحدة وتُخزن ثم يستخدمها كل الطلاب. عند بلوغ الحد تتوقف Jobs الجديدة مؤقتاً، وتعود تلقائياً مع بداية الشهر التالي. الحد يشمل ElevenLabs وPiper وComfyUI لأنه يُطبق قبل استدعاء المزود مباشرة.

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

ComfyUI هو المزود المحلي للصور لأنه يوفر Queue/API/workflow architecture محلية. لا تستخدم `127.0.0.1` أو `localhost` من Render للوصول إلى ComfyUI الموجود على جهازك؛ هذه العناوين تشير إلى بيئة Render نفسها. النموذج نفسه ليس جزءاً من المشروع؛ يجب تثبيته على الجهاز المشغل لخدمة ComfyUI ومراعاة ترخيصه.

إشارات المرور الرسمية لا يعاد رسمها كبديل عن الأصل الرسمي. Prompt الصورة يطلب سياق الطريق أو الموقف فقط ويمنع إعادة اختراع رمز رسمي.


## Eden AI (اختياري)

يمكن تشغيل Eden AI كطبقة موحّدة لمولدات الصوت والصورة، مع مزود أساسي ومزودين احتياطيين. الاستدعاءات تتم من الخادم فقط، ولا يوضع المفتاح في الواجهة أو المستودع.

الصوت:

QUESTION_AUDIO_PROVIDER=edenai
EDENAI_API_KEY=<your-eden-ai-key>
EDENAI_AUDIO_PROVIDER=elevenlabs
EDENAI_AUDIO_FALLBACK_PROVIDERS=google
EDENAI_AUDIO_LANGUAGE=ar
EDENAI_AUDIO_OPTION=MALE

الصورة:

QUESTION_IMAGE_PROVIDER=edenai
EDENAI_API_KEY=<your-eden-ai-key>
EDENAI_IMAGE_PROVIDER=<primary-provider>
EDENAI_IMAGE_FALLBACK_PROVIDERS=<fallback-provider-1>,<fallback-provider-2>

مثال البنية:
المزود الأساسي → fallback 1 → fallback 2

Eden AI يستخدم `providers` للمزود الأساسي و`fallback_providers` للمزودين الاحتياطيين. المنصة تدعم سلسلة fallback في الاستدعاءات المتزامنة، لكن توثيق Eden AI يوضح أن fallback_providers غير متاح على endpoints غير المتزامنة؛ لذلك هذا المشروع يستخدم استدعاء Eden المتزامن داخل الـworker الخلفي، وليس داخل طلب الطالب.

عند تفعيل Eden AI لا يتغير مسار الطالب: الـBulk Generation ينشئ Jobs فقط، وAiGenerationWorker ينفذ الطلب ويحفظ الناتج في نفس QuestionAudios / QuestionAiImages الحاليين.

فحص مزود الصور من لوحة الإدارة يتحقق من الوصول إلى Eden AI فقط ولا ينفذ توليداً مدفوعاً. يجب التأكد من أسماء المزودين المتاحة فعلياً في حساب Eden AI قبل وضعها في متغيرات البيئة.

المسار الحالي لا يزيل Hugging Face أو ElevenLabs أو ComfyUI. إبقِ الإعدادات القديمة كما هي، ولا تبدّل إلى `edenai` إلا بعد وضع `EDENAI_API_KEY` وباقي الإعدادات المطلوبة.

## Gemini API

Gemini is connected only from the ASP.NET backend through Google's current Interactions API. The API key is never exposed to the React client and is not stored in Git.

Required Render/server environment variables:

GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.8-flash

Optional timeout:

GEMINI_TIMEOUT_SECONDS=90

Protected admin endpoints:

GET  /api/admin/gemini/status
POST /api/admin/gemini/generate

Example request body:

{
  "prompt": "اكتب سؤالاً تجريبياً عن قواعد السير في سوريا.",
  "systemInstruction": "أنت مساعد لإنشاء محتوى تدريبي دقيق باللغة العربية."
}

The generate endpoint is Admin-only and calls Gemini directly from the server. It is separate from the existing ElevenLabs, Hugging Face, ComfyUI, and Eden AI generation queues, so enabling Gemini does not change the current student training or exam flow.

The API uses the Interactions endpoint:
https://generativelanguage.googleapis.com/v1beta/interactions

Do not put GEMINI_API_KEY in the frontend VITE_* variables, source code, GitHub, or database.

