import { Repeat2, X } from "lucide-react";
import { useState } from "react";
import { today } from "../lib/dates";
import type { EntryPayload, TravelEntry } from "../types";

export function ReturnTripPrompt({ entry, onCreate, onPrepare, onDismiss }: { entry: TravelEntry; onCreate: (payload: EntryPayload) => Promise<void>; onPrepare: (payload: EntryPayload) => void; onDismiss: () => void }) {
  const [date, setDate] = useState(entry.date || today());
  const reversed: EntryPayload = { date, startLocation: entry.endLocation, endLocation: entry.startLocation, kilometres: entry.kilometres, calculatedKilometres: entry.calculatedKilometres, distanceSource: entry.distanceSource, notes: null, vehicle: entry.vehicle, odometerStart: entry.odometerEnd, odometerEnd: null, roundTrip: false, tripCategory: entry.tripCategory, commuteReason: entry.commuteReason };
  return <section className="mt-5 rounded-lg border border-gumleaf/25 bg-gumleaf/10 p-4 shadow-panel ring-1 ring-gumleaf/10 dark:bg-gumleaf/10">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-ink dark:text-white">Create the return trip?</p><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{entry.endLocation} to {entry.startLocation}</p></div><button className="icon-btn" type="button" onClick={onDismiss} aria-label="Dismiss return trip prompt"><X className="h-4 w-4" /></button></div>
    <div className="mt-3 flex flex-wrap items-end gap-3"><label className="label">Return date<input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="btn-primary" type="button" onClick={() => onCreate(reversed)}><Repeat2 className="h-4 w-4" />Create With Same Kilometres</button><button className="btn-secondary" type="button" onClick={() => onPrepare({ ...reversed, kilometres: 0, calculatedKilometres: null, distanceSource: "manual" })}>Prepare And Recalculate</button></div>
  </section>;
}
