"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut } from "next-auth/react";
import Image from "next/image";

type UserShape = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "ADMIN" | "USER" | "MODERATOR" | null; // extend as needed
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

  const name = user.name ?? user.email ?? "Account";
  const initial = name.trim().charAt(0).toUpperCase();
  const isAdmin = user.role === "ADMIN";

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div data-overlay="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account menu"
        ref={panelRef}
        className="absolute inset-x-4 sm:inset-x-auto sm:right-6 top-20 sm:top-16 mx-auto sm:mx-0
                   w-[min(100%,24rem)] rounded-2xl border shadow-2xl overflow-hidden
                   bg-white text-zinc-900 border-black/10
                   dark:bg-zinc-900 dark:text-white dark:border-white/15"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          {user.image ? (
            <Image
              src={user.image}
              width={40}
              height={40}
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-black/10 dark:bg-white/20 grid place-items-center ring-2 ring-black/10 dark:ring-white/20">
              <span className="font-semibold">{initial}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{name}</div>
            {user.email && <div className="text-xs text-zinc-600 dark:text-white/60 truncate">{user.email}</div>}
          </div>
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10" />

        {/* Primary links */}
        <nav className="py-1">
          <Link
            href="/me"
            className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            My uploads
          </Link>
          <Link
            href="/dashboard"
            className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            Upload files
          </Link>
          <Link
            href="/account"
            className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            Account
          </Link>
          <Link
            href="/members/new"
            className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            Create Member
          </Link>
        </nav>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="h-px bg-black/10 dark:bg-white/10" />
            <div className="px-5 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-white/60">
              Admin
            </div>
            <nav className="pb-2">
              <Link
                href="/admin/events"
                className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                onClick={onClose}
              >
                Events &amp; Itinerary
              </Link>
              <Link
                href="/admin/members"
                className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                onClick={onClose}
              >
                Members &amp; Relationships
              </Link>
              <Link
                href="/family"
                className="block px-5 py-2.5 text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                onClick={onClose}
              >
                Family Admin
              </Link>
            </nav>
          </>
        )}

        <div className="h-px bg-black/10 dark:bg-white/10" />

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            ref={firstBtnRef}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900
                       dark:bg-white/10 dark:hover:bg-white/15 dark:text-white"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-sm font-medium text-rose-700 hover:bg-rose-50
                       dark:text-rose-300 dark:hover:bg-white/10"
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
