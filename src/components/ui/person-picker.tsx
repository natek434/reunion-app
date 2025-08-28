"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type PersonOption = {
  id: string;
  displayName: string;
  gender?: Gender | null;
  birthDate?: string | null;
};

async function searchMembers(q: string): Promise<PersonOption[]> {
  if (!q.trim()) return [];
  const r = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  const rows = (await r.json()) as PersonOption[];
  return rows.map((x) => ({
    ...x,
    displayName:
      x.displayName && x.displayName.trim().length
        ? x.displayName
        : "(unnamed)",
  }));
}

export default function PersonPicker({
  label,
  value,
  onChange,
  placeholder = "Search members…",
  allowCreate = true,
  className = "",
}: {
  label: string;
  value: PersonOption | null;
  onChange: (opt: PersonOption | null) => void;
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState(value?.displayName ?? "");
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<PersonOption[]>([]);
  const [idx, setIdx] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // fetch with debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      const rows = await searchMembers(q);
      setOpts(rows);
      setOpen(rows.length > 0 || (allowCreate && q.trim().length > 0));
      setIdx(rows.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(t);
  }, [q, allowCreate]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(opt: PersonOption | null) {
    onChange(opt);
    if (opt) setQ(opt.displayName);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, opts.length - 1 + (allowCreate && q.trim() ? 1 : 0) - 1));
      scrollIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
      scrollIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (idx >= 0 && idx < opts.length) {
        choose(opts[idx]);
      } else if (allowCreate && q.trim().length > 0) {
        createInline();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function scrollIntoView() {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  async function createInline() {
    // super-minimal inline create: firstName = q (you can expand if needed)
    const [firstName, ...rest] = q.trim().split(" ");
    const lastName = rest.join(" ") || null;
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        gender: "UNKNOWN",
        birthDate: null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return;
    const opt: PersonOption = {
      id: data.personId,
      displayName: [firstName, lastName].filter(Boolean).join(" "),
    };
    choose(opt);
  }

  const showCreate = allowCreate && q.trim().length > 0;

  return (
    <div className={`grid gap-1 ${className}`}>
      <label className="text-xs ">{label}</label>

      <div ref={wrapRef} className="relative">
        <div className="flex gap-2">
          <input
            className="input w-full"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen((opts.length > 0) || showCreate)}
            onKeyDown={onKey}
            autoComplete="off"
          />
          {value && (
            <button className="btn" onClick={() => choose(null)} title="Clear selection">
              Clear
            </button>
          )}
        </div>

        {open && (
          <div
            ref={listRef}
            className="absolute left-0 right-0 mt-1 max-h-64 overflow-auto rounded-md border shadow-lg z-50
                       bg-white text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {opts.map((o, i) => (
              <button
                key={o.id}
                data-idx={i}
                onClick={() => choose(o)}
                className={`w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                  i === idx ? "bg-neutral-50 dark:bg-neutral-800" : ""
                }`}
              >
                <div className="font-medium">{o.displayName}</div>
                <div className="text-xs ">
                  {o.gender ?? ""} {o.birthDate ? `• ${new Date(o.birthDate).toLocaleDateString()}` : ""}
                </div>
              </button>
            ))}

            {showCreate && (
              <button
                data-idx={opts.length} // last index for keyboard nav
                onClick={createInline}
                className={`w-full text-left px-3 py-2 border-t hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                  idx === opts.length ? "bg-neutral-50 dark:bg-neutral-800" : ""
                }`}
              >
                + Create “{q.trim()}”
              </button>
            )}

            {opts.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-sm ">No matches</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
