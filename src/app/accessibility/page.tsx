import LegalPage from "@/components/LegalPage";
const LAST_UPDATED = "25 August 2025";

export const metadata = {
  title: "Accessibility",
  description: "Our commitment to accessibility and the current WCAG 2.1 AA checklist.",
};

export default function Page() {
  const toc = [
    { href: "#commitment", label: "Our commitment" },
    { href: "#what-we-do", label: "What we do" },
    { href: "#checklist", label: "WCAG 2.1 AA checklist" },
    { href: "#feedback", label: "Feedback & requests" },
  ];

  return (
    <LegalPage
      title="Accessibility"
      lastUpdated={LAST_UPDATED}
      intro="We aim to make the reunion app usable for everyone. Here’s what we’ve done and what we’re improving."
      toc={toc}
    >
      <section id="commitment" tabIndex={-1}>
        <h2>Our commitment</h2>
        <p>
          We strive to meet WCAG 2.1 AA. Pages use semantic HTML, landmarks, keyboard support, and text alternatives
          for media where practicable.
        </p>
      </section>

      <section id="what-we-do" tabIndex={-1}>
        <h2>What we do</h2>
        <ul>
          <li>Provide consistent landmarks: header, nav, main, and clear headings.</li>
          <li>Ensure focus states are visible and keyboard navigation works across interactive elements.</li>
          <li>Use alt text or labelled alternatives for gallery items and icons.</li>
          <li>Maintain colour contrast that meets AA standards for text and UI controls.</li>
          <li>Announce dynamic content changes responsibly (e.g., toasts are supplementary).</li>
        </ul>
      </section>

      <section id="checklist" tabIndex={-1}>
        <h2>WCAG 2.1 AA checklist</h2>
        <ul>
          <li>Provide alt text for images and posters for videos.</li>
          <li>Ensure all links and buttons have discernible text.</li>
          <li>Verify keyboard access for uploads, sliders, and dialog components.</li>
          <li>Use headings in order (one <code>h1</code> per page; then <code>h2</code>, <code>h3</code>...).</li>
          <li>Maintain contrast (≥4.5:1 text; ≥3:1 large text and UI components).</li>
          <li>Provide a “Skip to content” link (already included here).</li>
          <li>Ensure form fields have programmatic labels and clear errors.</li>
          <li>Don’t rely on colour alone to convey meaning.</li>
          <li>Give users control over motion/auto-play; avoid auto-playing sound.</li>
          <li>Test with screen readers and keyboard only flows periodically.</li>
        </ul>
      </section>

      <section id="feedback" tabIndex={-1}>
        <h2>Feedback &amp; requests</h2>
        <p>
          If you encounter accessibility issues, email{" "}
          <a className="underline underline-offset-4" href="mailto:accessibility@rangiandraratihanara.com">
            accessibility@rangiandraratihanara.com
          </a>{" "}
          with details (page URL, browser, assistive tech, steps). We’ll respond as soon as we can.
        </p>
      </section>
    </LegalPage>
  );
}
