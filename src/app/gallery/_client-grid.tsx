"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type SyntheticEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf'

type Item = {
  id: string;
  name: string;
  mimeType: string;
  owner?: string;
  createdAt?: string;
};

const LOAD_AHEAD_PX = 1200; // earlier prefetch window
const MAX_RENDERED = 120; // cap DOM nodes for perf (tune)
const SCROLL_JUMP = 0.9; // jump ~90% of viewport
const REQUEST_TIMEOUT_MS = 10_000;
const VIDEO_OBSERVER_ROOT_MARGIN = "600px 0px";

const LOG_PREFIX = "[GalleryGrid]";
const log = {
  info: (...args: unknown[]) => console.info(LOG_PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
  error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
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

  // simple “windowing”: keep only most-recent N nodes mounted
  const windowedItems = useMemo(() => {
    if (items.length <= MAX_RENDERED) return items;
    return items.slice(items.length - MAX_RENDERED);
  }, [items]);

  // sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const pendingController = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor) {
      log.info("loadMore skipped: no cursor available");
      return;
    }
    if (loadingRef.current) {
      log.info("loadMore skipped: already loading");
      return;
    }

    const controller = new AbortController();
    pendingController.current?.abort();
    pendingController.current = controller;

    loadingRef.current = true;
    setLoading(true);
    log.info("loadMore started", { cursor });

    const timeout = window.setTimeout(() => {
      log.warn("loadMore timeout triggered, aborting fetch", {
        cursor,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const csrf = await ensureCsrfToken();
      if (!csrf) {
        toast.error("Missing CSRF token. Please refresh the page and try again.");
        log.warn("loadMore aborted due to missing CSRF token");
        return;
      }

      const res = await fetch(`/api/gallery/page?cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
        headers: { "X-Csrf-Token": csrf },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to load gallery page: ${res.status}`);
      }

      const data = (await res.json()) as { items?: Item[]; nextCursor?: string | null };
      const incoming = Array.isArray(data.items) ? data.items : [];

      setItems((prev) => {
        if (incoming.length === 0) return prev;
        const seen = new Set(prev.map((p) => p.id));
        const deduped = incoming.filter((item) => !seen.has(item.id));
        if (deduped.length === 0) return prev;
        const merged = prev.concat(deduped);
        log.info("loadMore appended items", {
          appended: deduped.length,
          total: merged.length,
        });
        return merged;
      });

      setCursor(data.nextCursor ?? null);
      log.info("loadMore completed", {
        received: incoming.length,
        nextCursor: data.nextCursor ?? null,
      });
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        toast.error("Loading the next set of items timed out. Please try again.");
        log.error("loadMore aborted", { cursor, error });
      } else {
        toast.error("Failed to load more items. Please try again.");
        log.error("loadMore failed", error);
      }
    } finally {
      window.clearTimeout(timeout);
      pendingController.current = null;
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor]);

  // intersection observer to fetch the next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          log.info("sentinel intersected, triggering loadMore", {
            ratio: entry.intersectionRatio,
          });
          loadMore();
        }
      },
      { rootMargin: `${LOAD_AHEAD_PX}px` }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  useEffect(() => {
    return () => {
      pendingController.current?.abort();
      log.info("cleanup: aborted pending gallery fetch");
    };
  }, []);

  useEffect(() => {
    log.info("items state updated", {
      total: items.length,
      windowed: windowedItems.length,
      hasCursor: Boolean(cursor),
    });
  }, [cursor, items.length, windowedItems.length]);

  // keyboard shortcuts: ↓ loads more / jumps down, ↑ jumps up
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // if near bottom and we have more, trigger load
        if (cursor && !loadingRef.current) loadMore();
        window.scrollBy({ top: window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ top: -window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, loadMore]);

  const jumpDown = () => {
    log.info("jumpDown activated", {
      hasCursor: Boolean(cursor),
      isLoading: loadingRef.current,
    });
    if (cursor && !loadingRef.current) loadMore();
    window.scrollBy({ top: window.innerHeight * SCROLL_JUMP, behavior: "smooth" });
  };
  const jumpUp = () => {
    log.info("jumpUp activated");
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
                    <VideoTile id={it.id} name={it.name} />
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

function VideoTile({ id, name }: { id: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const posterUrl = useMemo(() => `/api/files/${id}/poster?w=640`, [id]);

  useEffect(() => {
    setPoster(null);
    setPosterError(false);
  }, [posterUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const visible = Boolean(entry.isIntersecting);
        setIsVisible(visible);
        log.info("video visibility change", {
          id,
          visible,
          ratio: entry.intersectionRatio,
        });
      },
      { rootMargin: VIDEO_OBSERVER_ROOT_MARGIN }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [id]);

  useEffect(() => {
    if (!isVisible || source) return;
    const videoSrc = `/api/files/${id}`;
    setSource(videoSrc);
    log.info("video source attached", { id, videoSrc });
  }, [id, isVisible, source]);

  useEffect(() => {
    if (isVisible || !videoRef.current) return;
    if (!videoRef.current.paused) {
      videoRef.current.pause();
      log.info("video paused because it left the viewport", { id });
    }
  }, [id, isVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isVisible || poster || posterError) return;

    let cancelled = false;
    const img = new window.Image();
    img.decoding = "async";
    img.src = posterUrl;

    img.onload = () => {
      if (cancelled) return;
      setPoster(posterUrl);
      log.info("video poster ready", { id, posterUrl });
    };

    img.onerror = (err) => {
      if (cancelled) return;
      log.error("video poster failed to load", { id, posterUrl, err });
      setPosterError(true);
    };

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [id, isVisible, poster, posterError, posterUrl]);

  useEffect(() => {
    return () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        log.info("video paused on unmount", { id });
      }
    };
  }, [id]);

  const handleLoadedData = useCallback(() => {
    if (!videoRef.current) return;
    log.info("video metadata loaded", {
      id,
      duration: videoRef.current.duration,
      readyState: videoRef.current.readyState,
    });
  }, [id]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
    log.info("video buffering", { id });
  }, [id]);

  const handlePlaying = useCallback(() => {
    if (isBuffering) {
      setIsBuffering(false);
    }
    log.info("video playback started", { id });
  }, [id, isBuffering]);

  const handleError = useCallback(
    (event: SyntheticEvent<HTMLVideoElement, Event>) => {
      log.error("video element error", {
        id,
        error: event.currentTarget.error,
      });
    },
    [id]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full bg-neutral-900">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={!posterError ? poster ?? undefined : undefined}
        preload={source ? "metadata" : "none"}
        src={source ?? undefined}
        controls
        playsInline
        disablePictureInPicture
        controlsList="nodownload"
        aria-label={`${name} video preview`}
        onLoadedData={handleLoadedData}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onSuspend={() => log.info("video network suspended", { id })}
        onError={handleError}
      />

      {!source && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
            <Play size={18} />
            <span>Preview when visible</span>
          </div>
        </div>
      )}

      {posterError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-neutral-900 text-xs text-white">
          Poster unavailable
        </div>
      )}

      {isBuffering && source && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow-sm">
            Buffering…
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-start px-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-white/90">
          <Play size={12} />
          Video
        </span>
      </div>
    </div>
  );
}
