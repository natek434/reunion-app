// app/reset/page.tsx
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      const res = await fetch("/api/account/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      toast.success("Password updated. Please sign in.");
      router.push("/signin");
    } catch (e: any) {
      toast.error("Could not reset password", { description: e?.message?.slice(0, 160) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          className="input"
          placeholder="New password (min 6 chars)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button className="btn btn-primary w-full" disabled={busy || pw.length < 6}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
