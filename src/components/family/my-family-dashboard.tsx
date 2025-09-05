"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import LinkAccountPerson from "@/components/family/link-account-person";
import RelationshipQuickEdit from "@/components/family/relationship-quick-edit";
import FamilyGraph from "@/components/family/family-graph";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
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

  const members = data?.members || [];
  const edgesPC = data?.parentChild || [];
  const edgesP = data?.partnerships || [];

  const options: PersonOption[] = useMemo(
    () => members.map(p => ({ id: p.id, label: labelOf(p) })),
    [members]
  );

  // Single source of truth: who are we editing?
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to "me" once data loads (only the first time)
  useMemo(() => {
    if (!selectedId && data?.mePersonId) setSelectedId(data.mePersonId);
  }, [data?.mePersonId, selectedId]);

  async function refresh() {
    await mutate();
    toast.success("Refreshed");
  }

  const mePersonName =
    (data?.mePersonId && members.find(m => m.id === data.mePersonId)?.displayName) ||
    (data?.mePersonId && members.find(m => m.id === data.mePersonId) ? labelOf(members.find(m => m.id === data!.mePersonId)!) : null) ||
    null;

  return (
    <div className="grid gap-6">
      {/* Link account to your Person */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Link my account to a person</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Choose which member represents <em>you</em>. This won’t create anyone new.
        </p>
        <LinkAccountPerson
          mePersonId={data?.mePersonId ?? null}
          mePersonLabel={mePersonName}
          onLinked={refresh}
        />
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
            <div className="text-sm text-muted-foreground mb-2">
              Click a name to select them for editing.
            </div>
            <ul className="divide-y">
              {members.map(p => {
                const name = labelOf(p);
                const isSelected = selectedId === p.id;
                const isMe = data?.mePersonId === p.id;
                return (
                  <li
                    key={p.id}
                    className="py-2 flex items-center justify-between"
                  >
                    <button
                      className={`text-left ${isSelected ? "font-semibold" : "font-medium"}`}
                      onClick={() => setSelectedId(p.id)}
                      title={name}
                    >
                      <div>{name}{isMe && <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">You</span>}</div>
                    </button>
                    {/* Removed the broken/pointless "Edit relationships" button */}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Relationships graph */}
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

      {/* Clear selection and editor */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Edit relationships</h2>

        {/* Make it obvious how to choose WHO we are editing */}
        <div className="mb-3">
          <PersonPicker
            label="Person to edit"
            value={
              selectedId
                ? { id: selectedId, label: options.find(o => o.id === selectedId)?.label ?? selectedId }
                : null
            }
            onChange={(opt) => setSelectedId(opt?.id ?? null)}
          />
        </div>

        <RelationshipQuickEdit
          people={members}
          parentChild={edgesPC}
          partnerships={edgesP}
          selectedId={selectedId}
          onChanged={async () => {
            await refresh();
          }}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}
