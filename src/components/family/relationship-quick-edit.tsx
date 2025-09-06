"use client";

import { useEffect, useMemo, useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { ensureCsrfToken } from "@/lib/csrf-client";
import { toast } from "sonner";
import type { PersonDTO, ParentChildEdgeDTO, PartnershipDTO } from "./my-family-dashboard";

type Role = "MOTHER" | "FATHER" | "PARENT";
type Kind = "BIOLOGICAL" | "WHANGAI";

function labelOf(p: PersonDTO | null | undefined): string {
  try {
    if (!p) return "Unknown";
    const display = (p.displayName ?? "").trim();
    if (display) return display;
    const first = (p.firstName ?? "").trim();
    const last = (p.lastName ?? "").trim();
    const name = `${first} ${last}`.trim();
    return name || "Unknown";
  } catch {
    return "Unknown";
  }
}
function getById(
  people: PersonDTO[] | ReadonlyArray<PersonDTO> | null | undefined,
  id: string | null | undefined
): PersonDTO | null {
  try {
    if (!id || !people || !Array.isArray(people) || people.length === 0) return null;
    return people.find(p => p && p.id === id) ?? null;
  } catch {
    return null;
  }
}
function guessRoleFromGender(g: PersonDTO["gender"] | null | undefined): Role {
  try {
    if (g === "FEMALE") return "MOTHER";
    if (g === "MALE") return "FATHER";
    return "PARENT";
  } catch {
    return "PARENT";
  }
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
  // --- state (always declared in same order) ---
  const [pickFather, setPickFather] = useState<PersonOption | null>(null);
  const [pickMother, setPickMother] = useState<PersonOption | null>(null);
  const [pickChild, setPickChild] = useState<PersonOption | null>(null);
  const [pickPartner, setPickPartner] = useState<PersonOption | null>(null);
  const [fatherKind, setFatherKind] = useState<Kind>("BIOLOGICAL");
  const [motherKind, setMotherKind] = useState<Kind>("BIOLOGICAL");
  const [addChildKind, setAddChildKind] = useState<Kind>("BIOLOGICAL");
  const [busy, setBusy] = useState(false);

  // --- memos (unconditional) ---
  const options: PersonOption[] = useMemo(
    () => people.map(p => ({ id: p.id, label: labelOf(p) })),
    [people]
  );

  const selected = useMemo(
    () => (selectedId ? getById(people, selectedId) : null),
    [people, selectedId]
  );

  const parentEdges = useMemo(
    () => (selectedId ? parentChild.filter(e => e.childId === selectedId) : []),
    [parentChild, selectedId]
  );
  const childEdges = useMemo(
    () => (selectedId ? parentChild.filter(e => e.parentId === selectedId) : []),
    [parentChild, selectedId]
  );

  const fatherEdge = useMemo(() => {
    const byRole = parentEdges.find(e => e.role === "FATHER");
    if (byRole) return byRole;
    const byGender = parentEdges.find(e => getById(people, e.parentId)?.gender === "MALE");
    return byGender ?? null;
  }, [parentEdges, people]);

  const motherEdge = useMemo(() => {
    const byRole = parentEdges.find(e => e.role === "MOTHER");
    if (byRole) return byRole;
    const byGender = parentEdges.find(e => getById(people, e.parentId)?.gender === "FEMALE");
    return byGender ?? null;
  }, [parentEdges, people]);

  const currentFather = useMemo(
    () => (fatherEdge ? getById(people, fatherEdge.parentId) : null),
    [fatherEdge, people]
  );
  const currentMother = useMemo(
    () => (motherEdge ? getById(people, motherEdge.parentId) : null),
    [motherEdge, people]
  );
  const currentChildren = useMemo(
    () => childEdges.map(e => getById(people, e.childId)).filter(Boolean) as PersonDTO[],
    [childEdges, people]
  );

  const myPartnerships = useMemo(
    () => (selectedId ? partnerships.filter(p => p.aId === selectedId || p.bId === selectedId) : []),
    [partnerships, selectedId]
  );

  // --- effects (unconditional) ---
  // clear picks & reset kinds when the selection changes
  useEffect(() => {
    setPickFather(null);
    setPickMother(null);
    setPickChild(null);
    setPickPartner(null);
    setFatherKind("BIOLOGICAL");
    setMotherKind("BIOLOGICAL");
    setAddChildKind("BIOLOGICAL");
  }, [selectedId]);

  // sync kind selectors to existing edges (if present)
  useEffect(() => {
    setFatherKind(((fatherEdge?.kind as Kind) ?? "BIOLOGICAL"));
    setMotherKind(((motherEdge?.kind as Kind) ?? "BIOLOGICAL"));
  }, [fatherEdge?.kind, motherEdge?.kind]);

  // --- helpers ---
  async function getCsrf(): Promise<string | null> {
    try {
      const t = await ensureCsrfToken();
      if (!t) throw new Error("Missing CSRF token. Refresh the page.");
      return t;
    } catch {
      toast.error("Missing CSRF token. Refresh the page.");
      return null;
    }
  }

  async function postJson(url: string, method: "POST" | "DELETE", body: any) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const csrf = await getCsrf();
    if (!csrf) return { ok: false, status: 0, json: {} as any };
    headers["X-Csrf-Token"] = csrf;

    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    let json: any = {};
    try { json = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, json };
  }

  async function linkParentOrRequest(parentId: string, childId: string, role: Role, kind: Kind) {
    const res = await postJson("/api/relationships/parent-child", "POST", { parentId, childId, role, kind });
    if (res.ok) return { ok: true, requested: false };
    if (res.status !== 403) {
      toast.error(res.json?.error || "Failed to link");
      return { ok: false, requested: false };
    }
    const reqRes = await postJson("/api/relationship-requests", "POST", {
      type: "PARENT_CHILD", parentId, childId, role, kind, message: ""
    });
    if (!reqRes.ok) {
      toast.error(reqRes.json?.error || "Could not create approval request");
      return { ok: false, requested: false };
    }
    toast.success("Request sent for approval");
    return { ok: true, requested: true };
  }

  async function upsertPartnershipOrRequest(aId: string, bId: string) {
    const res = await postJson("/api/relationships/partnership", "POST", { aId, bId, status: "ACTIVE" });
    if (res.ok) return { ok: true, requested: false };
    if (res.status !== 403) {
      toast.error(res.json?.error || "Failed to set partnership");
      return { ok: false, requested: false };
    }
    const reqRes = await postJson("/api/relationship-requests", "POST", {
      type: "PARTNERSHIP", aId, bId, status: "ACTIVE", message: ""
    });
    if (!reqRes.ok) {
      toast.error(reqRes.json?.error || "Could not create approval request");
      return { ok: false, requested: false };
    }
    toast.success("Request sent for approval");
    return { ok: true, requested: true };
  }

  // --- actions (guard against null selection) ---
  async function setFather() {
    if (!selectedId || !pickFather) return;
    setBusy(true);
    try {
      if (currentFather && currentFather.id !== pickFather.id) {
        const del = await postJson("/api/relationships/parent-child", "DELETE", {
          parentId: currentFather.id, childId: selectedId
        });
        if (!del.ok) return toast.error(del.json?.error || "Failed to remove existing father");
      }
      const { ok } = await linkParentOrRequest(pickFather.id, selectedId, "FATHER", fatherKind);
      if (ok) onChanged?.();
    } finally { setBusy(false); }
  }
  async function updateFatherKind() {
    if (!selectedId || !currentFather) return;
    setBusy(true);
    try {
      const { ok } = await linkParentOrRequest(currentFather.id, selectedId, "FATHER", fatherKind);
      if (ok) onChanged?.();
    } finally { setBusy(false); }
  }
  async function clearFather() {
    if (!selectedId || !currentFather) return;
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: currentFather.id, childId: selectedId
      });
      if (!res.ok) return toast.error(res.json?.error || "Failed to remove father");
      onChanged?.();
    } finally { setBusy(false); }
  }

  async function setMother() {
    if (!selectedId || !pickMother) return;
    setBusy(true);
    try {
      if (currentMother && currentMother.id !== pickMother.id) {
        const del = await postJson("/api/relationships/parent-child", "DELETE", {
          parentId: currentMother.id, childId: selectedId
        });
        if (!del.ok) return toast.error(del.json?.error || "Failed to remove existing mother");
      }
      const { ok } = await linkParentOrRequest(pickMother.id, selectedId, "MOTHER", motherKind);
      if (ok) onChanged?.();
    } finally { setBusy(false); }
  }
  async function updateMotherKind() {
    if (!selectedId || !currentMother) return;
    setBusy(true);
    try {
      const { ok } = await linkParentOrRequest(currentMother.id, selectedId, "MOTHER", motherKind);
      if (ok) onChanged?.();
    } finally { setBusy(false); }
  }
  async function clearMother() {
    if (!selectedId || !currentMother) return;
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: currentMother.id, childId: selectedId
      });
      if (!res.ok) return toast.error(res.json?.error || "Failed to remove mother");
      onChanged?.();
    } finally { setBusy(false); }
  }

  async function addChild() {
    if (!selectedId || !pickChild) return;
    setBusy(true);
    try {
      const role: Role = guessRoleFromGender(selected?.gender);
      const { ok } = await linkParentOrRequest(selectedId, pickChild.id, role, addChildKind);
      if (ok) { setPickChild(null); onChanged?.(); }
    } finally { setBusy(false); }
  }
  async function unlinkChild(childId: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: selectedId, childId
      });
      if (!res.ok) return toast.error(res.json?.error || "Failed to remove child");
      onChanged?.();
    } finally { setBusy(false); }
  }

  async function upsertPartnership() {
    if (!selectedId || !pickPartner) return;
    setBusy(true);
    try {
      const { ok } = await upsertPartnershipOrRequest(selectedId, pickPartner.id);
      if (ok) { setPickPartner(null); onChanged?.(); }
    } finally { setBusy(false); }
  }
  async function deletePartnershipByPartnerId(partnerId: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      const [A, B] = selectedId < partnerId ? [selectedId, partnerId] : [partnerId, selectedId];
      const match = partnerships.find(p => p.aId === A && p.bId === B);
      if (!match) return toast.error("No partnership found");
      const res = await postJson("/api/relationships/partnership", "DELETE", { id: match.id });
      if (!res.ok) return toast.error(res.json?.error || "Failed to delete partnership");
      onChanged?.();
    } finally { setBusy(false); }
  }

  // --- render ---
  if (!selected) {
    return <div className="text-sm text-muted-foreground">Choose a person above to edit their relationships.</div>;
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">
          Editing: <span className="font-bold">{labelOf(selected)}</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Clear selection</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Father */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Father</div>
          {currentFather ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {labelOf(currentFather)}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({(fatherEdge?.kind as Kind) ?? "BIOLOGICAL"})
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={clearFather} disabled={busy}>Remove</button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs">Kind</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={fatherKind}
                  onChange={e => setFatherKind(e.target.value as Kind)}
                  aria-label="Father relationship kind"
                >
                  <option value="BIOLOGICAL">Biological</option>
                  <option value="WHANGAI">Whāngai</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={updateFatherKind} disabled={busy}>
                  Update Kind
                </button>
              </div>
            </div>
          ) : (
            <>
              <PersonPicker label="Add/replace father" value={pickFather} onChange={setPickFather} options={options} />
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs">Kind</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={fatherKind}
                  onChange={e => setFatherKind(e.target.value as Kind)}
                  aria-label="Father relationship kind"
                >
                  <option value="BIOLOGICAL">Biological</option>
                  <option value="WHANGAI">Whāngai</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={setFather} disabled={busy || !pickFather}>
                  Set Father
                </button>
              </div>
            </>
          )}
        </div>

        {/* Selected */}
        <div className="card p-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Selected person</div>
            <div className="text-lg font-semibold">{labelOf(selected)}</div>
          </div>
        </div>

        {/* Mother */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Mother</div>
          {currentMother ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {labelOf(currentMother)}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({(motherEdge?.kind as Kind) ?? "BIOLOGICAL"})
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={clearMother} disabled={busy}>Remove</button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs">Kind</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={motherKind}
                  onChange={e => setMotherKind(e.target.value as Kind)}
                  aria-label="Mother relationship kind"
                >
                  <option value="BIOLOGICAL">Biological</option>
                  <option value="WHANGAI">Whāngai</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={updateMotherKind} disabled={busy}>
                  Update Kind
                </button>
              </div>
            </div>
          ) : (
            <>
              <PersonPicker label="Add/replace mother" value={pickMother} onChange={setPickMother} options={options} />
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs">Kind</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={motherKind}
                  onChange={e => setMotherKind(e.target.value as Kind)}
                  aria-label="Mother relationship kind"
                >
                  <option value="BIOLOGICAL">Biological</option>
                  <option value="WHANGAI">Whāngai</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={setMother} disabled={busy || !pickMother}>
                  Set Mother
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children */}
        <div className="md:col-span-3 card p-3">
          <div className="text-sm font-medium mb-2">Children</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <PersonPicker label="Add child" value={pickChild} onChange={setPickChild} options={options} />
            </div>
            <div className="md:col-span-1 flex items-end gap-2">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={addChildKind}
                onChange={e => setAddChildKind(e.target.value as Kind)}
                aria-label="Child relationship kind"
              >
                <option value="BIOLOGICAL">Biological</option>
                <option value="WHANGAI">Whāngai</option>
              </select>
              <button className="btn btn-outline btn-sm w-full md:w-auto" onClick={addChild} disabled={busy || !pickChild}>
                Add Child
              </button>
            </div>
          </div>

          {currentChildren.length > 0 ? (
            <ul className="mt-3 divide-y">
              {currentChildren.map(ch => {
                const e = childEdges.find(edge => edge.childId === ch.id);
                return (
                  <li key={ch.id} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      {labelOf(ch)}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({(e?.kind as Kind) ?? "BIOLOGICAL"})
                      </span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => unlinkChild(ch.id)} disabled={busy}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">No children linked yet.</div>
          )}
        </div>

        {/* Partnerships */}
        <div className="md:col-span-3 card p-3">
          <div className="text-sm font-medium mb-2">Partnerships</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <PersonPicker label="Set / update partner" value={pickPartner} onChange={setPickPartner} options={options} />
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

          {myPartnerships.length > 0 ? (
            <ul className="mt-3 divide-y">
              {myPartnerships.map(p => {
                const otherId = p.aId === selectedId ? p.bId : p.aId;
                const other = getById(people, otherId);
                return (
                  <li key={p.id} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      {other ? labelOf(other) : otherId}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({p.kind.toLowerCase()}, {p.status.toLowerCase()})
                      </span>
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
