import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GITHUB_URL } from "@/lib/site";

// English edition of the open-governance page, translated semantically from the Portuguese one.
//
// "Open governance" is the phrase in this milestone most likely to be mistranslated INTO A STRONGER CLAIM
// than the source makes, in either direction, so three things are deliberate.
//
// First, open is not absent. The Portuguese page describes a governance model with named roles and a
// defined procedure — anyone may propose, the active maintainers review and integrate through the public
// process — so "permissionless", "leaderless" and "no authority" are all absent here. They would describe
// a different model, not a translation of this one.
//
// Second, governing the RULES is not operating a scheme. The page's load-bearing sentence is that
// governance does not license, does not approve and does not certify operators, does not issue financial
// licences and does not replace regulators; operators implement independently and interoperability rests
// on evidence rather than private approval. That is carried in full.
//
// Third, Banzami is named exactly as the source names it — original creator and initial institutional
// maintainer, a governance role — together with the qualification that the protocol is nonetheless
// governed by the repository's public processes. Deleting the attribution would make the English page
// vaguer about who maintains BANZA than the Portuguese one; inflating it into ownership of the rules would
// contradict the same sentence.
//
// Not imported: the page does not discuss the Trust Root, the authority set or the relationship between
// institutional legitimacy and cryptographic verification. Those are true elsewhere and are not this
// page's statement.

export const metadata: Metadata = {
  title: "Open governance",
  description:
    "BANZA was originally created by Banzami and is maintained as an open financial protocol through public governance on GitHub: issues, pull requests, ADRs, RFCs, specifications and releases.",
  alternates: {
    canonical: "/en/open-governance",
    languages: { "pt-PT": "/governanca", en: "/en/open-governance" },
  },
};

const MECHANISMS = [
  "Issues",
  "Pull requests",
  "Code review",
  "ADRs",
  "RFCs",
  "Specifications",
  "Releases",
  "Conformance tests",
  "Public evidence",
];

export default function EnOpenGovernancePage() {
  return (
    <>
      <PageHero
        eyebrow="OPEN GOVERNANCE"
        title={<>Public governance, today — on GitHub.</>}
        lede={
          <>
            BANZA was originally created by <strong>BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.</strong>, its
            original creator and initial institutional maintainer. Governance of the protocol is open
            today and happens in the public GitHub repository — it is not a future promise.
          </>
        }
        chips={[{ label: "OPEN FINANCIAL PROTOCOL" }, { label: "PUBLIC GOVERNANCE" }, { label: "APACHE-2.0" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">HOW THE PROTOCOL EVOLVES</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              A change enters the protocol through public artifacts:{" "}
              <span className="font-mono text-[13px]">
                proposal → issue/RFC/ADR → review → implementation → tests → merge → release → Reference
                update
              </span>
              . Anyone may propose; the active maintainers review and integrate through the public process.
            </p>
            <p>
              <strong className="text-ink">
                Banzami is the original creator and initial institutional maintainer
              </strong>
              , but the protocol is governed by the repository&rsquo;s public processes. No operator is
              approved or certified by private decision; normative changes require public artifacts.
            </p>
            <p>
              Governance{" "}
              <strong className="text-ink">does not license, does not approve and does not certify
              operators</strong>
              , does not issue financial licences and does not replace regulators.{" "}
              <strong className="text-ink">BanzAI guides and explains; it does not create rules</strong> —
              new rules enter only through public governance. Operators implement the protocol
              independently and publish verifiable evidence; interoperability between peers rests on
              evidence, not on private approval.
            </p>
            <p>
              Taking part in governance{" "}
              <strong className="text-ink">does not automatically grant trademark rights</strong> (see{" "}
              <Link href="/en/license" className="link-bordo">
                licence and trademarks
              </Link>
              ).
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {MECHANISMS.map((m) => (
              <span key={m} className="rounded-protocol border border-line bg-white px-3 py-1.5 font-mono text-[11px] text-ink-4">
                {m}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/en/reference/governance" className="link-bordo">
              Reference · Governance
            </Link>
            <a href={`${GITHUB_URL}/blob/main/GOVERNANCE.md`} rel="noopener" className="link-bordo">
              GOVERNANCE.md ↗
            </a>
            <a href={`${GITHUB_URL}/blob/main/MAINTAINERS.md`} rel="noopener" className="link-bordo">
              MAINTAINERS.md ↗
            </a>
            <Link href="/en/decisions" className="link-bordo">
              ADRs and RFCs
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
