import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// English edition of the operators page, translated semantically from the Portuguese one.
//
// THE PAGE IS A SET OF DISTINCTIONS, and English erodes exactly the ones it is made of.
//
// "Operator" in English slides towards "approved participant", and "registry" towards "list of licensed
// firms". The Portuguese page exists to prevent both readings: it separates entity, operator,
// implementation, certified implementation, scheme participant and end user, and says plainly that BANZA
// certifies implementations — identified by artifact hash — and never entities. Every one of those six
// roles is carried across, because dropping any of them collapses the distinction the page owns.
//
// The empty registry is stated as a positive, verifiable fact rather than softened into "not yet
// populated": /operators = [] is the honest state, and the page's own claim is that absence from the
// registry is not a regulatory prohibition. That qualification is preserved verbatim in meaning.
//
// Nothing is imported. The page does not enumerate the certification record fields (that is the
// certification page's material) and does not restate the three institutional layers (that is the
// architecture page's). What is true elsewhere is not this page's statement.

export const metadata: Metadata = {
  title: "Operators — roles, implementations and evidence",
  description:
    "Operators in the BANZA protocol — roles, implementations and verifiable evidence. The current state is verified directly through the public machine routes (GET /operators); the canonical index is the Technical Registry. The registry is not a list of operators licensed, approved or admitted — participation is demonstrated by verifiable evidence, it is not granted by a central authority.",
  alternates: {
    canonical: "/en/operators",
    languages: { "pt-PT": "/operadores", en: "/en/operators" },
  },
};

// The distinct roles the public surface must keep separate. The registry certifies implementations,
// never entities — so "certified operator" is never a thing here.
const ROLES = [
  {
    k: "ENTITY",
    t: "Entity",
    b: "An independent legal person — a company. It holds rights and obligations; it is not the subject of certification.",
  },
  {
    k: "OPERATOR",
    t: "Operator",
    b: "The responsible entity that implements BANZA to process payments on its own systems, under its own regulatory authorisations. BANZA is not an operator. Validating an operator means evaluating one of its published implementations.",
  },
  {
    k: "IMPLEMENTATION",
    t: "Implementation",
    b: "The technical system evaluated, and the subject of certification: a specific set of artifacts/build, identified by content hash — never an entity and never a brand. One operator may publish several.",
  },
  {
    k: "CERTIFIED IMPLEMENTATION",
    t: "Certified implementation",
    b: "An implementation that has demonstrated conformance and interoperability against a public, versioned profile, bound to its hash. A different build is a different subject.",
  },
  {
    k: "SCHEME PARTICIPANT",
    t: "Scheme participant",
    b: "An entity or implementation admitted by an operational scheme (Layer 3) under that scheme's own rules. Appearing in the technical registry is not being admitted to a scheme.",
  },
  {
    k: "END USER",
    t: "End user",
    b: "The person who uses an operator's product. Not a party to the protocol or to the registry — their relationship is with the operator.",
  },
] as const;

// Registry state — mirrors the machine routes (the verifiable source); this page is the human reading.
const PANEL = [
  { label: "BANZA Technical Registry", value: "0 entries — /operators returns []" },
  { label: "production_certificates", value: "false — no production artifacts indexed" },
  {
    label: "Revocation List",
    value: "Valid envelope, zero entries — a valid empty state; read closed by default",
  },
  { label: "Trust metadata", value: "In preparation — depends on the offline root-key ceremony" },
] as const;

// What the registry indexes per published operator (neutral, evidence-first framing).
const INDEXED = [
  {
    title: "Published manifests",
    body: "The manifest an operator publishes to describe itself and to point at its metadata and evidence.",
  },
  {
    title: "Metadata",
    body: "The operator's verifiable protocol metadata, bound to the protocol's delegated signing keys.",
  },
  {
    title: "Verifiable evidence",
    body: "Conformance evidence reproducible by third parties: recomputable hashes and re-runnable automation.",
  },
  {
    title: "Technical states",
    body: "Each entry's derived, recomputable technical state — a function of the published artifacts, never a seal granted by an authority and never a self-declared status.",
  },
  {
    title: "Chain verification",
    body: "The anchoring of metadata and evidence in the delegated keys of the Key Manifest, recomputable by any party. Trust evaluation between peers is local and per interaction — never an indexed state.",
  },
  {
    title: "Revocation",
    body: "Revoked keys and artifacts. A protocol security and trust mechanism — not a licence and not a sanction.",
  },
] as const;

