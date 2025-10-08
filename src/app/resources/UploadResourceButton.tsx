// src/app/resources/upload-resource-button.tsx
"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, X } from "lucide-react";

export default function UploadResourceButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<
    "pdf" | "doc" | "sheet" | "image" | "video" | "audio" | "link" | "zip" | "other"
  >("pdf");
  const isLink = kind === "link";

  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // (Optional) lock scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const form = formRef.current!;
      const fd = new FormData(form);
      const endpoint = isLink ? "/api/resources" : "/api/resources/upload";
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Upload failed (${res.status})`);
      }
      setOpen(false);
      form.reset();
      setKind("pdf");
      startTransition(() => router.refresh());
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Narrow file types by kind (optional nicety)
  const acceptForKind =
    kind === "image" ? "image/*" :
    kind === "video" ? "video/*" :
    kind === "audio" ? "audio/*" :
    kind === "pdf"   ? "application/pdf" :
    kind === "doc"   ? ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
    kind === "sheet" ? ".xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
    kind === "zip"   ? ".zip,application/zip,application/x-zip-compressed" :
    undefined;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus size={16} /> Upload
      </button>

      {open && (
        <div className="fixed inset-0 z-[12000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card text-card-foreground border border-border shadow-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] overflow-auto overscroll-contain">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Add Resource</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pt-3 pb-4 pb-[env(safe-area-inset-bottom)]">
              {err && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{err}</p>}

              <form ref={formRef} onSubmit={submit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Title</label>
                  <input
                    name="title"
                    required
                    className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">Kind</label>
                    <select
                      name="kind"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as typeof kind)}
                      className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="pdf">PDF</option>
                      <option value="doc">Doc</option>
                      <option value="sheet">Sheet</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                      <option value="link">Link</option>
                      <option value="zip">Zip</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Tags (comma-separated)</label>
                    <input
                      name="tags"
                      placeholder="e.g. reo, learning"
                      className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                {/* Input controlled by KINDS */}
                {isLink ? (
                  <div>
                    <label className="block text-sm font-medium">External URL</label>
                    <input
                      type="url"
                      name="externalUrl"
                      required
                      placeholder="https://…"
                      className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium">File</label>
                    <input
                      type="file"
                      name="file"
                      required
                      accept={acceptForKind}
                      className="mt-1 w-full rounded-md bg-card text-card-foreground border border-border px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-muted file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || isPending}
                    className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {loading || isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
