import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Save } from "lucide-react";
import type { User } from "../types";
import { AddressAutocomplete } from "./AddressAutocomplete";

type Props = {
  user: User;
  onUpdate: (payload: { fullName: string; address: string; email: string; tfn: string }) => Promise<void>;
  onPassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
};

export function ProfilePanel({ user, onUpdate, onPassword }: Props) {
  const [profile, setProfile] = useState(user);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");

  useEffect(() => setProfile(user), [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    await onUpdate(profile);
    setMessage("Profile updated");
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    await onPassword(passwords);
    setPasswords({ currentPassword: "", newPassword: "" });
    setMessage("Password changed");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form className="card space-y-4" onSubmit={saveProfile}>
        <h2 className="panel-title">Account details</h2>
        {message ? <div className="rounded-lg bg-gumleaf/10 px-4 py-3 text-sm font-medium text-gumleaf">{message}</div> : null}
        <label className="label">
          Full name
          <input className="field" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
        </label>
        <AddressAutocomplete value={profile.address} onChange={(address) => setProfile({ ...profile, address })} required />
        <label className="label">
          Email
          <input className="field" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
        </label>
        <label className="label">
          TFN
          <input className="field" inputMode="numeric" value={profile.tfn} onChange={(event) => setProfile({ ...profile, tfn: event.target.value })} required />
        </label>
        <button className="btn-primary" type="submit">
          <Save className="h-4 w-4" />
          Save Details
        </button>
      </form>
      <form className="card space-y-4" onSubmit={savePassword}>
        <h2 className="panel-title">Password</h2>
        <label className="label">
          Current password
          <input className="field" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required />
        </label>
        <label className="label">
          New password
          <input className="field" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required />
        </label>
        <p className="text-sm text-slate-500">Use at least 12 characters with uppercase, lowercase, number, and symbol characters.</p>
        <button className="btn-secondary" type="submit">
          <KeyRound className="h-4 w-4" />
          Change Password
        </button>
      </form>
    </div>
  );
}
