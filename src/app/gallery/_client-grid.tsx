"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  mimeType: string;
  owner?: string;
  createdAt?: string;
};

export default function GalleryGrid({
  initialItems,
  initialCursor,
}: {
  initialItems: Item[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gallery/page?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      setItems((prev) => prev.concat(data.items));
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading]);

  return (
    <>
      {items.length === 0 ? (
        <p className="text-neutral-600">No uploads yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => {
            const isImg = it.mimeType.startsWith("image/");
            const isVideo = it.mimeType.startsWith("video/");
            const thumb = isImg
              ? `/api/files/${it.id}/thumb?w=480`
              : `/api/files/${it.id}`; // videos: you can add a poster later

            return (
              <figure key={it.id} className="card overflow-hidden">
                <div className="relative w-full h-56 bg-neutral-100">
                  {isImg ? (
                    <Image
                      src={thumb}
                      alt={it.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized
                      loading="lazy"
                      placeholder="empty"
                      className="object-cover"
                    />
                  ) : isVideo ? (
                    <video
                      className="w-full h-full object-cover"
                      src={`/api/files/${it.id}`}
                      preload="metadata"
                      controls
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-sm text-neutral-600">
                      Unsupported: {it.mimeType}
                    </div>
                  )}
                </div>
                <figcaption className="px-4 py-3 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" title={it.name}>{it.name}</span>
                    <Link className="underline text-sm" href={`/api/files/${it.id}`} target="_blank">Open</Link>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {loading && <div className="text-sm text-neutral-500">Loading…</div>}
      {!cursor && items.length > 0 && (
        <div className="text-sm text-neutral-500 mt-2">End of gallery</div>
      )}
    </>
  );
}
