"use client";

import { useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export default function MemberForm() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [gender, setGender] = useState<Gender>("UNKNOWN");
  const [birthDate, setBirth] = useState("");
  const [notes, setNotes] = useState("");

  const [mother, setMother] = useState<PersonOption | null>(null);
  const [father, setFather] = useState<PersonOption | null>(null);
  const [child,  setChild]  = useState<PersonOption | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim()) {
      setMsg("First name is required.");
      return;
    }
    setBusy(true); setMsg(null);
      const csrf = await ensureCsrfToken();
          if (!csrf) {
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
        linkMotherId: mother?.id || null,
        linkFatherId: father?.id || null,
        linkChildId:  child?.id || null,
        linkKind: "BIOLOGICAL",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Member created." : (data?.error || "Failed to create member"));
    if (res.ok) {
      setFirst(""); setLast(""); setGender("UNKNOWN"); setBirth(""); setNotes("");
      setMother(null); setFather(null); setChild(null);
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
        />
        <input
          className="input"
          placeholder="Last name (optional)"
          value={lastName}
          onChange={e => setLast(e.target.value)}
        />
        <select
          className="input"
          value={gender}
          onChange={e => setGender(e.target.value as Gender)}
        >
          <option>UNKNOWN</option><option>MALE</option>
          <option>FEMALE</option><option>OTHER</option>
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

      {/* Relationship pickers */}
      <PersonPicker label="Mother" value={mother} onChange={setMother} />
      <PersonPicker label="Father" value={father} onChange={setFather} />
      <PersonPicker
        label="Child (link existing)"
        value={child}
        onChange={setChild}
        allowCreate={false} // keep child as existing only
      />

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create member"}
        </button>
        {msg && <span className="text-sm ">{msg}</span>}
      </div>
    </div>
  );
}
