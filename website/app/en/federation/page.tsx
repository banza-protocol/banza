import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// English edition of the federation page, translated semantically from the Portuguese one.
//
// The Portuguese page is unusually careful about what it does NOT claim, and that restraint is the thing
// most easily lost in translation. "Federation" in English pulls hard towards consensus networks and
// automatic settlement, so every qualification is preserved deliberately: this is local, per-interaction
// TECHNICAL evaluation of routing conditions, established by published verifiable evidence — not a network
// that moves real money by itself, not "without intermediaries", not "without approval", and not a global
// shared state. Contracts, participation, risk, settlement, responsibilities and authorisation stay in each
// participant's own applicable domain.
//
// Links point at English counterparts where they exist. Trust, architecture and protocol state are not yet
// translated, so those links stay Portuguese rather than pointing at routes that do not exist — a dead
// English link would be worse than an honest cross-locale one, and the route registry is what decides.

export const metadata: Metadata = {
  title: "Federation",
  description:
    "BANZA federation enables technical discovery and verification through common rules and profiles, reducing the need to rebuild bilateral technical integrations between every pair of participants. Contracts, participation, risk, settlement, responsibilities and authorisation remain in the applicable domain. Production federation is not active in pre-production.",
  alternates: {
    canonical: "/en/federation",
    languages: { "pt-PT": "/federacao", en: "/en/federation" },
  },
};

const REQUIRES = [
  {
    t: "Applicable conformance scope",
    b: "The implementation demonstrates the conformance scope required for the intended route.",
  },
  {
    t: "Valid and fresh metadata and evidence",
    b: "Verifiable Signed Protocol Metadata and evidence, within the freshness window.",
  },
  {
    t: "Absence from the Revocation List",
    b: "Keys and artifacts do not appear on the signed revocation list (checked closed by default).",
  },
  {
    t: "Production conditions",
    b: "The public production conditions are satisfied — which is not the case in pre-production.",
  },
] as const;

const REMAINS = ["Contracts", "Participation", "Risk", "Settlement", "Responsibilities", "Authorisation"];

export default function EnFederationPage() {
  return (
    <>
      <PageHero
        eyebrow="FEDERATION"
        title={<>Interoperate by evidence, not by bilateral integration.</>}
        lede={
          <>
            Federation enables technical discovery and verification through common rules and profiles,
            reducing the need to rebuild bilateral technical integrations between every pair of
            participants. It is not an automatic real-payments network, and it does not remove the need for
            contracts, responsibilities or authorisation.
          </>
        }
        chips={[
          { label: "BY PUBLISHED EVIDENCE" },
          { label: "OPEN TRUST EVALUATION" },
          { label: "PRODUCTION FEDERATION NOT ACTIVE" },
        ]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT FEDERATION IS</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              Federation is the technical, local, per-interaction evaluation of the conditions for routing
              payments between independent operators — established by published, verifiable evidence and by
              Open Trust Evaluation over signed metadata, rather than by each pair of operators rebuilding
              the same bilateral technical integration. That is why interoperability can grow without every
              participant having to rebuild the same technical integration with every other one.
            </p>
            <p>
              This is a technical property of the protocol — discovery and verification through common rules
              and profiles. It is not &ldquo;without intermediaries&rdquo;, not &ldquo;without
              approval&rdquo;, and not a network that connects real payments by itself.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT FEDERATION REQUIRES</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Routing to a peer is not automatic: every condition is verifiable, and all of them must hold. In
            pre-production, production federation is not active.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {REQUIRES.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT REMAINS IN THE APPLICABLE DOMAIN</div>
          <p className="mb-6 text-[15px] leading-[1.7] text-ink-3">
            Technical federation reduces the integration work between peers — but it does not absorb what
            belongs to operators, to schemes and to regulators. The following remain in the domain
            applicable to each participant:
          </p>
          <div className="mb-8 flex flex-wrap gap-2">
            {REMAINS.map((m) => (
              <span key={m} className="rounded-protocol border border-line bg-white px-3 py-1.5 font-mono text-[11px] text-ink-4">{m}</span>
            ))}
          </div>
          <StatusNote tone="pend">
            Technical interoperability and federation do not constitute regulatory approval, and do not
            replace contracts or legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Settlement and
            the movement of real money occur under each operator&rsquo;s own authorisations — and remain
            switched off in pre-production.
          </StatusNote>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/federation">Federation — Reference chapter</MoreLink>
            <MoreLink href="/en/reference/trust">The trust that underpins federation</MoreLink>
            <MoreLink href="/en/why-banza">Why BANZA exists</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
