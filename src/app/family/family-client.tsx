"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

/* ===== Types ===== */
type Role = "ADMIN" | "EDITOR" | "MEMBER";
type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
type ParentKind = "BIOLOGICAL" | "WHANGAI";

type GNode = {
  id: string;
  label: string;
  imageUrl?: string | null;
  gender?: Gender;
  locked?: boolean;
};
type GEdge = {
  id: string;
  source: string;
  target: string;
  type: "parent";
  role?: "MOTHER" | "FATHER";
  kind?: ParentKind;
};

const NODE_W = 220;
const NODE_H = 60;

/* ===== Custom Node (top = target from parent, bottom = source to child) ===== */
function PersonNode({
  data,
}: {
  data: { label: string; imageUrl?: string | null; locked?: boolean };
}) {
  return (
    <div
      className="rounded-xl border"
      style={{
        width: NODE_W,
        height: NODE_H,
        background: "var(--card)",
        borderColor: data.locked ? "#f59e0b" : "var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 10,
      }}
    >
      {/* Parent target (top) */}
      <Handle id="from-parent" type="target" position={Position.Top} style={{ background: "#64748b" }} />
      {/* Child source (bottom) */}
      <Handle id="to-child" type="source" position={Position.Bottom} style={{ background: "#64748b" }} />

      {data.imageUrl ? (
        <Image
          width={36}
          height={36}
          src={data.imageUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover border"
          style={{ borderColor: "var(--border)" }}
        />
      ) : (
        <div
          className="h-9 w-9 rounded-full grid place-items-center text-sm"
          style={{ background: "rgba(0,0,0,.06)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          {(data.label || "?").charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate font-medium" style={{ color: "var(--card-foreground)" }}>
          {data.label}
        </div>
        {data.locked && <div className="text-[11px] text-amber-700/90">Locked</div>}
      </div>
    </div>
  );
}
const nodeTypes = { person: PersonNode };

/* ===== Layout (parent edges only) ===== */
function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 130, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const parentEdges = edges.filter((e) => (e.data as any)?.type === "parent");
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  parentEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagreLayout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id) as { x: number; y: number };
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 }, draggable: true };
  });
}

