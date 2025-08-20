import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "sonner";
import Providers from "./providers";
import HeaderAuth from "@/components/header-auth";
import { brandFont } from "./fonts";
import NavWhakapapaLink from "@/components/nav-whakapapa-link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MobileNav from "@/components/mobile-nav";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

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
         <footer className="container mx-auto max-w-5xl py-10 text-sm text-neutral-500">
  <div className="grid md:grid-cols-3 gap-6 border-t pt-8">
    {/* Left - Copyright */}
    <div>
      <p>© {new Date().getFullYear()} Whānau Reunion</p>
      <p className="mt-2">Built with ❤️ for our whānau</p>
    </div>

    {/* Middle - Quick links */}
    <div>
      <h3 className="font-medium text-neutral-700 mb-2">Quick links</h3>
      <ul className="space-y-1">
        <li><a href="/event" className="hover:underline">Event & RSVP</a></li>
        <li><a href="/gallery" className="hover:underline">Gallery</a></li>
        <li><a href="/family" className="hover:underline">Family tree</a></li>
        <li><a href="/dashboard" className="hover:underline">Upload files</a></li>
      </ul>
    </div>

    {/* Right - Contact / location */}
    <div>
      <h3 className="font-medium text-neutral-700 mb-2">Contact & location</h3>
      <p>Te Awhina Marae<br />49 Taihape Road, Omahu, Hastings</p>
      <p className="mt-2">
        <a
          className="underline"
          href="mailto:admin@rangiraratihanara.com"
        >
          admin@rangiraratihanara.com
        </a>
      </p>
    </div>
  </div>
</footer>

        </Providers>
      </body>
    </html>
  );
}
