"use client";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}

export default function Countdown({
  toEpochMs,
  serverNowEpochMs,
}: { toEpochMs: number; serverNowEpochMs: number }) {
  // initialize with the server snapshot so SSR + first client paint match
  const [now, setNow] = useState(serverNowEpochMs);

  useEffect(() => {
    // after mount, switch to live time
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, toEpochMs - now);
  const { d, h, m, s } = parts(diff);

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="card px-3 py-2 text-center">
        <div className="text-2xl font-semibold tabular-nums" suppressHydrationWarning>{d}</div>
        <div className="text-xs opacity-70">days</div>
      </div>
      <div className="card px-3 py-2 text-center">
        <div className="text-2xl font-semibold tabular-nums" suppressHydrationWarning>{h}</div>
        <div className="text-xs opacity-70">hours</div>
      </div>
      <div className="card px-3 py-2 text-center">
        <div className="text-2xl font-semibold tabular-nums" suppressHydrationWarning>{m}</div>
        <div className="text-xs opacity-70">mins</div>
      </div>
      <div className="card px-3 py-2 text-center">
        <div className="text-2xl font-semibold tabular-nums" suppressHydrationWarning>{s}</div>
        <div className="text-xs opacity-70">secs</div>
      </div>
    </div>
  );
}
