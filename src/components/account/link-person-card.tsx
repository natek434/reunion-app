"use client";

import { useEffect, useState } from "react";

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
type PersonLite = { id: string; displayName: string; gender?: Gender; birthDate?: string | null };

async function searchPeople(q: string): Promise<PersonLite[]> {
  const r = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
  return r.ok ? r.json() : [];
}

export default function LinkPersonCard({ current }: { current?: { id: string; displayName: string } | null }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<PersonLite[]>([]);
  const [pick, setPick] = useState<PersonLite | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => setOpts(await searchPeople(q)), 200);
    return () => clearTimeout(t);
  }, [q]);

  async function link(personId: string) {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/account/person", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    setBusy(false);
    setMsg(r.ok ? "Linked!" : "Failed to link");
    if (r.ok) location.reload();
  }

  async function unlink() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/account/person", { method: "DELETE" });
    setBusy(false);
    setMsg(r.ok ? "Unlinked" : "Failed to unlink");
    if (r.ok) location.reload();
  }

  return (
    <div className="card p-4 grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Member profile link</h3>
        {current ? <button className="btn" onClick={unlink} disabled={busy}>Unlink</button> : null}
      </div>

      <div className="text-sm text-neutral-600">
        {current
          ? <>Currently linked to: <strong>{current.displayName}</strong></>
          : <>Not linked yet. Link your account to a Person to show as <em>“Me”</em> in the tree.</>}
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-neutral-500">Link existing member</label>
        <div className="flex gap-2">
          <input className="input" placeholder="Search members…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn" disabled={!pick} onClick={() => pick && link(pick.id)}>Link</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {opts.map(o => (
            <button key={o.id} onClick={() => setPick(o)} className={`btn ${pick?.id === o.id ? "btn-primary" : ""}`}>
              {o.displayName}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className="text-sm text-neutral-600">{msg}</div>}
    </div>
  );
}
