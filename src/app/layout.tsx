import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "sonner";
import Providers from "./providers";
import HeaderAuth from "@/components/header-auth";
import { brandFont } from "./fonts";
import NavWhakapapaLink from "@/components/nav-whakapapa-link";

import MobileNav from "@/components/mobile-nav";
import Footer from "@/components/ui/footer";

export default async function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en" className={brandFont.variable}>
      <body>
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-zinc-900/70 backdrop-blur">
            <div className="container mx-auto max-w-6xl flex items-center justify-between py-3 relative">
               <div className="hidden md:flex w-full items-center justify-between">
              <Link href="/" className="brand-title">
                Rangi and Rarati Hanara Reunion 2025
              </Link>

              <nav className="header-nav flex items-center gap-1 md:gap-2">
                <Link className="nav-link" href="/">Home</Link>
                <Link className="nav-link" href="/event">Event</Link>
                <NavWhakapapaLink />
                <Link className="nav-link" href="/gallery">Gallery</Link>
                <Link className="nav-link" href="/dashboard">Upload</Link>
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
