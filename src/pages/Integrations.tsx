import React from 'react';
import { ArrowRight, Clock3, DatabaseZap, RefreshCw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

function IntegrationBrand({
  name,
  accent,
  badge,
  description,
}: {
  name: string;
  accent: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
            {badge}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-3">{name}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-6">{description}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-slate-500">{name.slice(0, 2).toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-white">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-slate-300 mt-1 leading-6">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function Integrations() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-950/20">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative p-8 lg:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(99,102,241,0.22),rgba(15,23,42,0.98))]" />
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Coming soon
                </div>

                <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Connect your accounting stack without the manual work.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                  We’re building secure integrations for Xero and QuickBooks so your cash flow data, entries,
                  and reconciliation workflow can stay in sync automatically.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 ring-1 ring-inset ring-emerald-400/20">
                    <ShieldCheck className="h-4 w-4" />
                    Secure sync planned
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-inset ring-white/10">
                    <RefreshCw className="h-4 w-4" />
                    Two-way updates
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-inset ring-white/10">
                    <Clock3 className="h-4 w-4" />
                    Launching soon
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 lg:p-10">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Preview</p>
                <div className="mt-4 space-y-4">
                  <IntegrationBrand
                    name="Xero"
                    badge="Xero"
                    accent="bg-sky-50 text-sky-700"
                    description="Pull bank transactions, invoices, and account balances into Cash Flow Forecast with less friction."
                  />
                  <IntegrationBrand
                    name="QuickBooks"
                    badge="QuickBooks"
                    accent="bg-emerald-50 text-emerald-700"
                    description="Keep your forecast and bookkeeping aligned with a streamlined accounting connection."
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm">
                    <DatabaseZap className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">What will be available</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Fast setup, automated import mapping, and a cleaner view of cash movement across your finance tools.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <ArrowRight className="h-4 w-4 text-indigo-500" />
                  <p>
                    Early access and onboarding details will appear here when the Xero and QuickBooks connections are ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <FeatureCard
            icon={<WalletCards className="h-5 w-5 text-sky-200" />}
            title="Unified finance view"
            text="Bring accounting data into one place so forecasts and actuals are easier to compare."
          />
          <FeatureCard
            icon={<RefreshCw className="h-5 w-5 text-sky-200" />}
            title="Automated refreshes"
            text="Cut out repetitive exports and imports once the integrations are live."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-sky-200" />}
            title="Built with trust"
            text="Designed to keep your accounting workflow clear, controlled, and easy to audit."
          />
        </section>
      </div>
    </div>
  );
}