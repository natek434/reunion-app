"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RSVPClient({
  eventId,
  initialStatus,
  initialGuests,
}: {
  eventId: string;
  initialStatus: "YES" | "NO" | "PENDING";
  initialGuests: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [guests, setGuests] = useState(initialGuests);
  const [saving, setSaving] = useState(false);

  async function save(next: "YES" | "NO" | "PENDING") {
    try {
      setSaving(true);
      const res = await fetch("/api/event/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status: next, guests }),
      });

      if (!res.ok) throw new Error(await res.text());
      setStatus(next);
      toast.success("RSVP updated");
      router.refresh(); // refresh server components that read RSVP from DB
    } catch (err: any) {
      toast.error("Failed to save RSVP", { description: err?.message?.slice(0, 160) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className={`btn ${status === "YES" ? "btn-primary" : ""}`}
          onClick={() => save("YES")}
          disabled={saving}
        >
          Going
        </button>
        <button
          className={`btn ${status === "NO" ? "btn-primary" : ""}`}
          onClick={() => save("NO")}
          disabled={saving}
        >
          Not going
        </button>
        <button
          className={`btn ${status === "PENDING" ? "btn-primary" : ""}`}
          onClick={() => save("PENDING")}
          disabled={saving}
        >
          Maybe
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-600">Guests (not including you):</label>
        <input
          type="number"
          min={0}
          className="input max-w-24"
          value={guests}
          onChange={(e) => setGuests(Math.max(0, Number(e.currentTarget.value) || 0))}
          disabled={saving}
        />
        <button className="btn" onClick={() => save(status)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
