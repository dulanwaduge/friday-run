import { Repeat2, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { EntryPayload, FrequentDestination, TravelEntry, Vehicle } from "../types";
import { today } from "../lib/dates";
import { MapsTripPicker } from "./MapsTripPicker";
import { titleCase } from "../lib/text";

type Props = {
  entry?: TravelEntry | null;
  busy?: boolean;
  onSubmit: (payload: EntryPayload) => Promise<void>;
  onCancel?: () => void;
  draft?: EntryPayload | null;
  destinations?: FrequentDestination[];
  vehicles?: Vehicle[];
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
  roundTrip: false,
  tripCategory: "work",
  commuteReason: null
};

export function EntryForm({ entry, busy, onSubmit, onCancel, draft, destinations = [], vehicles = [] }: Props) {
  const [form, setForm] = useState<EntryPayload>(blank);

  useEffect(() => {
    if (entry) {
      const { id: _id, financialYear: _fy, createdAt: _created, updatedAt: _updated, ...payload } = entry;
      setForm(payload);
    } else if (draft) {
      setForm(draft);
    } else {
      setForm(blank);
    }
  }, [draft, entry]);

  const categoryFor = (address: string) => destinations.find((item) => item.address.trim().toLowerCase() === address.trim().toLowerCase())?.category;
  const likelyCommute = (categoryFor(form.startLocation) === "home" && categoryFor(form.endLocation) === "office") || (categoryFor(form.startLocation) === "office" && categoryFor(form.endLocation) === "home");

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
          <select className="field" value={form.vehicle ?? ""} onChange={(event) => update("vehicle", event.target.value || null)}>
            <option value="">Choose a vehicle…</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.rego}>{vehicle.rego} — {vehicle.state}</option>
            ))}
            {form.vehicle && !vehicles.some((vehicle) => vehicle.rego === form.vehicle) ? <option value={form.vehicle}>{form.vehicle}</option> : null}
          </select>
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
      {destinations.length ? <div className="grid gap-4 md:grid-cols-2">
        <label className="label">Use saved start<select className="field" value="" onChange={(event) => update("startLocation", event.target.value)}><option value="">Choose a destination…</option>{destinations.map((item) => <option key={item.id} value={item.address}>{item.nickname} — {item.address}</option>)}</select></label>
        <label className="label">Use saved end<select className="field" value="" onChange={(event) => update("endLocation", event.target.value)}><option value="">Choose a destination…</option>{destinations.map((item) => <option key={item.id} value={item.address}>{item.nickname} — {item.address}</option>)}</select></label>
      </div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label">Trip Category<select className="field" value={form.tripCategory} onChange={(event) => update("tripCategory", event.target.value as EntryPayload["tripCategory"])}>{["work", "personal", "commute", "client_visit", "site_visit", "training", "supplier_visit"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        {likelyCommute && form.tripCategory === "work" ? <label className="label text-amber-800 dark:text-amber-300">Reason this is work-related<input className="field" value={form.commuteReason ?? ""} onChange={(event) => update("commuteReason", event.target.value || null)} required /></label> : null}
      </div>
      {likelyCommute ? <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">This looks like travel between home and a regular workplace. Normal commuting is generally not tax deductible in Australia. You may continue, but work-related treatment requires a reason.</div> : null}
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
          {entry ? "Update Trip" : "Save Trip"}
        </button>
      </div>
    </form>
  );
}
