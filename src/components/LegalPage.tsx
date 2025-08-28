"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * A simple, accessible wrapper for legal pages:
 * - Skip link
 * - Main landmark
 * - Table of contents landmark
 * - Focus styles
 */
export default function LegalPage({
  title,
  intro,
  children,
  toc,
  lastUpdated,
}: {
  title: string;
  intro?: string;
  lastUpdated?: string;
  toc?: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Ensure hash links move focus for screen readers
    function onHashChange() {
      const id = window.location.hash.replace("#", "");
      if (!id) return;
      const el = document.getElementById(id);
      if (el) (el as HTMLElement).focus();
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-zinc-800 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      <header className="border-b bg-zinc-900/70 backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {lastUpdated && (
            <p className="mt-1 text-sm text-zinc-300">Last updated: {lastUpdated}</p>
          )}
          {intro && <p className="mt-3 text-zinc-200">{intro}</p>}
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {toc && toc.length > 0 && (
          <nav
            aria-label={`${title} sections`}
            className="order-2 lg:order-1 lg:sticky lg:top-20 self-start"
          >
            <h2 className="text-sm font-medium text-zinc-400">On this page</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {toc.map((item) => (
                <li key={item.href}>
                  <a
                    className="underline decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 text-sm text-zinc-500">
              <Link href="/" className="underline underline-offset-4">
                ← Back to home
              </Link>
            </div>
          </nav>
        )}

        <main id="content" tabIndex={-1} className="order-1 lg:order-2 min-w-0">
          <article className="prose prose-invert max-w-none">
            {children}
          </article>
        </main>
      </div>
    </>
  );
}
