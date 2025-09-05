// src/components/family/my-family-dashboard.tsx
"use client";

import useSWR from "swr";
import { useState } from "react";
import LinkAccountPerson from "@/components/family/link-account-person";
import RelationshipQuickEdit from "@/components/family/relationship-quick-edit";
import FamilyGraph from "@/components/family/family-graph";
import { toast } from "sonner";

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

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MyFamilyDashboard() {
  const { data, mutate, isLoading } = useSWR<{
    mePersonId: string | null;
    members: PersonDTO[];
    parentChild: ParentChildEdgeDTO[];
    partnerships: PartnershipDTO[];
  }>("/api/me/family", fetcher);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = data?.members || [];
  const edgesPC = data?.parentChild || [];
  const edgesP = data?.partnerships || [];

  async function refresh() {
    await mutate();
  }

  return (
    <div className="grid gap-6">
      {/* Section: Link account -> person */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Link my account to a person</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Choose which of your members represents <em>you</em>. This does not create new members.
        </p>
        <LinkAccountPerson mePersonId={data?.mePersonId ?? null} onLinked={refresh} />
      </div>

      {/* Section: Members list */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Members I created</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">You haven’t created any members yet. Ask an admin to create them, then manage relationships here.</div>
        ) : (
          <ul className="divide-y">
            {members.map(p => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim()}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedId(p.id)}>
                    Edit relationships
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section: Relationship graph */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Relationships (graph)</h2>
        <FamilyGraph
          people={members}
          parentChild={edgesPC}
          partnerships={edgesP}
          onSelectNode={(id) => setSelectedId(id)}
        />
      </div>

      {/* Section: Quick editor */}
      <RelationshipQuickEdit
        people={members}
        parentChild={edgesPC}
        partnerships={edgesP}
        selectedId={selectedId}
        onChanged={async () => {
          await refresh();
          toast.success("Updated");
        }}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
