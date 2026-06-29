import { Edit2, Trash2 } from "lucide-react";
import type { TravelEntry } from "../types";
import { formatKm } from "../lib/dates";

type Props = {
  entries: TravelEntry[];
  onEdit: (entry: TravelEntry) => void;
  onDelete: (entry: TravelEntry) => void;
};

export function EntriesTable({ entries, onEdit, onDelete }: Props) {
  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <caption className="sr-only">Travel entries with route, financial year, kilometres, and actions</caption>
          <thead className="bg-mist/70 dark:bg-slate-900">
            <tr>
              {["Date", "Route", "Trip type", "Financial year", "Kilometres", "Actions"].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {entries.map((entry) => (
              <tr className="align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60" key={entry.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink dark:text-white">{entry.date}</td>
                <td className="min-w-72 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="font-medium text-slate-900 dark:text-white">{entry.startLocation}</div>
                  <div>{entry.endLocation}</div>
                  {entry.notes ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.notes}</div> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{entry.roundTrip ? "Return trip" : "One-way"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{entry.financialYear}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gumleaf">{formatKm(entry.kilometres)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex gap-2">
                    <button className="icon-btn" type="button" onClick={() => onEdit(entry)} aria-label="Edit Entry">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="icon-btn danger" type="button" onClick={() => onDelete(entry)} aria-label="Delete Entry">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300" colSpan={6}>
                  No entries match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
