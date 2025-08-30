// app/reset/reset-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ResetClient({ token }: { token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      const csrf =
        document.cookie.split("; ").find(c => c.startsWith("csrf-token="))?.split("=")[1] ?? "";

      const res = await fetch("/api/account/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
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
        <button className="btn btn-primary w-full" disabled={busy || pw.length < 6 || !token}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
