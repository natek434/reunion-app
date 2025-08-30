"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import ProfileMenuModal from "./profile-menu-modal";
import Avatar from "@/components/avatar";

export default function HeaderAuth() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") return <div className="text-sm text-neutral-300">…</div>;

  if (!session?.user) {
    return (
      <button className="btn btn-primary" onClick={() => signIn("/signin")}>
        Sign in
      </button>
    );
  }

const name = session.user.name ?? session.user.email ?? "Account";
const email = session.user.email ?? "";
const custom = (session.user as any).customImage || "";      // from DB
const provider = (session.user as any).providerImage         // Google pic
               || session.user.image || "";                  // (compat fallback)
  return (
    <>
      <button className="flex items-center gap-2" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="hidden sm:block text-sm text-white/80">{name}</span>

<Avatar
  customSrc={custom}                  // your /api/files/:id or similar
  providerSrc={provider}  // optional
  name={name}
  email={email}
  size={48}
  className="rounded-full ring-2 ring-white/20"
  referrerPolicy="no-referrer"
  unoptimized
/>
      </button>

      <ProfileMenuModal open={open} onClose={() => setOpen(false)} user={session.user} />
    </>
  );
}
