import { Subject, Session, Exercise, Review, Goal, DashboardStats, Objective, Topic } from '../types';

const API_BASE = '/api';

// Retrieve the current user's ID from localStorage
function getUserId(): string {
  return localStorage.getItem('planoaprovado_user_id') || 'default';
}

// Base fetch wrapper that always attaches the user header
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
      ...(options.headers || {}),
    },
  });
}

export const api = {
  objectives: {
    list: () => apiFetch(`${API_BASE}/objectives`).then(r => r.json() as Promise<Objective[]>),
    create: (data: Omit<Objective, 'id'>) => apiFetch(`${API_BASE}/objectives`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  },
  subjects: {
    list: () => apiFetch(`${API_BASE}/subjects`).then(r => r.json() as Promise<Subject[]>),
    create: (data: Omit<Subject, 'id'>) => apiFetch(`${API_BASE}/subjects`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<Subject>) => apiFetch(`${API_BASE}/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: number) => apiFetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) return r.json().then(err => Promise.reject(err));
      return r.json();
    }),
  },
  topics: {
    list: (subjectId?: number) => {
      const url = subjectId ? `${API_BASE}/topics?subject_id=${subjectId}` : `${API_BASE}/topics`;
      return apiFetch(url).then(r => r.json() as Promise<Topic[]>);
    },
    create: (data: Omit<Topic, 'id'>) => apiFetch(`${API_BASE}/topics`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<Topic>) => apiFetch(`${API_BASE}/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: number) => apiFetch(`${API_BASE}/topics/${id}`, { method: 'DELETE' }).then(r => r.json()),
  },
  sessions: {
    list: () => apiFetch(`${API_BASE}/sessions`).then(r => r.json() as Promise<Session[]>),
    create: (data: Omit<Session, 'id'>) => apiFetch(`${API_BASE}/sessions`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<Session>) => apiFetch(`${API_BASE}/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: number) => apiFetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' }).then(r => r.json()),
  },
  exercises: {
    list: () => apiFetch(`${API_BASE}/exercises`).then(r => r.json() as Promise<Exercise[]>),
    create: (data: Omit<Exercise, 'id' | 'percent_correct'>) => apiFetch(`${API_BASE}/exercises`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<Exercise>) => apiFetch(`${API_BASE}/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),
    // ── NOVO: deletar registro de exercício ──
    delete: (id: number) => apiFetch(`${API_BASE}/exercises/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) return r.json().then(err => Promise.reject(err));
      return r.json();
    }),
  },
  reviews: {
    list: () => apiFetch(`${API_BASE}/reviews`).then(r => r.json() as Promise<Review[]>),
    create: (data: Omit<Review, 'id' | 'status'>) => apiFetch(`${API_BASE}/reviews`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateStatus: (id: number, status: string) => apiFetch(`${API_BASE}/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => r.json()),
  },
  goals: {
    list: () => apiFetch(`${API_BASE}/goals`).then(r => r.json() as Promise<Goal[]>),
    create: (data: Omit<Goal, 'id'>) => apiFetch(`${API_BASE}/goals`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: number, data: Partial<Goal>) => apiFetch(`${API_BASE}/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),
  },
  preferences: {
    get: () => apiFetch(`${API_BASE}/preferences`).then(r => r.json()),
    set: (key: string, value: any) => apiFetch(`${API_BASE}/preferences`, { method: 'POST', body: JSON.stringify({ key, value }) }).then(r => r.json()),
  },
  drafts: {
    list: () => apiFetch(`${API_BASE}/drafts`).then(r => r.json()),
    save: (type: string, payload: any, reference_id?: number) => apiFetch(`${API_BASE}/drafts`, { method: 'POST', body: JSON.stringify({ type, reference_id, payload }) }).then(r => r.json()),
    delete: (type: string, reference_id?: number) => {
      const url = reference_id ? `${API_BASE}/drafts/${type}?reference_id=${reference_id}` : `${API_BASE}/drafts/${type}`;
      return apiFetch(url, { method: 'DELETE' }).then(r => r.json());
    },
  },
  stats: {
    summary: () => apiFetch(`${API_BASE}/stats/summary`).then(r => r.json() as Promise<DashboardStats>),
  },
};
