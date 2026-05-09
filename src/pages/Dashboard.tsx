import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Entry, Forecast, ForecastWeek } from '../types';
import { entriesApi } from '../services/api';
import { useApp } from '../context/AppContext';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALLOWED_IMPORT_EXTENSIONS = new Set(['csv', 'xlsx', 'xlsm']);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtShortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtOptionalDate = (d: string | null | undefined) => d ? fmtDate(d) : 'Today';

const isDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function getLastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] };
  });
}

function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

function isAllowedImportFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && ALLOWED_IMPORT_EXTENSIONS.has(extension));
}

interface MonthData {
  label: string;
  inflow: number;
  outflow: number;
}

function BarChart({ data }: { data: MonthData[] }) {
  const VW = 520;
  const VH = 200;
  const PL = 56;
  const PR = 12;
  const PT = 16;
  const PB = 36;
  const plotW = VW - PL - PR;
  const plotH = VH - PT - PB;

  const maxVal = niceMax(Math.max(...data.flatMap(d => [d.inflow, d.outflow]), 1));
  const ticks = Array.from({ length: 5 }, (_, i) => (maxVal / 4) * i);
  const gW = plotW / data.length;
  const bW = Math.floor(gW * 0.27);
  const toY = (v: number) => PT + plotH - (v / maxVal) * plotH;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PL}
            y1={toY(t)}
            x2={PL + plotW}
            y2={toY(t)}
            stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'}
            strokeWidth="1"
          />
          <text x={PL - 7} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {t >= 1000 ? `$${(t / 1000).toFixed(0)}k` : `$${Math.round(t)}`}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const pairW = bW * 2 + 3;
        const x = PL + i * gW + (gW - pairW) / 2;
        const inflowH = Math.max((d.inflow / maxVal) * plotH, d.inflow > 0 ? 2 : 0);
        const outflowH = Math.max((d.outflow / maxVal) * plotH, d.outflow > 0 ? 2 : 0);
        return (
          <g key={d.label}>
            <rect x={x} y={toY(d.inflow)} width={bW} height={inflowH} fill="#10b981" rx="2" opacity="0.88" />
            <rect x={x + bW + 3} y={toY(d.outflow)} width={bW} height={outflowH} fill="#f43f5e" rx="2" opacity="0.88" />
            <text x={PL + i * gW + gW / 2} y={VH - 9} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        );
      })}

      <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH} stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}

function Sparkline({ weeks }: { weeks: ForecastWeek[] }) {
  if (weeks.length < 2) return null;

  const points = weeks.map(week => week.closing);
  const VW = 160;
  const VH = 48;
  const PAD = 4;
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const toX = (i: number) => PAD + (i / (points.length - 1)) * (VW - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - minV) / range) * (VH - PAD * 2);
  const polyline = points.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const areaPath = `M${toX(0)},${VH} ${points.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ')} L${toX(points.length - 1)},${VH} Z`;
  const isUp = points[points.length - 1] >= points[0];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-32 h-10">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={isUp ? '#10b981' : '#f43f5e'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accent: string;
  valueColor?: string;
}

