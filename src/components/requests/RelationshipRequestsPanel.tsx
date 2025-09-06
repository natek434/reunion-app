"use client";

import { useEffect, useMemo, useState } from "react";
type MiniUser = { id: string; name?: string | null; email?: string | null };
type MiniPerson = {
  id: string;
  preferredName?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdBy?: MiniUser | null; // <-- owner of this person (works)
};

interface RelationshipRequest {
  id: string;
  kind: "PARENT_CHILD" | "PARTNERSHIP";
  role: "MOTHER" | "FATHER" | "PARENT" | null;
  pcKind: "BIOLOGICAL" | "WHANGAI" | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  createdAt: string;

  // scalar fields are present even without includes:
  createdByUserId: string;
  approverUserId: string;

  // rich includes we kept:
  fromPerson?: MiniPerson;
  toPerson?: MiniPerson;
}

type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

type RequestKind = "PARENT_CHILD" | "PARTNERSHIP";

interface RelationshipRequest {
  id: string;
  kind: RequestKind;
  role: "MOTHER" | "FATHER" | "PARENT" | null;
  pcKind: "BIOLOGICAL" | "WHANGAI" | null;
  status: Status;
  createdAt: string;
  createdByUser?: MiniUser;
  approverUser?: MiniUser;
  fromPerson?: MiniPerson;
  toPerson?: MiniPerson;
}

function personLabel(p?: MiniPerson | null) {
  if (!p) return "Unknown";
  return (
    p.preferredName ||
    p.displayName ||
    [p.firstName, p.lastName].filter(Boolean).join(" ") ||
    p.id
  );
}

export default function RelationshipRequestsPanel() {
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [scope, setScope] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<RelationshipRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("scope", scope);
    if (filter === "PENDING") params.set("status", "PENDING");
    params.set("detail", "full");
    return `/api/relationship-requests?${params.toString()}`;
  }, [filter, scope]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(query);
      const data = await res.json();
      setItems(data?.requests ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query]);

  async function act(id: string, which: "approve" | "reject" | "cancel") {
    await fetch(`/api/relationship-requests/${id}/${which}`, { method: "POST" });
    await load();
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Relationship Requests</h2>

        {/* Scope: Received / Sent */}
        <select
          className="border rounded px-2 py-1"
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          aria-label="Scope"
        >
          <option value="received">Incoming (need my approval)</option>
          <option value="sent">Sent by me</option>
        </select>

        {/* Filter: Pending / All */}
        <select
          className="border rounded px-2 py-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          aria-label="Filter"
        >
          <option value="PENDING">Pending only</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {scope === "received" ? "No requests needing your approval." : "No requests sent."}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const from = personLabel(r.fromPerson);
            const to = personLabel(r.toPerson);
            const fromOwner = r.fromPerson?.createdBy?.name || r.fromPerson?.createdBy?.email;
            const toOwner = r.toPerson?.createdBy?.name || r.toPerson?.createdBy?.email;
            const detail =
              r.kind === "PARENT_CHILD"
                ? `Parent–child: ${r.role ?? "PARENT"} • ${r.pcKind ?? "BIOLOGICAL"}`
                : `Partnership`;
            return (
              <li key={r.id} className="border rounded p-3">
                <div className="flex flex-col gap-1">
                  <div className="font-medium">{detail}</div>
                  <div className="text-sm">
                    <span className="font-medium">{from}</span> →{" "}
                    <span className="font-medium">{to}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Owners: {from} by <span className="font-medium">{fromOwner || "Unknown"}</span>{" "}
                    · {to} by <span className="font-medium">{toOwner || "Unknown"}</span>
                  </div>
                  <div className="text-xs">Status: {r.status}</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  {r.status === "PENDING" && scope === "received" && (
                    <>
                      <button className="btn btn-primary" onClick={() => act(r.id, "approve")}>
                        Approve
                      </button>
                      <button className="btn btn-secondary" onClick={() => act(r.id, "reject")}>
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "PENDING" && scope === "sent" && (
                    <button className="btn btn-secondary" onClick={() => act(r.id, "cancel")}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
