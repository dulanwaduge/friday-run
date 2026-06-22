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
        <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-gumleaf" /><h2 className="panel-title">Tax deduction estimate</h2></div>
        <div className="flex gap-2">
          <input className="field w-28" aria-label="Financial year" value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} />
          <label className="label">Marginal rate %<input className="field w-28" type="number" min="0" max="100" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></label>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : summary ? <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-slate-500">Work kilometres</p><p className="text-2xl font-semibold">{summary.totalWorkKilometres.toFixed(1)} km</p></div>
          <div><p className="text-xs text-slate-500">Estimated deduction</p><p className="text-2xl font-semibold">{money(summary.estimatedDeduction)}</p></div>
          <div><p className="text-xs text-slate-500">Estimated tax benefit</p><p className="text-2xl font-semibold">{money(summary.estimatedTaxBenefit)}</p></div>
          <div><p className="text-xs text-slate-500">Financial year progress</p><p className="text-2xl font-semibold">{Math.round(summary.financialYearProgress * 100)}%</p></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-gumleaf" style={{ width: `${summary.financialYearProgress * 100}%` }} /></div>
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">Calculated at ${summary.centsPerKilometreRate.toFixed(2)}/km, capped at 5,000 km per recorded car. Trips without a vehicle are grouped together. {summary.disclaimer}</p>
      </> : <p className="text-sm text-slate-500">Loading estimate…</p>}
    </section>
  );
}
