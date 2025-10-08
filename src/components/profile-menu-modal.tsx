"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut } from "next-auth/react";
import Avatar from "@/components/avatar"; // <-- make sure path/casing matches your file
import { useSession } from "next-auth/react";

type UserShape = {
  name?: string | null;
  email?: string | null;
  image?: string | null; // your custom DB avatar URL (e.g. /api/files/:id)
  role?: "ADMIN" | "USER" | "MODERATOR" | null;
};

export default function ProfileMenuModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserShape;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).getAttribute("data-overlay") === "true") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    document.body.classList.add("overflow-hidden");
    const t = setTimeout(() => firstBtnRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      document.body.classList.remove("overflow-hidden");
      clearTimeout(t);
      prev?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const c = panelRef.current;
      if (!c) return;
      const els = Array.from(
        c.querySelectorAll<HTMLElement>(
          'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      const first = els[0];
      const last = els[els.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  if (!open) return null;

  const displayName = user.name ?? user.email ?? "Account";
  const isAdmin = user.role === "ADMIN";

  return createPortal(
   <div className="fixed inset-0 z-[1000]">
  <div data-overlay="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Account menu"
    ref={panelRef}
    className="absolute inset-x-4 sm:inset-x-auto sm:right-6 top-20 sm:top-16 mx-auto sm:mx-0 menu-panel"
  >
        {/* Header */}
         <div className="flex items-center gap-3 px-5 py-4">
          <Avatar
            customSrc={user.image || ""}                 // your DB avatar (/api/files/:id)
            providerSrc={session?.user?.image || ""}     // provider avatar (google/github)
            name={displayName}
            email={user.email || ""}
            size={48}                                     // matches your old h-10 w-10
            className="border"
            referrerPolicy="no-referrer"
            unoptimized  // uncomment if your /api/files/* needs cookies / no remotePatterns
          />
          <div className="min-w-0">
            <div className="font-medium truncate">{displayName}</div>
            {user.email && (
              <div className="text-xs text-zinc-600 dark:text-white/60 truncate">{user.email}</div>
            )}
          </div>
        </div>

        <div className="menu-divider" />

        {/* Primary links */}
        <nav className="py-1">
          <Link
            href="/me"
            className="menu-item"
            onClick={onClose}
          >
            My uploads
          </Link>
          <Link
            href="/dashboard"
            className="menu-item"
            onClick={onClose}
          >
            Upload files
          </Link>
          <Link
            href="/account"
            className="menu-item"
            onClick={onClose}
          >
            Account
          </Link>
          <Link
            href="/account/family"
            className="menu-item"
            onClick={onClose}
          >
            Create Member
          </Link>
        </nav>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="menu-divider" />
            <div className="menu-item">
              Admin
            </div>
            <nav className="pb-2">
              <Link
                href="/admin/events"
                className="menu-item"
                onClick={onClose}
              >
                Events &amp; Itinerary
              </Link>
              <Link
                href="/admin/members"
                className="menu-item"
                onClick={onClose}
              >
                Members &amp; Relationships
              </Link>
              <Link
                href="/family"
                className="menu-item"
                onClick={onClose}
              >
                Family Admin
              </Link>
            </nav>
          </>
        )}

        <div className="menu-divider" />

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            ref={firstBtnRef}
            className="menu-btn menu-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="menu-btn menu-btn--danger"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