// Operator-relevant machine routes (the verifiable source of the registry state).
const MACHINE_ROUTES = [
  {
    path: "/operators",
    what: "The BANZA Technical Registry — the index of metadata and verifiable evidence published by operators.",
    today:
      "An empty list ([]) — no operator evidence is indexed. Absence from the registry is not a regulatory prohibition.",
  },
  {
    path: "/conformance/evidence",
    what: "The canonical route: published conformance evidence, reproducible by any third party.",
    today:
      "Each record declares the automation version, the hashes and the freshness window that make it reproducible.",
  },
  {
    path: "/federation/revocation-list.json",
    what: "The Revocation List — revoked protocol keys and artifacts. A security and trust mechanism, not a licence and not a sanction.",
    today: "Present in its initial pre-production state: a valid envelope with zero entries.",
  },
] as const;

export default function EnOperatorsPage() {
  return (
    <>
      <PageHero
        eyebrow="OPERATORS · ROLES AND EVIDENCE"
        title={<>Who takes part in the protocol — and the evidence that proves it.</>}
        lede={
          <>
            This page explains the roles — entity, operator, implementation — and the verifiable
            evidence that demonstrates participation. The canonical index is the BANZA Technical
            Registry (explorable at /registo-tecnico; machine route /operators). It is not a list of
            operators licensed, approved or admitted: in BANZA participation is demonstrated by
            verifiable evidence, it is not granted by a central authority. Today the registry is empty —
            and that is exactly what the machine routes return.
          </>
        }
        chips={[
          { label: "PRE-PRODUCTION" },
          { label: "NO OPERATOR PUBLISHED" },
          { label: "VERIFIABLE EVIDENCE" },
          { label: "NO CENTRAL AUTHORITY" },
        ]}
      />

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHO IS WHO</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Entity, operator, implementation — these are not the same thing.
          </h2>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            BANZA certification applies to implementations, not to entities. Keeping these roles apart is
            what stops the registry being read as a list of centrally approved entities.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{r.k}</div>
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{r.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.b}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            An operator is not certified, and neither is an entity. What is certified is an
            implementation, bound to its artifact hash — and a different build is a different subject,
            needing its own certification.{" "}
            <strong className="text-ink">
              The operator is the responsible entity; the implementation is the technical system
              evaluated.
            </strong>{" "}
            So validating an operator means evaluating one of its published implementations: BanzAI
            resolves the target in this registry (operator → implementation → canonical origin →
            discovery) and official validation uses exclusively artifacts fetched from that
            implementation&rsquo;s public endpoints, by a secure Rust fetch layer — never by the browser
            (ADR-034).
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REGISTRY STATE · VERIFIABLE STATE</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {PANEL.map((r) => (
              <div key={r.label} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{r.label.toUpperCase()}</div>
                <div className="text-[14.5px] font-semibold leading-[1.45] text-ink">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            <strong className="text-ink">No operator published.</strong> No operator evidence is indexed
            today. The empty registry is not a failure: it is the verifiable statement that there is not
            yet any published evidence. Production publication of the trust metadata depends on the
            offline root-key ceremony and on the first published production conformance evidence.
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT THE REGISTRY INDEXES</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Every entry is verifiable evidence — never a seal that was granted.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            When an operator publishes, the registry indexes its metadata and its evidence for public
            verification. What is read here has to match what the machine routes return.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {INDEXED.map((c) => (
              <div key={c.title} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.title}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.body}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFY WITHOUT TRUSTING THIS SITE · MACHINE ROUTES</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Each route returns plain JSON. If what is written on this page does not match what these
            routes return, the routes win.
          </p>
          <div className="flex flex-col gap-[12px]">
            {MACHINE_ROUTES.map((r) => (
              <div key={r.path} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <a href={r.path} className="link-bordo break-all font-mono text-[13px]" title={`Open ${r.path} (returns JSON)`}>
                  {r.path}
                </a>
                <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">{r.what}</div>
                <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">Today: {r.today}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              The BANZA Technical Registry is an index of verifiable metadata and evidence. It is not a
              list of operators licensed, approved or admitted by BANZA, and technical conformance does
              not replace legal, regulatory, banking, KYC/KYB or AML/CFT obligations applicable to each
              operator. Nothing on this page constitutes regulatory approval. Operator A/B/C exist only in
              the documentation, as examples.
            </StatusNote>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/operators">Operators — Reference chapter</MoreLink>
            <MoreLink href="/en/status">The protocol&rsquo;s verifiable state</MoreLink>
            <MoreLink href="/en/reference/conformance-certification">
              How conformance and evidence work
            </MoreLink>
            <MoreLink href="/en/banzai">Explore with BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
