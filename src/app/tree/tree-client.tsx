"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import ReactFlow, {
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import { toast } from "sonner";

/* ---------- Types ---------- */
type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
type ParentKind = "BIOLOGICAL" | "WHANGAI";

type GNode = {
  id: string;
  label: string;
  imageUrl?: string | null;
  gender?: Gender;
  locked?: boolean;
  birthDate?: string | null;
  notes?: string | null;
};
type GEdge = {
  id: string;
  source: string;
  target: string;
  type: "parent";
  role?: "MOTHER" | "FATHER" | "PARENT";
  kind?: ParentKind;
};

type ViewKind = "BIOLOGICAL" | "WHANGAI" | "ALL";
type ViewMode = "GRAPH" | "ANCESTORS";
type Side = "MATERNAL" | "PATERNAL" | "BOTH";

const NODE_W = 220;
const NODE_H = 68;

/* ---------- Hover card rendered in a portal ---------- */
function HoverCardPortal({
  anchorRect,
  data,
}: {
  anchorRect: DOMRect | null;
  data: GNode & { isMe?: boolean };
}) {
  if (!anchorRect || typeof window === "undefined") return null;
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchorRect.top - 8,
    left: anchorRect.right + 8,
    width: 260,
    background: "rgba(255,255,255,.97)",
    backdropFilter: "blur(6px)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.12)",
    padding: 12,
    zIndex: 999999,
    pointerEvents: "none",
  };
  return ReactDOM.createPortal(
    <div style={style}>
      <div className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
        {data.label} {data.isMe ? <span className="text-xs text-blue-600/80">(me)</span> : null}
      </div>
      <dl className="space-y-1 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        {data.gender && (
          <div className="flex justify-between"><dt>Gender</dt><dd>{data.gender}</dd></div>
        )}
        {data.birthDate && (
          <div className="flex justify-between"><dt>Born</dt><dd>{new Date(data.birthDate).toLocaleDateString()}</dd></div>
        )}
        {data.notes && <div className="mt-1">{data.notes}</div>}
      </dl>
    </div>,
    document.body
  );
}

/* ---------- Custom node ---------- */
function PersonNode({ data }: { data: GNode & { isMe?: boolean; highlighted?: boolean } }) {
  const initial = (data.label || "?").charAt(0).toUpperCase();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  return (
    <>
      <div
        ref={wrapRef}
        className="rounded-xl border shadow-sm"
        style={{
          width: NODE_W,
          height: NODE_H,
          background: "var(--card)",
          borderColor: data.highlighted
            ? "#3b82f6"
            : data.isMe
            ? "#22c55e"
            : data.locked
            ? "#f59e0b"
            : "var(--border)",
          boxShadow: data.highlighted
            ? "0 0 0 2px rgba(59,130,246,.35)"
            : data.isMe
            ? "0 0 0 2px rgba(34,197,94,.35)"
            : undefined,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
        }}
        onMouseEnter={() => setHoverRect(wrapRef.current?.getBoundingClientRect() || null)}
        onMouseLeave={() => setHoverRect(null)}
      >
        <Handle id="from-parent" type="target" position={Position.Top} style={{ background: "#64748b" }} />
        <Handle id="to-child"   type="source" position={Position.Bottom} style={{ background: "#64748b" }} />

        {data.imageUrl ? (
          <img src={data.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover border" style={{ borderColor: "var(--border)" }} />
        ) : (
          <div className="h-9 w-9 rounded-full grid place-items-center text-sm"
               style={{ background: "rgba(0,0,0,.06)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
            {initial}
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate font-medium" style={{ color: "var(--card-foreground)" }}>{data.label}</div>
          <div className="text-[11px] text-neutral-500 truncate">{data.gender ?? ""} {data.locked ? "• locked" : ""}</div>
        </div>
      </div>

      {hoverRect ? <HoverCardPortal anchorRect={hoverRect} data={data} /> : null}
    </>
  );
}
const nodeTypes = { person: PersonNode };

/* ---------- Layout (dagre) ---------- */
function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 80,
    ranksep: 160,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const parentEdges = edges.filter((e) => (e.data as any)?.type === "parent");
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  parentEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagreLayout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id) as { x: number; y: number };
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 }, draggable: false };
  });
}

/* ---------- Helpers ---------- */

