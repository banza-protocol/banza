import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getReferenceChapters, getReferenceMeta, chapterSlug } from "@/lib/reference";
import { GITHUB_URL } from "@/lib/site";

// Reference INDEX, English edition — the cover and index of the official English Reference. The full
// single-page rendering is at /en/reference/full; each chapter at /en/reference/<slug>.
//
// The chapter list is read from the shared semantic definitions, so it cannot drift from the Portuguese
// edition's set or order. Only the framing copy on this page is page-authored, exactly as on the
// Portuguese index: an entry page is a door, not a chapter zero.

export const metadata: Metadata = {
  title: "Protocol Reference",
  description:
    "The official descriptive Reference for the BANZA v1.0 protocol (pre-production), organised by chapter: architecture, trust, conformance, evidence, federation and governance. It describes the protocol; it confers no status on any operator.",
  alternates: {
    canonical: "/en/reference",
    languages: { "pt-PT": "/referencia", en: "/en/reference" },
  },
};

// Current, verified public state — invariants only, never transitory runtime values. Live detail: /estado.
const STATE: string[] = [
  "BANZA protocol v1.0, in pre-production.",
  "Zero operators in production — the Technical Registry returns an empty list.",
  "No production certification; the Conformance and Interoperability Certification model (Layer 2) is active.",
  "Real payments are switched off.",
  "The reference implementation (Operator Zero) exists only in a test environment, read-only.",
  "Production federation is not yet active.",
];

export default function EnReferencePage() {
  const chapters = getReferenceChapters("en");
  const { version } = getReferenceMeta("en");

  return (
    <>
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(44px,6vw,80px)]">
          <div className="band-eyebrow mb-4">PROTOCOL REFERENCE</div>
          <h1 className="font-display max-w-[20ch] text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.05] text-creme-high">
            BANZA Protocol Reference
          </h1>
          <p className="mt-5 max-w-[62ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">
            Specifications, architecture, profiles, trust, conformance, evidence, federation and
            governance of the BANZA protocol — organised by chapter.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRE-PRODUCTION"].map((c) => (
              <span key={c} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {c}
              </span>
            ))}
          </div>
        </Container>
      </header>

      <section className="border-b border-line bg-paper">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="eyebrow mb-4">ABOUT THIS REFERENCE</div>
          <div className="max-w-[74ch] space-y-4 text-[15px] leading-[1.7] text-ink-4">
            <p>
              This is the official English edition of the BANZA protocol Reference, the translation of the
              canonical Portuguese Reference. It organises the protocol&apos;s concepts, rules and public
              surfaces by chapter. The canonical, verifiable sources — the contracts, the invariants, the
              conformance vectors, the signed metadata and the published evidence — define the applicable
              requirements; this Reference describes and organises them, and does not replace them.
            </p>
            <p>
              ADRs record adopted decisions and RFCs present proposals still in governance. The Reference is
              self-contained — it can be read without consulting other sources — but it points to them where
              they define the technical detail. Where a statement depends on the current state of an
              implementation, it must be confirmed on the verifiable surfaces.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-paper-2">
        <Container width="site" className="py-[clamp(24px,3.5vw,40px)]">
          <div className="eyebrow mb-4">CURRENT STATE</div>
          <ul className="m-0 grid max-w-[80ch] list-none grid-cols-1 gap-2 p-0 text-[14px] leading-[1.6] text-ink-4">
            {STATE.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-pend">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-paper">
        <Container width="site" className="py-[clamp(32px,4vw,56px)]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="eyebrow">CHAPTERS</div>
            <Link href="/en/reference/full" className="link-bordo text-[13px]">
              Read on a single page →
            </Link>
          </div>
          <ol className="mt-5 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2">
            {chapters.map((c) => {
              const slug = chapterSlug(c.num, "en");
              if (!slug) return null;
              return (
                <li key={c.num}>
                  <Link
                    href={`/en/reference/${slug}`}
                    className="flex items-baseline gap-2.5 rounded-protocol border border-line bg-paper-2 px-4 py-3 text-[14px] leading-snug text-ink-3 no-underline transition-colors hover:border-bordo hover:text-bordo"
                  >
                    <span className="font-mono text-[11px] text-ink-5">{String(c.num).padStart(2, "0")}</span>
                    <span className="font-medium">{c.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section className="border-t border-line bg-paper-2">
        <Container width="site" className="py-7">
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/en/reference/conformance-certification" className="link-bordo">Conformance and Certification</Link>
            <Link href="/en/reference/trust" className="link-bordo">Trust</Link>
            <Link href="/en/reference/developer-resources" className="link-bordo">Developer Resources</Link>
            <a href={GITHUB_URL} rel="noopener" className="link-bordo">GitHub ↗</a>
          </div>
        </Container>
      </section>
    </>
  );
}
