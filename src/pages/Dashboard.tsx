import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Clock } from 'lucide-react';
import { Entry } from '../types';
import { entriesApi } from '../services/api';

const STARTING_CASH_KEY = 'cff_startingCash';
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

// ─── Bar Chart ────────────────────────────────────────────────────────────────
interface MonthData { label: string; inflow: number; outflow: number }

function BarChart({ data }: { data: MonthData[] }) {
  const VW = 520, VH = 200, PL = 56, PR = 12, PT = 16, PB = 36;
  const plotW = VW - PL - PR;
  const plotH = VH - PT - PB;

  const allVals = data.flatMap(d => [d.inflow, d.outflow]);
  const maxVal = niceMax(Math.max(...allVals, 1));
  const ticks = Array.from({ length: 5 }, (_, i) => (maxVal / 4) * i);

  const gW = plotW / data.length;
  const bW = Math.floor(gW * 0.27);

  const toY = (v: number) => PT + plotH - (v / maxVal) * plotH;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
      {/* Grid lines + Y-axis labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PL} y1={toY(t)} x2={PL + plotW} y2={toY(t)}
            stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth="1"
          />
          <text x={PL - 7} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {t >= 1000 ? `$${(t / 1000).toFixed(0)}k` : `$${Math.round(t)}`}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const pairW = bW * 2 + 3;
        const x = PL + i * gW + (gW - pairW) / 2;
        const inflowH = Math.max((d.inflow / maxVal) * plotH, d.inflow > 0 ? 2 : 0);
        const outflowH = Math.max((d.outflow / maxVal) * plotH, d.outflow > 0 ? 2 : 0);
        return (
          <g key={d.label}>
            <rect x={x}          y={toY(d.inflow)}  width={bW} height={inflowH}  fill="#10b981" rx="2" opacity="0.88" />
            <rect x={x + bW + 3} y={toY(d.outflow)} width={bW} height={outflowH} fill="#f43f5e" rx="2" opacity="0.88" />
            <text x={PL + i * gW + gW / 2} y={VH - 9} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PL} y1={PT}        x2={PL}        y2={PT + plotH} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH} stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}

// ─── Net Cash Sparkline ───────────────────────────────────────────────────────
function Sparkline({ entries, startingCash }: { entries: Entry[]; startingCash: number }) {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) return null;

  const points: number[] = [];
  let running = startingCash;
  sorted.forEach(e => {
    running += e.type === 'inflow' ? e.amount : -e.amount;
    points.push(running);
  });

  const VW = 160, VH = 48, PAD = 4;
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const toX = (i: number) => PAD + (i / (points.length - 1)) * (VW - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - minV) / range) * (VH - PAD * 2);

  const polyline = points.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const areaPath = `M${toX(0)},${VH} ` +
    points.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ') +
    ` L${toX(points.length - 1)},${VH} Z`;

  const lastVal = points[points.length - 1];
  const isUp = lastVal >= points[0];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-32 h-10">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline points={polyline} fill="none" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
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
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 ${accent} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor} flex-shrink-0`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${valueColor} leading-none`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const startingCash = parseFloat(localStorage.getItem(STARTING_CASH_KEY) ?? '0') || 0;

  useEffect(() => {
    entriesApi.getAll()
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalInflow  = entries.filter(e => e.type === 'inflow').reduce((s, e) => s + e.amount, 0);
  const totalOutflow = entries.filter(e => e.type === 'outflow').reduce((s, e) => s + e.amount, 0);
  const netCash = startingCash + totalInflow - totalOutflow;

  // Monthly chart data
  const months = getLastMonths(6);
  const monthlyData: MonthData[] = months.map(m => ({
    label: m.label,
    inflow:  entries.filter(e => e.type === 'inflow'  && getMonthKey(e.date) === m.key).reduce((s, e) => s + e.amount, 0),
    outflow: entries.filter(e => e.type === 'outflow' && getMonthKey(e.date) === m.key).reduce((s, e) => s + e.amount, 0),
  }));

  // Category breakdown (outflows)
  const catMap: Record<string, number> = {};
  entries.filter(e => e.type === 'outflow').forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = categories[0]?.[1] || 1;
  const CAT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'];

  // Recent entries
  const recent = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const inflowCount  = entries.filter(e => e.type === 'inflow').length;
  const outflowCount = entries.filter(e => e.type === 'outflow').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
          loading ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {loading ? 'Loading data…' : `${entries.length} entries`}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Starting Cash"
          value={fmt(startingCash)}
          sub="Opening balance"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-slate-100"   iconColor="text-slate-600"
          accent="border-l-slate-400"
        />
        <SummaryCard
          label="Total Inflow"
          value={fmt(totalInflow)}
          sub={`${inflowCount} transaction${inflowCount !== 1 ? 's' : ''}`}
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-emerald-50"  iconColor="text-emerald-600"
          accent="border-l-emerald-500"
          valueColor="text-emerald-700"
        />
        <SummaryCard
          label="Total Outflow"
          value={fmt(totalOutflow)}
          sub={`${outflowCount} transaction${outflowCount !== 1 ? 's' : ''}`}
          icon={<TrendingDown className="w-4 h-4" />}
          iconBg="bg-rose-50"     iconColor="text-rose-600"
          accent="border-l-rose-500"
          valueColor="text-rose-600"
        />
        <SummaryCard
          label="Net Cash Flow"
          value={fmt(netCash)}
          sub={netCash >= 0 ? '↑ Positive balance' : '↓ Negative balance'}
          icon={<Wallet className="w-4 h-4" />}
          iconBg={netCash >= 0 ? 'bg-indigo-50' : 'bg-rose-50'}
          iconColor={netCash >= 0 ? 'text-indigo-600' : 'text-rose-600'}
          accent={netCash >= 0 ? 'border-l-indigo-500' : 'border-l-rose-500'}
          valueColor={netCash >= 0 ? 'text-indigo-600' : 'text-rose-600'}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Monthly Bar Chart */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Monthly Cash Flow</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months — inflow vs outflow</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block opacity-88" />
                Inflow
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block opacity-88" />
                Outflow
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[160px]">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={monthlyData} />
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-800">Outflow by Category</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Top spending areas</p>

          {loading ? (
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
                        style={{ width: `${(val / catMax) * 100}%`, backgroundColor: CAT_COLORS[i] }}
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

      {/* ── Net Cash Trend + Recent Activity ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Net Cash Trend card */}
        {entries.length >= 2 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-0.5">Net Cash Trend</h2>
            <p className="text-xs text-slate-400 mb-3">Cumulative balance over time</p>
            <Sparkline entries={entries} startingCash={startingCash} />
            <p className={`text-base font-bold mt-2 ${netCash >= startingCash ? 'text-emerald-600' : 'text-rose-600'}`}>
              {fmtFull(netCash)}
            </p>
            <p className="text-xs text-slate-400">Current balance</p>
          </div>
        )}

        {/* Recent Activity */}
        <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${entries.length >= 2 ? 'col-span-2' : 'col-span-3'}`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {Math.min(6, recent.length)} of {entries.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-slate-600">No entries yet</p>
              <p className="text-xs text-slate-400 mt-1">Go to Entries to add your first transaction</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((entry, i) => (
                <div key={entry.id ?? i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.type === 'inflow' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    {entry.type === 'inflow'
                      ? <TrendingUp  className="w-3.5 h-3.5 text-emerald-600" />
                      : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {entry.description || entry.category}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {entry.category} · {fmtDate(entry.date)}
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
    </div>
  );
}
