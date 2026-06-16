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
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="card" key={card.label}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">{card.label}</span>
              <card.icon className="h-5 w-5 text-gumleaf" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-ink">{card.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="panel-title">Kilometres over time</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} km`} />
                <Bar dataKey="kilometres" fill="#2d6a4f" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="panel-title">Recent trips</h2>
          <div className="mt-4 space-y-3">
            {data.recent.length ? (
              data.recent.map((entry) => (
                <div className="rounded-lg border border-slate-200 p-3" key={entry.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{entry.date}</span>
                    <span className="text-sm font-semibold text-gumleaf">{formatKm(entry.kilometres)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {entry.startLocation} to {entry.endLocation}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No trips recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
