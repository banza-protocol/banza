import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GITHUB_URL } from "@/lib/site";

// The English counterpart of /licenca. Only the Website's explanatory layer is translated: LICENSE,
// NOTICE and TRADEMARKS.md remain the canonical artifacts and are linked, not restated. A translated
// paraphrase of licence clauses would read like a second licence, and there is only one.

export const metadata: Metadata = {
  title: "Licence and trademarks",
  description:
    "BANZA is open source under the Apache License 2.0. The licence does not automatically grant rights over the BANZA, BanzAI or Banzami trademarks. Attribution in NOTICE; trademark policy in TRADEMARKS.",
  alternates: { canonical: "/en/license" },
};

export default function LicensePage() {
  return (
    <>
      <PageHero
        eyebrow="LICENCE AND TRADEMARKS"
        title={<>Open source under Apache-2.0 — trademarks kept separate.</>}
        lede={
          <>
            BANZA&rsquo;s code, contracts and specifications are open source under the{" "}
            <strong>Apache License 2.0</strong>. The licence does not automatically grant rights to use the
            BANZA, BanzAI or Banzami trademarks — the licence and the trademark are handled separately.
          </>
        }
        chips={[{ label: "APACHE LICENSE 2.0" }, { label: "OPEN FINANCIAL PROTOCOL" }, { label: "TRADEMARKS SEPARATE" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT THE LICENCE COVERS</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              The <strong className="text-ink">Apache License 2.0</strong> grants the rights to use, reproduce,
              modify and distribute the covered code and documentation, on its terms. You do not need to ask
              Banzami for permission to use, study, modify or distribute the code the licence covers. The
              canonical text is in <a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener" className="link-bordo">LICENSE</a>;
              the institutional attribution is in <a href={`${GITHUB_URL}/blob/main/NOTICE`} rel="noopener" className="link-bordo">NOTICE</a>.
            </p>
            <p>
              The <strong className="text-ink">licence grants no trademark rights.</strong> Use of the BANZA,
              BanzAI and Banzami names and logos is governed by the trademark policy in{" "}
              <a href={`${GITHUB_URL}/blob/main/TRADEMARKS.md`} rel="noopener" className="link-bordo">TRADEMARKS.md</a>.
              Nominative reference, attribution, forks that declare themselves forks, and compatibility
              statements (&ldquo;implements the BANZA protocol&rdquo;) are permitted where they do not suggest
              approval, certification or partnership.
            </p>
            <p>
              BANZA was originally created by <strong className="text-ink">BANZAMI - TECNOLOGIA E
              SERVIÇOS, LDA.</strong> (original creator and initial institutional maintainer) and is governed by
              the repository&rsquo;s public processes (see <Link href="/en/open-governance" className="link-bordo">governance</Link>).
              BANZA is an open financial protocol — it is not a bank, a PSP, a wallet or a financial operator.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener" className="link-bordo">LICENSE ↗</a>
            <a href={`${GITHUB_URL}/blob/main/NOTICE`} rel="noopener" className="link-bordo">NOTICE ↗</a>
            <a href={`${GITHUB_URL}/blob/main/TRADEMARKS.md`} rel="noopener" className="link-bordo">TRADEMARKS ↗</a>
            <Link href="/en/open-governance" className="link-bordo">Governance</Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
