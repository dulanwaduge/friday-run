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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "Route", "Financial year", "Kilometres", "Actions"].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.map((entry) => (
              <tr className="align-top" key={entry.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">{entry.date}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{entry.startLocation}</div>
                  <div>{entry.endLocation}</div>
                  {entry.notes ? <div className="mt-1 text-xs text-slate-400">{entry.notes}</div> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{entry.financialYear}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gumleaf">{formatKm(entry.kilometres)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex gap-2">
                    <button className="icon-btn" type="button" onClick={() => onEdit(entry)} aria-label="Edit entry">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="icon-btn danger" type="button" onClick={() => onDelete(entry)} aria-label="Delete entry">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
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
