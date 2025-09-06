"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import LinkAccountPerson from "@/components/family/link-account-person";
import RelationshipQuickEdit from "@/components/family/relationship-quick-edit";
import FamilyGraph from "@/components/family/family-graph";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client";
import RelationshipRequestsPanel from "../requests/RelationshipRequestsPanel";

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";



export type PersonDTO = {
  id: string;
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  gender: Gender;
  createdById: string;
  deletedAt: string | null;
};

export type ParentChildEdgeDTO = {
  id: string;
  parentId: string;
  childId: string;
  role: "MOTHER" | "FATHER" | "PARENT";
  kind: "BIOLOGICAL" | "WHANGAI";
};

export type PartnershipDTO = {
  id: string;
  aId: string;
  bId: string;
  kind: "MARRIED" | "PARTNER" | "CIVIL_UNION" | "DE_FACTO" | "OTHER";
  status: "ACTIVE" | "SEPARATED" | "DIVORCED" | "WIDOWED" | "ENDED";
};

type RelationshipRequestDTO = {
  id: string;
  createdByUserId: string;
  approverUserId: string;
  fromPersonId: string;
  toPersonId: string;
  kind: "PARENT_CHILD" | "PARTNERSHIP";
  role: "MOTHER" | "FATHER" | "PARENT" | null;
  pcKind: "BIOLOGICAL" | "WHANGAI" | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

function labelOf(p: PersonDTO) {
  return p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim();
}

export default function MyFamilyDashboard() {
  const { data, mutate, isLoading } = useSWR<{
    mePersonId: string | null;
    members: PersonDTO[];
    parentChild: ParentChildEdgeDTO[];
    partnerships: PartnershipDTO[];
  }>("/api/me/family", fetcher);

  const { data: requests, mutate: mutateReq } = useSWR<RelationshipRequestDTO[]>(
    "/api/me/relationship-requests",
    fetcher
  );

  const members = data?.members || [];
  const edgesPC = data?.parentChild || [];
  const edgesP = data?.partnerships || [];

  const options: PersonOption[] = useMemo(
    () => members.map(p => ({ id: p.id, label: labelOf(p) })),
    [members]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useMemo(() => {
    if (!selectedId && data?.mePersonId) setSelectedId(data.mePersonId);
  }, [data?.mePersonId, selectedId]);

  async function refresh() {
    await Promise.all([mutate(), mutateReq()]);
    toast.success("Refreshed");
  }

  async function deleteMember(memberId: string) {
    if (!memberId) return;
    const name =
      members.find(m => m.id === memberId)?.displayName ||
      members.find(m => m.id === memberId)?.firstName ||
      "this member";

    if (!confirm(`Delete ${name}? This cannot be undone and may remove related links.`)) {
      return;
    }

    setDeletingId(memberId);
    try {
      const csrf = await ensureCsrfToken();
      if (!csrf) {
        toast.error("Missing CSRF token. Refresh and try again.");
        return;
      }
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: { "X-Csrf-Token": csrf },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete member");
      }
      if (selectedId === memberId) setSelectedId(null);
      toast.success("Member deleted.");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function actOnRequest(id: string, action: "approve" | "reject") {
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch(`/api/relationship-requests/${id}/${action}`, {
        method: "POST",
        headers: csrf ? { "X-Csrf-Token": csrf } : undefined,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e?.error || "Failed");
        return;
      }
      toast.success(action === "approve" ? "Approved" : "Rejected");
      await Promise.all([mutateReq(), mutate()]);
    } catch {
      toast.error("Network error");
    }
  }

  const mePersonName =
    (data?.mePersonId && members.find(m => m.id === data.mePersonId)?.displayName) ||
    (data?.mePersonId && members.find(m => m.id === data?.mePersonId) ? labelOf(members.find(m => m.id === data!.mePersonId)!) : null) ||
    null;

  return (
    <div className="grid gap-6">
      {/* Approval inbox */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Requests needing your approval</h2>
        {!requests ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending requests.</div>
        ) : (
          <ul className="divide-y">
            {requests.map(r => {
              const from = members.find(m => m.id === r.fromPersonId);
              const to = members.find(m => m.id === r.toPersonId);
              return (
                <li key={r.id} className="py-2 flex items-center justify-between">
                  <div className="text-sm">
                    {r.kind === "PARENT_CHILD" ? (
                      <>
                        Link <strong>{from ? labelOf(from) : r.fromPersonId}</strong> as{" "}
                        <strong>{(r.role || "PARENT").toLowerCase()}</strong> of{" "}
                        <strong>{to ? labelOf(to) : r.toPersonId}</strong>
                      </>
                    ) : (
                      <>
                        Partnership between <strong>{from ? labelOf(from) : r.fromPersonId}</strong> and{" "}
                        <strong>{to ? labelOf(to) : r.toPersonId}</strong>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => actOnRequest(r.id, "approve")}>
                      Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => actOnRequest(r.id, "reject")}>
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
         <RelationshipRequestsPanel />
      {/* Link account to Person */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Link my account to a person</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Choose which member represents <em>you</em>. This won’t create anyone new.
        </p>
        <LinkAccountPerson mePersonId={data?.mePersonId ?? null} mePersonLabel={mePersonName} onLinked={refresh} />
      </div>

      {/* Members you created */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Members I created</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No members yet. Ask an admin to add them, then manage relationships here.
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-2">Click a name to select them for editing.</div>
            <ul className="divide-y">
              {members.map(p => {
                const name = labelOf(p);
                const isSelected = selectedId === p.id;
                const isMe = data?.mePersonId === p.id;
                const isDeleting = deletingId === p.id;

                return (
                  <li key={p.id} className="py-2 flex items-center justify-between">
                    <button
                      className={`text-left ${isSelected ? "font-semibold" : "font-medium"}`}
                      onClick={() => setSelectedId(p.id)}
                      title={name}
                    >
                      <div>
                        {name}
                        {isMe && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteMember(p.id)}
                        disabled={isDeleting}
                        aria-label={`Delete ${name}`}
                        title={`Delete ${name}`}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Graph */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Relationships (graph)</h2>
        <FamilyGraph
          people={members}
          parentChild={edgesPC}
          partnerships={edgesP}
          selectedId={selectedId}
          onSelectNode={id => setSelectedId(id)}
        />
        <div className="text-xs text-muted-foreground mt-2">
          Tip: click a name in the graph to set the “Person to edit” below.
        </div>
      </div>

      {/* Editor */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Edit relationships</h2>

        <div className="mb-3">
          <PersonPicker
            label="Person to edit"
            value={selectedId ? { id: selectedId, label: options.find(o => o.id === selectedId)?.label ?? selectedId } : null}
            onChange={opt => setSelectedId(opt?.id ?? null)}
            options={options}
          />
        </div>

        <RelationshipQuickEdit
          people={members}
          parentChild={edgesPC}
          partnerships={edgesP}
          selectedId={selectedId}
          onChanged={refresh}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}
