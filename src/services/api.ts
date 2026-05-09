import {
  User,
  Entry,
  EntryData,
  Forecast,
  ForecastData,
  ForecastWeek,
  ImportResult,
} from '../types';

const BASE_URL = 'https://cash-flow-forcast-backend-latest.onrender.com/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? (options.headers as Record<string, string> | undefined)
    : {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const text = await res.text();
  const body = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message =
      (isRecord(body) && (body.message || body.error)) ||
      res.statusText ||
      'Request failed';
    throw new Error(String(message));
  }

  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberValue(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// The deployed backend has used snake_case, camelCase, and PascalCase during
// iteration. Normalize at the service boundary so UI components stay boring.
function normalizeEntry(raw: unknown): Entry {
  const record = isRecord(raw) ? raw : {};
  return {
    id: stringValue(record.id ?? record.ID),
    user_id: stringValue(record.user_id ?? record.userId ?? record.UserID),
    forecast_id: stringValue(record.forecast_id ?? record.forecastId ?? record.ForecastID),
    type: (record.type ?? record.Type) === 'outflow' ? 'outflow' : 'inflow',
    amount: numberValue(record.amount ?? record.Amount),
    date: stringValue(record.date ?? record.Date),
    category: stringValue(record.category ?? record.Category),
    description: stringValue(record.description ?? record.Description),
    created_at: (record.created_at ?? record.createdAt ?? record.CreatedAt) as number | string | undefined,
  };
}

function normalizeWeek(raw: unknown): ForecastWeek {
  const record = isRecord(raw) ? raw : {};
  return {
    week: numberValue(record.week ?? record.Week),
    opening: numberValue(record.opening ?? record.Opening),
    inflow: numberValue(record.inflow ?? record.Inflow),
    outflow: numberValue(record.outflow ?? record.Outflow),
    closing: numberValue(record.closing ?? record.Closing),
    end_date: stringValue(record.end_date ?? record.endDate ?? record.EndDate),
    warning: Boolean(record.warning ?? record.Warning),
  };
}

function normalizeForecast(raw: unknown): Forecast {
  const record = isRecord(raw) ? raw : {};
  return {
    id: stringValue(record.id ?? record.ID),
    user_id: stringValue(record.user_id ?? record.userId ?? record.UserID),
    name: stringValue(record.name ?? record.Name, 'Untitled forecast'),
    starting_date: nullableStringValue(record.starting_date ?? record.startingDate ?? record.StartingDate),
    starting_cash: numberValue(record.starting_cash ?? record.startingCash ?? record.StartingCash),
    weeks: arrayValue<unknown>(record.weeks ?? record.Weeks).map(normalizeWeek),
    entries: arrayValue<unknown>(record.entries ?? record.Entries).map(normalizeEntry),
    created_at: (record.created_at ?? record.createdAt ?? record.CreatedAt) as number | string | undefined,
    updated_at: (record.updated_at ?? record.updatedAt ?? record.UpdatedAt) as number | string | undefined,
  };
}

function extractUser(data: unknown): User {
  const record = isRecord(data) && isRecord(data.user) ? data.user : data;
  const user = isRecord(record) ? record : {};
  return {
    id: stringValue(user.id ?? user.ID),
    email: stringValue(user.email ?? user.Email),
  };
}

function normalizeImportResult(raw: unknown): ImportResult {
  const record = isRecord(raw) ? raw : {};
  return {
    message: stringValue(record.message, 'Entries imported successfully'),
    forecast_id: stringValue(record.forecast_id ?? record.forecastId),
    imported_count: numberValue(record.imported_count ?? record.importedCount),
    entries: arrayValue<unknown>(record.entries).map(normalizeEntry),
  };
}

function forecastPayload(data: Partial<ForecastData>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    payload.name = data.name;
    payload.Name = data.name;
  }

  if (data.starting_cash !== undefined) {
    payload.starting_cash = data.starting_cash;
    payload.startingCash = data.starting_cash;
    payload.StartingCash = data.starting_cash;
  }

  if (data.starting_date !== undefined) {
    payload.starting_date = data.starting_date;
    payload.startingDate = data.starting_date;
    payload.StartingDate = data.starting_date;
  }

  if (data.entries !== undefined) {
    payload.entries = data.entries;
    payload.Entries = data.entries;
  }

  return payload;
}

export const authApi = {
  signup: (email: string, password: string) =>
    request<{ message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ message: string } | null>('/auth/logout', { method: 'POST' }),

  getCurrentUser: async () => extractUser(await request<unknown>('/auth/me')),
};

export const forecastApi = {
  getAll: async () => {
    const raw = await request<unknown>('/forecasts');
    return arrayValue<unknown>(raw).map(normalizeForecast);
  },

  getById: async (id: string) => normalizeForecast(await request<unknown>(`/forecasts/${id}`)),

  create: async (data: ForecastData) =>
    normalizeForecast(await request<unknown>('/forecasts', {
      method: 'POST',
      body: JSON.stringify(forecastPayload(data)),
    })),

  update: async (id: string, data: Partial<ForecastData>) => {
    const raw = await request<unknown>(`/forecasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(forecastPayload(data)),
    });
    return raw ? normalizeForecast(raw) : null;
  },

  delete: (id: string) =>
    request<{ message: string } | null>(`/forecasts/${id}`, { method: 'DELETE' }),

  importEntries: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return normalizeImportResult(await request<unknown>(`/forecasts/${id}/import`, {
      method: 'POST',
      body: formData,
    }));
  },
};

export const entriesApi = {
  getAll: async (forecastId: string) => {
    const raw = await request<unknown[]>(`/entries?forecast_id=${encodeURIComponent(forecastId)}`);
    return arrayValue<unknown>(raw).map(normalizeEntry);
  },

  create: async (forecastId: string, data: EntryData) => {
    const raw = await request<unknown>('/entries', {
      method: 'POST',
      body: JSON.stringify({ forecast_id: forecastId, ...data }),
    });
    return normalizeEntry(raw);
  },

  update: async (id: string, forecastId: string, data: Partial<EntryData>) => {
    const raw = await request<unknown>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ forecast_id: forecastId, ...data }),
    });
    return normalizeEntry(raw);
  },

  delete: (id: string) =>
    request<{ message: string } | null>(`/entries/${id}`, { method: 'DELETE' }),

  bulkCreate: async (forecastId: string, entries: EntryData[]) => {
    const raw = await request<unknown[]>('/entries/bulk', {
      method: 'POST',
      body: JSON.stringify({ forecast_id: forecastId, entries }),
    });
    return arrayValue<unknown>(raw).map(normalizeEntry);
  },
};
