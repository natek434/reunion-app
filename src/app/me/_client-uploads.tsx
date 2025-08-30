"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

type UploadItem = {
  id: string;
  name: string;
  mimeType: string;
};

export default function ClientUploads({ initial }: { initial: UploadItem[] }) {
  const [items, setItems] = useState<UploadItem[]>(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const allSelected = useMemo(
    () => items.length > 0 && selected.length === items.length,
    [items.length, selected.length]
  );

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleAll(on: boolean) {
    setSelected(on ? items.map((i) => i.id) : []);
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Permanently delete ${selected.length} upload(s)? This cannot be undone.`)) return;

    setBusy(true);
    try {
       const csrf = await ensureCsrfToken();
                if (!csrf) {
                  toast.error("Missing CSRF token. Please refresh the page and try again.");
                  return;
                }
      const res = await fetch("/api/gallery/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Bulk delete failed");

      setItems((prev) => prev.filter((i) => !selected.includes(i.id)));
      setSelected([]);
      toast.success(`Deleted ${data?.deleted ?? selected.length} item(s)`);
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My uploads</h1>

        <div className="flex gap-2">
          <button
            className="btn"
            disabled={busy || items.length === 0 || allSelected}
            onClick={() => toggleAll(true)}
            title="Select all"
          >
            Select all
          </button>
          <button
            className="btn"
            disabled={busy || selected.length === 0}
            onClick={() => toggleAll(false)}
            title="Clear selection"
          >
            Clear
          </button>
          <button
            className="btn text-rose-600"
            disabled={busy || selected.length === 0}
            onClick={bulkDelete}
            title="Delete selected"
          >
            {busy ? "Deleting…" : `Delete selected (${selected.length})`}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="">You have no uploads yet.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it) => {
            const isImg = it.mimeType.startsWith("image/");
            const isVideo = it.mimeType.startsWith("video/");
            const thumb = isImg
              ? `/api/files/${it.id}/thumb?w=480`
              : `/api/files/${it.id}`;

            return (
              <li key={it.id} className="border rounded-xl overflow-hidden">
                <label className="block cursor-pointer">
                  <div className="relative">
                   {isImg && thumb ? (
  <Image
    src={thumb}
    alt={it.name ?? ""}
    width={640}
    height={320}
    className="w-full h-48 object-cover"
    unoptimized // (optional if you’re proxying/transforming already)
  />
                    ) : isVideo ? (
                      <video
                        className="w-full h-48 object-cover"
                        preload="metadata"
                        src={thumb}
                        // controls // (omit controls in grid to keep it clean)
                      />
                    ) : (
                      <div className="w-full h-48 grid place-items-center text-sm ">
                        {it.name}
                      </div>
                    )}

                    <input
                      type="checkbox"
                      className="absolute top-2 left-2 h-5 w-5 accent-blue-600"
                      checked={selected.includes(it.id)}
                      onChange={(e) => toggleOne(it.id, e.target.checked)}
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="text-sm truncate" title={it.name}>
                      {it.name}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
