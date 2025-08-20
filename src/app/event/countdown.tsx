"use client";
import { useEffect, useState } from "react";

export default function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  return (
    <div className="grid grid-flow-col gap-3 text-center auto-cols-max">
      {[
        ["Days", days],
        ["Hours", hours],
        ["Min", minutes],
        ["Sec", seconds],
      ].map(([label, val]) => (
        <div key={label} className="card px-4 py-3">
          <div className="text-2xl font-semibold tabular-nums">{val as number}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      ))}
    </div>
  );
}
