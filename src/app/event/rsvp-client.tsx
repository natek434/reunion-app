// app/event/RSVPClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

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

  // Optional: warm the CSRF token on mount so first click doesn’t need the extra round-trip
  useEffect(() => {
    void ensureCsrfToken().catch(() => {
      /* ignore – we’ll try again on save */
    });
  }, []);

  async function save(nextStatus: "YES" | "NO" | "PENDING") {
    try {
      setSaving(true);

      // 🔐 Ensure token exists (helper will issue one if missing) and return it
      const csrf = await ensureCsrfToken();
      if (!csrf) {
        toast.error("Missing CSRF token. Please refresh the page and try again.");
        return;
      }

      const res = await fetch("/api/event/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ eventId, status: nextStatus, guests }),
        // credentials: "same-origin", // optional; same-origin is default
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Request failed");
      }

      setStatus(nextStatus);
      toast.success("RSVP updated");
      router.refresh(); // refresh server components that read RSVP from DB
    } catch (err: any) {
      toast.error("Failed to save RSVP", {
        description: String(err?.message || "").slice(0, 160),
      });
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
        <label className="text-sm">Guests (not including you):</label>
        <input
          type="number"
          min={0}
          className="input max-w-24"
          value={guests}
          onChange={(e) =>
            setGuests(Math.max(0, Number(e.currentTarget.value) || 0))
          }
          disabled={saving}
        />
        <button className="btn" onClick={() => save(status)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
