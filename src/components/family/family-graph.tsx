"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PersonDTO, ParentChildEdgeDTO, PartnershipDTO } from "./my-family-dashboard";

export default function FamilyGraph({
  people,
  parentChild,
  partnerships,
  onSelectNode,
  selectedId, // NEW: highlight selection
}: {
  people: PersonDTO[];
  parentChild: ParentChildEdgeDTO[];
  partnerships: PartnershipDTO[];
  onSelectNode?: (id: string) => void;
  selectedId?: string | null;
}) {
  const nodes = useMemo(() => {
    const sorted = [...people].sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
    return sorted.map((p, i) => {
      const label = p.displayName || `${p.firstName} ${p.lastName ?? ""}`.trim();
      return {
        id: p.id,
        label,
        // Slightly tighter, more even spacing
        x: (i % 7) * 160 + 80,
        y: Math.floor(i / 7) * 110 + 70,
      };
    });
  }, [people]);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const edges = useMemo(() => {
    const e1 = parentChild.map(e => ({ from: e.parentId, to: e.childId, kind: "pc" as const }));
    const e2 = partnerships.map(e => ({ from: e.aId, to: e.bId, kind: "pp" as const }));
    return [...e1, ...e2].filter(e => nodeMap[e.from] && nodeMap[e.to]);
  }, [parentChild, partnerships, nodeMap]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = c.clientWidth; c.height = c.clientHeight;
    const g = c.getContext("2d"); if (!g) return;

    g.clearRect(0, 0, c.width, c.height);
    g.lineWidth = 1.25;

    // Nicer edges: soft color, slight curve
    edges.forEach(e => {
      const a = nodeMap[e.from], b = nodeMap[e.to];
      g.beginPath();
      g.strokeStyle = e.kind === "pc" ? "rgba(100,100,100,0.7)" : "rgba(0,120,140,0.7)";
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 - 20; // small arc
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(midX, midY, b.x, b.y);
      g.stroke();
    });
  }, [edges, nodeMap]);

  return (
    <div className="relative border rounded-md h-[440px] overflow-hidden bg-white">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {nodes.map(n => {
        const isSelected = selectedId === n.id;
        return (
          <button
            key={n.id}
            className={[
              "absolute -translate-x-1/2 -translate-y-1/2",
              "px-2.5 py-1.5 text-xs rounded-full border shadow-sm bg-white/95 hover:bg-white",
              isSelected ? "ring-2 ring-emerald-500 border-emerald-500 font-semibold" : "border-zinc-300"
            ].join(" ")}
            style={{ left: n.x, top: n.y }}
            onClick={() => onSelectNode?.(n.id)}
            title={n.label}
          >
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
