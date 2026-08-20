import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { ReferenceMarkdown } from "@/components/reference/ReferenceMarkdown";
import { ReferenceNav } from "@/components/reference/ReferenceNav";
import { getReferenceMarkdown, getReferenceOutline, getReferenceMeta } from "@/lib/reference";

// The single-page rendering of the official English Reference. Its Portuguese counterpart is
// /referencia/completa, and the two are reciprocal alternates: same document, two editions.
//
// Nothing here is translated. The English text comes from docs/reference/en/BANZA_REFERENCE.md through the
// generated mirror, exactly as the Portuguese page reads the canonical Portuguese edition — the website
// renders the Reference, it does not author it. The rendering components are shared and locale-neutral;
// only the data source and the labels differ.

export const metadata: Metadata = {
  title: "Full Reference (single page)",
  description:
    "The official BANZA v1.0 protocol Reference on a single page — every chapter and internal anchor. Pre-production; public registry with no indexed evidence.",
  alternates: {
    canonical: "/en/reference/full",
    languages: { "pt-PT": "/referencia/completa", en: "/en/reference/full" },
  },
};

// The same standing qualifications the Portuguese page carries. They are statements of current protocol
// state, so they must not soften in translation: an English reader is owed the same caveats.
const TRUTH = [
  "Public registry with no indexed evidence",
  "PASS = verifiable and reproducible evidence",
  "Trust metadata pending",
  "Production federation not active",
];

export default function EnReferenceFullPage() {
  const markdown = getReferenceMarkdown("en");
  const outline = getReferenceOutline("en");
  const { version, data } = getReferenceMeta("en");

  return (
    <>
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(36px,5vw,64px)]">
          <div className="band-eyebrow mb-4">
            <Link href="/en/reference" className="text-creme-mid no-underline hover:text-creme-high">
              REFERENCE
            </Link>{" "}
            · SINGLE PAGE
          </div>
          <h1 className="font-display max-w-[22ch] text-[clamp(26px,3.8vw,44px)] font-semibold leading-[1.08] text-creme-high">
            Full Reference
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6] text-creme-mid">
            Every chapter on a single page, with all internal anchors. To read chapter by chapter, use
            the <Link href="/en/reference" className="text-creme-high underline">Reference index</Link>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRE-PRODUCTION", ...(data ? [data] : [])].map((c) => (
              <span key={c} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {c}
              </span>
            ))}
          </div>
        </Container>
      </header>

      <section className="border-b border-line bg-paper-2">
        <Container width="site" className="py-5">
          <div className="flex flex-wrap gap-2">
            {TRUTH.map((t) => (
              <span key={t} className="rounded-protocol border border-pend/30 bg-tint-gold px-3 py-1.5 font-mono text-[11px] text-pend">
                {t}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-paper">
        <Container width="site" className="py-[clamp(32px,4vw,56px)]">
          <div className="grid grid-cols-1 gap-[clamp(20px,4vw,56px)] lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <ReferenceNav
                outline={outline}
                variant="full"
                chapterBase="/en/reference"
                chaptersLabel="CHAPTERS"
              />
            </aside>
            <article className="min-w-0 max-w-[820px]">
              <ReferenceMarkdown markdown={markdown} />
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}
