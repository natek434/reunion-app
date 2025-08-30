"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";

type Item = { src: string; title?: string; type: "image" | "video" };

/* ---------- Tiny image cache with prefetch+decode and LRU eviction ---------- */
function useImageCache(maxEntries = 24) {
  const mapRef = useRef<Map<string, string>>(new Map()); // src -> blobURL
  const inFlightRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    return () => {
      for (const url of mapRef.current.values()) URL.revokeObjectURL(url);
      mapRef.current.clear();
      inFlightRef.current.clear();
    };
  }, []);

  function touch(src: string, blobUrl: string) {
    mapRef.current.delete(src);
    mapRef.current.set(src, blobUrl);
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
    if (mapRef.current.has(src)) return;
    const inflight = inFlightRef.current.get(src);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const resp = await fetch(src, { credentials: "include" }).catch(() => null);
        if (resp && resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          await new Promise<void>((resolve) => {
            const Img = (globalThis as any).Image as new () => HTMLImageElement;
            const img = new Img();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
            if ((img as any).decode) (img as any).decode().then(() => resolve()).catch(() => {});
          });
          touch(src, url);
          return;
        }
      } catch {
        // fall through
      }

      // Fallback: warm cache without blob
      await new Promise<void>((resolve) => {
        const Img = (globalThis as any).Image as new () => HTMLImageElement;
        const img = new Img();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => resolve();
        if ((img as any).decode) (img as any).decode().then(() => resolve()).catch(() => {});
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
  const PRELOAD_AHEAD = 4;

  // order (with shuffle)
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

  // current slide
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

  // Preload current and a few ahead (images)
  useEffect(() => {
    if (!cur || !order.length) return;
    (async () => {
      if (cur.type === "image") await prefetch(cur.src);
      for (let k = 1; k <= PRELOAD_AHEAD; k++) {
        const idxInOrder = (pos + k) % order.length;
        const it = items[order[idxInOrder]];
        if (it && it.type === "image") prefetch(it.src);
      }
    })();
  }, [curKey, pos, order, items, prefetch]);

  // Auto-advance (images only)
  useEffect(() => {
    if (!playing || !cur || cur.type !== "image") return;
    const t = setTimeout(next, seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, cur?.src, cur?.type, seconds, next]);

  // Progress bar arming (AFTER cur/curKey are defined)
  const [barArmed, setBarArmed] = useState(false);
  useEffect(() => {
    setBarArmed(false);
    if (!playing || cur?.type !== "image") return;
    let r1 = 0, r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setBarArmed(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [curKey, seconds, playing, cur?.type]);

  // Fullscreen
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

  // Keyboard shortcuts
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
  const displaySrc = cur.type === "image" ? resolve(cur.src) : cur.src;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm">
      {/* Top controls */}
      {!isFullscreen && (
        <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-3 text-white">
          <button
            className="px-3 py-1.5 rounded border bg-white/10 hover:bg-white/20 border-white/30"
            onClick={onClose}
          >
            Close
          </button>

          <div className="flex items-center gap-2 ml-2">
            <button
              className="px-3 py-1.5 rounded border bg-white/10 hover:bg-white/20 border-white/30"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </button>

            <label className="text-sm/none opacity-90">Seconds:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={20}
                value={seconds}
                onChange={(e) => setSeconds(parseInt(e.target.value))}
                className="accent-white"
              />
              <span className="text-sm tabular-nums opacity-90">{seconds}s</span>
            </div>

            <label className="text-sm ml-3 opacity-90">Shuffle</label>
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => {
                setShuffle(e.target.checked);
                setIdx(0);
              }}
              className="accent-white"
            />
            <label className="text-sm ml-3 opacity-90">Loop</label>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="accent-white"
            />
          </div>

          <button
            className="px-3 py-1.5 rounded border bg-white/10 hover:bg-white/20 border-white/30 ml-2"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>

          <div className="ml-auto text-sm opacity-90">{pos + 1} / {order.length}</div>
        </div>
      )}

      {/* Media layer below controls */}
      <div className="absolute inset-0 z-10 grid place-items-center" onDoubleClick={toggleFullscreen}>
        {cur.type === "video" ? (
          <video
            key={curKey}
            ref={videoRef}
            src={displaySrc}
            controls
            autoPlay
            playsInline
            style={{ maxWidth: "98vw", maxHeight: "88vh", borderRadius: 12 }}
            onEnded={next}
          />
        ) : (
          <NextImage
            src={displaySrc}
            alt={cur.title || ""}
            width={1920}
            height={1080}
            priority
            unoptimized
            className="max-w-[98vw] max-h-[88vh] object-contain rounded-xl"
          />
        )}
      </div>

      {/* Caption + progress */}
      <div className="absolute left-8 right-8 bottom-6 z-20 text-white pointer-events-none select-none">
        <div className="mb-2 text-center text-sm opacity-90">{cur.title}</div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden" key={curKey}>
          <div
            className="h-full bg-white/80 transition-[width]"
            style={{
              width: playing && cur?.type === "image" && barArmed ? "100%" : "0%",
              transitionDuration: `${seconds}s`,
            }}
          />
        </div>
      </div>

      {/* Arrows */}
      <button
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded border bg-white/10 hover:bg-white/20 border-white/30 text-white"
        onClick={prev}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded border bg-white/10 hover:bg-white/20 border-white/30 text-white"
        onClick={next}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}
