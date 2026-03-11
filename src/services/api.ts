import { Subject, Session, Exercise, Review, Goal, DashboardStats, Objective, Topic } from '../types';

const API_BASE = '/api';

export const api = {
  objectives: {
    list: () => fetch(`${API_BASE}/objectives`).then(res => res.json() as Promise<Objective[]>),
    create: (data: Omit<Objective, 'id'>) => fetch(`${API_BASE}/objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  },
  subjects: {
    list: () => fetch(`${API_BASE}/subjects`).then(res => res.json() as Promise<Subject[]>),
    create: (data: Omit<Subject, 'id'>) => fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: number, data: Partial<Subject>) => fetch(`${API_BASE}/subjects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    delete: (id: number) => fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) return res.json().then(err => Promise.reject(err));
      return res.json();
    }),
  },
  topics: {
    list: (subjectId?: number) => {
      const url = subjectId ? `${API_BASE}/topics?subject_id=${subjectId}` : `${API_BASE}/topics`;
      return fetch(url).then(res => res.json() as Promise<Topic[]>);
    },
    create: (data: Omit<Topic, 'id'>) => fetch(`${API_BASE}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: number, data: Partial<Topic>) => fetch(`${API_BASE}/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    delete: (id: number) => fetch(`${API_BASE}/topics/${id}`, { method: 'DELETE' }).then(res => res.json()),
  },
  sessions: {
    list: () => fetch(`${API_BASE}/sessions`).then(res => res.json() as Promise<Session[]>),
    create: (data: Omit<Session, 'id'>) => fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: number, data: Partial<Session>) => fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  },
  exercises: {
    list: () => fetch(`${API_BASE}/exercises`).then(res => res.json() as Promise<Exercise[]>),
    create: (data: Omit<Exercise, 'id' | 'percent_correct'>) => fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: number, data: Partial<Exercise>) => fetch(`${API_BASE}/exercises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  },
  reviews: {
    list: () => fetch(`${API_BASE}/reviews`).then(res => res.json() as Promise<Review[]>),
    create: (data: Omit<Review, 'id' | 'status'>) => fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    updateStatus: (id: number, status: string) => fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(res => res.json()),
  },
  goals: {
    list: () => fetch(`${API_BASE}/goals`).then(res => res.json() as Promise<Goal[]>),
    create: (data: Omit<Goal, 'id'>) => fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: number, data: Partial<Goal>) => fetch(`${API_BASE}/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  },
  preferences: {
    get: () => fetch(`${API_BASE}/preferences`).then(res => res.json()),
    set: (key: string, value: any) => fetch(`${API_BASE}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    }).then(res => res.json()),
  },
  drafts: {
    list: () => fetch(`${API_BASE}/drafts`).then(res => res.json()),
    save: (type: string, payload: any, reference_id?: number) => fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, reference_id, payload })
    }).then(res => res.json()),
    delete: (type: string, reference_id?: number) => {
      const url = reference_id ? `${API_BASE}/drafts/${type}?reference_id=${reference_id}` : `${API_BASE}/drafts/${type}`;
      return fetch(url, { method: 'DELETE' }).then(res => res.json());
    },
  },
  stats: {
    summary: () => fetch(`${API_BASE}/stats/summary`).then(res => res.json() as Promise<DashboardStats>),
  }
};
