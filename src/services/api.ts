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

// The API returns PascalCase fields — normalize to camelCase so the rest of
// the app works with consistent lowercase field names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(raw: any): Entry {
  return {
    id:          raw.ID          ?? raw.id,
    type:        raw.Type        ?? raw.type,
    amount:      raw.Amount      ?? raw.amount,
    date:        raw.Date        ?? raw.date,
    category:    raw.Category    ?? raw.category,
    description: raw.Description ?? raw.description ?? '',
  };
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
  getAll: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any[]>('/entries');
    return (raw ?? []).map(normalizeEntry);
  },

  create: async (data: EntryData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeEntry(raw);
  },

  update: async (id: string, data: Partial<EntryData>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeEntry(raw);
  },

  delete: (id: string) => request<null>(`/entries/${id}`, { method: 'DELETE' }),

  bulkCreate: async (entries: EntryData[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any[]>('/entries/bulk', {
      method: 'POST',
      body: JSON.stringify(entries),
    });
    return (raw ?? []).map(normalizeEntry);
  },
};

export const forecastApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: async (startingCash: number): Promise<ForecastWeek[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>(`/entries/forecast?startingCash=${startingCash}`);
    // API returns { starting_cash, weeks: [...] }
    if (raw && typeof raw === 'object' && Array.isArray(raw.weeks)) return raw.weeks;
    if (Array.isArray(raw)) return raw;
    return [];
  },
};
