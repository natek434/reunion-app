'use client';
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

export default function ManageMember({
  options,
  isAdmin,
  onAfterChange,
}: {
  options: { id: string; label: string }[];
  isAdmin: boolean;
  onAfterChange: () => Promise<void>;
}) {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => { setLocked(null); }, [id]);

  async function fetchLockedState() {
    // If you expose `locked` in your person read API, you can fetch it here.
    // For now we keep it optimistic (toggle without pre-read).
  }

  async function doDelete() {
    if (!id) return;
    const name = options.find((o) => o.id === id)?.label ?? "this person";
    const ok = window.confirm(
      `Soft delete ${name}?\n\nThis removes their partnerships and parent links.\n(ADMINs can restore.)`
    );
    if (!ok) return;
    try {
       const csrf = await ensureCsrfToken();
                if (!csrf) {
                  toast.error("Missing CSRF token. Please refresh the page and try again.");
                  return;
                }
      setBusy(true);
      const res = await fetch(`/api/family/person/${id}`, { method: "DELETE", headers: { "X-Csrf-Token": csrf } });
      if (!res.ok) throw new Error(await res.text());
      setId("");
      toast.success("Member deleted");
      await onAfterChange();
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message?.slice(0, 160) });
    } finally {
      setBusy(false);
    }
  }

  async function toggleLock(next: boolean) {
    if (!id) return;
    try {
      setLockBusy(true);
       const csrf = await ensureCsrfToken();
                if (!csrf) {
                  toast.error("Missing CSRF token. Please refresh the page and try again.");
                  return;
                }
      const res = await fetch(`/api/family/person/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ locked: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLocked(next);
      toast.success(next ? "Member locked" : "Member unlocked");
      await onAfterChange();
    } catch (e: any) {
      toast.error("Lock/unlock failed", { description: e?.message?.slice(0, 160) }, role);
    } finally {
      setLockBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <select className="input" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Select member</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2">
        <button className="btn text-rose-600" onClick={doDelete} disabled={!id || busy}>
          {busy ? "Deleting…" : "Delete"}
        </button>

        {isAdmin && (
          <>
            <button
              className="btn"
              onClick={() => toggleLock(true)}
              disabled={!id || lockBusy || locked === true}
            >
              {lockBusy && locked !== true ? "Working…" : "Lock"}
            </button>
            <button
              className="btn"
              onClick={() => toggleLock(false)}
              disabled={!id || lockBusy || locked === false}
            >
              {lockBusy && locked !== false ? "Working…" : "Unlock"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs ">
        Delete is <strong>soft</strong>: the person is hidden from the graph, and their links are removed.
        Admins can restore from the database (or add a restore UI later).
      </p>
    </div>
  );
}
