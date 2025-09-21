"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link as LinkIcon, X } from "lucide-react";

export default function UploadResourceButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const form = formRef.current!;
      const fd = new FormData(form);
      const endpoint = mode === "file" ? "/api/resources/upload" : "/api/resources";
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Upload failed (${res.status})`);
      }
      setOpen(false);
      form.reset();

      // Revalidate server components without passing a callback down
      startTransition(() => router.refresh());
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-black text-white px-3 py-2 text-sm hover:bg-black/90"
      >
        <Plus size={16} /> Upload
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Resource</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setMode("file")}
                  className={`text-sm px-3 py-1.5 rounded border ${mode === "file" ? "bg-black text-white" : "bg-white hover:bg-zinc-100"}`}
                >
                  <Upload size={14} className="inline mr-1" /> File
                </button>
                <button
                  onClick={() => setMode("link")}
                  className={`text-sm px-3 py-1.5 rounded border ${mode === "link" ? "bg-black text-white" : "bg-white hover:bg-zinc-100"}`}
                >
                  <LinkIcon size={14} className="inline mr-1" /> External link
                </button>
              </div>

              {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

              <form ref={formRef} onSubmit={submit} className="space-y-3 pb-4">
                <div>
                  <label className="block text-sm font-medium">Title</label>
                  <input name="title" required className="mt-1 w-full rounded border px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium">Description</label>
                  <textarea name="description" rows={3} className="mt-1 w-full rounded border px-3 py-2" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">Kind</label>
                    <select name="kind" className="mt-1 w-full rounded border px-3 py-2" defaultValue="pdf">
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
                    <input name="tags" placeholder="e.g. reo, learning" className="mt-1 w-full rounded border px-3 py-2" />
                  </div>
                </div>

                {mode === "file" ? (
                  <div>
                    <label className="block text-sm font-medium">File</label>
                    <input type="file" name="file" required className="mt-1 w-full rounded border px-3 py-2" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium">External URL</label>
                    <input type="url" name="externalUrl" required placeholder="https://…" className="mt-1 w-full rounded border px-3 py-2" />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-100">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || isPending}
                    className="rounded-md bg-black text-white px-3 py-2 text-sm hover:bg-black/90 disabled:opacity-50"
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
