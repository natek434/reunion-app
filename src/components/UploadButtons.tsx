// src/components/UploadButtons.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

export default function UploadButtons() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Keep screen awake during uploads (best effort)
  useEffect(() => {
    async function acquire() {
      try {
        // @ts-ignore
        if ("wakeLock" in navigator && busy) {
          // @ts-ignore
          const lock = await navigator.wakeLock.request("screen");
          setWakeLock(lock);
          lock.addEventListener?.("release", () => setWakeLock(null));
        }
      } catch {}
    }
    acquire();
    return () => wakeLock?.release?.().catch(() => {});
  }, [busy]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      // You already have /api/upload that supports multiple; if not, loop.
      const fd = new FormData();
      // Multiple upload: append all under "files"
      Array.from(files).forEach((f) => fd.append("files", f));

      const res = await fetch("/api/upload-multi", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Uploaded!");
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message?.slice(0, 160) });
    } finally {
      setBusy(false);
      // reset inputs so selecting same file again re-triggers change
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"      // iOS: open camera
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Visible buttons */}
      <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Choose from Photos/Files"}
      </button>
      <button className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Take photo/video"}
      </button>
    </div>
  );
}
