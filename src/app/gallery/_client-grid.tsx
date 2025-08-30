"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf'

type Item = {
  id: string;
  name: string;
  mimeType: string;
  owner?: string;
  createdAt?: string;
};

const LOAD_AHEAD_PX = 1200;     // earlier prefetch window
const MAX_RENDERED = 120;       // cap DOM nodes for perf (tune)
const SCROLL_JUMP = 0.9;        // jump ~90% of viewport

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

  // simple “windowing”: keep only most-recent N nodes mounted
  const windowedItems = useMemo(() => {
    if (items.length <= MAX_RENDERED) return items;
    return items.slice(items.length - MAX_RENDERED);
  }, [items]);

  // sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
     const csrf = await ensureCsrfToken();
              if (!csrf) {
                toast.error("Missing CSRF token. Please refresh the page and try again.");
                return;
              }
    try {
      const res = await fetch(`/api/gallery/page?cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
        headers: { "X-Csrf-Token": csrf },
      });
      const data = await res.json();
      setItems((prev) => prev.concat(data.items));
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // intersection observer to fetch the next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: `${LOAD_AHEAD_PX}px` }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // keyboard shortcuts: ↓ loads more / jumps down, ↑ jumps up
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // if near bottom and we have more, trigger load
        if (cursor && !loading) loadMore();
        window.scrollBy({ top: window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ top: -window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, loading, loadMore]);

  const jumpDown = () => {
    if (cursor && !loading) loadMore();
    window.scrollBy({ top: window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
  };
  const jumpUp = () => {
    window.scrollBy({ top: -window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
  };

  return (
    <>
      {items.length === 0 ? (
        <p className="">No uploads yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {windowedItems.map((it) => {
            const isImg = it.mimeType.startsWith("image/");
            const isVideo = it.mimeType.startsWith("video/");
            const thumb = isImg
              ? `/api/files/${it.id}/thumb?w=480`
              : `/api/files/${it.id}`;

            return (
              <figure
                key={it.id}
                className="relative overflow-hidden rounded-xl bg-neutral-100 shadow-sm"
              >
                <div className="relative w-full h-56">
                  {isImg ? (
                    <Image
                      src={thumb}
                      alt={it.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
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
                    <div className="absolute inset-0 grid place-items-center text-sm ">
                      Unsupported: {it.mimeType}
                    </div>
                  )}

                  {/* top-right "open" icon */}
                  <Link
                    href={`/api/files/${it.id}`}
                    target="_blank"
                    aria-label={`Open ${it.name}`}
                    className="absolute right-2 top-2 inline-flex items-center rounded-m bg-white/40 backdrop-blur px-2 py-1
                               text-white hover:bg-black/55 transition"
                  >
                    <ExternalLink size={16} />
                  </Link>

                  {/* bottom filename strip with translucent gradient */}
                  <figcaption
                    className="absolute inset-x-0 bottom-0 p-2 text-xs sm:text-sm text-white
                               bg-gradient-to-t from-black/60 via-black/35 to-transparent"
                  >
                    <span className="line-clamp-2 drop-shadow-sm">{it.name}</span>
                  </figcaption>
                </div>
              </figure>
            );
          })}
        </div>
      )}

      {/* infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8" />

      {loading && <div className="text-sm ">Loading…</div>}
      {!cursor && items.length > 0 && (
        <div className="text-sm  mt-2">End of gallery</div>
      )}

      {/* floating jump buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={jumpUp}
          title="Jump up"
          className="rounded-full p-3 bg-black/60 text-white backdrop-blur hover:bg-black/70 shadow-md"
        >
          <ArrowUp size={18} />
        </button>
        <button
          onClick={jumpDown}
          title="Jump down / load more"
          className="rounded-full p-3 bg-black/60 text-white backdrop-blur hover:bg-black/70 shadow-md"
        >
          <ArrowDown size={18} />
        </button>
      </div>
    </>
  );
}
