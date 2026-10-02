// Production fallback keeps the app connected to the known Render API even if
// VITE_API_URL was omitted from a static-site build. The environment value still wins.
const configuredApiBase = String(import.meta.env.VITE_API_URL || '').trim();
const API_BASE = (configuredApiBase || 'https://driving-test-evd0.onrender.com').replace(/\/+$/, '');

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

function getDeviceId(): string {
  const key = 'drv_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData || options.body == null ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'حدث خطأ غير متوقع';
    try {
      const body = await res.json();
      message = Array.isArray(body) ? body.join('، ') : (body.message || message);
    } catch { /* no JSON body */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (userName: string, password: string) => {
    const body = new URLSearchParams({
      userName,
      password,
      deviceId: getDeviceId(),
    });
    return request<import('../types').LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },
  // يوقظ الـAPI أثناء وجود المستخدم على شاشة الدخول، بدلاً من انتظار الضغط على زر الدخول.
  warmup: () =>
    request<{ status: string }>('/api/healthz', {
      method: 'GET',
      cache: 'no-store',
    }),
  me: () => request<import('../types').LoginResponse>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') =>
    request<import('../types').Question[]>(`/api/questions?category=${category}`),
  getExamQuestions: (modelId: number) =>
    request<import('../types').ExamQuestion[]>(`/api/questions/exam/${modelId}`),
  submitExamAttempt: (data: {
    modelId: number;
    answers: Record<number, number>;
  }) =>
    request<import('../types').ExamSubmission>('/api/exam-attempts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  admin: {
    listStudents: () => request<import('../types').Student[]>('/api/admin/students'),
    createStudent: (data: { userName: string; fullName: string; password: string; accessDays: number | null }) =>
      request<import('../types').Student>('/api/admin/students', { method: 'POST', body: JSON.stringify(data) }),
    setStatus: (id: string, isActive: boolean) => request<void>(`/api/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    resetDevice: (id: string) => request<void>(`/api/admin/students/${id}/reset-device`, { method: 'POST' }),
    deleteStudent: (id: string) => request<void>(`/api/admin/students/${id}`, { method: 'DELETE' }),
    getLogs: (id: string) => request<import('../types').AuthLog[]>(`/api/admin/students/${id}/logs`),
    getAttempts: (id: string) => request<import('../types').ExamAttempt[]>(`/api/admin/students/${id}/attempts`),
    listQuestions: () => request<import('../types').Question[]>('/api/admin/questions'),
    createQuestion: (data: Omit<import('../types').Question, 'id'>) => request<import('../types').Question>('/api/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
    updateQuestion: (id: number, data: Omit<import('../types').Question, 'id'>) => request<import('../types').Question>(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuestion: (id: number) => request<void>(`/api/admin/questions/${id}`, { method: 'DELETE' }),
    generateQuestionAudio: (id: number, force = false) =>
      request<{ questionId:number; audioUrl?:string|null; generated:boolean; contentHash:string; jobId:number; status:string }>(
        `/api/admin/questions/${id}/generate-audio`,
        { method:'POST', body:JSON.stringify({ force }) }),
    generateQuestionImage: (id: number, force = false) =>
      request<{ questionId:number; generated:boolean; contentHash:string; jobId:number; status:string }>(
        `/api/admin/questions/${id}/generate-image`,
        { method:'POST', body:JSON.stringify({ force }) }),
    aiGenerationStatus: () =>
      request<import('../types').AiGenerationOverview>('/api/admin/ai-generation/status'),
    aiGenerationControl: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control'),
    startAllAiGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/all/start', { method:'POST' }),
    stopAllAiGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/all/stop', { method:'POST' }),
    startAudioGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/audio/start', { method:'POST' }),
    stopAudioGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/audio/stop', { method:'POST' }),
    startImageGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/image/start', { method:'POST' }),
    stopImageGeneration: () =>
      request<import('../types').AiGenerationControlState>('/api/admin/ai-generation/control/image/stop', { method:'POST' }),
    retryFailedAi: (type:'audio'|'image') =>
      request<import('../types').AiGenerationEnqueueResult>(
        '/api/admin/ai-generation/retry-failed/'+type,
        { method:'POST' }),
    completedAiImages: (limit = 24) =>
      request<import('../types').CompletedAiImageItem[]>(
        `/api/admin/ai-generation/completed-images?limit=${limit}`),
    enqueueAllAudio: (retryFailed = false, regenerateCompleted = false) =>
      request<import('../types').AiGenerationEnqueueResult>(
        '/api/admin/ai-generation/audio',
        { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    enqueueAllImages: (retryFailed = false, regenerateCompleted = false) =>
      request<import('../types').AiGenerationEnqueueResult>(
        '/api/admin/ai-generation/image',
        { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    enqueueAllAi: (retryFailed = false, regenerateCompleted = false) =>
      request<unknown>(
        '/api/admin/ai-generation/all',
        { method:'POST', body:JSON.stringify({ retryFailed, regenerateCompleted }) }),
    resumeAiGeneration: () =>
      request<import('../types').AiGenerationOverview>(
        '/api/admin/ai-generation/resume',
        { method:'POST' }),
    testImageProvider: () =>
      request<import('../types').ImageProviderTestResult>(
        '/api/admin/ai-generation/test-image-provider',
        { method:'POST' }),
    retryAiJob: (jobId:number) =>
      request<void>(`/api/admin/ai-generation/jobs/${jobId}/retry`, { method:'POST' }),
    getQuestionAudioStatus: (id: number) => request<{
      questionId: number;
      stored: boolean;
      bytes: number;
      currentHash: string;
      storedHash?: string | null;
      hashMatches: boolean;
      playable: boolean;
      audioUrl?: string | null;
    }>(`/api/admin/questions/${id}/audio-status`),
    analytics: () => request<import('../types').Analytics>('/api/admin/analytics'),

  },
};
