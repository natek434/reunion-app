"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- fetches/sets csrf cookie & returns token
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";


type ItemStatus = "queued" | "uploading" | "done" | "error";
type UploadItem = {
  id: string;
  file: File;
  size: number;
  percent: number; // 0-100
  status: ItemStatus;
  error?: string;
};

const CONCURRENCY = 3;

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function Dashboard() {
    const session = useSession();
    if (session.status != "authenticated") redirect("/signin"); // keep if you want sign-in required
    

  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);

  const overall = useMemo(() => {
    const total = items.reduce((s, it) => s + it.size, 0);
    const loaded = items.reduce((s, it) => s + it.size * (it.percent / 100), 0);
    const pct = total ? Math.round((loaded / total) * 100) : 0;
    const completed = items.filter((i) => i.status === "done").length;
    const errors = items.filter((i) => i.status === "error").length;
    return { pct, completed, totalCount: items.length, errors };
  }, [items]);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => ({
      id: uid(),
      file: f,
      size: f.size,
      percent: 0,
      status: "queued" as ItemStatus,
    }));
    setItems((prev) => [...prev, ...next]);
  }

  function setProgress(id: string, percent: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, percent } : it)));
  }

  function setStatus(id: string, status: ItemStatus, error?: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, error } : it)));
  }

  // Pass the token in for each upload
  function uploadOne(it: UploadItem, csrf: string) {
    return new Promise<void>((resolve) => {
      const fd = new FormData();
      fd.append("file", it.file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.responseType = "text";

      // 🔐 CSRF header (cookie already set by /api/csrf)
      xhr.setRequestHeader("X-CSRF-Token", csrf);
      // If your API might be on a subdomain, this keeps cookies attached
      // (harmless for same-origin):
      xhr.withCredentials = true;

      setStatus(it.id, "uploading");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(it.id, Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(it.id, 100);
          setStatus(it.id, "done");
          toast.success("Uploaded", { description: it.file.name });
        } else {
          const msg = xhr.responseText || `HTTP ${xhr.status}`;
          setStatus(it.id, "error", msg);
          toast.error("Upload failed", { description: `${it.file.name} — ${msg}` });
        }
        resolve();
      };

      xhr.onerror = () => {
        setStatus(it.id, "error", "Network error");
        toast.error("Upload error", { description: it.file.name });
        resolve();
      };

      xhr.send(fd);
    });
  }

  async function startUploads() {
    if (!items.some((i) => i.status === "queued")) return;
    setRunning(true);

    // Get/refresh token once for this batch
    const csrf = await ensureCsrfToken();
    if (!csrf) {
      toast.error("Missing CSRF token. Refresh the page and try again.");
      setRunning(false);
      return;
    }

    const queue = [...items.filter((i) => i.status === "queued")];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
      workers.push(
        (async function worker() {
          while (queue.length) {
            const next = queue.shift();
            if (!next) break;
            await uploadOne(next, csrf);
          }
        })()
      );
    }

    await Promise.all(workers);
    setRunning(false);
  }

  function clearAll() {
    if (running) return; // avoid nuking while uploading
    setItems([]);
  }

  function retryErrors() {
    if (running) return;
    setItems((prev) =>
      prev.map((it) =>
        it.status === "error" ? { ...it, status: "queued", percent: 0, error: undefined } : it
      )
    );
    // auto-start
    setTimeout(() => startUploads(), 0);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold mb-2">Upload to family gallery</h1>
        <p className="text-sm mb-4">
          Select multiple images/videos. We’ll upload up to {CONCURRENCY} at a time.
        </p>

        <input
          className="input"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => addFiles(e.target.files)}
        />

        {items.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1 text-sm">
              <span>
                Overall progress ({overall.completed}/{overall.totalCount})
              </span>
              <span>{overall.pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full bg-black transition-[width] duration-150"
                style={{ width: `${overall.pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button
            className="btn btn-primary"
            disabled={running || items.length === 0}
            onClick={startUploads}
          >
            {running ? "Uploading…" : "Start uploads"}
          </button>

          <button className="btn" disabled={running || items.length === 0} onClick={clearAll}>
            Clear all
          </button>

          {overall.errors > 0 && (
            <button className="btn" disabled={running} onClick={retryErrors}>
              Retry errors
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 text-white text-[11px] px-1">
                {overall.errors}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-3">Queue</h2>
        {items.length === 0 ? (
          <p>No files queued.</p>
        ) : (
          <ul className="space-y-3 max-h-[28rem] overflow-auto pr-1">
            {items.map((it) => (
              <li key={it.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate">{it.file.name}</div>
                  <div className="text-xs">{(it.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      it.status === "error" ? "bg-red-600" : "bg-black"
                    }`}
                    style={{ width: `${it.percent}%` }}
                  />
                </div>
                <div className="mt-1 text-xs">
                  {it.status}
                  {it.error ? ` — ${it.error}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
