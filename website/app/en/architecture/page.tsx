import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// English edition of the architecture page, translated semantically from the Portuguese one.
//
// PAGE-LOCAL CLAIM DISCIPLINE. This page does NOT enumerate the five architectural invariants, so this
// translation does not add them: they are true elsewhere and are not this page's statement. What the page
// owns is the three-layer institutional model, BanzAI as a transversal interface that is explicitly not a
// layer and not an authority, and the three separate determinations with no propagation between them.
//
// The Banzami Operational Scheme IS named by the source page, together with its qualifications —
// regulatory preparation in progress, real payments switched off — so it is translated with those
// qualifications intact rather than dropped or softened. "BANZA is not Banzami" is one of the page's
// load-bearing sentences and survives verbatim in meaning.

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "The BANZA architecture in three layers: Layer 1 open protocol, Layer 2 Conformance and Interoperability Certification (per implementation, evidence-based, decided in Rust) and Layer 3 independent operational schemes — schemes built on the protocol under their own rules and authorisations; the first is the Banzami Operational Scheme, with Banzami as the designated scheme operator (regulatory preparation in progress, real payments switched off). BanzAI is the primary, transversal human interface — it is not a layer.",
  alternates: {
    canonical: "/en/architecture",
    languages: { "pt-PT": "/arquitectura", en: "/en/architecture" },
  },
};

type Layer = {
  tag: string;
  name: string;
  role: string;
  body: string;
  bullets: string[];
  status?: string;
};

const LAYERS: Layer[] = [
  {
    tag: "Layer 1",
    name: "BANZA · Protocol",
    role: "Open and neutral",
    body:
      "The layer common to every operator: the public rules that define what is correct. It executes nothing and belongs to no operator.",
    bullets: [
      "Contracts (OpenAPI), schemas and messages",
      "Financial invariants and reason codes",
      "Technical identity, manifests and signed metadata",
      "Discovery, profiles, trust and revocation",
      "Technical registry and federation",
    ],
  },
  {
    tag: "Layer 2",
    name: "Conformance and Interoperability Certification",
    role: "Per implementation · evidence-based · decided in Rust",
    body:
      "A reproducible, hash-linked determination that an implementation has demonstrated conformance and interoperability against a public, versioned profile, with limited scope and validity. It certifies an implementation (identified by the artifact hash), never an entity.",
    bullets: [
      "Public, versioned certification profile",
      "Conformance + interoperability as evidence",
      "Verdict decided by the Rust engines, with a reason code",
      "States: NOT_CERTIFIED · CERTIFIED · EXPIRED · SUSPENDED · REVOKED · SUPERSEDED",
      "It is not a licence, scheme admission or regulatory authorisation",
    ],
  },
  {
    tag: "Layer 3",
    name: "Independent operational schemes",
    role: "The first: Banzami Operational Scheme · in regulatory preparation",
    body:
      "Schemes built on the protocol under their own rules and authorisations. The first is the Banzami Operational Scheme, promoted and administered by Banzami — Tecnologia e Serviços, Lda. as the designated scheme operator, conditional on obtaining the applicable regulatory framework. It is one scheme among other possible ones; BANZA certification is not exclusive to it. BANZA is not Banzami.",
    bullets: [
      "Admission of participants under the scheme's own rules",
      "Participant directory distinct from the technical registry (Layer 2)",
      "Separated from Layer 1 and Layer 2 in infrastructure, keys and data",
    ],
    status:
      "Designated scheme operator: Banzami · regulatory preparation in progress · real payments switched off.",
  },
];

