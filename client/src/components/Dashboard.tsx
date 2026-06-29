import { Activity, CalendarDays, CarFront, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "../types";
import { formatKm } from "../lib/dates";

type Props = {
  data: DashboardData;
};

export function Dashboard({ data }: Props) {
  const cards = [
    { label: `${data.financialYearLabel} financial year`, value: formatKm(data.totals.financialYear), icon: FileText },
    { label: "This month", value: formatKm(data.totals.month), icon: CalendarDays },
    { label: "This week", value: formatKm(data.totals.week), icon: Activity },
    { label: "Trips recorded", value: data.totals.trips.toLocaleString(), icon: CarFront }
  ];

  return (
    <section className="space-y-5" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading" className="sr-only">Dashboard totals</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="card transition hover:-translate-y-0.5 hover:shadow-soft" key={card.label}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{card.label}</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gumleaf/10 text-gumleaf ring-1 ring-gumleaf/15 dark:bg-gumleaf/20 dark:text-emerald-200">
                <card.icon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 text-3xl font-bold text-ink dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">Kilometres over time</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e2dc" vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => `${value} km`}
                  contentStyle={{ borderRadius: 8, borderColor: "#d7e2dc", boxShadow: "0 12px 28px rgba(16, 32, 51, 0.12)" }}
                />
                <Bar dataKey="kilometres" fill="#1f6f55" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="panel-title">Recent trips</h3>
          <div className="mt-4 space-y-3">
            {data.recent.length ? (
              data.recent.map((entry) => (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50" key={entry.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink dark:text-white">{entry.date}</span>
                    <span className="rounded-full bg-gumleaf/10 px-2.5 py-1 text-xs font-bold text-gumleaf dark:bg-gumleaf/20 dark:text-emerald-200">{formatKm(entry.kilometres)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                    {entry.startLocation} to {entry.endLocation}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">No trips recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
