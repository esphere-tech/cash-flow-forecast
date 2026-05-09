import React, { useState, useEffect, useMemo, FormEvent, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Entry, EntryData } from '../types';
import { entriesApi } from '../services/api';
import { useApp } from '../context/AppContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const CATEGORIES = [
  'Sales', 'Investment', 'Loan', 'Salary', 'Rent', 'Utilities',
  'Supplies', 'Marketing', 'Payroll', 'Tax', 'Other',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function emptyForm(): EntryData {
  return { type: 'inflow', amount: 0, date: '', category: '', description: '' };
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white';

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text || '-'}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-100 text-amber-900 rounded px-0.5">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
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

function EntryFields({
  form,
  setForm,
  datalistId,
}: {
  form: EntryData;
  setForm: React.Dispatch<React.SetStateAction<EntryData>>;
  datalistId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value as 'inflow' | 'outflow' }))}
          className={inputCls}
        >
          <option value="inflow">Inflow</option>
          <option value="outflow">Outflow</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input
            type="number"
            value={form.amount || ''}
            onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className={`${inputCls} pl-7`}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
        <input
          type="text"
          list={datalistId}
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          placeholder="Sales, Rent..."
          className={inputCls}
        />
        <datalist id={datalistId}>
          {CATEGORIES.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Add a note..."
          className={inputCls}
        />
      </div>
    </div>
  );
}

export default function Entries() {
  const {
    forecasts,
    forecastsLoading,
    selectedForecast,
    selectedForecastId,
    selectForecast,
    refreshForecasts,
  } = useApp();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<EntryData>(emptyForm());
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<EntryData>(emptyForm());
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEntries = useCallback(async (forecastId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await entriesApi.getAll(forecastId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedForecastId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    void loadEntries(selectedForecastId);
  }, [loadEntries, selectedForecastId]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, pageSize, selectedForecastId]);

  const validate = (f: EntryData): string => {
    if (!f.type) return 'Select a type.';
    if (!f.amount || f.amount <= 0) return 'Amount must be greater than 0.';
    if (!f.date) return 'Select a date.';
    return '';
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedForecast) {
      setFormError('Select a forecast first.');
      return;
    }

    const msg = validate(form);
    if (msg) {
      setFormError(msg);
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      const created = await entriesApi.create(selectedForecast.id, form);
      setEntries(prev => [created, ...prev]);
      setForm(emptyForm());
      setShowAdd(false);
      await refreshForecasts(selectedForecast.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (entry: Entry) => {
    setEditEntry(entry);
    setEditForm({
      type: entry.type,
      amount: entry.amount,
      date: entry.date.slice(0, 10),
      category: entry.category,
      description: entry.description,
    });
    setEditError('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editEntry || !selectedForecast) return;

    const msg = validate(editForm);
    if (msg) {
      setEditError(msg);
      return;
    }

    setEditError('');
    setEditSubmitting(true);
    try {
      const updated = await entriesApi.update(editEntry.id, selectedForecast.id, editForm);
      setEntries(prev => prev.map(en => en.id === updated.id ? updated : en));
      setEditEntry(null);
      await refreshForecasts(selectedForecast.id);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update entry.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedForecast) return;

    setDeletingId(id);
    try {
      await entriesApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      await refreshForecasts(selectedForecast.id);
    } catch {
      // Keep the table stable if deletion fails; the next explicit refresh will resync.
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries
      .filter(e => typeFilter === 'all' || e.type === typeFilter)
      .filter(e =>
        !q ||
        e.category.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        fmt(e.amount).includes(q)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNums = getPageNumbers(safePage, totalPages);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      active
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entries</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {selectedForecast ? selectedForecast.name : 'No forecast selected'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {forecasts.length > 0 && (
            <select
              value={selectedForecastId ?? ''}
              onChange={e => selectForecast(e.target.value || null)}
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
            onClick={() => {
              setForm(emptyForm());
              setFormError('');
              setShowAdd(true);
            }}
            disabled={!selectedForecast}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      {forecastsLoading && forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading forecasts...</p>
        </div>
      ) : forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No forecasts yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Forecast Entries</h2>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {entries.length} total
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search category, description..."
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setTypeFilter('all')} className={filterBtn(typeFilter === 'all')}>All</button>
                <button type="button" onClick={() => setTypeFilter('inflow')} className={filterBtn(typeFilter === 'inflow')}>Inflow</button>
                <button type="button" onClick={() => setTypeFilter('outflow')} className={filterBtn(typeFilter === 'outflow')}>Outflow</button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {(search || typeFilter !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
                </span>
                {search && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    "{search}"
                    <button type="button" onClick={() => setSearch('')} className="hover:text-amber-900 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {typeFilter}
                    <button type="button" onClick={() => setTypeFilter('all')} className="hover:text-indigo-900 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading entries...</p>
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-red-600">{error}</p>
              {selectedForecastId && (
                <button
                  type="button"
                  onClick={() => loadEntries(selectedForecastId)}
                  className="mt-2 text-sm text-indigo-600 hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No entries yet</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No entries match your search</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Date', 'Type', 'Amount', 'Category', 'Description', ''].map((h, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                          i === 5 ? 'w-20' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === 'inflow'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {entry.type === 'inflow'
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />
                          }
                          {entry.type}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 font-semibold whitespace-nowrap ${
                        entry.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {entry.type === 'inflow' ? '+' : '-'}{fmt(entry.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <Highlight text={entry.category} query={search} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 max-w-xs truncate">
                        <Highlight text={entry.description || '-'} query={search} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === entry.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{rangeStart}-{rangeEnd}</span> of{' '}
                <span className="font-medium text-slate-700">{filtered.length}</span>
                {filtered.length !== entries.length && (
                  <span className="text-slate-400"> (filtered from {entries.length})</span>
                )}
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {pageNums.map((n, i) =>
                  n === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 py-1.5 text-xs text-slate-400 select-none">...</span>
                  ) : (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`min-w-[30px] px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        n === safePage
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <Modal title="New Entry" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <EntryFields form={form} setForm={setForm} datalistId="add-cat-list" />
            {formError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                  : <><Plus className="w-4 h-4" /> Add Entry</>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editEntry && (
        <Modal title="Edit Entry" onClose={() => setEditEntry(null)}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <EntryFields form={editForm} setForm={setEditForm} datalistId="edit-cat-list" />
            {editError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditEntry(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {editSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : 'Save Changes'
                }
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
