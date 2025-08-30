"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Avatar from "@/components/avatar"; // ensure casing matches file name
import { ensureCsrfToken } from "@/lib/csrf-client"; // <-- your helper that may call /api/csrf

type Props = {
  initialName: string;
  email: string;
  initialImage: string; // custom avatar or ""
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
  const { data: session, update } = useSession();

  // Form state
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);

  // Baselines that we control locally (so "No changes" works after first save)
  const [lastSavedName, setLastSavedName] = useState(initialName);
  const [lastSavedImage, setLastSavedImage] = useState(initialImage);

  const [saving, setSaving] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const providerImage = session?.user?.image || "";

  async function saveProfile() {
    const trimmedName = name.trim();

    // Compare vs last saved, not initial props
    const nameChanged = trimmedName !== lastSavedName;
    const imageChanged = image !== lastSavedImage;

    const payload: Record<string, string | null> = {};
    if (nameChanged) payload.name = trimmedName;
    if (imageChanged) payload.image = image ? image : null; // DB: null clears custom avatar

    if (Object.keys(payload).length === 0) {
      toast.message("No changes");
      return;
    }

    try {
      setSaving(true);
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");

      // Do NOT clobber provider image: only set session.image if we actually have a custom image
      const sessionUpdate: any = {};
      if (nameChanged) sessionUpdate.name = trimmedName;
      if (imageChanged && image) sessionUpdate.image = image;
      if (Object.keys(sessionUpdate).length) await update(sessionUpdate);

      // Update local baselines so subsequent saves work correctly
      if (nameChanged) setLastSavedName(trimmedName);
      if (imageChanged) setLastSavedImage(image);

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
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch("/api/upload", { method: "POST", headers: {"Content-Type": "application/json", "X-Csrf-Token": csrf}, body: fd });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error || "Upload failed");
      setImage(`/api/files/${data.id}`);
      toast.success("Avatar uploaded");
    } catch (e: any) {
      toast.error("Avatar upload failed", { description: e?.message?.slice(0, 160) });
    }
  }

  function clearAvatar() {
    setImage("");
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
        const csrf = await ensureCsrfToken();
          if (!csrf) {
            toast.error("Missing CSRF token. Please refresh the page and try again.");
            return;
          }
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
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
          <Avatar
            customSrc={image}
            providerSrc={providerImage}
            name={name || email}
            email={email}
            size={48}
            className="border ring-2 ring-white/20"
            // If /api/files/* requires cookies or your remotePatterns aren't set:
            unoptimized
          />

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
          <div className="text-sm mb-1">Display name</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-sm mb-1">Email</div>
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
          <p className="text-sm">
            You’re signed in with a provider ({providers.join(", ") || "none"}). To add a password, contact an admin or
            add a “credentials” flow later.
          </p>
        )}
      </div>
    </div>
  );
}
