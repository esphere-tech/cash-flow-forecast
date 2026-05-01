import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Loader2, TrendingDown, DollarSign } from 'lucide-react';
import { ForecastWeek } from '../types';
import { forecastApi } from '../services/api';

const STARTING_CASH_KEY = 'cff_startingCash';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function Forecast() {
  const [startingCash, setStartingCash] = useState<string>(
    () => localStorage.getItem(STARTING_CASH_KEY) ?? ''
  );
  const [forecast, setForecast] = useState<ForecastWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    const val = parseFloat(startingCash);
    if (isNaN(val)) {
      setError('Enter a valid starting cash amount.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const weeks = await forecastApi.get(val);
      setForecast(weeks);
      setGenerated(true);
      localStorage.setItem(STARTING_CASH_KEY, String(val));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  const safeForecast = forecast ?? [];
  const firstDeficitWeek = safeForecast.find(w => w.warning);
  const lowestBalance = safeForecast.length > 0
    ? safeForecast.reduce((min, w) => w.closing < min ? w.closing : min, safeForecast[0].closing)
    : null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Forecast</h1>
        <p className="text-slate-500 mt-1 text-sm">Project your weekly cash flow</p>
      </div>

      {/* Generate Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Generate Forecast</h2>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={startingCash}
              onChange={e => setStartingCash(e.target.value)}
              placeholder="Starting cash balance"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><TrendingUp className="w-4 h-4" /> Generate Forecast</>
            }
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            {error}
          </div>
        )}
      </div>

      {/* Insights */}
      {generated && safeForecast.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-xl border shadow-sm p-5 ${
            firstDeficitWeek
              ? 'bg-red-50 border-red-100'
              : 'bg-green-50 border-green-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {firstDeficitWeek
                ? <AlertTriangle className="w-4 h-4 text-red-600" />
                : <TrendingUp className="w-4 h-4 text-green-600" />
              }
              <p className={`text-xs font-semibold uppercase tracking-wider ${
                firstDeficitWeek ? 'text-red-600' : 'text-green-600'
              }`}>
                Cash Deficit
              </p>
            </div>
            {firstDeficitWeek ? (
              <p className="text-sm font-semibold text-red-800">
                ⚠️ You will run out of cash in <span className="font-bold">Week {firstDeficitWeek.week}</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-green-800">
                ✓ No cash deficit projected in this forecast
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-slate-600" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Lowest Balance
              </p>
            </div>
            <p className={`text-sm font-semibold ${
              lowestBalance !== null && lowestBalance < 0 ? 'text-red-700' : 'text-slate-800'
            }`}>
              <DollarSign className="w-3.5 h-3.5 inline -mt-0.5" />
              Lowest cash balance: <span className="font-bold">{lowestBalance !== null ? fmt(lowestBalance) : '—'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      {generated && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Weekly Projection</h2>
            {safeForecast.some(w => w.warning) && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Cash deficit weeks highlighted
              </span>
            )}
          </div>

          {safeForecast.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">No forecast data returned. Add some entries first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Week</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Opening</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Inflow</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Outflow</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Closing</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {safeForecast.map(week => (
                    <tr
                      key={week.week}
                      className={week.warning ? 'bg-red-50' : 'hover:bg-slate-50 transition-colors'}
                    >
                      <td className={`px-6 py-4 font-medium ${week.warning ? 'text-red-900' : 'text-slate-700'}`}>
                        Week {week.week}
                      </td>
                      <td className={`px-6 py-4 text-right ${week.warning ? 'text-red-700' : 'text-slate-600'}`}>
                        {fmt(week.opening)}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${week.warning ? 'text-red-700' : 'text-green-600'}`}>
                        +{fmt(week.inflow)}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${week.warning ? 'text-red-700' : 'text-red-600'}`}>
                        -{fmt(week.outflow)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        week.closing < 0 ? 'text-red-700' : week.warning ? 'text-red-800' : 'text-slate-900'
                      }`}>
                        {fmt(week.closing)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {week.warning ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Deficit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            ✓ Healthy
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state before generation */}
      {!generated && !loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-20 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">No forecast yet</p>
          <p className="text-xs text-slate-400 mt-1">Enter a starting cash balance and click Generate Forecast</p>
        </div>
      )}
    </div>
  );
}
