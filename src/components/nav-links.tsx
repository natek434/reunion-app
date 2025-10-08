"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS, NavItem } from "@/config/nav";
import NavWhakapapaLink from "@/components/nav-whakapapa-link";

/**
 * Renders the shared NAV_ITEMS as either desktop or mobile links.
 * Keeps active state styling consistent across both.
 */
export default function NavLinks({
  variant,                   // "desktop" | "mobile"
  className,
}: {
  variant: "desktop" | "mobile";
  className?: string;
}) {
  const pathname = usePathname();

  const linkClass =
    variant === "desktop"
      ? "nav-link" // you already style this in globals.css
      : "block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white";

  const wrapClass =
    variant === "desktop"
      ? clsx("header-nav flex items-center gap-1 md:gap-2", className)
      : clsx("rounded-2xl border border-white/15 bg-zinc-900/80 p-2 backdrop-blur header-nav", className);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <nav className={wrapClass} aria-label="Primary">
      {NAV_ITEMS.map((item, i) => {
        if (item.desktopOnly && variant === "mobile") return null;
        if (item.mobileOnly && variant === "desktop") return null;

        if (item.type === "component") {
          // Assumes NavWhakapapaLink accepts className; if not, adjust there.
          if (item.key === "whakapapa") return <NavWhakapapaLink key={`comp-${i}`} className={linkClass} />;
          return null;
        }

        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(linkClass, variant === "desktop" ? "" : active && "bg-white/10 text-white")}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
