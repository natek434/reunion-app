import LegalPage from "@/components/LegalPage";
const LAST_UPDATED = "25 August 2025";

export const metadata = {
  title: "Terms of Use",
  description: "Acceptable use, IP, and disclaimers for the reunion app.",
};

export default function Page() {
  const toc = [
    { href: "#acceptance", label: "Acceptance" },
    { href: "#eligibility", label: "Eligibility & access" },
    { href: "#acceptable-use", label: "Acceptable use" },
    { href: "#content", label: "User content" },
    { href: "#ip", label: "Intellectual property" },
    { href: "#privacy", label: "Privacy" },
    { href: "#warranty", label: "No warranties" },
    { href: "#liability", label: "Liability" },
    { href: "#governing-law", label: "Governing law" },
    { href: "#changes", label: "Changes" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <LegalPage
      title="Terms of Use"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of this private, invitation-only reunion app."
      toc={toc}
    >
      <section id="acceptance" tabIndex={-1}>
        <h2>Acceptance</h2>
        <p>By accessing the app, you agree to these Terms and our Privacy Policy.</p>
      </section>

      <section id="eligibility" tabIndex={-1}>
        <h2>Eligibility &amp; access</h2>
        <p>
          Access is limited to invited whānau and trusted organisers. We may revoke access for security or misuse.
        </p>
      </section>

      <section id="acceptable-use" tabIndex={-1}>
        <h2>Acceptable use</h2>
        <ul>
          <li>Share only content you have permission to share.</li>
          <li>Do not attempt to bypass access controls or scrape private data.</li>
          <li>No unlawful, harassing, or harmful content.</li>
          <li>Respect tikanga and whānau privacy at all times.</li>
        </ul>
      </section>

      <section id="content" tabIndex={-1}>
        <h2>User content</h2>
        <p>
          You retain your rights in content you upload. You grant us a limited licence to host and display it within the
          app for reunion purposes. We may remove content that breaches these Terms.
        </p>
      </section>

      <section id="ip" tabIndex={-1}>
        <h2>Intellectual property</h2>
        <p>
          App code, design and logos are owned by the organisers. Do not reuse or redistribute app materials without
          permission.
        </p>
      </section>

      <section id="privacy" tabIndex={-1}>
        <h2>Privacy</h2>
        <p>See the <a className="underline underline-offset-4" href="/privacy">Privacy Policy</a> for how we handle information.</p>
      </section>

      <section id="warranty" tabIndex={-1}>
        <h2>No warranties</h2>
        <p>The app is provided on an “as is” and “as available” basis, without warranties.</p>
      </section>

      <section id="liability" tabIndex={-1}>
        <h2>Liability</h2>
        <p>
          To the maximum extent permitted by New Zealand law, we are not liable for indirect or consequential loss.
        </p>
      </section>

      <section id="governing-law" tabIndex={-1}>
        <h2>Governing law</h2>
        <p>These Terms are governed by the laws of New Zealand. Venue: New Zealand courts.</p>
      </section>

      <section id="changes" tabIndex={-1}>
        <h2>Changes</h2>
        <p>We may update these Terms from time to time. We’ll note the “Last updated” date above.</p>
      </section>

      <section id="contact" tabIndex={-1}>
        <h2>Contact</h2>
        <p>Email: <a className="underline underline-offset-4" href="mailto:legal@rangiandraratihanara.com">legal@rangiandraratihanara.com</a></p>
      </section>
    </LegalPage>
  );
}
