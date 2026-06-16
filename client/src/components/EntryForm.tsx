import { Repeat2, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { EntryPayload, TravelEntry } from "../types";
import { today } from "../lib/dates";
import { MapsTripPicker } from "./MapsTripPicker";

type Props = {
  entry?: TravelEntry | null;
  busy?: boolean;
  onSubmit: (payload: EntryPayload) => Promise<void>;
  onCancel?: () => void;
};

const blank: EntryPayload = {
  date: today(),
  startLocation: "",
  endLocation: "",
  kilometres: 0,
  calculatedKilometres: null,
  distanceSource: "manual",
  notes: null,
  vehicle: null,
  odometerStart: null,
  odometerEnd: null,
  roundTrip: false
};

export function EntryForm({ entry, busy, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<EntryPayload>(blank);

  useEffect(() => {
    if (entry) {
      const { id: _id, financialYear: _fy, createdAt: _created, updatedAt: _updated, ...payload } = entry;
      setForm(payload);
    } else {
      setForm(blank);
    }
  }, [entry]);

  function update<K extends keyof EntryPayload>(key: K, value: EntryPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRoundTrip(checked: boolean) {
    setForm((current) => {
      const oneWayKm =
        current.calculatedKilometres == null
          ? null
          : current.roundTrip
            ? current.calculatedKilometres / 2
            : current.calculatedKilometres;
      const nextCalculatedKilometres =
        oneWayKm == null ? current.calculatedKilometres : checked ? Math.round(oneWayKm * 2 * 10) / 10 : oneWayKm;
      const kilometres =
        current.calculatedKilometres == null || current.kilometres !== current.calculatedKilometres
          ? current.kilometres
          : nextCalculatedKilometres ?? current.kilometres;
      return {
        ...current,
        roundTrip: checked,
        calculatedKilometres: nextCalculatedKilometres,
        kilometres
      };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(form);
    if (!entry) setForm(blank);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[180px_180px_180px_1fr]">
        <label className="label">
          Date
          <input className="field" type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required />
        </label>
        <label className="label">
          Kilometres
          <input
            className="field"
            type="number"
            min="0"
            step="0.1"
            value={form.kilometres}
            onChange={(event) => {
              const kilometres = Number(event.target.value);
              update("kilometres", kilometres);
              update("distanceSource", form.calculatedKilometres === kilometres ? "calculated" : "manual");
            }}
            required
          />
        </label>
        <label className="label">
          Round trip
          <span className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <input
              className="h-4 w-4 accent-gumleaf"
              type="checkbox"
              checked={form.roundTrip}
              onChange={(event) => updateRoundTrip(event.target.checked)}
            />
            <Repeat2 className="h-4 w-4 text-gumleaf" />
            Return
          </span>
        </label>
        <label className="label">
          Vehicle
          <input className="field" value={form.vehicle ?? ""} onChange={(event) => update("vehicle", event.target.value || null)} />
        </label>
      </div>
      <MapsTripPicker
        startLocation={form.startLocation}
        endLocation={form.endLocation}
        roundTrip={form.roundTrip}
        onStartChange={(value) => update("startLocation", value)}
        onEndChange={(value) => update("endLocation", value)}
        onDistanceCalculated={(oneWayKm) => {
          const totalKm = form.roundTrip ? Math.round(oneWayKm * 2 * 10) / 10 : oneWayKm;
          setForm((current) => ({
            ...current,
            kilometres: totalKm,
            calculatedKilometres: totalKm,
            distanceSource: "calculated"
          }));
        }}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="label">
          Odometer start
          <input className="field" type="number" min="0" value={form.odometerStart ?? ""} onChange={(event) => update("odometerStart", event.target.value ? Number(event.target.value) : null)} />
        </label>
        <label className="label">
          Odometer end
          <input className="field" type="number" min="0" value={form.odometerEnd ?? ""} onChange={(event) => update("odometerEnd", event.target.value ? Number(event.target.value) : null)} />
        </label>
        <label className="label">
          Notes
          <input className="field" value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || null)} />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <button className="btn-secondary" type="button" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </button>
        ) : null}
        <button className="btn-primary" type="submit" disabled={busy}>
          <Save className="h-4 w-4" />
          {entry ? "Update trip" : "Save trip"}
        </button>
      </div>
    </form>
  );
}
