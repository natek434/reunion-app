"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type Props = {
  initialName: string;
  email: string;
  initialImage: string;
  hasPassword: boolean;
  providers: string[];
};

export default function ProfileClient({
  initialName,
  email,
  initialImage,
  hasPassword,
  providers,
}: Props) {
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage); // string ("" means none in UI)
  const [saving, setSaving] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile() {
    const payload: Record<string, string | null> = {};

    const trimmedName = name.trim();
    if (trimmedName !== initialName) payload.name = trimmedName;

    // Only send image if changed:
    if (image !== initialImage) {
      // When cleared in UI, send null to clear in DB
      payload.image = image ? image : null;
    }

    if (Object.keys(payload).length === 0) {
      toast.message("No changes");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");

      // Refresh session so header/avatar updates immediately
      // We merge the new values into the session snapshot for instant UI feedback.
      await update({
        name: trimmedName,
        // If cleared, set to "" so the header shows the fallback initials immediately.
        image: image || "",
      } as any);

      toast.success("Profile updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message?.slice(0, 160) });
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPick(file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error || "Upload failed");

      // Use your protected files route (app-relative). Server accepts this.
      setImage(`/api/files/${data.id}`);
      toast.success("Avatar uploaded");
    } catch (e: any) {
      toast.error("Avatar upload failed", { description: e?.message?.slice(0, 160) });
    }
  }

  function clearAvatar() {
    setImage(""); // UI shows initials; server receives null on save
    toast.message("Avatar will be cleared after you save.");
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const currentPassword = String(fd.get("currentPassword") || "");
    const newPassword = String(fd.get("newPassword") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");

    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    try {
      setPwBusy(true);
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Password update failed");

      form.reset();
      toast.success("Password updated");
    } catch (e: any) {
      toast.error("Failed to change password", { description: e?.message?.slice(0, 160) });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-6">
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          {image ? (
            <img src={image} alt="" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-neutral-200 grid place-items-center border">
              <span className="text-neutral-600 text-xl">
                {(name || email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="btn">
              Change avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onAvatarPick(e.target.files[0])}
              />
            </label>
            {image && (
              <button className="btn text-rose-600" onClick={clearAvatar}>
                Remove avatar
              </button>
            )}
          </div>
        </div>

        <label className="block">
          <div className="text-sm text-neutral-600 mb-1">Display name</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-sm text-neutral-600 mb-1">Email</div>
          <input className="input opacity-70" value={email} disabled />
        </label>

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Password</h3>
        {hasPassword || providers.includes("credentials") ? (
          <form className="grid gap-3 max-w-sm" onSubmit={changePassword}>
            <input name="currentPassword" type="password" placeholder="Current password" className="input" required />
            <input name="newPassword" type="password" placeholder="New password" className="input" required />
            <input name="confirmPassword" type="password" placeholder="Confirm new password" className="input" required />
            <button className="btn" disabled={pwBusy}>
              {pwBusy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="text-neutral-500 text-sm">
            You’re signed in with a provider ({providers.join(", ") || "none"}). To add a password, contact an admin or
            add a “credentials” flow later.
          </p>
        )}
      </div>
    </div>
  );
}
