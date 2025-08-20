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

/* ---------- Node sizing ---------- */
const NODE_W = 220;
const NODE_H = 72;

/* ---------- Palette (light/dark friendly) ---------- */
const COLOR = {
  gender: {
    MALE: "#3b82f6",      // blue-500
    FEMALE: "#ec4899",    // pink-500
    OTHER: "#a78bfa",     // violet-400/500
    UNKNOWN: "#94a3b8",   // slate-400
  },
  edge: {
    biological: "#94a3b8",
    whangai: "#f59e0b",
    highlight: "#3b82f6",
  },
  chipLockBg: (accent: string) => `color-mix(in oklab, ${accent} 16%, transparent)`,
  chipLockFg: (accent: string) => `color-mix(in oklab, ${accent} 90%, #111)`,
};

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
        {data.birthDate && (
          <div className="flex justify-between">
            <dt>Born</dt>
            <dd>{new Date(data.birthDate).toLocaleDateString()}</dd>
          </div>
        )}
        {data.notes && <div className="mt-1">{data.notes}</div>}
      </dl>
    </div>,
    document.body
  );
}

/* ---------- Gendered person node ---------- */
function PersonNode({ data }: { data: GNode & { isMe?: boolean; highlighted?: boolean } }) {
  const initial = (data.label || "?").charAt(0).toUpperCase();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const accent =
    COLOR.gender[(data.gender || "UNKNOWN") as keyof typeof COLOR.gender] || COLOR.gender.UNKNOWN;

  // Show birthdate if present, otherwise a notes snippet
  const dob = data.birthDate ? new Date(data.birthDate).toLocaleDateString() : null;
  const subline = dob ?? (data.notes || "");

  const borderColor =
    data.highlighted ? COLOR.edge.highlight : data.isMe ? "#22c55e" : data.locked ? "#f59e0b" : "var(--border)";
  const ringShadow =
    data.highlighted
      ? "0 0 0 2px rgba(59,130,246,.35)"
      : data.isMe
      ? "0 0 0 2px rgba(34,197,94,.35)"
      : undefined;

  return (
    <>
      <div
        ref={wrapRef}
        className="rounded-xl border shadow-sm"
        style={{
          width: NODE_W,
          height: NODE_H,
          background: "var(--card)",
          borderColor,
          boxShadow: ringShadow,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
          position: "relative",
        }}
        onMouseEnter={() => setHoverRect(wrapRef.current?.getBoundingClientRect() || null)}
        onMouseLeave={() => setHoverRect(null)}
      >
        {/* gender accent rail */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: 4,
            borderRadius: "12px 0 0 12px",
            background: accent,
          }}
        />

        {/* reactflow handles */}
        <Handle id="from-parent" type="target" position={Position.Top} style={{ background: "#64748b" }} />
        <Handle id="to-child" type="source" position={Position.Bottom} style={{ background: "#64748b" }} />

        {/* avatar */}
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover border"
            style={{
              boxShadow: `0 0 0 2px color-mix(in oklab, ${accent} 55%, transparent)`,
              borderColor: `color-mix(in oklab, ${accent} 35%, var(--border))`,
            }}
          />
        ) : (
          <div
            className="h-9 w-9 rounded-full grid place-items-center text-sm border"
            style={{
              background: "rgba(0,0,0,.06)",
              color: "var(--foreground)",
              boxShadow: `0 0 0 2px color-mix(in oklab, ${accent} 40%, transparent)`,
              borderColor: `color-mix(in oklab, ${accent} 35%, var(--border))`,
            }}
          >
            {initial}
          </div>
        )}

        {/* text */}
        <div className="min-w-0">
          <div className="truncate font-medium" style={{ color: "var(--card-foreground)" }}>
            {data.label}
          </div>
          <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
            {subline}
            {data.locked && (
              <span
                className="ml-1"
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 9999,
                  background: COLOR.chipLockBg(accent),
                  color: COLOR.chipLockFg(accent),
                }}
              >
                locked
              </span>
            )}
          </div>
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

// WHĀNGAI-FIRST SELECTOR (per-role)
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
        list.find((x) => (x.kind ?? "BIOLOGICAL") === "WHANGAI") ??
        list.find((x) => (x.kind ?? "BIOLOGICAL") === "BIOLOGICAL") ??
        null;
      if (chosen) out.push(chosen);
    } else {
      const chosen = list.find((x) => (x.kind ?? "BIOLOGICAL") === "BIOLOGICAL") ?? null;
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

// Ancestors ascent for one or both sides
function ascendLine(
  startId: string,
  parentsOf: Map<string, Array<{ parentId: string; role?: GEdge["role"] }>>,
  which: "MOTHER" | "FATHER" | "ANY",
  maxDepth = 12
) {
  const nodes = new Set<string>([startId]);
  const edges = new Set<string>();
  let cur = startId;
  let depth = 0;
  while (depth < maxDepth) {
    const ps = parentsOf.get(cur) || [];
    const pref =
      which === "ANY"
        ? ps.find((p) => p.role === "MOTHER") || ps.find((p) => p.role === "FATHER") || ps[0]
        : ps.find((p) => p.role === which);
    if (!pref) break;
    nodes.add(pref.parentId);
    edges.add(`${pref.parentId}->${cur}`);
    cur = pref.parentId;
    depth++;
  }
  return { nodes, edges };
}

/* ---------- Edge styling helpers ---------- */
const edgeStyleFor = (isWhangai: boolean, hi: boolean) => {
  const color = hi
    ? COLOR.edge.highlight
    : isWhangai
    ? COLOR.edge.whangai
    : COLOR.edge.biological;
  return {
    stroke: color,
    strokeWidth: hi ? 3 : 1.8,
    strokeDasharray: isWhangai && !hi ? "6 3" : undefined,
    strokeLinecap: "round" as const,
    strokeOpacity: hi ? 1 : 0.95,
  };
};

const makeEdges = (list: GEdge[], hiEdges: Set<string>, viewFilter?: { edges: Set<string> }): Edge[] => {
  const edges = list.map((e) => {
    const isWhangai = e.kind === "WHANGAI";
    const hi = hiEdges.has(`${e.source}->${e.target}`);
    const style = edgeStyleFor(isWhangai, hi);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      data: { type: "parent", role: e.role },
      style,
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke as string },
    } as Edge;
  });
  return viewFilter ? edges.filter((e) => viewFilter.edges.has(`${e.source}->${e.target}`)) : edges;
};

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
  // inside GraphCanvas() just above the return
