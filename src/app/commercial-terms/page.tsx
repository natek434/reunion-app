import LegalPage from "@/components/LegalPage";
const LAST_UPDATED = "25 August 2025";

export const metadata = {
  title: "Commercial Terms",
  description: "Payments, refunds, warranties, liability for commercial features (if any).",
};

export default function Page() {
  const toc = [
    { href: "#status", label: "Status of paid features" },
    { href: "#future", label: "If paid features are added" },
    { href: "#warranty", label: "Warranties" },
    { href: "#liability", label: "Liability & risk" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <LegalPage
      title="Commercial Terms"
      lastUpdated={LAST_UPDATED}
      intro="This app does not currently offer paid features. If that changes, this page will govern payments and refunds."
      toc={toc}
    >
      <section id="status" tabIndex={-1}>
        <h2>Status of paid features</h2>
        <p>There are no paid features at this time. No charges are collected by the app.</p>
      </section>

      <section id="future" tabIndex={-1}>
        <h2>If paid features are added</h2>
        <ul>
          <li>We will disclose pricing, renewal cycles, and taxes before purchase.</li>
          <li>Refund policy will be stated clearly (e.g., 14-day refund for unused services).</li>
          <li>Payment processing will be handled by a third-party provider with PCI-DSS compliance.</li>
        </ul>
      </section>

      <section id="warranty" tabIndex={-1}>
        <h2>Warranties</h2>
        <p>Paid features (if introduced) will be provided with reasonable care and skill per NZ Consumer Law.</p>
      </section>

      <section id="liability" tabIndex={-1}>
        <h2>Liability &amp; risk</h2>
        <p>Liability will be limited to the amount paid for the affected service, to the extent permitted by law.</p>
      </section>

      <section id="contact" tabIndex={-1}>
        <h2>Contact</h2>
        <p>Email: <a className="underline underline-offset-4" href="mailto:billing@rangiandraratihanara.com">billing@rangiandraratihanara.com</a></p>
      </section>
    </LegalPage>
  );
}
