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
    <div className="mb-4 flex items-center gap-2"><span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gumleaf/10 text-gumleaf ring-1 ring-gumleaf/15"><MapPin className="h-5 w-5" /></span><h2 className="panel-title">Frequent destinations</h2></div>
    {error ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
    <form className="surface-subtle grid gap-3 p-4 lg:grid-cols-[1fr_2fr_180px_1.2fr_auto]" onSubmit={submit}>
      <label className="label">Nickname<input className="field" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required /></label>
      <AddressAutocomplete label="Full Address" value={form.address} onChange={(address) => setForm((current) => ({ ...current, address }))} required />
      <label className="label">Category<select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DestinationPayload["category"] })}>{["home", "office", "client", "supplier", "training", "job_site", "other"].map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}</select></label>
      <label className="label">Notes<input className="field" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></label>
      <button className="btn-primary self-end" type="submit"><Plus className="h-4 w-4" />{editingId ? "Update" : "Save"}</button>
    </form>
    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {destinations.map((item) => <div className="flex items-start justify-between rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel dark:border-slate-800 dark:bg-slate-950/50" key={item.id}>
        <div className="min-w-0"><p className="font-semibold text-ink dark:text-white">{item.nickname} <span className="rounded-full bg-harbor/10 px-2 py-0.5 text-xs font-semibold text-harbor dark:bg-slate-800 dark:text-slate-200">{titleCase(item.category)}</span></p><p className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">{item.address}</p></div>
        <div className="flex">
          <button className="icon-btn" type="button" aria-label={`Edit ${item.nickname}`} onClick={() => { setEditingId(item.id); setForm({ nickname: item.nickname, address: item.address, category: item.category, notes: item.notes }); }}><Pencil className="h-4 w-4" /></button>
          <button className="icon-btn danger" type="button" aria-label={`Delete ${item.nickname}`} onClick={async () => { if (window.confirm(`Delete ${item.nickname}?`)) { await api.deleteDestination(item.id); await onChange(); } }}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>)}
    </div>
  </section>;
}
