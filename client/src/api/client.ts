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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'حدث خطأ غير متوقع';
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      /* no JSON body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (userName: string, password: string) =>
    request<import('../types').LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userName, password, deviceId: getDeviceId() }),
    }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  getQuestions: (category: 'Ser' | 'Ishara' | 'Mechanic') =>
    request<import('../types').Question[]>(`/api/questions?category=${category}`),

  admin: {
    listStudents: () => request<import('../types').Student[]>('/api/admin/students'),
    createStudent: (data: { userName: string; fullName: string; password: string; accessDays: number | null }) =>
      request<import('../types').Student>('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    setStatus: (id: string, isActive: boolean) =>
      request<void>(`/api/admin/students/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    resetDevice: (id: string) =>
      request<void>(`/api/admin/students/${id}/reset-device`, { method: 'POST' }),
    deleteStudent: (id: string) =>
      request<void>(`/api/admin/students/${id}`, { method: 'DELETE' }),
    getLogs: (id: string) =>
      request<import('../types').AuthLog[]>(`/api/admin/students/${id}/logs`),
  },
};
