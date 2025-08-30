"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Slideshow from "./_slideshow";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf
import Image from "next/image";

// Derive a thumbnail URL for a gallery item/file
function thumbUrl(fileId: string, opts?: { w?: number; h?: number; fit?: "cover" | "contain" }) {
  const w = opts?.w ?? 96;
  const h = opts?.h ?? 72;
  const fit = opts?.fit ?? "cover";
  return `/api/files/${fileId}/thumb?w=${w}&h=${h}&fit=${fit}`;
}

// Tiny fallback placeholder (if thumb 404s)
function onThumbError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  el.onerror = null;
  el.src =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='72'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='#999'>no preview</text></svg>`
    );
}


type Slide = {
  albumItemId: string;
  galleryItemId: string;
  name: string;
  mimeType: string;
  src: string;
};
type GalleryItem = { id: string; name: string; mimeType: string; owner: string };

export default function AlbumClient({ albumId }: { albumId: string }) {
  const router = useRouter();

  const [albumName, setAlbumName] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [playing, setPlaying] = useState(false);

  // selection state
  const [selectedGallery, setSelectedGallery] = useState<string[]>([]);
  const [selectedSlides, setSelectedSlides] = useState<string[]>([]);

  // busy flags
  const [busyLoad, setBusyLoad] = useState(false);
  const [busyAdd, setBusyAdd] = useState(false);
  const [busyRemove, setBusyRemove] = useState(false);
  const [busyDeleteAlbum, setBusyDeleteAlbum] = useState(false);

  async function load() {
    setBusyLoad(true);
    try {
      const [a, g] = await Promise.all([
        fetch(`/api/albums/${albumId}`).then((r) => r.json()),
        fetch(`/api/gallery/all`).then((r) => r.json()),
      ]);
      setAlbumName(a.album?.name ?? "");
      setSlides(a.album?.slides ?? []);
      setGallery(g.items ?? []);
    } catch {
      toast.error("Failed to load album");
    } finally {
      setBusyLoad(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  // --- Add from gallery (bulk) ---
  async function addSelected() {
    if (!selectedGallery.length) return;
    setBusyAdd(true);
    try {
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch(`/api/albums/${albumId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ galleryItemIds: selectedGallery }),
      });
      if (!res.ok) throw new Error(await safeText(res));
      toast.success("Added to album");
      setSelectedGallery([]);
      await load();
    } catch (e: any) {
      toast.error("Failed to add", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusyAdd(false);
    }
  }

  // --- Remove single slide (existing behavior) ---
  async function removeItem(albumItemId: string) {
    setBusyRemove(true);
    try {
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch(`/api/albums/${albumId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ albumItemId }),
      });
      if (!res.ok) throw new Error(await safeText(res));
      setSlides((prev) => prev.filter((s) => s.albumItemId !== albumItemId));
      setSelectedSlides((prev) => prev.filter((id) => id !== albumItemId));
    } catch (e: any) {
      toast.error("Remove failed", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusyRemove(false);
    }
  }

  // --- Remove selected slides (bulk) ---
  async function removeSelected() {
    if (!selectedSlides.length) return;
    if (!confirm(`Remove ${selectedSlides.length} item(s) from this album?`)) return;

    setBusyRemove(true);
    try {
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      // Try array API first
      const res = await fetch(`/api/albums/${albumId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ albumItemIds: selectedSlides }),
      });

      if (!res.ok) {
             const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
        // Fallback to per-item deletes if server only supports single removes
        await Promise.all(
     
          selectedSlides.map((albumItemId) =>
            fetch(`/api/albums/${albumId}/items`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
              body: JSON.stringify({ albumItemId }),
            })
          )
        );
      }

      setSlides((prev) => prev.filter((s) => !selectedSlides.includes(s.albumItemId)));
      setSelectedSlides([]);
      toast.success("Removed from album");
    } catch (e: any) {
      toast.error("Bulk remove failed", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusyRemove(false);
    }
  }

  // --- Reorder (persist) ---
  async function move(albumItemId: string, delta: -1 | 1) {
    const idx = slides.findIndex((s) => s.albumItemId === albumItemId);
    if (idx < 0) return;
    const swap = idx + delta;
    if (swap < 0 || swap >= slides.length) return;

    const next = [...slides];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSlides(next);

    try {
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      await fetch(`/api/albums/${albumId}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Csrf-Token": csrf },
        body: JSON.stringify({ order: next.map((s) => s.albumItemId) }),
      });
    } catch {
      // Soft failure: keep UI order; next refresh will reconcile
    }
  }

  // --- Delete album ---
  async function deleteAlbum() {
    if (!confirm("Delete this album? This only removes the album (not your uploads).")) return;
    setBusyDeleteAlbum(true);
    try {
       const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch(`/api/albums/${albumId}`, { method: "DELETE", headers: { "X-Csrf-Token": csrf } });
      if (!res.ok) throw new Error(await safeText(res));
      toast.success("Album deleted");
      router.push("/albums");
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message?.slice(0, 200) });
    } finally {
      setBusyDeleteAlbum(false);
    }
  }

  const images = useMemo(() => slides.filter((s) => s.mimeType.startsWith("image/")), [slides]);
  const videos = useMemo(() => slides.filter((s) => s.mimeType.startsWith("video/")), [slides]);

  const allGallerySelected = selectedGallery.length === gallery.length && gallery.length > 0;
  const allSlidesSelected = selectedSlides.length === slides.length && slides.length > 0;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{albumName || "Album"}</h1>
            <p className="">
              {slides.length} items • {images.length} images • {videos.length} videos
            </p>
          </div>
          <button
            className="btn btn-outline text-rose-600"
            onClick={deleteAlbum}
            disabled={busyDeleteAlbum || busyLoad}
            title="Delete album"
          >
            {busyDeleteAlbum ? "Deleting…" : "Delete album"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Add from gallery */}
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Add items from gallery</h2>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              className="btn"
              onClick={() => setSelectedGallery(gallery.map((g) => g.id))}
              disabled={busyAdd || busyLoad || allGallerySelected}
            >
              Select all
            </button>
            <button
              className="btn"
              onClick={() => setSelectedGallery([])}
              disabled={busyAdd || busyLoad || selectedGallery.length === 0}
            >
              Clear
            </button>
            <button
              className="btn btn-primary"
              onClick={addSelected}
              disabled={busyAdd || busyLoad || selectedGallery.length === 0}
            >
              {busyAdd ? "Adding…" : `Add selected (${selectedGallery.length})`}
            </button>
          </div>

          <div className="max-h-[360px] overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left ">
                  <th className="p-2 w-10">
                    <input
                      aria-label="toggle all"
                      type="checkbox"
                      checked={allGallerySelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGallery(gallery.map((g) => g.id));
                        else setSelectedGallery([]);
                      }}
                    />
                  </th>
                  <th className="p-2 w-20">Thumb</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {gallery.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedGallery.includes(item.id)}
                        onChange={(e) =>
                          setSelectedGallery((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                          )
                        }
                      />
                    </td>
                     <td className="p-2">
     <Image
         src={thumbUrl(item.id)}
         alt=""
         width={96}
         height={72}
         loading="lazy"
         className="h-12 w-16 object-cover rounded border"
         onError={onThumbError}
         unoptimized // (optional if you’re proxying/transforming already)
       />
     </td>
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.mimeType}</td>
                    <td className="p-2">{item.owner}</td>
                  </tr>
                ))}
                {gallery.length === 0 && (
                  <tr>
                    <td className="p-4 " colSpan={4}>
                      No uploads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Album items / order */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Album items (order)</h2>
            <div className="flex gap-2">
              <button
                className="btn"
                onClick={() => setSelectedSlides(slides.map((s) => s.albumItemId))}
                disabled={busyRemove || busyLoad || allSlidesSelected || slides.length === 0}
              >
                Select all
              </button>
              <button
                className="btn"
                onClick={() => setSelectedSlides([])}
                disabled={busyRemove || busyLoad || selectedSlides.length === 0}
              >
                Clear
              </button>
              <button
                className="btn text-rose-600"
                onClick={removeSelected}
                disabled={busyRemove || busyLoad || selectedSlides.length === 0}
                title="Remove selected from album"
              >
                {busyRemove ? "Removing…" : `Remove selected (${selectedSlides.length})`}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setPlaying(true)}
                disabled={busyLoad || slides.length === 0}
              >
                Start slideshow
              </button>
            </div>
             {selectedGallery.length > 0 && (
   <div className="mb-3 flex flex-wrap gap-2">
     {selectedGallery.slice(0, 20).map((id) => (
       <Image
         key={id}
         src={thumbUrl(id, { w: 64, h: 64 })}
         alt=""
         width={64}
         height={64}
         className="h-16 w-16 object-cover rounded border"
         onError={onThumbError}
         title="Selected"
         unoptimized
       />
     ))}
     {selectedGallery.length > 20 && (
       <span className="self-center text-xs text-neutral-500">
         {selectedGallery.length - 20} more
       </span>
     )}
   </div>
 )}
          </div>

          <div className="max-h-[360px] overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left ">
                  <th className="p-2 w-10">
                    <input
                      aria-label="toggle all slides"
                      type="checkbox"
                      checked={allSlidesSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSlides(slides.map((s) => s.albumItemId));
                        else setSelectedSlides([]);
                      }}
                    />
                  </th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slides.map((s) => (
                  <tr key={s.albumItemId} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedSlides.includes(s.albumItemId)}
                        onChange={(e) =>
                          setSelectedSlides((prev) =>
                            e.target.checked
                              ? [...prev, s.albumItemId]
                              : prev.filter((id) => id !== s.albumItemId)
                          )
                        }
                      />
                    </td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.mimeType}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button className="btn" onClick={() => move(s.albumItemId, -1)} disabled={busyLoad}>
                          ↑
                        </button>
                        <button className="btn" onClick={() => move(s.albumItemId, +1)} disabled={busyLoad}>
                          ↓
                        </button>
                        <button
                          className="btn text-rose-600"
                          onClick={() => removeItem(s.albumItemId)}
                          disabled={busyRemove}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slides.length === 0 && (
                  <tr>
                    <td className="p-4 " colSpan={4}>
                      No items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {playing && (
        <Slideshow
          items={slides.map((s) => ({
            src: s.src,
            title: s.name,
            type: s.mimeType.startsWith("video/") ? "video" : "image",
          }))}
          onClose={() => setPlaying(false)}
        />
      )}
    </div>
  );
}

// Utility to read response text safely
async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
