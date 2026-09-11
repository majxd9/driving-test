const API_BASE = import.meta.env.VITE_API_URL || '';

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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), path.includes('/login') ? 20000 : 30000);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    signal: options.signal ?? controller.signal,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'حدث خطأ غير متوقع';
    try {
      const body = await res.json();
      message = body.message || (Array.isArray(body) ? body.join('، ') : message);
    } catch { /* no JSON body */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  warmup: () => fetch(`${API_BASE}/api/health`, { credentials: 'omit', cache: 'no-store', keepalive: true }).catch(() => {}),
  login: (userName: string, password: string) =>
    request<import('../types').LoginResponse>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ userName, password, deviceId: getDeviceId() }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') =>
    request<import('../types').Question[]>(`/api/questions?category=${category}`),
  submitExamResult: (data: { modelId: number; total: number; correct: number; answered: number }) =>
    request<void>('/api/exams/results', { method: 'POST', body: JSON.stringify(data) }),
  admin: {
    listStudents: () => request<import('../types').Student[]>('/api/admin/students'),
    createStudent: (data: { userName: string; fullName: string; password: string; accessDays: number | null }) =>
      request<import('../types').Student>('/api/admin/students', { method: 'POST', body: JSON.stringify(data) }),
    setStatus: (id: string, isActive: boolean) => request<void>(`/api/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    resetDevice: (id: string) => request<void>(`/api/admin/students/${id}/reset-device`, { method: 'POST' }),
    deleteStudent: (id: string) => request<void>(`/api/admin/students/${id}`, { method: 'DELETE' }),
    getLogs: (id: string) => request<import('../types').AuthLog[]>(`/api/admin/students/${id}/logs`),
    listQuestions: () => request<import('../types').Question[]>('/api/admin/questions'),
    createQuestion: (data: import('../types').QuestionUpsert) => request<import('../types').Question>('/api/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
    updateQuestion: (id: number, data: import('../types').QuestionUpsert) => request<import('../types').Question>(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuestion: (id: number) => request<void>(`/api/admin/questions/${id}`, { method: 'DELETE' }),
    analytics: () => request<import('../types').Analytics>('/api/admin/analytics'),
    uploadMedia: (file: File) => {
      const form = new FormData();
      form.append('file', file, file.name);
      return request<{ url: string; size: number; width: number; height: number }>('/api/admin/media', { method: 'POST', body: form });
    },
  },
};