/* ===== Canvas wrapper (now with floating "Link as") ===== */
function GraphCanvas({
  nodes,
  edges,
  onConnect,
  onRelayout,
  linkKind,
  onChangeLinkKind,
  canEdit,
  onDeleteEdge,
}: {
  nodes: Node[];
  edges: Edge[];
  onConnect: (c: Connection) => void;
  onRelayout: () => void;
  linkKind: ParentKind;
  onChangeLinkKind: (k: ParentKind) => void;
  canEdit: boolean;
  onDeleteEdge: (edge: Edge) => void;
}) {
  const { fitView } = useReactFlow();
  function relayoutAndFit() {
    onRelayout();
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
  }
  function isValidConnection(c: Connection) {
    return !!(
      c.source &&
      c.target &&
      c.sourceHandle === "to-child" &&
      c.targetHandle === "from-parent" &&
      c.source !== c.target
    );
  }
  return (
    <div className="relative h-full">
      <div className="absolute z-10 right-3 top-3 flex items-center gap-2">
        {canEdit && (
          <>
            <label className="text-sm ">Link as</label>
            <select
              className="input"
              value={linkKind}
              onChange={(e) => onChangeLinkKind(e.target.value as ParentKind)}
            >
              <option value="BIOLOGICAL">Biological</option>
              <option value="WHANGAI">Whāngai</option>
            </select>
          </>
        )}
        <button className="btn" onClick={relayoutAndFit}>
          Relayout & Fit
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onEdgeClick={(_, edge) => canEdit && onDeleteEdge(edge)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        connectionLineStyle={{ stroke: "#64748b", strokeDasharray: "6 3" }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

/* ===== Manage Member (inline for convenience) ===== */
function ManageMember({
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

  useEffect(() => {
    setLocked(null);
  }, [id]);

  async function doDelete() {
    if (!id) return;
    const name = options.find((o) => o.id === id)?.label ?? "this person";
    if (!window.confirm(`Soft delete ${name}? This will remove their links.`)) return;
    try {
      setBusy(true);
       const csrf = await ensureCsrfToken();
                if (!csrf) {
                  toast.error("Missing CSRF token. Please refresh the page and try again.");
                  return;
                }
      const res = await fetch(`/api/family/person/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
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
      toast.error("Lock/unlock failed", { description: e?.message?.slice(0, 160) });
    } finally {
      setLockBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <select className="input" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Select member</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2">
        <button className="btn text-rose-600" onClick={doDelete} disabled={!id || busy}>
          {busy ? "Deleting…" : "Delete"}
        </button>

        {isAdmin && (
          <>
            <button className="btn" onClick={() => toggleLock(true)} disabled={!id || lockBusy || locked === true}>
              {lockBusy && locked !== true ? "Working…" : "Lock"}
            </button>
            <button className="btn" onClick={() => toggleLock(false)} disabled={!id || lockBusy || locked === false}>
              {lockBusy && locked !== false ? "Working…" : "Unlock"}
            </button>
          </>
        )}
      </div>

      <p className="text-xs ">
        Delete is <strong>soft</strong>: the person is hidden from the graph, and their links are removed. Admins can
        restore later.
      </p>
    </div>
  );
}

/* ===== Page ===== */
export default function FamilyClient() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [rel, setRel] = useState("");

  // Drag-to-connect kind selector (shown on canvas)
  const [linkKind, setLinkKind] = useState<ParentKind>("BIOLOGICAL");

  // Manual linking state
  const [manualParent, setManualParent] = useState("");
  const [manualChild, setManualChild] = useState("");
  const [manualRole, setManualRole] = useState<"MOTHER" | "FATHER">("MOTHER");
  const [manualKind, setManualKind] = useState<ParentKind>("BIOLOGICAL");
  const [linkBusy, setLinkBusy] = useState(false);

  const { data: session } = useSession();
  const role = (session?.user as any)?.role as Role | undefined;
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const isAdmin = role === "ADMIN";

  async function load() {
    const res = await fetch("/api/family/graph", { cache: "no-store" });
    const data = await res.json();

    const ns: Node[] = (data.nodes as GNode[]).map((n) => ({
      id: n.id,
      type: "person",
      data: { label: n.label, imageUrl: n.imageUrl, gender: n.gender, locked: n.locked },
      position: { x: 0, y: 0 },
    }));

    const es: Edge[] = (data.edges as GEdge[]).map((e) => {
      const isWhangai = e.kind === "WHANGAI";
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        data: { type: "parent", role: e.role, kind: e.kind },
        style: isWhangai ? { stroke: "#f59e0b", strokeDasharray: "6 3" } : { stroke: "#94a3b8" },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
    });

    setNodes(layoutGraph(ns, es));
    setEdges(es);
  }

  useEffect(() => {
    load();
  }, []);

  function roleFromGender(g?: Gender): "MOTHER" | "FATHER" | null {
    if (g === "FEMALE") return "MOTHER";
    if (g === "MALE") return "FATHER";
    return null;
  }

  // Person options (carry gender for defaults)
  const personOptions = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        label: (n.data as any).label as string,
        gender: (n.data as any).gender as Gender | undefined,
      })),
    [nodes]
  );

  // Default manualRole from selected parent's gender (editable)
  useEffect(() => {
    const p = personOptions.find((x) => x.id === manualParent);
    if (p?.gender === "FEMALE") setManualRole("MOTHER");
    else if (p?.gender === "MALE") setManualRole("FATHER");
  }, [manualParent, personOptions]);

  // Drag-to-connect handler
  async function handleConnect(c: Connection) {
    const { source, sourceHandle, target, targetHandle } = c;
    if (!source || !target || sourceHandle !== "to-child" || targetHandle !== "from-parent") return;

    const parent = nodes.find((n) => n.id === source);
    const g = (parent?.data as any)?.gender as Gender | undefined;
    const role = roleFromGender(g);
    if (!role) {
      toast.error("Parent gender unknown — set gender first (Male/Female).");
      return;
    }

    try {
           const csrf = await ensureCsrfToken();
                 if (!csrf) {
                   toast.error("Missing CSRF token. Please refresh the page and try again.");
                   return;
                 }
      const res = await fetch("/api/family/link/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({
          parentId: source,
          childId: target,
          role,
          kind: linkKind, // from state
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Linked ${linkKind === "WHANGAI" ? "whāngai" : "biological"} ${role.toLowerCase()} → child`);
      await load();
    } catch (e: any) {
      toast.error("Failed to link", { description: e?.message?.slice(0, 160) });
    }
  }

  // Edge delete (click an edge to remove)
  async function handleDeleteEdge(edge: Edge) {
    const parentId = edge.source;
    const childId = edge.target;
    const kind = ((edge.data as any)?.kind as ParentKind | undefined) ?? "BIOLOGICAL";
    const role = (edge.data as any)?.role as "MOTHER" | "FATHER" | undefined;

    const label = `${kind === "WHANGAI" ? "whāngai" : "biological"}${role ? ` ${role.toLowerCase()}` : ""}`;
    if (!window.confirm(`Remove ${label} link?\n\nParent → Child`)) return;

    try {
           const csrf = await ensureCsrfToken();
                 if (!csrf) {
                   toast.error("Missing CSRF token. Please refresh the page and try again.");
                   return;
                 }
      const res = await fetch("/api/family/link/parent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ parentId, childId, kind }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Link removed");
      await load();
    } catch (e: any) {
      toast.error("Failed to remove link", { description: e?.message?.slice(0, 160) });
    }
  }

  // Manual link handler
  async function doLinkManual() {
    if (!manualParent || !manualChild) {
      toast.error("Pick a parent and a child."); return;
    }
    if (manualParent === manualChild) {
      toast.error("Parent and child must be different."); return;
    }

    // Optional client-side check
    const parent = personOptions.find((x) => x.id === manualParent);
    if (manualRole === "MOTHER" && parent?.gender && parent.gender !== "FEMALE") {
      toast.error("Selected mother is not FEMALE."); return;
    }
    if (manualRole === "FATHER" && parent?.gender && parent.gender !== "MALE") {
      toast.error("Selected father is not MALE."); return;
    }

    try {
      setLinkBusy(true);
           const csrf = await ensureCsrfToken();
                 if (!csrf) {
                   toast.error("Missing CSRF token. Please refresh the page and try again.");
                   return;
                 }
      const res = await fetch("/api/family/link/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({
          parentId: manualParent,
          childId: manualChild,
          role: manualRole,
          kind: manualKind,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Linked ${manualKind === "WHANGAI" ? "whāngai" : "biological"} ${manualRole.toLowerCase()} → child`);
      setManualChild(""); // keep parent selected for quick multiple links
      await load();
    } catch (e: any) {
      toast.error("Failed to link", { description: e?.message?.slice(0, 160) });
    } finally {
      setLinkBusy(false);
    }
  }

  async function onRel() {
    if (!a || !b) return;
    const res = await fetch(`/api/family/relationship?a=${a}&b=${b}`);
    const data = await res.json();
    if (data.ok) setRel(data.label);
    else toast.error("Failed to compute relationship");
  }

  async function addPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      firstName: String(fd.get("firstName") || ""),
      lastName: String(fd.get("lastName") || ""),
      gender: (fd.get("gender") as string) || "UNKNOWN",
      birthDate: (fd.get("birthDate") as string) || undefined,
      createdBy: (session?.user as any)?.email || undefined,
    };
    const csrf = await ensureCsrfToken();
             if (!csrf) {
               toast.error("Missing CSRF token. Please refresh the page and try again.");
               return;
             }
    const res = await fetch("/api/family/person", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      form.reset();
      toast.success("Member added");
      await load();
    } else {
      toast.error("Failed to add member");
    }
  }

  const optionsForManage = useMemo(
    () => personOptions.map(({ id, label }) => ({ id, label })),
    [personOptions]
  );

  function relayout() {
    setNodes((prev) => layoutGraph(prev, edges));
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="card p-2 h-[70vh]">
        <ReactFlowProvider>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onConnect={handleConnect}
            onRelayout={relayout}
            linkKind={linkKind}
            onChangeLinkKind={setLinkKind}
            canEdit={canEdit}
            onDeleteEdge={handleDeleteEdge}
          />
        </ReactFlowProvider>
      </div>

      <div className="card p-4 space-y-6">
        {/* Manual linking form */}
        {canEdit && (
          <section>
            <h2 className="font-semibold mb-2">Link people (dropdown)</h2>
            <div className="grid grid-cols-2 gap-2">
              {/* Parent */}
              <select className="input" value={manualParent} onChange={(e) => setManualParent(e.target.value)}>
                <option value="">Select parent</option>
                {personOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Role (defaults from parent gender, but editable) */}
              <select
                className="input"
                value={manualRole}
                onChange={(e) => setManualRole(e.target.value as "MOTHER" | "FATHER")}
              >
                <option value="MOTHER">Mother</option>
                <option value="FATHER">Father</option>
              </select>

              {/* Child */}
              <select className="input" value={manualChild} onChange={(e) => setManualChild(e.target.value)}>
                <option value="">Select child</option>
                {personOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Kind */}
              <select className="input" value={manualKind} onChange={(e) => setManualKind(e.target.value as ParentKind)}>
                <option value="BIOLOGICAL">Biological</option>
                <option value="WHANGAI">Whāngai</option>
              </select>
            </div>

            <div className="mt-2">
              <button className="btn btn-primary" onClick={doLinkManual} disabled={!manualParent || !manualChild || linkBusy}>
                {linkBusy ? "Linking…" : "Connect"}
              </button>
            </div>

            <p className="text-xs  mt-1">
              Tip: Click an edge in the graph to remove it. Whāngai links render as dashed amber lines.
            </p>
          </section>
        )}

        <section>
          <h2 className="font-semibold mb-2">Add member</h2>
          <form className="space-y-2" onSubmit={addPerson}>
            <div className="grid grid-cols-2 gap-2">
              <input name="firstName" className="input" placeholder="First name" required />
              <input name="lastName" className="input" placeholder="Last name" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select name="gender" className="input">
                <option value="UNKNOWN">Unknown</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
              <input name="birthDate" className="input" type="date" />
            </div>
            <button className="btn btn-primary">Create</button>
          </form>
        </section>

        {canEdit && (
          <section>
            <h2 className="font-semibold mb-2">Manage member</h2>
            <ManageMember options={optionsForManage} isAdmin={!!isAdmin} onAfterChange={load} />
          </section>
        )}

        <section>
          <h2 className="font-semibold mb-2">Find relationship</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select person A</option>
              {personOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <select className="input" value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Select person B</option>
              {personOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-primary" onClick={onRel} disabled={!a || !b}>
              Compute
            </button>
            {rel && (
              <span className="text-sm  self-center">
                Result: <strong>{rel}</strong>
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

