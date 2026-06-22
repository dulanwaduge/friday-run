import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../lib/api";
import type { DestinationPayload, FrequentDestination } from "../types";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { titleCase } from "../lib/text";

const empty: DestinationPayload = { nickname: "", address: "", category: "other", notes: null };

export function FrequentDestinations({ destinations, onChange }: { destinations: FrequentDestination[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState<DestinationPayload>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (editingId) await api.updateDestination(editingId, form); else await api.createDestination(form);
      setForm(empty); setEditingId(null); await onChange();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save destination"); }
  }

  return <section className="card">
    <div className="mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-gumleaf" /><h2 className="panel-title">Frequent destinations</h2></div>
    {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
    <form className="grid gap-3 lg:grid-cols-[1fr_2fr_180px_1.2fr_auto]" onSubmit={submit}>
      <label className="label">Nickname<input className="field" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required /></label>
      <AddressAutocomplete label="Full Address" value={form.address} onChange={(address) => setForm((current) => ({ ...current, address }))} required />
      <label className="label">Category<select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DestinationPayload["category"] })}>{["home", "office", "client", "supplier", "training", "job_site", "other"].map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}</select></label>
      <label className="label">Notes<input className="field" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></label>
      <button className="btn-primary self-end" type="submit"><Plus className="h-4 w-4" />{editingId ? "Update" : "Save"}</button>
    </form>
    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {destinations.map((item) => <div className="flex items-start justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700" key={item.id}>
        <div className="min-w-0"><p className="font-semibold">{item.nickname} <span className="text-xs font-normal text-slate-500">{titleCase(item.category)}</span></p><p className="truncate text-sm text-slate-500">{item.address}</p></div>
        <div className="flex">
          <button className="icon-btn" type="button" aria-label={`Edit ${item.nickname}`} onClick={() => { setEditingId(item.id); setForm({ nickname: item.nickname, address: item.address, category: item.category, notes: item.notes }); }}><Pencil className="h-4 w-4" /></button>
          <button className="icon-btn danger" type="button" aria-label={`Delete ${item.nickname}`} onClick={async () => { if (window.confirm(`Delete ${item.nickname}?`)) { await api.deleteDestination(item.id); await onChange(); } }}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>)}
    </div>
  </section>;
}
