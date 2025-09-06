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
  const [pickFather, setPickFather] = useState<PersonOption | null>(null);
  const [pickMother, setPickMother] = useState<PersonOption | null>(null);
  const [pickChild, setPickChild] = useState<PersonOption | null>(null);
  const [pickPartner, setPickPartner] = useState<PersonOption | null>(null);
  const [busy, setBusy] = useState(false);

  const options: PersonOption[] = useMemo(
    () => people.map(p => ({ id: p.id, label: labelOf(p) })),
    [people]
  );

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

  // Current edges
  const parentEdges = parentChild.filter(e => e.childId === selectedId);
  const childEdges = parentChild.filter(e => e.parentId === selectedId);

  const fatherEdge =
    parentEdges.find(e => e.role === "FATHER") ??
    parentEdges.find(e => getById(people, e.parentId)?.gender === "MALE") ??
    null;
  const motherEdge =
    parentEdges.find(e => e.role === "MOTHER") ??
    parentEdges.find(e => getById(people, e.parentId)?.gender === "FEMALE") ??
    null;

  const currentFather = fatherEdge ? getById(people, fatherEdge.parentId) : null;
  const currentMother = motherEdge ? getById(people, motherEdge.parentId) : null;
  const currentChildren = childEdges.map(e => getById(people, e.childId)).filter(Boolean) as PersonDTO[];

  const myPartnerships = partnerships.filter(p => p.aId === selectedId || p.bId === selectedId);

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

  async function postJson(url: string, method: "POST" | "DELETE", body: any, includeCsrf = true) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (includeCsrf) {
      const csrf = await getCsrf();
      if (!csrf) return { ok: false, status: 0, json: {} as any };
      headers["X-Csrf-Token"] = csrf;
    }
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      // ignore
    }
    return { ok: res.ok, status: res.status, json };
  }

  /** Try direct link; if 403, create a request instead. */
  async function linkParentOrRequest(parentId: string, childId: string, role: Role, kind: Kind) {
    // 1) try direct
    const res = await postJson("/api/relationships/parent-child", "POST", { parentId, childId, role, kind });
    if (res.ok) return { ok: true, requested: false };

    if (res.status !== 403) {
      toast.error(res.json?.error || "Failed to link");
      return { ok: false, requested: false };
    }

    // 2) fallback to request
    const reqRes = await postJson(
      "/api/relationship-requests",
      "POST",
      { type: "PARENT_CHILD", parentId, childId, role, kind, message: "" },
      false // most apps don't require CSRF for this route; set true if you do
    );
    if (!reqRes.ok) {
      toast.error(reqRes.json?.error || "Could not create approval request");
      return { ok: false, requested: false };
    }
    toast.success("Request sent for approval");
    return { ok: true, requested: true };
  }

  /** Try direct partnership upsert; if 403, create a request instead. */
  async function upsertPartnershipOrRequest(aId: string, bId: string) {
    const res = await postJson("/api/relationships/partnership", "POST", { aId, bId, status: "ACTIVE" });
    if (res.ok) return { ok: true, requested: false };

    if (res.status !== 403) {
      toast.error(res.json?.error || "Failed to set partnership");
      return { ok: false, requested: false };
    }

    const reqRes = await postJson(
      "/api/relationship-requests",
      "POST",
      { type: "PARTNERSHIP", aId, bId, status: "ACTIVE", message: "" },
      false
    );
    if (!reqRes.ok) {
      toast.error(reqRes.json?.error || "Could not create approval request");
      return { ok: false, requested: false };
    }
    toast.success("Request sent for approval");
    return { ok: true, requested: true };
  }

  // Father actions
  async function setFather() {
    if (!pickFather) return;
    setBusy(true);
    try {
      if (currentFather && currentFather.id !== pickFather.id) {
        // optional: require explicit unlink first; keeping behavior simple
        const del = await postJson("/api/relationships/parent-child", "DELETE", {
          parentId: currentFather.id,
          childId: selectedId,
        });
        if (!del.ok) {
          toast.error(del.json?.error || "Failed to remove existing father");
          return;
        }
      }
      const { ok } = await linkParentOrRequest(pickFather.id, selectedId!, "FATHER", "BIOLOGICAL");
      if (ok) onChanged?.();
    } finally {
      setBusy(false);
    }
  }
  async function clearFather() {
    if (!currentFather) return;
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: currentFather.id,
        childId: selectedId,
      });
      if (!res.ok) {
        toast.error(res.json?.error || "Failed to remove father");
        return;
      }
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  // Mother actions
  async function setMother() {
    if (!pickMother) return;
    setBusy(true);
    try {
      if (currentMother && currentMother.id !== pickMother.id) {
        const del = await postJson("/api/relationships/parent-child", "DELETE", {
          parentId: currentMother.id,
          childId: selectedId,
        });
        if (!del.ok) {
          toast.error(del.json?.error || "Failed to remove existing mother");
          return;
        }
      }
      const { ok } = await linkParentOrRequest(pickMother.id, selectedId!, "MOTHER", "BIOLOGICAL");
      if (ok) onChanged?.();
    } finally {
      setBusy(false);
    }
  }
  async function clearMother() {
    if (!currentMother) return;
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: currentMother.id,
        childId: selectedId,
      });
      if (!res.ok) {
        toast.error(res.json?.error || "Failed to remove mother");
        return;
      }
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  // Children actions
  async function addChild() {
    if (!pickChild) return;
    setBusy(true);
    try {
      const role: Role = guessRoleFromGender(selected.gender);
      const { ok } = await linkParentOrRequest(selectedId!, pickChild.id, role, "BIOLOGICAL");
      if (ok) {
        setPickChild(null);
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  }
  async function unlinkChild(childId: string) {
    setBusy(true);
    try {
      const res = await postJson("/api/relationships/parent-child", "DELETE", {
        parentId: selectedId,
        childId,
      });
      if (!res.ok) {
        toast.error(res.json?.error || "Failed to remove child");
        return;
      }
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  // Partnerships
  async function upsertPartnership() {
    if (!pickPartner) return;
    setBusy(true);
    try {
      const { ok } = await upsertPartnershipOrRequest(selectedId!, pickPartner.id);
      if (ok) {
        setPickPartner(null);
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deletePartnershipByPartnerId(partnerId: string) {
    setBusy(true);
    try {
      const [A, B] = selectedId! < partnerId ? [selectedId!, partnerId] : [partnerId, selectedId!];
      const match = partnerships.find(p => p.aId === A && p.bId === B);
      if (!match) {
        toast.error("No partnership found");
        return;
      }
      const res = await postJson("/api/relationships/partnership", "DELETE", { id: match.id });
      if (!res.ok) {
        toast.error(res.json?.error || "Failed to delete partnership");
        return;
      }
      onChanged?.();
    } finally {
      setBusy(false);
    }
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
        {/* Father */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Father</div>
          {currentFather ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">{labelOf(currentFather)}</div>
              <button className="btn btn-danger btn-sm" onClick={clearFather} disabled={busy}>Remove</button>
            </div>
          ) : (
            <>
              <PersonPicker
                label="Add/replace father"
                value={pickFather}
                onChange={setPickFather}
                options={options}
              />
              <div className="mt-2">
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
            <div className="flex items-center justify-between">
              <div className="text-sm">{labelOf(currentMother)}</div>
              <button className="btn btn-danger btn-sm" onClick={clearMother} disabled={busy}>Remove</button>
            </div>
          ) : (
            <>
              <PersonPicker
                label="Add/replace mother"
                value={pickMother}
                onChange={setPickMother}
                options={options}
              />
              <div className="mt-2">
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

        {/* Partnerships */}
        <div className="md:col-span-3 card p-3">
          <div className="text-sm font-medium mb-2">Partnerships</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <PersonPicker
                label="Set / update partner"
                value={pickPartner}
                onChange={setPickPartner}
                options={options}
              />
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
