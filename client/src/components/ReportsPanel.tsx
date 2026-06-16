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

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Reports</h2>
        <button className="btn-primary" type="button" onClick={download}>
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <label className="label">
          Period
          <select className="field" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="financial-year">Financial year</option>
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
    </div>
  );
}
