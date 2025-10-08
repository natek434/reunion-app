// src/components/mobile-nav.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuth from "@/components/header-auth";
import { NAV_ITEMS } from "@/config/nav";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // close on route change
  useEffect(() => setOpen(false), [pathname]);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // click outside (but ignore the toggle button)
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;   // inside menu
      if (buttonRef.current?.contains(t)) return;  // toggle button
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
            ref={buttonRef}
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full aspect-square border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
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

      {/* Collapsible panel */}
      <div
        id="mobile-menu"
        ref={panelRef}
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 will-change-[max-height]
          ${open ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}
        `}
      > <nav className="rounded-2xl border border-white/15 bg-zinc-900/80 p-2 backdrop-blur header-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-nav-link"
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
