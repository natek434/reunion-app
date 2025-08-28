"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import ProfileMenuModal from "./profile-menu-modal";
import Image from "next/image";

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
  const avatar = session.user.image; // updated immediately via useSession().update in profile client

  return (
    <>
      <button className="flex items-center gap-2" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="hidden sm:block text-sm text-white/80">{name}</span>

        {avatar ? (

<Image
  src={avatar}
  width={36}              // required
  height={36}              // required
  alt="Profile"            // required
  className="h-auto w-auto rounded-full aspect-square ring-2 ring-white/20 object-cover"
  referrerPolicy="no-referrer"
  // unoptimized // uncomment if remotePatterns not configured
   style={{
    minWidth: '36px',
    minHeight: '36px',
    maxWidth: '36px',
    maxHeight: '36px',
    flexShrink: 0, // prevent shrinking in flex layouts
  }}
/>

        ) : (
          <div className="h-9 w-9 rounded-full bg-white/20 text-white grid place-items-center ring-2 ring-white/20">
            <span className="font-semibold">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </button>

      <ProfileMenuModal open={open} onClose={() => setOpen(false)} user={session.user} />
    </>
  );
}
