"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = { src: string; title?: string; type: "image" | "video" };

/* ---------- Tiny image cache with prefetch+decode and LRU eviction ---------- */
function useImageCache(maxEntries = 24) {
  const mapRef = useRef<Map<string, string>>(new Map()); // src -> blobURL
  const inFlightRef = useRef<Map<string, Promise<void>>>(new Map());

  // revoke all on unmount
  useEffect(() => {
    return () => {
      for (const url of mapRef.current.values()) URL.revokeObjectURL(url);
      mapRef.current.clear();
      inFlightRef.current.clear();
    };
  }, []);

  function touch(src: string, blobUrl: string) {
    // LRU: reinsert as most-recent
    mapRef.current.delete(src);
    mapRef.current.set(src, blobUrl);
    // prune
    while (mapRef.current.size > maxEntries) {
      const oldest = mapRef.current.keys().next().value as string | undefined;
      if (oldest) {
        const url = mapRef.current.get(oldest)!;
        mapRef.current.delete(oldest);
        URL.revokeObjectURL(url);
      } else break;
    }
  }

  async function prefetch(src: string) {
    // already cached
    if (mapRef.current.has(src)) return;
    // already prefetching
    const inflight = inFlightRef.current.get(src);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        // Try fetch→blob (ignores server no-store by keeping in memory)
        const resp = await fetch(src, { credentials: "include" }).catch(() => null);
        if (resp && resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          // Ensure it's decoded before we consider it ready
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve(); // don't block on errors
            // `decode()` is nicer but Safari may reject on some images; try both
            // @ts-ignore
            if (img.decode) img.decode().then(() => resolve()).catch(() => {});
          });
          touch(src, url);
          return;
        }
      } catch {}

      // Fallback: preload via <img> without blob (uses browser cache)
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => resolve();
        // @ts-ignore
        if (img.decode) img.decode().then(() => resolve()).catch(() => {});
      });
    })();

    inFlightRef.current.set(src, p);
    try {
      await p;
    } finally {
      inFlightRef.current.delete(src);
    }
  }

  function resolve(src: string): string {
    return mapRef.current.get(src) ?? src;
  }

  return { prefetch, resolve };
}

/* ---------- Slideshow ---------- */
export default function Slideshow({
  items,
  onClose,
}: {
  items: Item[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [seconds, setSeconds] = useState(6);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { prefetch, resolve } = useImageCache(24);
  const PRELOAD_AHEAD = 4; // tweak as you like

  // --- order (with shuffle) ---
  const order = useMemo(() => {
    if (!items.length) return [] as number[];
    if (!shuffle) return items.map((_, i) => i);
    const a = items.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [items, shuffle]);

  // current pos/item and a key that changes every slide
  const pos = useMemo(() => (order.length ? Math.min(idx, order.length - 1) : 0), [idx, order.length]);
  const cur = order.length ? items[order[pos]] : undefined;
  const curKey = `${order[pos] ?? 0}:${cur?.src ?? ""}`;

  const next = useCallback(() => {
    setIdx((i) => {
      if (!order.length) return 0;
      const n = i + 1;
      return n >= order.length ? (loop ? 0 : i) : n;
    });
  }, [order.length, loop]);

  const prev = useCallback(() => {
    setIdx((i) => {
      if (!order.length) return 0;
      const n = i - 1;
      return n < 0 ? (loop ? Math.max(order.length - 1, 0) : 0) : n;
    });
  }, [order.length, loop]);

  // --- preloading (images) ---
  useEffect(() => {
    if (!cur || !order.length) return;
    // Preload current (ensures decoded if not already) and next few
    const run = async () => {
      if (cur.type === "image") await prefetch(cur.src);
      for (let k = 1; k <= PRELOAD_AHEAD; k++) {
        const idxInOrder = (pos + k) % order.length;
        const it = items[order[idxInOrder]];
        if (it && it.type === "image") prefetch(it.src);
      }
    };
    run();
  }, [curKey, pos, order, items, prefetch]);

  // --- auto-advance for images: reschedule per slide ---
  useEffect(() => {
    if (!playing) return;
    if (!cur || cur.type !== "image") return;
    const t = setTimeout(next, seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, cur?.src, cur?.type, seconds, next]);

  // --- fullscreen handling ---
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      }
    } catch {}
  }, []);
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exitFullscreen();
    else enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // --- keyboard shortcuts ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, toggleFullscreen]);

  if (!order.length || !cur) return null;

  // Resolve current image to blob URL if preloaded
  const displaySrc = cur.type === "image" ? resolve(cur.src) : cur.src;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm">
      {/* Top controls — visible ONLY when not fullscreen */}
      {!isFullscreen && (
        <div className="absolute left-4 right-4 top-4 flex items-center gap-3 text-white/90">
          <button className="btn" onClick={onClose}>Close</button>
          <div className="flex items-center gap-2 ml-2">
            <button className="btn" onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>

            <label className="text-sm">Seconds:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={20}
                value={seconds}
                onChange={e => setSeconds(parseInt(e.target.value))}
              />
              <span className="text-sm tabular-nums">{seconds}s</span>
            </div>

            <label className="text-sm ml-3">Shuffle</label>
            <input
              type="checkbox"
              checked={shuffle}
              onChange={e => {
                setShuffle(e.target.checked);
                setIdx(0); // restart when toggling shuffle
              }}
            />
            <label className="text-sm ml-3">Loop</label>
            <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />
          </div>

          <button className="btn ml-2" onClick={toggleFullscreen}>
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>

          <div className="ml-auto text-sm">{pos + 1} / {order.length}</div>
        </div>
      )}

      {/* Media (double-click toggles fullscreen) */}
      <div className="absolute inset-0 grid place-items-center" onDoubleClick={toggleFullscreen}>
        {cur.type === "video" ? (
          <video
            key={curKey}
            ref={videoRef}
            src={displaySrc}
            controls
            autoPlay
            onEnded={next}
            style={{ maxWidth: "98vw", maxHeight: "88vh", borderRadius: 12 }}
          />
        ) : (
          <img
            key={curKey}
            src={displaySrc}
            alt={cur.title || ""}
            loading="eager"
            decoding="async"
            style={{ maxWidth: "98vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 12, willChange: "opacity" }}
          />
        )}
      </div>

      {/* Caption + progress (always visible) */}
      <div className="absolute left-8 right-8 bottom-6 text-white/90 pointer-events-none select-none">
        <div className="mb-2 text-center text-sm">{cur.title}</div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden" key={curKey}>
          <div
            className="h-full bg-white/80 transition-[width]"
            style={{
              width: playing && cur.type === "image" ? "100%" : "0%",
              transitionDuration: `${seconds}s`,
            }}
          />
        </div>
      </div>

      {/* Arrows (always visible) */}
      <button className="absolute left-3 top-1/2 -translate-y-1/2 btn" onClick={prev}>‹</button>
      <button className="absolute right-3 top-1/2 -translate-y-1/2 btn" onClick={next}>›</button>
    </div>
  );
}
