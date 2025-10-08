import './globals.css';
import '@/styles/maori-theme.css';
import { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "sonner";
import Providers from "./providers";
import HeaderAuth from "@/components/header-auth";
import { brandFont } from "./fonts";
import MobileNav from "@/components/mobile-nav";
import Footer from "@/components/ui/footer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en" className={`${brandFont.variable} dark`}>
      <body className="bg-weave min-h-dvh">
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-zinc-900/70 backdrop-blur">
            <div className="container mx-auto max-w-6xl flex items-center justify-between py-3 relative">
               <div className="hidden md:flex w-full items-center justify-between">
              <Link href="/" className="brand-title">
                Rangi and Rarati Hanara Reunion 2025
              </Link>

              <nav className="header-nav flex items-center gap-1 md:gap-2">
                {/** Consolidated: single source of nav items */}
                  {(
                  (await import("@/config/nav").catch(() => ({ NAV_ITEMS: [] as {href:string;label:string}[] }))).NAV_ITEMS
                ).map((item) => (
                  <Link key={item.href} className="nav-link" href={item.href}>
                    {item.label}
                  </Link>
                ))}
                <HeaderAuth />
              </nav>
              </div>
               <div className="w-full md:hidden">
      <MobileNav />
    </div>
            </div>
          </header>

          <Toaster position="top-center" richColors closeButton />
          <main className="container mx-auto max-w-5xl py-8">{children}</main>
<Footer />
        </Providers>
      </body>
    </html>
  );
}
