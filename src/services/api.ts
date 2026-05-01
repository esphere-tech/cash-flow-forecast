import { User, Entry, EntryData, ForecastWeek } from '../types';

const BASE_URL = 'https://cash-flow-forcast-backend-latest.onrender.com/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const authApi = {
  signup: (email: string, password: string) =>
    request<{ user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<null>('/auth/logout', { method: 'POST' }),

  getCurrentUser: () => request<{ user: User } | User>('/auth/me'),
};

export const entriesApi = {
  getAll: () => request<Entry[]>('/entries'),

  create: (data: EntryData) =>
    request<Entry>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<EntryData>) =>
    request<Entry>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<null>(`/entries/${id}`, { method: 'DELETE' }),

  bulkCreate: (entries: EntryData[]) =>
    request<Entry[]>('/entries/bulk', {
      method: 'POST',
      body: JSON.stringify(entries),
    }),
};

export const forecastApi = {
  get: (startingCash: number) =>
    request<{ forecast: ForecastWeek[] } | ForecastWeek[]>(
      `/entries/forecast?startingCash=${startingCash}`
    ),
};
