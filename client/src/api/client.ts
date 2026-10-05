// Production fallback keeps the app connected to the known Render API even if
// VITE_API_URL was omitted from a static-site build. The environment value still wins.
const configuredApiBase = String(import.meta.env.VITE_API_URL || '').trim();
const API_BASE = (configuredApiBase || 'https://driving-test-evd0.onrender.com').replace(/\/+$/, '');

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers: { ...(options.body == null ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
  if (!res.ok) { let message = 'حدث خطأ غير متوقع'; try { const body = await res.json(); message = Array.isArray(body) ? body.join('، ') : (body.message || message); } catch { /* no JSON body */ } throw new Error(message); }
  return res.blob();
}

type QuestionCacheEntry = {
  value: import('../types').Question[];
  expiresAt: number;
};

const questionCache = new Map<string, QuestionCacheEntry>();
const questionInflight = new Map<string, Promise<import('../types').Question[]>>();
const QUESTION_CACHE_TTL_MS = 30_000;

function normalizeQuestionCategory(value: unknown): import('../types').QuestionCategory {
  if (value === 1 || String(value).toLowerCase() === 'ishara') return 'Ishara';
  if (value === 2 || String(value).toLowerCase() === 'mechanic') return 'Mechanic';
  return 'Ser';
}

function normalizeQuestions(items: import('../types').Question[]): import('../types').Question[] {
  return items.map(item => ({
    ...item,
    category: normalizeQuestionCategory((item as unknown as { category?: unknown }).category),
  }));
}

async function getCachedQuestions(category: 'Ser' | 'Ishara' | 'Mechanic', force = false): Promise<import('../types').Question[]> {
  const now = Date.now();
  const cached = questionCache.get(category);
  if (!force && cached && cached.expiresAt > now) return cached.value;
  const existing = questionInflight.get(category);
  if (!force && existing) return existing;
  const promise = request<import('../types').Question[]>(`/api/questions?category=${category}`)
    .then(value => {
      const normalized = normalizeQuestions(value);
      questionCache.set(category, { value: normalized, expiresAt: Date.now() + QUESTION_CACHE_TTL_MS });
      return normalized;
    })
    .finally(() => questionInflight.delete(category));
  questionInflight.set(category, promise);
  return promise;
}

function getDeviceId(): string { const key = 'drv_device_id'; let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers: { ...(isFormData || options.body == null ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
  if (!res.ok) { let message = 'حدث خطأ غير متوقع'; try { const body = await res.json(); message = Array.isArray(body) ? body.join('، ') : (body.message || message); } catch { /* no JSON body */ } throw new Error(message); }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (userName: string, password: string) => { const body = new URLSearchParams({ userName, password, deviceId: getDeviceId() }); return request<import('../types').LoginResponse>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); },
  warmup: () => request<{ status: string }>('/api/healthz', { method: 'GET', cache: 'no-store' }),
  me: () => request<import('../types').LoginResponse>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') => getCachedQuestions(category),
  prefetchQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') => { void getCachedQuestions(category).catch(() => undefined); },
  refreshQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') => getCachedQuestions(category, true),
  getExamQuestions: (modelId: number) => request<import('../types').ExamQuestion[]>(`/api/questions/exam/${modelId}`),
  submitExamAttempt: (data: { modelId: number; answers: Record<number, number> }) => request<import('../types').ExamSubmission>('/api/exam-attempts', { method: 'POST', body: JSON.stringify(data) }),
  admin: {
    listStudents: () => request<import('../types').Student[]>('/api/admin/students'),
    createStudent: (data: { userName: string; fullName: string; password: string; accessDays: number | null }) => request<import('../types').Student>('/api/admin/students', { method: 'POST', body: JSON.stringify(data) }),
    setStatus: (id: string, isActive: boolean) => request<void>(`/api/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    resetDevice: (id: string) => request<void>(`/api/admin/students/${id}/reset-device`, { method: 'POST' }),
    deleteStudent: (id: string) => request<void>(`/api/admin/students/${id}`, { method: 'DELETE' }),
    getLogs: (id: string) => request<import('../types').AuthLog[]>(`/api/admin/students/${id}/logs`),
    getAttempts: (id: string) => request<import('../types').ExamAttempt[]>(`/api/admin/students/${id}/attempts`),
    listQuestions: () => request<import('../types').Question[]>('/api/admin/questions'),
    createQuestion: (data: Omit<import('../types').Question, 'id'>) => request<import('../types').Question>('/api/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
    updateQuestion: (id: number, data: Omit<import('../types').Question, 'id'>) => request<import('../types').Question>(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuestion: (id: number) => request<void>(`/api/admin/questions/${id}`, { method: 'DELETE' }),
    generateQuestionAudio: (id: number, force = false) => request<{ questionId:number; audioUrl?:string|null; generated:boolean; contentHash:string; jobId:number; status:string }>(`/api/admin/questions/${id}/generate-audio`, { method:'POST', body:JSON.stringify({ force }) }),
    generateQuestionImage: (id: number, force = false) => request<{ questionId:number; generated:boolean; contentHash:string; jobId:number; status:string }>(`/api/admin/questions/${id}/generate-image`, { method:'POST', body:JSON.stringify({ force }) }),
    aiGenerationStatus: () => request<import('../types').AiGenerationOverview>('/api/admin/ai-generation/status'),
    aiGenerationControl: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control'),
    startAllAiGeneration: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/all/start', { method:'POST' }),
    stopAllAiGeneration: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/all/stop', { method:'POST' }),
    // The admin button now runs the repair/reconcile pipeline, not just a flag toggle.
    startAudioGeneration: () => request<unknown>('/api/admin/ai-generation/audio-repair/reconcile', { method:'POST' }),
    reconcileAudioGeneration: () => request<{ created:number; closedHistoricalJobs:number; stored:number; status:{total:number;stored:number;missing:number;pending:number;processing:number;failed:number} }>('/api/admin/ai-generation/audio-repair/reconcile', { method:'POST' }),
    audioGenerationRepairStatus: () => request<{ total:number;stored:number;missing:number;pending:number;processing:number;failed:number }>('/api/admin/ai-generation/audio-repair/status'),
    stopAudioGeneration: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/audio/stop', { method:'POST' }),
    startImageGeneration: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/image/start', { method:'POST' }),
    setImageProvider: (provider:string) => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/image/provider', { method:'POST', body:JSON.stringify({ provider }) }),
    stopImageGeneration: () => request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/image/stop', { method:'POST' }),
    retryFailedAi: (type:'audio'|'image') => request<import('../types').AiGenerationEnqueueResult>('/api/admin/ai-generation/retry-failed/'+type, { method:'POST' }),
    importAiImagesZip: (file: File) => { const form = new FormData(); form.append('file', file, file.name); return request<import('../types').AiImageImportResult>('/api/admin/ai-generation/import-zip', { method: 'POST', body: form }); },
    completedAiImages: (limit = 24) => request<import('../types').CompletedAiImageItem[]>(`/api/admin/ai-generation/completed-images?limit=${limit}`),
    nextAiImageReview: () => request<import('../types').AiImageReviewItem|null>('/api/admin/ai-generation/review/next'),
    approveAiImageReview: (id:number) => request<import('../types').AiImageReviewItem|null>(`/api/admin/ai-generation/review/${id}/approve`, { method:'POST' }),
    rejectAiImageReview: (id:number) => request<import('../types').AiImageReviewItem|null>(`/api/admin/ai-generation/review/${id}/reject`, { method:'POST' }),
    hideAiImageReview: (id:number) => request<{hidden:boolean;questionId:number}>(`/api/admin/ai-generation/review-image/${id}/hide`, { method:'POST' }),
    deleteAiImageReview: (id:number) => request<{deleted:boolean;questionId:number}>(`/api/admin/ai-generation/review-image/${id}`, { method:'DELETE' }),
    hideQuestionImage: (id:number) => request<{hidden:boolean;questionId:number}>(`/api/questions/${id}/image/hide`, { method:'POST' }),
    removeQuestionImage: (id:number) => request<{deletedFromQuestion:boolean;questionId:number}>(`/api/questions/${id}/image`, { method:'DELETE' }),
    resetAllAiImageReviews: () => request<{ reset:number }>('/api/admin/ai-generation/review/reset-all', { method:'POST' }),
    enqueueAllAudio: (retryFailed = false, regenerateCompleted = false) => request<import('../types').AiGenerationEnqueueResult>('/api/admin/ai-generation/audio', { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    enqueueAllImages: (retryFailed = false, regenerateCompleted = false) => request<import('../types').AiGenerationEnqueueResult>('/api/admin/ai-generation/image', { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    enqueueAllAi: (retryFailed = false, regenerateCompleted = false) => request<unknown>('/api/admin/ai-generation/all', { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    resumeAiGeneration: () => request<import('../types').AiGenerationOverview>('/api/admin/ai-generation/resume', { method:'POST' }),
    testImageProvider: () => request<import('../types').ImageProviderTestResult>('/api/admin/ai-generation/test-image-provider', { method:'POST' }),
    testImageGeneration: (id:number) => requestBlob(`/api/admin/ai-generation/test-image-generation/${id}`, { method:'POST' }),
    startAiTest: (data:{questionId:number;type:'image'|'audio';provider:string}) => request<import('../types').AiTestRun>('/api/admin/ai-generation/test/start', { method:'POST', body:JSON.stringify(data) }),
    getAiTest: (id:number) => request<import('../types').AiTestRun>(`/api/admin/ai-generation/test/${id}`),
    approveAiTest: (id:number) => request<import('../types').AiTestRun>(`/api/admin/ai-generation/test/${id}/approve`, { method:'POST' }),
    rejectAiTest: (id:number) => request<import('../types').AiTestRun>(`/api/admin/ai-generation/test/${id}/reject`, { method:'POST' }),
    geminiStatus: () => request<{ configured:boolean; model:string; endpoint:string }>('/api/admin/gemini/status'),
    geminiGenerate: (prompt:string, systemInstruction?:string, previousInteractionId?:string) => request<{ text:string; interactionId?:string|null; model:string }>('/api/admin/gemini/generate', { method:'POST', body:JSON.stringify({ prompt, systemInstruction, previousInteractionId }) }),
    retryAiJob: (jobId:number) => request<void>(`/api/admin/ai-generation/jobs/${jobId}/retry`, { method:'POST' }),
    getQuestionAudioStatus: (id: number) => request<{ questionId:number; stored:boolean; bytes:number; currentHash:string; storedHash?:string|null; hashMatches:boolean; playable:boolean; audioUrl?:string|null }>(`/api/admin/questions/${id}/audio-status`),
    analytics: () => request<import('../types').Analytics>('/api/admin/analytics'),
  },
};