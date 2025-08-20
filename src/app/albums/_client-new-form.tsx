"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewAlbumForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create album");
      toast.success("Album created");
      router.push(`/albums/${data.album.id}`);
    } catch (e: any) {
      toast.error("Create failed", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card p-4 grid gap-2 max-w-lg" onSubmit={createAlbum}>
      <div className="font-semibold">Create album</div>
      <input
        className="input"
        placeholder="Album name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="input"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button className="btn btn-primary w-fit" disabled={busy || name.trim().length === 0}>
        {busy ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
