export interface User {
  id: string;
  email: string;
}

export interface ForecastWeek {
  week: number;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  end_date: string;
  warning: boolean;
}

export interface Entry {
  id: string;
  user_id?: string;
  forecast_id: string;
  type: 'inflow' | 'outflow';
  amount: number;
  date: string;
  category: string;
  description: string;
  created_at?: number | string;
}

export interface EntryData {
  type: 'inflow' | 'outflow';
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface Forecast {
  id: string;
  user_id?: string;
  name: string;
  starting_date: string | null;
  starting_cash: number;
  weeks: ForecastWeek[];
  entries?: Entry[];
  created_at?: number | string;
  updated_at?: number | string;
}

export interface ForecastData {
  name: string;
  starting_date?: string | null;
  starting_cash?: number;
  entries?: EntryData[];
}

export interface ImportResult {
  message: string;
  forecast_id: string;
  imported_count: number;
  entries: Entry[];
}
