"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client";
import MyFamilyDashboard from "@/components/family/my-family-dashboard";

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export default function MemberForm() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [gender, setGender] = useState<Gender>("UNKNOWN");
  const [birthDate, setBirth] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim()) {
      setMsg("First name is required.");
      return;
    }

    setBusy(true);
    setMsg(null);

    const csrf = await ensureCsrfToken();
    if (!csrf) {
      setBusy(false); // prevent perma-spinner
      toast.error("Missing CSRF token. Please refresh the page and try again.");
      return;
    }

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf },
      body: JSON.stringify({
        firstName,
        lastName,
        gender,
        birthDate: birthDate || null,
        notes: notes || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.ok) {
      setMsg("Member created.");
      setFirst("");
      setLast("");
      setGender("UNKNOWN");
      setBirth("");
      setNotes("");
      toast.success("Member created.");
    } else {
      setMsg(data?.error || "Failed to create member");
      toast.error(data?.error || "Failed to create member");
    }
  }

  return (
    <div className="card p-4 grid gap-4">
      <h2 className="text-lg font-semibold">Create Member</h2>

      <div className="grid md:grid-cols-2 gap-3">
        <input
          className="input"
          placeholder="First name"
          value={firstName}
          onChange={e => setFirst(e.target.value)}
          required
          autoComplete="given-name"
        />
        <input
          className="input"
          placeholder="Last name (optional)"
          value={lastName}
          onChange={e => setLast(e.target.value)}
          autoComplete="family-name"
        />
        <select
          className="input"
          value={gender}
          onChange={e => setGender(e.target.value as Gender)}
        >
          <option>UNKNOWN</option>
          <option>MALE</option>
          <option>FEMALE</option>
          <option>OTHER</option>
        </select>
        <input
          className="input"
          type="date"
          value={birthDate}
          onChange={e => setBirth(e.target.value)}
        />
      </div>

      <textarea
        className="input min-h-24"
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create member"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
      <MyFamilyDashboard />
    </div>
  );
}
