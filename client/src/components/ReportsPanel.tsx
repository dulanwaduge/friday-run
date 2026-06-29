import { Download } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { currentFinancialYear, today } from "../lib/dates";

export function ReportsPanel() {
  const [period, setPeriod] = useState("financial-year");
  const [format, setFormat] = useState("pdf");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());

  async function download() {
    const params = new URLSearchParams({ period, format });
    if (period === "custom") {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else if (period === "financial-year") {
      params.set("financialYear", financialYear);
    } else {
      params.set("startDate", startDate);
    }
    await api.downloadReport(params);
  }

  async function downloadAuditPackage() {
    await api.downloadAuditPackage(financialYear, 0.30);
  }

  return (
    <section className="card" aria-labelledby="reports-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Exports</p>
          <h2 id="reports-heading" className="panel-title">Reports</h2>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button className="btn-secondary flex-1 sm:flex-none" type="button" onClick={downloadAuditPackage}>
            <Download className="h-4 w-4" />
            ATO Audit Package
          </button>
          <button className="btn-primary flex-1 sm:flex-none" type="button" onClick={download}>
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <label className="label">
          Period
          <select className="field" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="financial-year">Financial Year</option>
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {period === "financial-year" ? (
          <label className="label">
            Financial year
            <input className="field" value={financialYear} onChange={(event) => setFinancialYear(event.target.value)} />
          </label>
        ) : (
          <label className="label">
            Date
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
        )}
        {period === "custom" ? (
          <label className="label">
            End date
            <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        ) : null}
        <label className="label">
          Format
          <select className="field" value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">The audit package is a record-keeping aid, not tax advice, and should be reviewed by a registered tax professional.</p>
    </section>
  );
}