const TREE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>
  <g stroke='#475569' stroke-opacity='0.07' fill='none' stroke-linecap='round' stroke-linejoin='round' stroke-width='4'>
    <!-- trunk -->
    <path d='M400 560 C402 480 402 440 400 320' />
    <!-- main branches -->
    <path d='M400 420 C360 380 340 340 320 300' />
    <path d='M400 420 C440 380 460 340 480 300' />
    <!-- secondary branches left -->
    <path d='M320 300 C300 270 280 240 250 220' />
    <path d='M340 340 C315 310 300 285 280 260' />
    <!-- secondary branches right -->
    <path d='M480 300 C500 270 520 240 550 220' />
    <path d='M460 340 C485 310 500 285 520 260' />
    <!-- twigs -->
    <path d='M250 220 C235 210 225 200 210 195' />
    <path d='M550 220 C565 210 575 200 590 195' />
  </g>
</svg>`;
const TREE_BG_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TREE_SVG)}`;

const RF_STYLE: React.CSSProperties = {
  backgroundColor: "var(--background)",
  backgroundImage: `url("${TREE_BG_DATA_URL}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center 18%",
  backgroundSize: "min(780px, 90%)",
};

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15 }), 0);    
    return () => clearTimeout(t);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      style={RF_STYLE}
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
  const visibleParentEdges = useMemo(() => selectEdgesForView(rawEdges, viewKind), [rawEdges, viewKind]);

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

    const nodes = new Set<string>();
    const edges = new Set<string>();
    for (const s of sets) {
      s.nodes.forEach((n) => nodes.add(n));
      s.edges.forEach((e) => edges.add(e));
    }
    nodes.add(focus); // ensure focus visible
    return { nodes, edges };
  }, [viewMode, side, selected, myId, parentsOfKindAware]);

  const rfNodes: Node[] = useMemo(() => {
    const allNodes: Node[] = rawNodes.map((n) => ({
      id: n.id,
      type: "person",
      data: { ...n, isMe: myId === n.id, highlighted: hiNodes.has(n.id) },
      position: { x: 0, y: 0 },
    }));

    // Edges are made with helper (to ensure identical styles)
    const allEdges = makeEdges(visibleParentEdges, hiEdges);

    if (viewMode === "ANCESTORS" && ancestorFilter) {
      const { nodes, edges } = ancestorFilter;
      const fn = allNodes.filter((n) => nodes.has(n.id));
      const fe = makeEdges(visibleParentEdges, hiEdges, { edges });
      return layoutGraph(fn, fe);
    }

    return layoutGraph(allNodes, allEdges);
  }, [rawNodes, visibleParentEdges, hiNodes, hiEdges, myId, viewMode, ancestorFilter]);

  const rfEdges: Edge[] = useMemo(
    () => makeEdges(visibleParentEdges, hiEdges, viewMode === "ANCESTORS" ? ancestorFilter ?? undefined : undefined),
    [visibleParentEdges, hiEdges, viewMode, ancestorFilter]
  );

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
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 mb-1">Person</label>
          <div className="flex gap-2">
            <select className="input min-w-56" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{myId ? "— Use 'Me' by default —" : "— Select —"}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {myId && (
              <button className="btn" onClick={() => setSelected(myId!)}>
                Use Me
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <button className="btn" onClick={() => highlight("MOTHER")}>
            Highlight maternal line
          </button>
          <button className="btn" onClick={() => highlight("FATHER")}>
            Highlight paternal line
          </button>
          <button className="btn" onClick={clearHighlight}>
            Clear
          </button>
        </div>

        {/* Mode toggle */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-neutral-500">Mode</span>
          <div className="inline-flex rounded-lg border overflow-hidden">
            {(["GRAPH", "ANCESTORS"] as ViewMode[]).map((m) => (
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
              {(["MATERNAL", "PATERNAL", "BOTH"] as Side[]).map((s) => (
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

        {/* Kind filter (segmented) + Legend */}
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
          <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-500 ml-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR.gender.MALE }} /> Male
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR.gender.FEMALE }} /> Female
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR.gender.OTHER }} /> Other/Unknown
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px]" style={{ background: COLOR.edge.biological }} /> Biological
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px] border-t border-dashed" style={{ borderColor: COLOR.edge.whangai }} /> Whāngai
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-5 h-[2px]" style={{ background: COLOR.edge.highlight }} /> Highlight
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
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select className="input min-w-56" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">B — Select</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={computeRel} disabled={!a || !b}>
          Compute
        </button>
        {rel && (
          <div className="text-sm text-neutral-700">
            Result: <strong>{rel}</strong>
          </div>
        )}
        <div className="ml-auto text-xs text-neutral-500">
          Picking: <strong>{pick}</strong> These are approximations and may not reflect the actual relationship of the people selected
        </div>
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