// Build simple maps (child -> parents[]), (parent -> children[])
function buildMaps(edges: GEdge[]) {
  const parentsOf = new Map<string, Array<{ id: string; role?: GEdge["role"] }>>();
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== "parent") continue;
    if (!parentsOf.has(e.target)) parentsOf.set(e.target, []);
    parentsOf.get(e.target)!.push({ id: e.source, role: e.role });
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
  }
  return { parentsOf, childrenOf };
}

// Walk strictly maternal/paternal line upwards
function walkLineage(
  startId: string,
  parentsOf: Map<string, Array<{ id: string; role?: GEdge["role"] }>>,
  which: "MOTHER" | "FATHER"
) {
  const nodes: string[] = [startId];
  const edges: Array<{ from: string; to: string }> = [];
  let cur = startId;
  const seen = new Set([startId]);

  while (true) {
    const ps = parentsOf.get(cur) || [];
    const pref = ps.find((p) => p.role === which) || ps.find((p) => p.role === "PARENT");
    if (!pref) break;
    if (seen.has(pref.id)) break;
    nodes.push(pref.id);
    edges.push({ from: pref.id, to: cur });
    seen.add(pref.id);
    cur = pref.id;
  }
  return { nodes: new Set(nodes), edges: new Set(edges.map((e) => `${e.from}->${e.to}`)) };
}

