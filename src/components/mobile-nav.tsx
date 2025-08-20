// src/components/mobile-nav.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuth from "@/components/header-auth";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/event", label: "Event" },
  { href: "/gallery", label: "Gallery" },
  { href: "/dashboard", label: "Upload" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null); // ⬅️ NEW
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]); // close on route change

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close when clicking outside — but ignore the toggle button
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;               // inside menu
      if (buttonRef.current?.contains(target)) return;              // ⬅️ ignore the hamburger/X
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href="/" className="brand-title">
          Rangi and Rarati Hanara Reunion 2025
        </Link>

        <div className="flex items-center gap-2">
          <HeaderAuth />
          <button
            ref={buttonRef}                              // ⬅️ attach ref
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
          >
            <span className="sr-only">Toggle menu</span>
            <svg
              className={`h-5 w-5 transition-transform ${open ? "rotate-90 opacity-80" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 will-change-[max-height]
          ${open ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}
        `}
      >
        <nav className="rounded-2xl border border-white/15 bg-zinc-900/80 p-2 backdrop-blur header-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
