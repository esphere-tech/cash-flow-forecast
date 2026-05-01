export interface User {
  id: string;
  email: string;
}

export interface Entry {
  id: string;
  type: 'inflow' | 'outflow';
  amount: number;
  date: string;
  category: string;
  description: string;
}

export type EntryData = Omit<Entry, 'id'>;

export interface ForecastWeek {
  week: number;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  warning: boolean;
}