function SummaryCard({ label, value, sub, icon, iconBg, iconColor, accent, valueColor = 'text-slate-900' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-100 shadow-sm p-5 border-l-4 ${accent}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor} flex-shrink-0`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${valueColor} leading-none`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

function WeeklyProjectionPanel({
  weeks,
  firstDeficitWeek,
  projectedClosing,
  lowestBalance,
  startingDate,
}: {
  weeks: ForecastWeek[];
  firstDeficitWeek: ForecastWeek | undefined;
  projectedClosing: number;
  lowestBalance: number;
  startingDate: string | null;
}) {
  const positiveWeeks = weeks.filter(week => !week.warning).length;

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                13-week cash forecast
              </p>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">Weekly Projection</h2>
            <p className="text-sm text-slate-300 mt-1">
              Starts {fmtOptionalDate(startingDate)}. Each week ends on the date shown in the table.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Week 13 Closing</p>
              <p className={`text-lg font-bold mt-1 ${projectedClosing < 0 ? 'text-rose-200' : 'text-white'}`}>
                {fmt(projectedClosing)}
              </p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Lowest Balance</p>
              <p className={`text-lg font-bold mt-1 ${lowestBalance < 0 ? 'text-rose-200' : 'text-white'}`}>
                {fmt(lowestBalance)}
              </p>
            </div>
            <div className={`rounded-lg border px-4 py-3 ${
              firstDeficitWeek
                ? 'bg-rose-500/15 border-rose-300/20'
                : 'bg-emerald-500/15 border-emerald-300/20'
            }`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Cash Status</p>
              <p className={`text-sm font-bold mt-1 ${firstDeficitWeek ? 'text-rose-100' : 'text-emerald-100'}`}>
                {firstDeficitWeek ? `Deficit week ${firstDeficitWeek.week}` : `${positiveWeeks} healthy weeks`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mt-3">No projection returned</p>
          <p className="text-xs text-slate-400 mt-1">Add entries or refresh the forecast to populate the weekly view.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Week</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Inflows</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Outflows</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeks.map(week => {
                const net = week.inflow - week.outflow;
                return (
                  <tr
                    key={week.week}
                    className={`transition-colors ${week.warning ? 'bg-rose-50/70 hover:bg-rose-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          week.warning ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {week.week}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${week.warning ? 'text-rose-900' : 'text-slate-800'}`}>
                            Week {week.week}{week.end_date ? ` (${fmtShortDate(week.end_date)})` : ''}
                          </p>
                          {week.warning && (
                            <p className="text-xs text-rose-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> Deficit risk
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                      {fmt(week.inflow)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-600">
                      {fmt(week.outflow)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
                    </td>
                    <td className={`px-6 py-4 text-right text-base font-bold ${
                      week.closing < 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}>
                      {fmt(week.closing)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ForecastForm({
  name,
  startingDate,
  startingCash,
  setName,
  setStartingDate,
  setStartingCash,
}: {
  name: string;
  startingDate: string;
  startingCash: string;
  setName: (value: string) => void;
  setStartingDate: (value: string) => void;
  setStartingCash: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Q2 2026 forecast"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Starting Date <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="date"
          value={startingDate}
          onChange={e => setStartingDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Starting Cash <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input
            type="number"
            value={startingCash}
            onChange={e => setStartingCash(e.target.value)}
            placeholder="Defaults to 0.00"
            min="0"
            step="0.01"
            className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export function ForecastDetail() {
  const {
    forecasts,
    forecastsLoading,
    selectedForecast,
    selectedForecastId,
    selectForecast,
    refreshForecasts,
    createForecast,
    updateForecast,
    deleteForecast,
    importForecastEntries,
  } = useApp();
  const { id: forecastId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'projection'>('overview');

  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState('');

  const [showForecastModal, setShowForecastModal] = useState(false);
  const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
  const [forecastName, setForecastName] = useState('');
  const [forecastStartingDate, setForecastStartingDate] = useState('');
  const [forecastStartingCash, setForecastStartingCash] = useState('');
  const [forecastFormError, setForecastFormError] = useState('');
  const [forecastSubmitting, setForecastSubmitting] = useState(false);
  const [deletingForecast, setDeletingForecast] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const activeForecastId = forecastId ?? selectedForecastId;
  const activeForecast =
    forecasts.find(forecast => forecast.id === activeForecastId) ??
    (selectedForecast?.id === activeForecastId ? selectedForecast : null);

  const loadEntries = useCallback(async (forecastId: string) => {
    setEntriesLoading(true);
    setEntriesError('');
    try {
      const data = await entriesApi.getAll(forecastId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setEntriesError(err instanceof Error ? err.message : 'Failed to load entries.');
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (forecastId && forecastId !== selectedForecastId) {
      selectForecast(forecastId);
    }
  }, [forecastId, selectForecast, selectedForecastId]);

  useEffect(() => {
    if (!activeForecastId) {
      setEntries([]);
      setEntriesLoading(false);
      return;
    }

    void loadEntries(activeForecastId);
  }, [activeForecastId, loadEntries]);

  const openEditForecast = () => {
    if (!activeForecast) return;
    setEditingForecast(activeForecast);
    setForecastName(activeForecast.name);
    setForecastStartingDate(activeForecast.starting_date ?? '');
    setForecastStartingCash(activeForecast.starting_cash === 0 ? '' : String(activeForecast.starting_cash));
    setForecastFormError('');
    setShowForecastModal(true);
  };

  const handleForecastSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = forecastName.trim();
    const startingDate = forecastStartingDate.trim();
    const startingCashInput = forecastStartingCash.trim();
    const startingCash = startingCashInput === '' ? 0 : Number(startingCashInput);

    if (!name) {
      setForecastFormError('Enter a forecast name.');
      return;
    }
    if (!Number.isFinite(startingCash) || startingCash < 0) {
      setForecastFormError('Starting cash must be zero or greater.');
      return;
    }
    if (startingDate && !isDateInput(startingDate)) {
      setForecastFormError('Starting date must use YYYY-MM-DD.');
      return;
    }

    setForecastFormError('');
    setForecastSubmitting(true);
    try {
      if (editingForecast) {
        await updateForecast(editingForecast.id, {
          name,
          starting_date: startingDate || null,
          starting_cash: startingCash,
        });
      } else {
        await createForecast({
          name,
          ...(startingDate ? { starting_date: startingDate } : {}),
          starting_cash: startingCash,
        });
      }
      setShowForecastModal(false);
    } catch (err) {
      setForecastFormError(err instanceof Error ? err.message : 'Failed to save forecast.');
    } finally {
      setForecastSubmitting(false);
    }
  };

  const handleDeleteForecast = async () => {
    if (!activeForecast) return;
    const confirmed = window.confirm(`Delete "${activeForecast.name}" and all entries attached to it?`);
    if (!confirmed) return;

    setDeletingForecast(true);
    try {
      await deleteForecast(activeForecast.id);
      setEntries([]);
      navigate('/dashboard');
    } finally {
      setDeletingForecast(false);
    }
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImportError('');
    setImportMessage('');

    if (file && !isAllowedImportFile(file)) {
      setImportFile(null);
      setImportError('Upload a CSV, XLSX, or XLSM file.');
      event.target.value = '';
      return;
    }

    setImportFile(file);
  };

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeForecast || !importFile) {
      setImportError('Choose a CSV or Excel file.');
      return;
    }
    if (!isAllowedImportFile(importFile)) {
      setImportError('Upload a CSV, XLSX, or XLSM file.');
      return;
    }

    setImportError('');
    setImportMessage('');
    setImporting(true);
    try {
      const result = await importForecastEntries(activeForecast.id, importFile);
      setImportMessage(`${result.imported_count} entr${result.imported_count === 1 ? 'y' : 'ies'} imported.`);
      setImportFile(null);
      await loadEntries(activeForecast.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import entries.');
    } finally {
      setImporting(false);
    }
  };

  const handleRefresh = async () => {
    await refreshForecasts(activeForecastId);
    if (activeForecastId) await loadEntries(activeForecastId);
  };

  const totalInflow = entries.filter(e => e.type === 'inflow').reduce((s, e) => s + e.amount, 0);
  const totalOutflow = entries.filter(e => e.type === 'outflow').reduce((s, e) => s + e.amount, 0);
  const startingDate = activeForecast?.starting_date ?? null;
  const startingCash = activeForecast?.starting_cash ?? 0;
  const weeks = activeForecast?.weeks ?? [];
  const projectedClosing = weeks.at(-1)?.closing ?? startingCash + totalInflow - totalOutflow;
  const firstDeficitWeek = weeks.find(w => w.warning);
  const lowestBalance = weeks.length > 0
    ? weeks.reduce((min, week) => Math.min(min, week.closing), weeks[0].closing)
    : projectedClosing;

  const monthlyData: MonthData[] = useMemo(() => {
    const months = getLastMonths(6);
    return months.map(month => ({
      label: month.label,
      inflow: entries
        .filter(entry => entry.type === 'inflow' && getMonthKey(entry.date) === month.key)
        .reduce((sum, entry) => sum + entry.amount, 0),
      outflow: entries
        .filter(entry => entry.type === 'outflow' && getMonthKey(entry.date) === month.key)
        .reduce((sum, entry) => sum + entry.amount, 0),
    }));
  }, [entries]);

  const categories = useMemo(() => {
    const catMap: Record<string, number> = {};
    entries
      .filter(entry => entry.type === 'outflow')
      .forEach(entry => {
        const key = entry.category || 'Uncategorized';
        catMap[key] = (catMap[key] || 0) + entry.amount;
      });
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const catMax = categories[0]?.[1] || 1;
  const categoryColors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#f43f5e'];
  const recent = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const inflowCount = entries.filter(e => e.type === 'inflow').length;
  const outflowCount = entries.filter(e => e.type === 'outflow').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{activeForecast?.name ?? 'Forecast'}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Forecast workspace
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {forecasts.length > 0 && (
            <select
              value={activeForecastId ?? ''}
              onChange={e => {
                const nextId = e.target.value || null;
                selectForecast(nextId);
                if (nextId) navigate(`/forecast/${nextId}`);
              }}
              className="min-w-56 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {forecasts.map(forecast => (
                <option key={forecast.id} value={forecast.id}>
                  {forecast.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={forecastsLoading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${forecastsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {forecastsLoading && forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading forecasts...</p>
        </div>
      ) : forecasts.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-6 py-20 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">No forecasts yet</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : activeForecast ? (
        <>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projection')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'projection'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Weekly Projection
            </button>
          </div>

          {activeTab === 'projection' ? (
            <WeeklyProjectionPanel
              weeks={weeks}
              firstDeficitWeek={firstDeficitWeek}
              projectedClosing={projectedClosing}
              lowestBalance={lowestBalance}
              startingDate={startingDate}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              label="Starting Cash"
              value={fmt(startingCash)}
              sub={`Starts ${fmtOptionalDate(startingDate)}`}
              icon={<DollarSign className="w-4 h-4" />}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              accent="border-l-slate-400"
            />
            <SummaryCard
              label="Total Inflow"
              value={fmt(totalInflow)}
              sub={`${inflowCount} transaction${inflowCount !== 1 ? 's' : ''}`}
              icon={<TrendingUp className="w-4 h-4" />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accent="border-l-emerald-500"
              valueColor="text-emerald-700"
            />
            <SummaryCard
              label="Total Outflow"
              value={fmt(totalOutflow)}
              sub={`${outflowCount} transaction${outflowCount !== 1 ? 's' : ''}`}
              icon={<TrendingDown className="w-4 h-4" />}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              accent="border-l-rose-500"
              valueColor="text-rose-600"
            />
            <SummaryCard
              label="Week 13 Closing"
              value={fmt(projectedClosing)}
              sub={firstDeficitWeek ? `Deficit starts week ${firstDeficitWeek.week}` : 'No projected deficit'}
              icon={<Wallet className="w-4 h-4" />}
              iconBg={projectedClosing >= 0 ? 'bg-indigo-50' : 'bg-rose-50'}
              iconColor={projectedClosing >= 0 ? 'text-indigo-600' : 'text-rose-600'}
              accent={projectedClosing >= 0 ? 'border-l-indigo-500' : 'border-l-rose-500'}
              valueColor={projectedClosing >= 0 ? 'text-indigo-600' : 'text-rose-600'}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{activeForecast.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Scenario controls</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openEditForecast}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteForecast}
                    disabled={deletingForecast}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-100 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  >
                    {deletingForecast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>

              <form onSubmit={handleImport} className="flex flex-wrap items-center gap-3">
                <label className="flex-1 min-w-64">
                  <span className="sr-only">Import entries</span>
                  <span className="mb-2 block text-xs font-medium text-slate-600">
                    Upload CSV, XLSX, or XLSM. Required columns: type, amount, date. Optional columns: category, description.
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xlsm"
                    onChange={handleImportFile}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-600 hover:file:bg-slate-200"
                  />
                </label>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import
                </button>
              </form>
              {importError && <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{importError}</p>}
              {importMessage && <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{importMessage}</p>}
            </div>

            <div className={`rounded-lg border shadow-sm p-5 ${firstDeficitWeek ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                {firstDeficitWeek
                  ? <AlertTriangle className="w-4 h-4 text-rose-600" />
                  : <TrendingUp className="w-4 h-4 text-emerald-600" />
                }
                <p className={`text-xs font-semibold uppercase tracking-wider ${firstDeficitWeek ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Cash Position
                </p>
              </div>
              <p className={`text-sm font-semibold ${firstDeficitWeek ? 'text-rose-800' : 'text-emerald-800'}`}>
                {firstDeficitWeek ? `Deficit in week ${firstDeficitWeek.week}` : 'No deficit projected'}
              </p>
              <p className="text-xs text-slate-500 mt-2">Lowest balance: {fmtFull(lowestBalance)}</p>
              <div className="mt-4">
                <Sparkline weeks={weeks} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Monthly Cash Flow</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                    Inflow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
                    Outflow
                  </span>
                </div>
              </div>

              {entriesLoading ? (
                <div className="flex items-center justify-center h-[160px]">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : entriesError ? (
                <div className="flex items-center justify-center h-[160px] text-sm text-rose-600">{entriesError}</div>
              ) : (
                <BarChart data={monthlyData} />
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5 flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800">Outflow by Category</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">Top spending areas</p>

              {entriesLoading ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : categories.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-xs text-slate-400">
                  No outflows recorded
                </div>
              ) : (
                <>
                  <div className="space-y-3 flex-1">
                    {categories.map(([cat, val], i) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">{cat}</span>
                          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">{fmt(val)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(val / catMax) * 100}%`, backgroundColor: categoryColors[i] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs">
                    <span className="text-slate-500">Total outflows</span>
                    <span className="font-semibold text-rose-600">{fmtFull(totalOutflow)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 bg-white rounded-lg border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {Math.min(6, recent.length)} of {entries.length}
                </span>
              </div>

              {entriesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recent.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs font-medium text-slate-600">No entries yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recent.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        entry.type === 'inflow' ? 'bg-emerald-50' : 'bg-rose-50'
                      }`}>
                        {entry.type === 'inflow'
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {entry.description || entry.category || 'Entry'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {entry.category || 'Uncategorized'} - {fmtDate(entry.date)}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${
                        entry.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {entry.type === 'inflow' ? '+' : '-'}{fmtFull(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-6 py-20 text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">Forecast not found</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      )}

      {showForecastModal && (
        <Modal
          title="Edit Forecast"
          onClose={() => setShowForecastModal(false)}
        >
          <form onSubmit={handleForecastSubmit} className="space-y-4">
            <ForecastForm
              name={forecastName}
              startingDate={forecastStartingDate}
              startingCash={forecastStartingCash}
              setName={setForecastName}
              setStartingDate={setForecastStartingDate}
              setStartingCash={setForecastStartingCash}
            />
            {forecastFormError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {forecastFormError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forecastSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {forecastSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : <><Plus className="w-4 h-4" /> Save</>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

interface DashboardEntry extends Entry {
  forecastName: string;
}

export default function Dashboard() {
  const {
    forecasts,
    forecastsLoading,
    selectForecast,
    refreshForecasts,
    createForecast,
  } = useApp();
  const navigate = useNavigate();

  const [recentEntries, setRecentEntries] = useState<DashboardEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState('');

  const [showForecastModal, setShowForecastModal] = useState(false);
  const [forecastName, setForecastName] = useState('');
  const [forecastStartingDate, setForecastStartingDate] = useState('');
  const [forecastStartingCash, setForecastStartingCash] = useState('');
  const [forecastFormError, setForecastFormError] = useState('');
  const [forecastSubmitting, setForecastSubmitting] = useState(false);

  const loadRecentEntries = useCallback(async () => {
    if (forecasts.length === 0) {
      setRecentEntries([]);
      return;
    }

    setEntriesLoading(true);
    setEntriesError('');
    try {
      const settled = await Promise.allSettled(
        forecasts.map(async forecast => {
          const entries = await entriesApi.getAll(forecast.id);
          return entries.map(entry => ({ ...entry, forecastName: forecast.name }));
        })
      );

      const combined = settled
        .flatMap(result => result.status === 'fulfilled' ? result.value : [])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);

      setRecentEntries(combined);
      if (settled.some(result => result.status === 'rejected')) {
        setEntriesError('Some forecast activity could not be loaded.');
      }
    } finally {
      setEntriesLoading(false);
    }
  }, [forecasts]);

  useEffect(() => {
    void loadRecentEntries();
  }, [loadRecentEntries]);

  const openForecast = (forecastId: string) => {
    selectForecast(forecastId);
    navigate(`/forecast/${forecastId}`);
  };

  const openCreateForecast = () => {
    setForecastName('');
    setForecastStartingDate('');
    setForecastStartingCash('');
    setForecastFormError('');
    setShowForecastModal(true);
  };

  const handleCreateForecast = async (event: FormEvent) => {
    event.preventDefault();
    const name = forecastName.trim();
    const startingDate = forecastStartingDate.trim();
    const startingCashInput = forecastStartingCash.trim();
    const startingCash = startingCashInput === '' ? 0 : Number(startingCashInput);

    if (!name) {
      setForecastFormError('Enter a forecast name.');
      return;
    }
    if (!Number.isFinite(startingCash) || startingCash < 0) {
      setForecastFormError('Starting cash must be zero or greater.');
      return;
    }
    if (startingDate && !isDateInput(startingDate)) {
      setForecastFormError('Starting date must use YYYY-MM-DD.');
      return;
    }

    setForecastFormError('');
    setForecastSubmitting(true);
    try {
      const created = await createForecast({
        name,
        ...(startingDate ? { starting_date: startingDate } : {}),
        starting_cash: startingCash,
      });
      setShowForecastModal(false);
      openForecast(created.id);
    } catch (err) {
      setForecastFormError(err instanceof Error ? err.message : 'Failed to create forecast.');
    } finally {
      setForecastSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await refreshForecasts();
    await loadRecentEntries();
  };

  const totalStartingCash = forecasts.reduce((sum, forecast) => sum + forecast.starting_cash, 0);
  const forecastClosings = forecasts.map(forecast =>
    forecast.weeks.at(-1)?.closing ?? forecast.starting_cash
  );
  const totalProjectedCash = forecastClosings.reduce((sum, closing) => sum + closing, 0);
  const deficitForecasts = forecasts.filter(forecast => forecast.weeks.some(week => week.warning));
  const strongestForecast = [...forecasts].sort((a, b) => {
    const aClosing = a.weeks.at(-1)?.closing ?? a.starting_cash;
    const bClosing = b.weeks.at(-1)?.closing ?? b.starting_cash;
    return bClosing - aClosing;
  })[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Workspace</p>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">All forecast scenarios and recent cash movement</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={forecastsLoading || entriesLoading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${forecastsLoading || entriesLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreateForecast}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Forecast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Forecasts"
          value={String(forecasts.length)}
          sub="Active scenarios"
          icon={<FolderOpen className="w-4 h-4" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          accent="border-l-indigo-500"
        />
        <SummaryCard
          label="Starting Cash"
          value={fmt(totalStartingCash)}
          sub="Across all forecasts"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          accent="border-l-slate-400"
        />
        <SummaryCard
          label="Projected Cash"
          value={fmt(totalProjectedCash)}
          sub="Combined week 13 balance"
          icon={<Wallet className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          accent="border-l-emerald-500"
          valueColor={totalProjectedCash < 0 ? 'text-rose-600' : 'text-emerald-700'}
        />
        <SummaryCard
          label="At Risk"
          value={String(deficitForecasts.length)}
          sub={deficitForecasts.length === 1 ? 'Forecast has a deficit week' : 'Forecasts have deficit weeks'}
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBg={deficitForecasts.length > 0 ? 'bg-rose-50' : 'bg-emerald-50'}
          iconColor={deficitForecasts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}
          accent={deficitForecasts.length > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'}
          valueColor={deficitForecasts.length > 0 ? 'text-rose-600' : 'text-emerald-700'}
        />
      </div>

      {strongestForecast && (
        <section className="rounded-lg border border-slate-200 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Best projected scenario</p>
              <h2 className="text-xl font-bold text-white mt-1">{strongestForecast.name}</h2>
              <p className="text-sm text-slate-300 mt-1">
                Starts {fmtOptionalDate(strongestForecast.starting_date)}. Week 13 closing balance: {fmtFull(strongestForecast.weeks.at(-1)?.closing ?? strongestForecast.starting_cash)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openForecast(strongestForecast.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Open Forecast <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Available Forecasts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click a scenario to open its forecast page</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {forecasts.length} total
            </span>
          </div>

          {forecastsLoading && forecasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading forecasts...</p>
            </div>
          ) : forecasts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">No forecasts yet</p>
              <button
                type="button"
                onClick={openCreateForecast}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Forecast
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {forecasts.map(forecast => {
                const closing = forecast.weeks.at(-1)?.closing ?? forecast.starting_cash;
                const deficitWeek = forecast.weeks.find(week => week.warning);
                return (
                  <button
                    key={forecast.id}
                    type="button"
                    onClick={() => openForecast(forecast.id)}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{forecast.name}</p>
                          {deficitWeek && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              <AlertTriangle className="w-3 h-3" /> Week {deficitWeek.week}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Starts {fmtOptionalDate(forecast.starting_date)} - Starting cash {fmt(forecast.starting_cash)} - {forecast.weeks.length || 0} projected weeks
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${closing < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {fmt(closing)}
                          </p>
                          <p className="text-xs text-slate-400">Week 13</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
            </div>
          </div>

          {entriesLoading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-xs font-medium text-slate-600">No recent entries</p>
              {entriesError && <p className="text-xs text-rose-500 mt-2">{entriesError}</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentEntries.map(entry => (
                <div key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {entry.description || entry.category || 'Entry'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {entry.forecastName} - {fmtDate(entry.date)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${
                      entry.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {entry.type === 'inflow' ? '+' : '-'}{fmt(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showForecastModal && (
        <Modal title="New Forecast" onClose={() => setShowForecastModal(false)}>
          <form onSubmit={handleCreateForecast} className="space-y-4">
            <ForecastForm
              name={forecastName}
              startingDate={forecastStartingDate}
              startingCash={forecastStartingCash}
              setName={setForecastName}
              setStartingDate={setForecastStartingDate}
              setStartingCash={setForecastStartingCash}
            />
            {forecastFormError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {forecastFormError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forecastSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {forecastSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  : <><Plus className="w-4 h-4" /> Create</>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
