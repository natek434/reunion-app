"use client";

import { useState } from "react";
import PersonPicker, { PersonOption } from "@/components/ui/person-picker";
import { toast } from "sonner";
import { ensureCsrfToken } from "@/lib/csrf-client";

export default function LinkAccountPerson({
  mePersonId,
  mePersonLabel,
  onLinked,
}: {
  mePersonId: string | null;
  mePersonLabel?: string | null; // friendly name from parent
  onLinked?: () => void;
}) {
  const [selected, setSelected] = useState<PersonOption | null>(
    mePersonId ? { id: mePersonId, label: mePersonLabel || "Your person" } : null
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/account/person-link", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Csrf-Token": csrf ?? "" },
      body: JSON.stringify({ personId: selected?.id ?? null }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Failed to link");
      return;
    }
    toast.success("Linked!");
    onLinked?.();
  }

  return (
    <div className="grid gap-3">
      <PersonPicker
        label="Choose your Person"
        value={selected}
        onChange={setSelected}
      />
      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save link"}
        </button>
        {mePersonId && (
          <div className="text-xs text-muted-foreground">
            Currently linked: <span className="font-medium">{mePersonLabel || selected?.label || "Unknown"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
