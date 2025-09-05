// src/components/family/family-graph.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PersonDTO, ParentChildEdgeDTO, PartnershipDTO } from "./my-family-dashboard";

export default function FamilyGraph({
  people, parentChild, partnerships, onSelectNode,
}: {
  people: PersonDTO[];
  parentChild: ParentChildEdgeDTO[];
  partnerships: PartnershipDTO[];
  onSelectNode?: (id: string) => void;
}) {
  // Very simple layout (grid-ish): keeps it dependency-free.
  const nodes = useMemo(() => {
    const sorted = [...people].sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
    return sorted.map((p, i) => ({
      id: p.id,
      label: p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim(),
      x: (i % 6) * 180 + 40,
      y: Math.floor(i / 6) * 120 + 40,
    }));
  }, [people]);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const edges = useMemo(() => {
    const e1 = parentChild.map(e => ({ from: e.parentId, to: e.childId, kind: "pc" as const }));
    const e2 = partnerships.map(e => ({ from: e.aId, to: e.bId, kind: "pp" as const }));
    return [...e1, ...e2].filter(e => nodeMap[e.from] && nodeMap[e.to]);
  }, [parentChild, partnerships, nodeMap]);

  // Canvas lines
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = c.clientWidth; c.height = c.clientHeight;
    const g = c.getContext("2d"); if (!g) return;
    g.clearRect(0, 0, c.width, c.height);
    g.lineWidth = 1.5;
    edges.forEach(e => {
      const a = nodeMap[e.from], b = nodeMap[e.to];
      g.beginPath();
      g.strokeStyle = e.kind === "pc" ? "#888" : "#0aa";
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    });
  }, [edges, nodeMap]);

  return (
    <div className="relative border rounded-md h-[420px] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {nodes.map(n => (
        <button
          key={n.id}
          className="absolute px-2 py-1 text-xs bg-white/90 border rounded shadow"
          style={{ left: n.x - 50, top: n.y - 12 }}
          onClick={() => onSelectNode?.(n.id)}
          title={n.id}
        >
          {n.label || n.id}
        </button>
      ))}
    </div>
  );
}
