import LegalPage from "@/components/LegalPage";
import Link from "next/link";

const LAST_UPDATED = "25 August 2025";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How we collect, use, store and share information for the Rangi & Rarati Hanara Reunion app.",
};

export default function Page() {
  const toc = [
    { href: "#who-we-are", label: "Who we are" },
    { href: "#what-we-collect", label: "What we collect" },
    { href: "#how-we-use", label: "How we use information" },
    { href: "#sharing", label: "When we share information" },
    { href: "#retention", label: "Retention & deletion" },
    { href: "#security", label: "Security" },
    { href: "#international", label: "International transfers" },
    { href: "#your-rights", label: "Your rights" },
    { href: "#children", label: "Children & sensitive info" },
    { href: "#changes", label: "Changes to this policy" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains how the reunion app collects, uses, and safeguards personal information. It reflects our actual data flows: private sign-in, family gallery uploads, RSVP, and the family tree."
      toc={toc}
    >
      <section id="who-we-are" tabIndex={-1}>
        <h2>Who we are</h2>
        <p>
          This site is a private, invitation-only app for the Rangi &amp; Rarati Hanara Reunion 2025,
          administered by the reunion organisers. It is not a commercial service.
        </p>
      </section>

      <section id="what-we-collect" tabIndex={-1}>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> name, email, hashed password (when using email/password), or
            Google account identifiers via NextAuth. We may store an optional profile image.
          </li>
          <li>
            <strong>Authentication/session data:</strong> NextAuth JWT session data (user id, role, basic profile).
          </li>
          <li>
            <strong>Gallery uploads:</strong> filenames, MIME type, size, created/updated timestamps; original
            files are stored privately on the server and thumbnails are generated for display.
          </li>
          <li>
            <strong>Event &amp; RSVP:</strong> your RSVP status (Yes/No/Maybe), number of guests, optional note.
          </li>
          <li>
            <strong>Family tree:</strong> person records (first/last name, optional display name, gender,
            birth/death dates if provided, notes, image URL), and parent/child relationships, including whāngai.
          </li>
          <li>
            <strong>Technical logs:</strong> basic server logs (timestamps, IP, user ID) for security and
            troubleshooting. No advertising cookies or third-party analytics are used.
          </li>
        </ul>
      </section>

      <section id="how-we-use" tabIndex={-1}>
        <h2>How we use information</h2>
        <ul>
          <li>Operate the private gallery, RSVP, and family tree features requested by users.</li>
          <li>Secure accounts and prevent misuse (e.g., role checks, access control).</li>
          <li>Improve reliability and fix bugs (using minimal technical logs).</li>
        </ul>
        <p>
          <strong>Lawful basis:</strong> For NZ, we follow the Privacy Act 2020 principles (collection for a lawful
          purpose and use consistent with that purpose). For GDPR, our bases are <em>contract</em> (providing the service
          you request), <em>legitimate interests</em> (site security, minimal logs), and <em>consent</em> for optional
          information (e.g., adding profile images).
        </p>
      </section>

      <section id="sharing" tabIndex={-1}>
        <h2>When we share information</h2>
        <ul>
          <li>
            <strong>Within the whānau:</strong> uploads and family-tree information are visible to signed-in
            members. Albums may display names and image thumbnails.
          </li>
          <li>
            <strong>Service providers:</strong> we use Next.js/Node on our own servers and a PostgreSQL database via
            Prisma. We do not use ad networks. We don’t sell personal information (CCPA).
          </li>
          <li>
            <strong>Legal:</strong> we may disclose information if required by law or to protect people’s safety.
          </li>
        </ul>
      </section>

      <section id="retention" tabIndex={-1}>
        <h2>Retention &amp; deletion</h2>
        <ul>
          <li>Account and gallery content: retained while your account remains active or until removed.</li>
          <li>RSVP and event records: retained for the duration of the event plus a reasonable period for records.</li>
          <li>Family-tree records: retained to preserve whakapapa unless a correction/removal request is upheld.</li>
          <li>Backups: may persist for a limited time after deletion requests and are cycled out routinely.</li>
        </ul>
      </section>

      <section id="security" tabIndex={-1}>
        <h2>Security</h2>
        <p>
          We use role-based access controls, per-user authorization checks, and store passwords using strong hashing.
          File uploads are validated and stored privately; thumbnails are generated server-side.
        </p>
      </section>

      <section id="international" tabIndex={-1}>
        <h2>International transfers</h2>
        <p>
          Servers are administered in New Zealand. If we use any cloud infrastructure outside NZ, we ensure appropriate
          protections consistent with the NZ Privacy Act and, where applicable, GDPR safeguards.
        </p>
      </section>

      <section id="your-rights" tabIndex={-1}>
        <h2>Your rights</h2>
        <ul>
          <li>Access and correction (NZ Privacy Act 2020).</li>
          <li>GDPR: access, rectification, erasure, restriction, objection, and portability (where applicable).</li>
          <li>CCPA/CPRA: right to know/access and deletion; we do not sell personal information.</li>
        </ul>
        <p>
          To request access or correction, contact us (details below). If you’re in NZ, you may complain to the Office
          of the Privacy Commissioner if you are unsatisfied with our response.
        </p>
      </section>

      <section id="children" tabIndex={-1}>
        <h2>Children &amp; sensitive information</h2>
        <p>
          This is a private, family-only app. Parent/guardian involvement is expected for tamariki. Do not upload
          sensitive health or other special-category data.
        </p>
      </section>

      <section id="changes" tabIndex={-1}>
        <h2>Changes to this policy</h2>
        <p>We will update this page when our practices change and note the “Last updated” date above.</p>
      </section>

      <section id="contact" tabIndex={-1}>
        <h2>Contact</h2>
        <p>
          Email: <a className="underline underline-offset-4" href="mailto:privacy@rangiandraratihanara.com">privacy@rangiandraratihanara.com</a>
        </p>
      </section>
    </LegalPage>
  );
}
