import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Forecast, ForecastData, ImportResult, User } from '../types';
import { authApi, forecastApi } from '../services/api';

const SELECTED_FORECAST_KEY = 'cff_selectedForecastId';

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  forecasts: Forecast[];
  forecastsLoading: boolean;
  selectedForecastId: string | null;
  selectedForecast: Forecast | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectForecast: (id: string | null) => void;
  refreshForecasts: (preferredId?: string | null) => Promise<Forecast[]>;
  createForecast: (data: ForecastData) => Promise<Forecast>;
  updateForecast: (id: string, data: Partial<ForecastData>) => Promise<Forecast | null>;
  deleteForecast: (id: string) => Promise<void>;
  importForecastEntries: (id: string, file: File) => Promise<ImportResult>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecastsLoading, setForecastsLoading] = useState(false);
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_FORECAST_KEY)
  );

  const persistSelectedForecast = useCallback((id: string | null) => {
    setSelectedForecastId(id);
    if (id) {
      localStorage.setItem(SELECTED_FORECAST_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_FORECAST_KEY);
    }
  }, []);

  const applyForecasts = useCallback((items: Forecast[], preferredId?: string | null) => {
    const storedId = localStorage.getItem(SELECTED_FORECAST_KEY);
    const requestedId = preferredId === undefined ? storedId : preferredId;
    const nextId =
      (requestedId && items.some(forecast => forecast.id === requestedId) ? requestedId : null) ||
      items[0]?.id ||
      null;

    setForecasts(items);
    persistSelectedForecast(nextId);
    return nextId;
  }, [persistSelectedForecast]);

  const refreshForecasts = useCallback(async (preferredId?: string | null) => {
    setForecastsLoading(true);
    try {
      const items = await forecastApi.getAll();
      applyForecasts(items, preferredId);
      return items;
    } finally {
      setForecastsLoading(false);
    }
  }, [applyForecasts]);

  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      try {
        await refreshForecasts();
      } catch {
        setForecasts([]);
        persistSelectedForecast(null);
      }
    } catch {
      setUser(null);
      setForecasts([]);
      persistSelectedForecast(null);
    } finally {
      setAuthLoading(false);
    }
  }, [persistSelectedForecast, refreshForecasts]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
    try {
      await refreshForecasts();
    } catch {
      setForecasts([]);
      persistSelectedForecast(null);
    }
  }, [persistSelectedForecast, refreshForecasts]);

  const signup = useCallback(async (email: string, password: string) => {
    await authApi.signup(email, password);
    await authApi.login(email, password);
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
    try {
      await refreshForecasts();
    } catch {
      setForecasts([]);
      persistSelectedForecast(null);
    }
  }, [persistSelectedForecast, refreshForecasts]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setForecasts([]);
    persistSelectedForecast(null);
  }, [persistSelectedForecast]);

  const selectForecast = useCallback((id: string | null) => {
    persistSelectedForecast(id);
  }, [persistSelectedForecast]);

  const createForecast = useCallback(async (data: ForecastData) => {
    const created = await forecastApi.create(data);
    await refreshForecasts(created.id);
    return created;
  }, [refreshForecasts]);

  const updateForecast = useCallback(async (id: string, data: Partial<ForecastData>) => {
    const updated = await forecastApi.update(id, data);
    const items = await refreshForecasts(id);
    return updated ?? items.find(forecast => forecast.id === id) ?? null;
  }, [refreshForecasts]);

  const deleteForecast = useCallback(async (id: string) => {
    await forecastApi.delete(id);
    await refreshForecasts(null);
  }, [refreshForecasts]);

  const importForecastEntries = useCallback(async (id: string, file: File) => {
    const result = await forecastApi.importEntries(id, file);
    await refreshForecasts(id);
    return result;
  }, [refreshForecasts]);

  const selectedForecast = useMemo(
    () => forecasts.find(forecast => forecast.id === selectedForecastId) ?? null,
    [forecasts, selectedForecastId]
  );

  const value = useMemo<AppContextType>(() => ({
    user,
    authLoading,
    forecasts,
    forecastsLoading,
    selectedForecastId,
    selectedForecast,
    checkAuth,
    login,
    signup,
    logout,
    selectForecast,
    refreshForecasts,
    createForecast,
    updateForecast,
    deleteForecast,
    importForecastEntries,
  }), [
    user,
    authLoading,
    forecasts,
    forecastsLoading,
    selectedForecastId,
    selectedForecast,
    checkAuth,
    login,
    signup,
    logout,
    selectForecast,
    refreshForecasts,
    createForecast,
    updateForecast,
    deleteForecast,
    importForecastEntries,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
