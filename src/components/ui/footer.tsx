// src/components/footer.tsx  (replace your component with this)
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-zinc-900/70 backdrop-blur mt-12">
      {/* CHANGED: set footer text colour here */}
      <div className="container mx-auto max-w-6xl px-4 py-10 text-sm text-[#e7e1db]">
        <div className="grid gap-8 md:grid-cols-3">
          
          {/* Left - Quick links */}
          <div>
            {/* CHANGED: headings slightly brighter than body */}
            <h3 className="font-medium text-white/95 mb-3">Quick links</h3>
            <ul className="space-y-2">
              <li>
                {/* CHANGED: links inherit the warm footer colour; brighten on hover */}
                <Link
                  href="/event"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Event & RSVP
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/family"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Family tree
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Upload files
                </Link>
              </li>
            </ul>
          </div>

          {/* Middle - Legal */}
          <div>
            <h3 className="font-medium text-white/95 mt-6 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/commercial-terms"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Commercial Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/accessibility"
                  className="text-inherit hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>

          {/* Right - Contact */}
          <div>
            <h3 className="font-medium text-white/95 mb-3">Contact & location</h3>

            {/* CHANGED: let address inherit the warm tone */}
            <address className="not-italic">
              Te Awhina Marae<br />
              49 Taihape Road<br />
              Omahu, Hastings
            </address>

            <p className="mt-2">
              <a
                href="mailto:admin@rangiraratihanara.com"
                className="text-inherit underline underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                admin@rangiraratihanara.com
              </a>
            </p>

            {/* CHANGED: inherit colour, just soften slightly */}
            <p className="opacity-90">
              © {new Date().getFullYear()} Whānau Reunion
            </p>
            <p className="mt-2 opacity-80">
              Built with <span aria-hidden>❤️</span>{" "}
              <span className="sr-only">love</span> for our whānau
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