// Three separate determinations — none implies another (non-propagation).
const DETERMINATIONS = [
  {
    t: "Technical certification (Layer 2)",
    b: "“this implementation passed this profile, with this evidence, in this scope, until this date”. Decided in Rust. It grants access to no scheme and authorises no regulated activity.",
  },
  {
    t: "Admission to a scheme (Layer 3)",
    b: "a scheme's decision to admit a participant, under its own due diligence, eligibility and contracts. It may require valid certification, but is never implied by it.",
  },
  {
    t: "Regulatory authorisation",
    b: "granted by the competent regulator to conduct regulated financial activity. BANZA is not a party: it does not grant it, does not accelerate it and does not replace it.",
  },
] as const;

export default function EnArchitecturePage() {
  return (
    <>
      <PageHero
        eyebrow="ARCHITECTURE"
        title={<>Three layers. One interface.</>}
        lede={
          <>
            BANZA permanently separates what the rule is, what proves an implementation respects it, and
            what it means to operate a real service. These are three distinct layers — protocol, technical
            certification and operational scheme — crossed by a primary, transversal human interface,
            BanzAI, which is not a fourth layer.
          </>
        }
        chips={[
          { label: "LAYER 1 · PROTOCOL" },
          { label: "LAYER 2 · TECHNICAL CERTIFICATION" },
          { label: "LAYER 3 · OPERATIONAL SCHEME" },
          { label: "BANZAI · TRANSVERSAL INTERFACE" },
        ]}
      />

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">THE THREE LAYERS</div>
          <div className="flex flex-col gap-[14px]">
            {LAYERS.map((l) => (
              <div key={l.tag} className="rounded-cardish border border-line bg-white p-[clamp(18px,2.4vw,28px)]">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="rounded-protocol border border-bordo/20 bg-tint-bordo px-2.5 py-1 font-mono text-[12px] font-semibold tracking-[0.04em] text-bordo">
                    {l.tag}
                  </span>
                  <h2 className="font-serif text-[clamp(18px,2vw,24px)] font-semibold leading-[1.2] text-ink">
                    {l.name}
                  </h2>
                  <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-5">{l.role}</span>
                </div>
                <p className="mt-3 max-w-[80ch] text-[14.5px] leading-[1.65] text-ink-3">{l.body}</p>
                <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {l.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-ink-4">
                      <span aria-hidden className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-bordo/60" />
                      {b}
                    </li>
                  ))}
                </ul>
                {l.status && (
                  <div className="mt-4 rounded-cardish border border-pend/30 bg-tint-gold px-4 py-2.5 font-mono text-[12px] leading-[1.5] text-pend">
                    {l.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">BANZAI — PRIMARY, TRANSVERSAL HUMAN INTERFACE</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              <strong className="text-ink">BanzAI</strong> is the primary, transversal human interface, at{" "}
              <span className="font-mono text-[13px]">/banzai</span>, through which people carry out each
              workflow across the three layers — asking and validating. It guides, invokes the Rust engines
              and explains; machine consumers keep direct access to the APIs.
            </p>
            <p>
              BanzAI <strong className="text-ink">is not a layer and not an authority</strong>: it does not
              decide, does not certify, does not admit, does not publish, does not activate funds and does
              not change a state or a reason code. <strong className="text-ink">Rust decides; Qwen
              explains</strong> — once, and never decides.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">THREE DISTINCT DETERMINATIONS</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Certifying is not admitting; admitting is not authorising.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            These are three separate decisions, with different owners. None implies another — there is no
            propagation between layers.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            {DETERMINATIONS.map((d) => (
              <div key={d.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{d.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{d.b}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              Technical conformance with BANZA does not replace legal, regulatory, banking, KYC/KYB or
              AML/CFT obligations. Contracts, eligibility, risk, settlement, responsibilities and
              authorisation remain in the domain applicable to each operator and scheme. Nothing on this
              page constitutes regulatory approval.
            </StatusNote>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/protocol-architecture">Architecture — Reference chapter</MoreLink>
            <MoreLink href="/en/trust">Trust and verification</MoreLink>
            <MoreLink href="/en/federation">Federation</MoreLink>
            <MoreLink href="/en/why-banza">Why BANZA exists</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
