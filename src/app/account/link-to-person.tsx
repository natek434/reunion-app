"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Option = { id: string; label: string };

export default function LinkToPerson() {
  const [options, setOptions] = useState<Option[]>([]);
  const [personId, setPersonId] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [g, me] = await Promise.all([
        fetch("/api/family/graph", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/family/me", { cache: "no-store" }).then(r => r.json()),
      ]);
      setOptions((g.nodes as any[]).map(n => ({ id: n.id, label: n.label })));
      if (me?.personId) { setCurrent(me.personId); setPersonId(me.personId); }
    })();
  }, []);

  async function link() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/link-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setCurrent(personId);
      toast.success("Linked!");
    } catch (e: any) {
      toast.error(e.message || "Failed to link");
    } finally {
      setBusy(false);
    }
  }

  async function useAvatar() {
    const res = await fetch("/api/account/use-person-avatar", { method: "POST" });
    const data = await res.json();
    if (res.ok) toast.success("Avatar applied to person");
    else toast.error(data?.error || "Failed to apply avatar");
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-600">
        Current: {current ? <code className="text-neutral-800">{current}</code> : <em>not linked</em>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <select className="input min-w-56" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={link} disabled={!personId || busy}>
          {busy ? "Linking…" : "Link"}
        </button>
        <button className="btn" onClick={useAvatar} disabled={!current}>
          Use my profile photo
        </button>
      </div>
    </div>
  );
}
