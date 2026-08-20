import type { Metadata } from "next";
import { PageHero, Section, Container, MoreLink } from "@/components/ui";

// English edition of the WHY BANZA framing page. Translated semantically from the Portuguese page, which is
// the source for website-authored editorial prose — this content is not generated from the Reference, so
// there is no official English text to render. Reference terminology is reused where a BANZA concept already
// has an established English name.
//
// The claim being made is deliberately narrow and must stay that way in translation: interoperability
// between operators ALREADY works, and BANZA adds a public, reproducible specification/conformance/evidence
// layer on top of it. It complements the infrastructures in use; it does not replace them. Translating that
// into "BANZA enables interoperability" would be a claim the Portuguese page does not make.
//
// Reader-facing Reference links point at the English Reference through its semantic counterpart, never by
// prefixing the Portuguese path.

export const metadata: Metadata = {
  title: "Why BANZA exists",
  description:
    "Interoperability between operators already exists — through bilateral integrations and shared infrastructures with controlled participation. What is rarely public and reproducible by third parties is the specification, conformance and evidence layer. BANZA adds that open layer; it complements the infrastructures in use rather than replacing them.",
  alternates: {
    canonical: "/en/why-banza",
    languages: { "pt-PT": "/porque-existe", en: "/en/why-banza" },
  },
};

export default function EnWhyBanzaPage() {
  return (
    <>
      <PageHero
        eyebrow="WHY IT EXISTS"
        title={<>An open layer over the interoperability that already exists.</>}
        lede={
          <>
            Interoperability between operators is already provided — through bilateral integrations and
            shared infrastructures with controlled participation. What is missing, and what BANZA adds, is
            an open layer in which the rules, the tests and the evidence are public and reproducible by
            third parties. BANZA complements the infrastructures in use; it does not replace them.
          </>
        }
        chips={[{ label: "OPEN LAYER" }, { label: "VERIFIABLE INTEROPERABILITY" }, { label: "OPEN FINANCIAL PROTOCOL" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">THE PROBLEM</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              Operational interoperability between operators already exists — through bilaterally negotiated
              integrations and through shared infrastructures with controlled participation (membership,
              technical adequacy and authorisation). These models make operation work, but their
              specifications, tests and results are usually private, or available only to authorised
              participants.
            </p>
            <p>
              The consequence is that a third party can rarely reproduce the technical validation
              independently: the rules, the test vectors and the evidence are not public. Each new
              integration repeats similar work, with slightly different criteria and results that are hard to
              compare.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT BANZA ADDS</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              BANZA adds an open layer to that interoperability: public rules, versioned profiles,
              conformance tests, interoperability verification and technical certification. An
              implementation that follows the protocol can demonstrate conformance and interoperate through a
              common profile — and any third party can reproduce that validation from the same public
              artifacts. BANZA complements the infrastructures in use; it does not replace them.
            </p>
            <p>
              The protocol is operator-neutral, and participation is demonstrated by verifiable evidence
              rather than by private approval. It is the public basis on which independent operators can
              compete on products and cooperate on interoperability.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/why-banza-exists">Full rationale — Reference chapter</MoreLink>
            <MoreLink href="/en/reference/what-banza-is">What BANZA is</MoreLink>
            <MoreLink href="/en/architecture">The three-layer architecture</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