// WHĀNGAI-FIRST SELECTOR:
// For a given (child, role) choose at most ONE edge by view:
// - WHANGAI: choose whāngai if present, else fall back to biological
// - BIOLOGICAL: biological only
// - ALL: return all as-is
function selectEdgesForView(raw: GEdge[], viewKind: ViewKind): GEdge[] {
  if (viewKind === "ALL") return raw;

  const groups = new Map<string, GEdge[]>();
  for (const e of raw) {
    if (e.type !== "parent") continue;
    const role = (e.role as any) || "PARENT";
    const key = `${e.target}::${role}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const out: GEdge[] = [];
  for (const list of groups.values()) {
    if (viewKind === "WHANGAI") {
      const chosen =
        list.find(x => (x.kind ?? "BIOLOGICAL") === "WHANGAI") ??
        list.find(x => (x.kind ?? "BIOLOGICAL") === "BIOLOGICAL") ??
        null;
      if (chosen) out.push(chosen);
    } else { // BIOLOGICAL
      const chosen = list.find(x => (x.kind ?? "BIOLOGICAL") === "BIOLOGICAL") ?? null;
      if (chosen) out.push(chosen);
    }
  }
  return out;
}


// Build map child -> [{ parentId, role }]
function buildParentsMapKindAware(edges: GEdge[]) {
  const map = new Map<string, Array<{ parentId: string; role?: GEdge["role"] }>>();
  for (const e of edges) {
    if (e.type !== "parent") continue;
    if (!map.has(e.target)) map.set(e.target, []);
    map.get(e.target)!.push({ parentId: e.source, role: e.role });
  }
  return map;
}

// Ascend a single line (maternal/paternal) or ANY (fallback) for ancestors-only mode
function ascendLine(
  startId: string,
  parentsOf: Map<string, Array<{ parentId: string; role?: GEdge["role"] }>>,
  which: "MOTHER" | "FATHER" | "ANY",
  maxDepth = 12
) {
  const nodes = new Set<string>([startId]);
  const edges = new Set<string>();
  let cur = startId; let depth = 0;
  while (depth < maxDepth) {
    const ps = parentsOf.get(cur) || [];
    const pref =
      which === "ANY" ? (ps.find(p => p.role === "MOTHER") || ps.find(p => p.role === "FATHER") || ps[0])
      : ps.find(p => p.role === which);
    if (!pref) break;
    nodes.add(pref.parentId);
    edges.add(`${pref.parentId}->${cur}`);
    cur = pref.parentId;
    depth++;
  }
  return { nodes, edges };
}

/* ---------- Canvas ---------- */
function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (id: string) => void;
}) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15 }), 0);
    return () => clearTimeout(t);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => onNodeClick(n.id)}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      selectionOnDrag={false}
      nodesDraggable={false}
      edgesFocusable={false}
      edgesUpdatable={false}
    >
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

/* ---------- Page ---------- */
export default function TreeClient() {
  const [rawNodes, setRawNodes] = useState<GNode[]>([]);
  const [rawEdges, setRawEdges] = useState<GEdge[]>([]);
  const [selected, setSelected] = useState<string>("");

  // highlight state
  const [hiNodes, setHiNodes] = useState<Set<string>>(new Set());
  const [hiEdges, setHiEdges] = useState<Set<string>>(new Set());

  // relationship compute
  const [pick, setPick] = useState<"A" | "B">("A");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [rel, setRel] = useState("");

  // "Me"
  const [myId, setMyId] = useState<string | null>(null);

  // Filters / modes
  const [viewKind, setViewKind] = useState<ViewKind>("BIOLOGICAL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRAPH");
  const [side, setSide] = useState<Side>("BOTH");

  useEffect(() => {
    (async () => {
      const [graphRes, meRes] = await Promise.all([
        fetch("/api/family/graph", { cache: "no-store" }),
        fetch("/api/family/me", { cache: "no-store" }),
      ]);
      const graph = await graphRes.json();
      setRawNodes(graph.nodes as GNode[]);
      setRawEdges((graph.edges as GEdge[]).filter((e) => e.type === "parent"));
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.personId) setMyId(me.personId as string);
      }
    })();
  }, []);

  const options = useMemo(
    () => [...rawNodes].sort((x, y) => x.label.localeCompare(y.label)).map((n) => ({ id: n.id, label: n.label })),
    [rawNodes]
  );

  // Whāngai-first fallback selection
  const visibleParentEdges = useMemo(
    () => selectEdgesForView(rawEdges, viewKind),
    [rawEdges, viewKind]
  );

  // Build maps from *visible* edges so lineage/ancestors respect the current selection
  const { parentsOf } = useMemo(() => buildMaps(visibleParentEdges), [visibleParentEdges]);
  const parentsOfKindAware = useMemo(() => buildParentsMapKindAware(visibleParentEdges), [visibleParentEdges]);

  function highlight(which: "MOTHER" | "FATHER") {
    const start = selected || myId;
    if (!start) {
      toast.info("Select a person (or link 'Me' in your account) to highlight.");
      return;
    }
    const path = walkLineage(start, parentsOf, which);
    setHiNodes(path.nodes);
    setHiEdges(path.edges);
  }
  function clearHighlight() {
    setHiNodes(new Set());
    setHiEdges(new Set());
  }

  // Ancestors-only filter (build subgraph for selected/me)
  const ancestorFilter = useMemo(() => {
    if (viewMode !== "ANCESTORS") return null;
    const focus = selected || myId;
    if (!focus) return { nodes: new Set<string>(), edges: new Set<string>() };

    const sets = [];
    if (side === "MATERNAL" || side === "BOTH") sets.push(ascendLine(focus, parentsOfKindAware, "MOTHER"));
    if (side === "PATERNAL" || side === "BOTH") sets.push(ascendLine(focus, parentsOfKindAware, "FATHER"));

    const nodes = new Set<string>(); const edges = new Set<string>();
    for (const s of sets) { s.nodes.forEach(n => nodes.add(n)); s.edges.forEach(e => edges.add(e)); }
    // ensure focus visible
    nodes.add(focus);
    return { nodes, edges };
  }, [viewMode, side, selected, myId, parentsOfKindAware]);

  const rfNodes: Node[] = useMemo(() => {
    const allNodes: Node[] = rawNodes.map((n) => ({
      id: n.id,
      type: "person",
      data: { ...n, isMe: myId === n.id, highlighted: hiNodes.has(n.id) },
      position: { x: 0, y: 0 },
    }));

    const allEdges: Edge[] = visibleParentEdges.map((e) => {
      const isWhangai = e.kind === "WHANGAI";
      const hi = hiEdges.has(`${e.source}->${e.target}`);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        data: { type: "parent", role: e.role },
        style: hi
          ? { stroke: "#3b82f6", strokeWidth: 2.5 }
          : isWhangai
          ? { stroke: "#f59e0b", strokeDasharray: "6 3" }
          : { stroke: "#94a3b8" },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
    });

    if (viewMode === "ANCESTORS" && ancestorFilter) {
      const { nodes, edges } = ancestorFilter;
      const fn = allNodes.filter(n => nodes.has(n.id));
      const fe = allEdges.filter(e => edges.has(`${e.source}->${e.target}`));
      return layoutGraph(fn, fe);
    }

    return layoutGraph(allNodes, allEdges);
  }, [rawNodes, visibleParentEdges, hiNodes, hiEdges, myId, viewMode, ancestorFilter]);

  const rfEdges: Edge[] = useMemo(() => {
    const edges = visibleParentEdges.map((e) => {
      const isWhangai = e.kind === "WHANGAI";
      const hi = hiEdges.has(`${e.source}->${e.target}`);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        data: { type: "parent", role: e.role },
        style: hi
          ? { stroke: "#3b82f6", strokeWidth: 2.5 }
          : isWhangai
          ? { stroke: "#f59e0b", strokeDasharray: "6 3" }
          : { stroke: "#94a3b8" },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
    });

    if (viewMode === "ANCESTORS" && ancestorFilter) {
      return edges.filter(e => ancestorFilter.edges.has(`${e.source}->${e.target}`));
    }
    return edges;
  }, [visibleParentEdges, hiEdges, viewMode, ancestorFilter]);

  async function computeRel() {
    if (!a || !b) return;
    const res = await fetch(`/api/family/relationship?a=${a}&b=${b}`);
    const data = await res.json();
    setRel(res.ok ? data.label : "unknown");
  }

  function onNodeClick(id: string) {
    setSelected(id);
    if (pick === "A") {
      setA(id);
      setPick("B");
      toast.info("Selected A; now pick B");
    } else {
      setB(id);
      setPick("A");
      toast.info("Selected B; press Compute");
    }
  }

  return (
    <div className="grid gap-4">
      {/* Toolbar: person + highlight + kind filter + mode/side + legend */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 mb-1">Person</label>
          <div className="flex gap-2">
            <select className="input min-w-56" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{myId ? "— Use 'Me' by default —" : "— Select —"}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {myId && <button className="btn" onClick={() => setSelected(myId!)}>Use Me</button>}
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <button className="btn" onClick={() => highlight("MOTHER")}>Highlight maternal line</button>
          <button className="btn" onClick={() => highlight("FATHER")}>Highlight paternal line</button>
          <button className="btn" onClick={clearHighlight}>Clear</button>
        </div>

        {/* Mode toggle */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-neutral-500">Mode</span>
          <div className="inline-flex rounded-lg border overflow-hidden">
            {(["GRAPH","ANCESTORS"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs ${viewMode === m ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}
              >
                {m === "GRAPH" ? "Full graph" : "Ancestors only"}
              </button>
            ))}
          </div>

          {viewMode === "ANCESTORS" && (
            <div className="inline-flex rounded-lg border overflow-hidden">
              {(["MATERNAL","PATERNAL","BOTH"] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`px-3 py-1.5 text-xs ${side === s ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}
                >
                  {s === "MATERNAL" ? "Maternal" : s === "PATERNAL" ? "Paternal" : "Both"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kind filter (segmented) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Show</span>
          <div className="inline-flex rounded-lg border overflow-hidden">
            {(["BIOLOGICAL", "WHANGAI", "ALL"] as ViewKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setViewKind(k)}
                className={`px-3 py-1.5 text-xs ${
                  viewKind === k ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"
                }`}
              >
                {k === "BIOLOGICAL" ? "Biological" : k === "WHANGAI" ? "Whāngai" : "All"}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500 ml-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px] bg-[#94a3b8]" /> Biological
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px] border-t border-dashed border-[#f59e0b]" /> Whāngai
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px] bg-[#3b82f6]" /> Highlight
            </span>
          </div>
        </div>
      </div>

      {/* Relationship compute */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="text-sm text-neutral-600">
          Click nodes to pick <span className="font-semibold">A</span> then <span className="font-semibold">B</span>, or choose below:
        </div>
        <select className="input min-w-56" value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">A — Select</option>
          {options.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
        </select>
        <select className="input min-w-56" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">B — Select</option>
          {options.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
        </select>
        <button className="btn btn-primary" onClick={computeRel} disabled={!a || !b}>Compute</button>
        {rel && <div className="text-sm text-neutral-700">Result: <strong>{rel}</strong></div>}
        <div className="ml-auto text-xs text-neutral-500">Picking: <strong>{pick}</strong> These are approximations and may not reflect the actual relationship of the people selected</div>
      </div>

      {/* Canvas */}
      <div className="card p-2 h-[78vh]">
        <ReactFlowProvider>
          <GraphCanvas nodes={rfNodes} edges={rfEdges} onNodeClick={onNodeClick} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
