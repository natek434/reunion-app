import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-zinc-900/70 backdrop-blur mt-12">
      <div className="container mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-400">
        <div className="grid gap-8 md:grid-cols-3">
          
          {/* Left - Copyright */}
          <div>
        <h3 className="font-medium text-neutral-200 mb-3">Quick links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/event" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Event & RSVP
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/family" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Family tree
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Upload files
                </Link>
              </li>
            </ul>
          </div>

          {/* Middle - Links */}
          <div>
         

            <h3 className="font-medium text-neutral-200 mt-6 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/commercial-terms" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Commercial Terms
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>

          {/* Right - Contact */}
          <div>
            <h3 className="font-medium text-neutral-200 mb-3">Contact & location</h3>
            <address className="not-italic text-neutral-400">
              Te Awhina Marae<br />
              49 Taihape Road<br />
              Omahu, Hastings
            </address>
            <p className="mt-2">
              <a
                className="underline hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                href="mailto:admin@rangiraratihanara.com"
              >
                admin@rangiraratihanara.com
              </a>
            </p>
                   <p className="text-neutral-300">
              © {new Date().getFullYear()} Whānau Reunion
            </p>
            <p className="mt-2 text-neutral-400">
              Built with <span aria-hidden>❤️</span>{" "}
              <span className="sr-only">love</span> for our whānau
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
