// src/app/resources/resources-client.tsx
"use client";

import { useMemo, useState } from "react";
import type { Resource, ResourceKind } from "./page";
import ResourceCard from "./resource-card";
import { Search, Filter, X } from "lucide-react";

const ALL_KINDS: { key: ResourceKind; label: string }[] = [
  { key: "pdf", label: "PDF" },
  { key: "doc", label: "Doc" },
  { key: "sheet", label: "Sheet" },
  { key: "image", label: "Image" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "link", label: "Link" },
  { key: "zip", label: "Zip" },
  { key: "other", label: "Other" },
];

export default function ResourcesClient({ initialItems }: { initialItems: Resource[] }) {
  const [q, setQ] = useState("");
  const [activeKinds, setActiveKinds] = useState<ResourceKind[]>([]);
  const allTags = useMemo(
    () => Array.from(new Set(initialItems.flatMap((r) => r.tags || []))).sort(),
    [initialItems]
  );
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const visible = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return initialItems.filter((r) => {
      if (activeKinds.length && !activeKinds.includes(r.kind)) return false;
      if (activeTags.length && !activeTags.every(t => (r.tags || []).includes(t))) return false;
      if (!qn) return true;
      const hay = `${r.title} ${r.description || ""} ${(r.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(qn);
    });
  }, [initialItems, q, activeKinds, activeTags]);

  const toggleKind = (k: ResourceKind) =>
    setActiveKinds((ks) => (ks.includes(k) ? ks.filter(x => x !== k) : [...ks, k]));

  const toggleTag = (t: string) =>
    setActiveTags((ts) => (ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]));

  const clearFilters = () => {
    setActiveKinds([]);
    setActiveTags([]);
    setQ("");
  };

  return (
    <section>
      {/* Controls */}
      <div className="mb-6 rounded-xl border border-border bg-card text-card-foreground p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-card text-card-foreground">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, description, tags…"
              className="outline-none w-64 bg-transparent text-foreground placeholder:text-muted-foreground"
              aria-label="Search resources"
            />
          </label>

          {/* Kind filter */}
          <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs uppercase text-muted-foreground">
              <Filter size={14} /> Types:
            </span>
            {ALL_KINDS.map(({ key, label }) => {
              const on = activeKinds.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleKind(key)}
                 className={`text-xs px-2 py-1 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    on
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                  aria-pressed={on}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs uppercase text-zinc-500">Tags:</span>
            {allTags.map((t) => {
              const on = activeTags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2 py-1 rounded-full border transition ${
                    on ? "bg-black text-white" : "bg-white hover:bg-zinc-100"
                  }`}
                  aria-pressed={on}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Clear */}
          <button
            onClick={clearFilters}
className="inline-flex items-center gap-1 text-xs rounded-md border border-border px-3 py-2 bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Clear filters"
          >
            <X size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <ResourceCard key={r.id} res={r} />
          ))}
        </div>
      )}
    </section>
  );
}
