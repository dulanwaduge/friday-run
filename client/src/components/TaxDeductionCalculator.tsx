import { Calculator } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { currentFinancialYear } from "../lib/dates";
import type { DeductionSummary } from "../types";

const money = (value: number) => value.toLocaleString(undefined, { style: "currency", currency: "AUD" });

export function TaxDeductionCalculator({ refreshKey = 0 }: { refreshKey?: number }) {
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [taxRate, setTaxRate] = useState(30);
  const [summary, setSummary] = useState<DeductionSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.deduction(financialYear, taxRate / 100).then(setSummary).catch((err) => setError(err.message));
  }, [financialYear, refreshKey, taxRate]);

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gumleaf/10 text-gumleaf ring-1 ring-gumleaf/15"><Calculator className="h-5 w-5" /></span><h2 className="panel-title">Tax deduction estimate</h2></div>
        <div className="flex gap-2">
          <input className="field w-28" aria-label="Financial year" value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} />
          <label className="label">Marginal rate %<input className="field w-28" type="number" min="0" max="100" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></label>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : summary ? <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="metric-tile"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Work kilometres</p><p className="mt-2 text-2xl font-bold text-ink dark:text-white">{summary.totalWorkKilometres.toFixed(1)} km</p></div>
          <div className="metric-tile"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Estimated deduction</p><p className="mt-2 text-2xl font-bold text-ink dark:text-white">{money(summary.estimatedDeduction)}</p></div>
          <div className="metric-tile"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Estimated tax benefit</p><p className="mt-2 text-2xl font-bold text-ink dark:text-white">{money(summary.estimatedTaxBenefit)}</p></div>
          <div className="metric-tile"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Financial year progress</p><p className="mt-2 text-2xl font-bold text-ink dark:text-white">{Math.round(summary.financialYearProgress * 100)}%</p></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gumleaf" style={{ width: `${summary.financialYearProgress * 100}%` }} /></div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">Calculated at ${summary.centsPerKilometreRate.toFixed(2)}/km, capped at 5,000 km per recorded car. Trips without a vehicle are grouped together. {summary.disclaimer}</p>
      </> : <p className="text-sm text-slate-500">Loading estimate…</p>}
    </section>
  );
}
