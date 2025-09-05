"use client";

import { useEffect, useMemo, useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { ensureCsrfToken } from "@/lib/csrf-client";
import { toast } from "sonner";
import type { PersonDTO, ParentChildEdgeDTO, PartnershipDTO } from "./my-family-dashboard";

type Role = "MOTHER" | "FATHER" | "PARENT";
type Kind = "BIOLOGICAL" | "WHANGAI";

function labelOf(p: PersonDTO) {
  return p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim();
}
function getById(people: PersonDTO[], id: string | null) {
  return id ? people.find(p => p.id === id) ?? null : null;
}
function guessRoleFromGender(g: PersonDTO["gender"]): Role {
  if (g === "FEMALE") return "MOTHER";
  if (g === "MALE") return "FATHER";
  return "PARENT";
}

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
    () => people.map(p => ({ id: p.id, label: labelOf(p) })),
    [people]
  );

  const [pickFather, setPickFather] = useState<PersonOption | null>(null);
  const [pickMother, setPickMother] = useState<PersonOption | null>(null);
  const [pickChild,  setPickChild ] = useState<PersonOption | null>(null);
  const [pickPartner, setPickPartner] = useState<PersonOption | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPickFather(null);
    setPickMother(null);
    setPickChild(null);
    setPickPartner(null);
  }, [selectedId]);

  if (!selectedId) {
    return <div className="text-sm text-muted-foreground">Choose a person above to edit their relationships.</div>;
  }

  const selected = getById(people, selectedId)!;

  // Current parents and children of selected
  const parentEdges = parentChild.filter(e => e.childId === selectedId);
  const childEdges  = parentChild.filter(e => e.parentId === selectedId);

  const fatherEdge = parentEdges.find(e => e.role === "FATHER")
    ?? parentEdges.find(e => getById(people, e.parentId)?.gender === "MALE")
    ?? null;
  const motherEdge = parentEdges.find(e => e.role === "MOTHER")
    ?? parentEdges.find(e => getById(people, e.parentId)?.gender === "FEMALE")
    ?? null;

  const currentFather = fatherEdge ? getById(people, fatherEdge.parentId) : null;
  const currentMother = motherEdge ? getById(people, motherEdge.parentId) : null;
  const currentChildren = childEdges.map(e => getById(people, e.childId)).filter(Boolean) as PersonDTO[];

  // Partnerships involving selected
  const myPartnerships = partnerships.filter(p => p.aId === selectedId || p.bId === selectedId);

  async function postParentChild(body: any, method: "POST" | "DELETE") {
    const csrf = await ensureCsrfToken();
    if (!csrf) {
      toast.error("Missing CSRF token. Refresh the page.");
      return false;
    }
    const res = await fetch("/api/relationships/parent-child", {
      method,
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed");
      return false;
    }
    return true;
  }

  async function setFather() {
    if (!pickFather) return;
    setBusy(true);
    // Replace existing father first
    if (currentFather && currentFather.id !== pickFather.id) {
      const ok = await postParentChild({ parentId: currentFather.id, childId: selectedId }, "DELETE");
      if (!ok) { setBusy(false); return; }
    }
    await postParentChild({ parentId: pickFather.id, childId: selectedId, role: "FATHER", kind: "BIOLOGICAL" as Kind }, "POST");
    setBusy(false);
    onChanged?.();
  }
  async function clearFather() {
    if (!currentFather) return;
    setBusy(true);
    await postParentChild({ parentId: currentFather.id, childId: selectedId }, "DELETE");
    setBusy(false);
    onChanged?.();
  }

  async function setMother() {
    if (!pickMother) return;
    setBusy(true);
    if (currentMother && currentMother.id !== pickMother.id) {
      const ok = await postParentChild({ parentId: currentMother.id, childId: selectedId }, "DELETE");
      if (!ok) { setBusy(false); return; }
    }
    await postParentChild({ parentId: pickMother.id, childId: selectedId, role: "MOTHER", kind: "BIOLOGICAL" as Kind }, "POST");
    setBusy(false);
    onChanged?.();
  }
  async function clearMother() {
    if (!currentMother) return;
    setBusy(true);
    await postParentChild({ parentId: currentMother.id, childId: selectedId }, "DELETE");
    setBusy(false);
    onChanged?.();
  }

  async function addChild() {
    if (!pickChild) return;
    setBusy(true);
    const role: Role = guessRoleFromGender(selected.gender);
    await postParentChild({ parentId: selectedId, childId: pickChild.id, role, kind: "BIOLOGICAL" as Kind }, "POST");
    setBusy(false);
    setPickChild(null);
    onChanged?.();
  }
  async function unlinkChild(childId: string) {
    setBusy(true);
    await postParentChild({ parentId: selectedId, childId }, "DELETE");
    setBusy(false);
    onChanged?.();
  }

  // Partnerships
  async function upsertPartnership() {
    if (!pickPartner) return;
    setBusy(true);
    const csrf = await ensureCsrfToken();
    if (!csrf) { setBusy(false); toast.error("Missing CSRF token. Refresh."); return; }
    const res = await fetch("/api/relationships/partnership", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf },
      body: JSON.stringify({ aId: selectedId, bId: pickPartner.id, status: "ACTIVE" }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed");
      return;
    }
    setPickPartner(null);
    onChanged?.();
  }

  async function deletePartnershipByPartnerId(partnerId: string) {
    setBusy(true);
    const [A, B] = selectedId! < partnerId ? [selectedId!, partnerId] : [partnerId, selectedId!];
    const match = partnerships.find(p => p.aId === A && p.bId === B);
    if (!match) { setBusy(false); toast.error("No partnership found"); return; }
    const csrf = await ensureCsrfToken();
    if (!csrf) { setBusy(false); toast.error("Missing CSRF token. Refresh."); return; }
    const res = await fetch("/api/relationships/partnership", {
      method: "DELETE",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf },
      body: JSON.stringify({ id: match.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed");
      return;
    }
    onChanged?.();
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">
          Editing: <span className="font-bold">{labelOf(selected)}</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Clear selection</button>
      </div>

      {/* Top row: Father | Selected | Mother */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Father (top-left) */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Father</div>
          {currentFather ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">{labelOf(currentFather)}</div>
              <button className="btn btn-danger btn-sm" onClick={clearFather} disabled={busy}>Remove</button>
            </div>
          ) : (
            <>
              <PersonPicker label="Add/replace father" value={pickFather} onChange={setPickFather} />
              <div className="mt-2">
                <button className="btn btn-outline btn-sm" onClick={setFather} disabled={busy || !pickFather}>
                  Set Father
                </button>
              </div>
            </>
          )}
        </div>

        {/* Selected in the center */}
        <div className="card p-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Selected person</div>
            <div className="text-lg font-semibold">{labelOf(selected)}</div>
          </div>
        </div>

        {/* Mother (top-right) */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Mother</div>
          {currentMother ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">{labelOf(currentMother)}</div>
              <button className="btn btn-danger btn-sm" onClick={clearMother} disabled={busy}>Remove</button>
            </div>
          ) : (
            <>
              <PersonPicker label="Add/replace mother" value={pickMother} onChange={setPickMother} />
              <div className="mt-2">
                <button className="btn btn-outline btn-sm" onClick={setMother} disabled={busy || !pickMother}>
                  Set Mother
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children (bottom, full width) */}
        <div className="md:col-span-3 card p-3">
          <div className="text-sm font-medium mb-2">Children</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <PersonPicker label="Add child" value={pickChild} onChange={setPickChild} />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button className="btn btn-outline btn-sm w-full md:w-auto" onClick={addChild} disabled={busy || !pickChild}>
                Add Child
              </button>
            </div>
          </div>

          {currentChildren.length > 0 ? (
            <ul className="mt-3 divide-y">
              {currentChildren.map(ch => (
                <li key={ch.id} className="py-2 flex items-center justify-between">
                  <div className="text-sm">{labelOf(ch)}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => unlinkChild(ch.id)} disabled={busy}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">No children linked yet.</div>
          )}
        </div>

        {/* Partnerships (bottom, full width) */}
        <div className="md:col-span-3 card p-3">
          <div className="text-sm font-medium mb-2">Partnerships</div>

          {/* Add / update */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <PersonPicker label="Set / update partner" value={pickPartner} onChange={setPickPartner} />
            </div>
            <div className="md:col-span-1 flex items-end gap-2">
              <button className="btn btn-outline btn-sm w-full md:w-auto" onClick={upsertPartnership} disabled={busy || !pickPartner}>
                Set / Update
              </button>
              {pickPartner && (
                <button className="btn btn-danger btn-sm w-full md:w-auto" onClick={() => deletePartnershipByPartnerId(pickPartner.id)} disabled={busy}>
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Existing partnerships list */}
          {myPartnerships.length > 0 ? (
            <ul className="mt-3 divide-y">
              {myPartnerships.map(p => {
                const otherId = p.aId === selectedId ? p.bId : p.aId;
                const other = getById(people, otherId);
                return (
                  <li key={p.id} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      {other ? labelOf(other) : otherId} <span className="text-xs text-muted-foreground">({p.kind.toLowerCase()}, {p.status.toLowerCase()})</span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePartnershipByPartnerId(otherId)} disabled={busy}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">No partnerships yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
