// src/components/family/relationship-quick-edit.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { ensureCsrfToken } from "@/lib/csrf-client";
import { toast } from "sonner";
import type { PersonDTO, ParentChildEdgeDTO, PartnershipDTO } from "./my-family-dashboard";

export default function RelationshipQuickEdit({
  people,
  parentChild,
  partnerships,
  selectedId,
  onChanged,
  onClose,
}: {
  people: PersonDTO[];
  parentChild: ParentChildEdgeDTO[];
  partnerships: PartnershipDTO[];
  selectedId: string | null;
  onChanged?: () => void;
  onClose?: () => void;
}) {
  const opts: PersonOption[] = useMemo(
    () => people.map(p => ({ id: p.id, label: p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim() })),
    [people]
  );
  const [parent, setParent] = useState<PersonOption | null>(null);
  const [child, setChild] = useState<PersonOption | null>(null);
  const [partner, setPartner] = useState<PersonOption | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId) { setParent(null); setChild(null); setPartner(null); }
  }, [selectedId]);

  if (!selectedId) return null;

  async function linkParent(kind: "BIOLOGICAL" | "WHANGAI", role: "MOTHER" | "FATHER" | "PARENT") {
    if (!parent) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/parent-child", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ parentId: parent.id, childId: selectedId, role, kind }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function unlinkParentEdge() {
    if (!parent) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/parent-child", {
      method: "DELETE",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ parentId: parent.id, childId: selectedId }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function linkChild(kind: "BIOLOGICAL" | "WHANGAI", role: "MOTHER" | "FATHER" | "PARENT") {
    if (!child) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/parent-child", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ parentId: selectedId, childId: child.id, role, kind }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function unlinkChildEdge() {
    if (!child) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/parent-child", {
      method: "DELETE",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ parentId: selectedId, childId: child.id }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function upsertPartnership() {
    if (!partner) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/partnership", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ aId: selectedId, bId: partner.id, status: "ACTIVE" }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  async function deletePartnership() {
    if (!partner) return;
    setBusy(true);
    // Find ID by pair
    const [A, B] = selectedId < partner.id ? [selectedId, partner.id] : [partner.id, selectedId];
    const match = partnerships.find(p => (p.aId === A && p.bId === B));
    if (!match) { toast.error("No partnership found"); setBusy(false); return; }

    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/relationships/partnership", {
      method: "DELETE",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ id: match.id }),
    });
    setBusy(false);
    res.ok ? onChanged?.() : toast.error((await res.json().catch(() => ({})))?.error ?? "Failed");
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Edit relationships for</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Parents of selected */}
        <div>
          <div className="font-medium mb-1">Parents of selected</div>
          <PersonPicker label="Parent" value={parent} onChange={setParent} />
          <div className="flex flex-wrap gap-2 mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => linkParent("BIOLOGICAL", "MOTHER")} disabled={busy}>Link as Mother</button>
            <button className="btn btn-outline btn-sm" onClick={() => linkParent("BIOLOGICAL", "FATHER")} disabled={busy}>Link as Father</button>
            <button className="btn btn-outline btn-sm" onClick={() => linkParent("BIOLOGICAL", "PARENT")} disabled={busy}>Link as Parent</button>
            <button className="btn btn-danger btn-sm" onClick={unlinkParentEdge} disabled={busy}>Unlink</button>
          </div>
        </div>

        {/* Children of selected */}
        <div>
          <div className="font-medium mb-1">Children of selected</div>
          <PersonPicker label="Child" value={child} onChange={setChild} />
          <div className="flex flex-wrap gap-2 mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => linkChild("BIOLOGICAL", "MOTHER")} disabled={busy}>Link as Mother</button>
            <button className="btn btn-outline btn-sm" onClick={() => linkChild("BIOLOGICAL", "FATHER")} disabled={busy}>Link as Father</button>
            <button className="btn btn-outline btn-sm" onClick={() => linkChild("BIOLOGICAL", "PARENT")} disabled={busy}>Link as Parent</button>
            <button className="btn btn-danger btn-sm" onClick={unlinkChildEdge} disabled={busy}>Unlink</button>
          </div>
        </div>
      </div>

      {/* Partnerships */}
      <div className="mt-4">
        <div className="font-medium mb-1">Partnerships</div>
        <PersonPicker label="Partner" value={partner} onChange={setPartner} />
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="btn btn-outline btn-sm" onClick={upsertPartnership} disabled={busy}>Set / Update Partnership</button>
          <button className="btn btn-danger btn-sm" onClick={deletePartnership} disabled={busy}>Delete Partnership</button>
        </div>
      </div>
    </div>
  );
}
