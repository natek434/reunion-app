"use client";

import { useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";

export default function LinkToPerson({
  current,
}: {
  current: { id: string; displayName: string } | null;
}) {
  const [pick, setPick] = useState<PersonOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function link() {
    if (!pick) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/account/person", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId: pick.id }),
    });
    setBusy(false);
    setMsg(r.ok ? "Linked!" : "Failed to link (check permissions)");
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
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        {current ? (
          <div className="text-sm">
            Currently linked to: <strong>{current.displayName}</strong>
          </div>
        ) : (
          <div className="text-sm">Not linked yet.</div>
        )}
        {current && (
          <button className="btn" onClick={unlink} disabled={busy}>
            Unlink
          </button>
        )}
      </div>

      <PersonPicker
        label="Link existing member"
        value={pick}
        onChange={setPick}
        placeholder="Type a name…"
        allowCreate={false} // keep creation in MemberForm; toggle true if you want inline create here too
      />

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={link} disabled={!pick || busy}>
          Link
        </button>
        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
