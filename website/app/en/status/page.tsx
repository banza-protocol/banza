import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { GITHUB_URL, BANZAI_GITHUB_URL } from "@/lib/site";
import { fetchBanzaiRuntimeRow } from "@/lib/runtimeStatusRow";

// English edition of the protocol-status page, translated semantically from the Portuguese one.
//
// LIFECYCLE FIDELITY IS THE WHOLE POINT OF THIS PAGE, so two things are handled deliberately.
//
// First, the specification is published and versioned — NOT frozen. contracts/production/protocol-version.json
// is the authority (lifecycle_state.protocol_frozen = false; _release_state "Pre-release. No externally frozen
// BANZA target has been published"), and "versioned" and "frozen" are different states. The Portuguese page
// claimed frozen; that claim was corrected at its source rather than translated, because a translation is not
// the place to fix a false statement and publishing it in a second language would only double it.
//
// Second, the BanzAI row is NOT written here. It is derived from the runtime SSOT by lib/runtimeStatusRow.ts,
// the same module the Portuguese page uses, so the two editions cannot disagree about what the service
// reports. Where this page's prose and the machine route differ, the route wins — which only means anything
// if there is one derivation, not one per language.

export const metadata: Metadata = {
  title: "Protocol Status",
  description:
    "The verifiable public state of the BANZA protocol: pre-production, specification v1.0.0 published and versioned but not yet frozen for external implementation, a public registry with no indexed evidence, and production publication of the trust metadata dependent on the offline root-key ceremony. Verify each claim directly through the public machine routes.",
  alternates: {
    canonical: "/en/status",
    languages: { "pt-PT": "/estado", en: "/en/status" },
  },
};

// Static, citable status panel. Values mirror the machine routes below — the machine routes are the
// verifiable source; this page is the human explanation.
const PANEL_STATIC = [
  {
    label: "Specification",
    value: "v1.0.0 — published and versioned; not yet frozen for external implementation",
    tone: "pend",
  },
  {
    label: "Architecture",
    value:
      "Three layers — Layer 1 open protocol · Layer 2 conformance and interoperability certification · Layer 3 independent operational schemes",
    tone: "ok",
  },
  { label: "Environment", value: "Pre-production", tone: "pend" },
  { label: "BANZA Technical Registry (Layer 2)", value: "0 entries — /operators returns []", tone: "pend" },
  { label: "production_certificates", value: "false — no production certification records", tone: "pend" },
  {
    label: "Conformance and interoperability certification (Layer 2)",
    value:
      "Model active — per implementation, evidence-based and decided by Rust; no production certification",
    tone: "pend",
  },
  {
    label: "Conformance verification",
    value: "Available — produces evidence third parties can reproduce",
    tone: "ok",
  },
  {
    label: "Operator Zero",
    value:
      "Read-only reference implementation · NOT_CERTIFIED · no real money · validated in BanzAI from its own public endpoints",
    tone: "ok",
  },
  {
    label: "Real payments",
    value: "Switched off — activation depends on a single gate that is closed by default",
    tone: "pend",
  },
  {
    label: "Banzami Operational Scheme (Layer 3)",
    value: "In regulatory preparation — authorisation not granted",
    tone: "pend",
  },
] as const;

const MACHINE_ROUTES = [
  {
    path: "/.well-known/banza/root.json",
    what: "The protocol's root manifest (a public trust artifact).",
    today:
      "A pre-production envelope — production publication depends on the offline root-key ceremony.",
  },
  {
    path: "/.well-known/banza/key-manifest.json",
    what: "Manifest of the delegated public signing keys.",
    today:
      "A pre-production envelope — no production signing key exists before the root-key ceremony.",
  },
  {
    path: "/operators",
    what: "The BANZA Technical Registry — a public, read-only surface; the verifiable index of Layer 2 artifacts (metadata and evidence published by operators about their implementations). Independent of any scheme's participant directory (Layer 3).",
    today:
      "An empty list ([]) — no published evidence is indexed. Absence from the registry is not a regulatory prohibition.",
  },
  {
    path: "/federation/revocation-list.json",
    what: "The Revocation List — revoked protocol keys and artifacts. A security and trust mechanism, not a licence and not a sanction.",
    today: "Present in its initial pre-production state: a valid envelope with zero entries.",
  },
  {
    path: "/conformance/evidence",
    what: "The canonical route: published conformance evidence, reproducible by any third party.",
    today:
      "Each record declares the automation version, the hashes and the freshness window that make it reproducible.",
  },
  {
    path: "/banzai/runtime",
    what: "The BanzAI runtime SSOT (ADR-036): a secret-free projection of execution state — mode, inference location, external calls, model availability and readiness of the deterministic engines. Non-normative telemetry (authoritative: false), distinct from the signed trust artifacts under /.well-known/banza/*.",
    today:
      "Returns versioned JSON (schema_version: banzai-runtime/1). The BanzAI panel row above is derived from this route — if they diverge, the route wins.",
  },
] as const;

export default async function EnStatusPage() {
  const banzaiRow = await fetchBanzaiRuntimeRow("en");
  const PANEL = [...PANEL_STATIC, { label: "BanzAI", value: banzaiRow.value, tone: banzaiRow.tone }];
  return (
    <>
      <PageHero
        eyebrow="PROTOCOL STATUS"
        title={<>What is true today — and how to check it.</>}
        lede={
          <>
            This page states the public state of BANZA in plain language and points at the machine
            routes where anyone — a regulator, an auditor, an operator or a developer — can verify
            each claim directly, without trusting this website.
          </>
        }
        chips={[
          { label: "PRE-PRODUCTION" },
          { label: "SPECIFICATION v1.0.0 PUBLISHED" },
          { label: "PUBLIC REGISTRY WITH NO INDEXED EVIDENCE" },
          { label: "VERIFIABLE STATE" },
        ]}
      />

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">STATUS PANEL · VERIFIABLE STATE</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {PANEL.map((r) => (
              <div key={r.label} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{r.label.toUpperCase()}</div>
                <div className="text-[14.5px] font-semibold leading-[1.45] text-ink">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            The BANZA v1.0.0 specification is published and publicly verifiable, but it is not yet frozen
            for external implementation: no externally frozen BANZA target has been published and no
            independent implementation trial has been conducted, so the architecture of 1.0.0 is still
            being completed. The architecture is organised in three layers — the protocol (Layer 1),
            conformance and interoperability certification (Layer 2, per implementation and decided by
            Rust) and independent operational schemes (Layer 3) — with BanzAI as a transversal human
            interface, not a layer. Production — the Key Manifest, signed protocol metadata, federation
            between operators and production certification — depends on the offline root-key ceremony and
            on the first published production conformance evidence. Until then the correct state of the
            public registry is <em>empty</em>, and that is exactly what the machine routes return.
          </p>
          <p className="mt-4 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            Banzami is the designated scheme operator of the first Banzami Operational Scheme. The
            operational layer is in regulatory preparation and real payments remain switched off.
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFY WITHOUT TRUSTING THIS SITE · MACHINE ROUTES</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            The machine routes are the verifiable source of the public state.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Each route returns plain JSON, with no redirect to HTML. What is written on this page has to
            match what these routes return — and if it does not, the routes win.
          </p>
          <div className="flex flex-col gap-[12px]">
            {MACHINE_ROUTES.map((r) => (
              <div key={r.path} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <a
                  href={r.path}
                  className="link-bordo break-all font-mono text-[13px]"
                  title={`Open ${r.path} (returns JSON)`}
                >
                  {r.path}
                </a>
                <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">{r.what}</div>
                <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">Today: {r.today}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">READING THE STATE CORRECTLY</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              <strong className="text-ink">A PASS is verifiable evidence.</strong> Conformance
              verification is available today and produces reproducible evidence: hashes any third party
              recomputes and automation any third party re-runs, obtaining the same result. That is what a
              peer evaluates — not anyone&rsquo;s word.
            </p>
            <p>
              <strong className="text-ink">Certification (Layer 2) is per implementation.</strong>{" "}
              Conformance and interoperability certification is a per-implementation determination, based
              on evidence and decided by the Rust engines against a public, versioned profile. It
              certifies an implementation, never an entity, and it is not a licence, scheme admission or
              regulatory authorisation. The model is active; no production certification record exists
              today (<span className="font-mono text-[13px]">production_certificates = false</span>).
            </p>
            <p>
              <strong className="text-ink">The empty registry is the honest state.</strong>{" "}
              <span className="font-mono text-[13px]">/operators = []</span> is not a failure: it is the
              verifiable statement that no published evidence is indexed today. The BANZA Technical
              Registry is the public, verifiable index of Layer 2 artifacts and is independent of any
              scheme&rsquo;s participant directory (Layer 3). It is not a list of operators licensed,
              approved or admitted by BANZA — in BANZA participation is demonstrated by verifiable
              evidence, it is not granted by a central authority. Operator A/B/C exist only in the
              documentation, as examples.
            </p>
            <p>
              <strong className="text-ink">Operator Zero is the reference implementation.</strong> It is
              the protocol&rsquo;s canonical reference implementation, read-only: it exposes identity,
              manifest, capabilities, endpoints, metadata, keys and evidence for discovery and
              verification. It moves no real money and provides no financial services; it is
              NOT_CERTIFIED, and every human validation is initiated in BanzAI. The operator is the
              responsible entity; the implementation is the technical system evaluated. Official
              validation uses exclusively artifacts fetched from that implementation&rsquo;s public
              endpoints, through a secure Rust fetch layer and never the browser, and Operator Zero is the
              first canonical example — but it goes through exactly the same validation process that
              applies to any future published implementation (ADR-034).
            </p>
            <p>
              <strong className="text-ink">The manifests exist for public verification.</strong> The root
              manifest and the key manifest publish the protocol&rsquo;s trust artifacts. The Trust Root
              signs only the Key Manifest; the delegated keys sign the artifacts of their respective
              domains — protocol metadata, conformance evidence and revocations. The root does not
              authorise operators, does not issue licences and does not authorise payments. In
              pre-production the routes return honest envelopes; the production versions depend on the
              root-key ceremony, which is offline and controlled.
            </p>
            <p>
              <strong className="text-ink">The Revocation List exists, in its initial state.</strong> The
              Revocation List is a protocol security and trust mechanism. It is not a licence, a
              regulatory sanction or a financial authorisation. Today it is a valid envelope with zero
              entries. A peer that cannot obtain and verify the signed, fresh list treats it as
              unreliable material — never as an empty list (closed by default).
            </p>
            <p>
              <strong className="text-ink">
                BanzAI guides; the engines verify; the evidence proves; the competent authority decides.
              </strong>{" "}
              BanzAI is the primary, transversal human interface between people and operators and the
              protocol (ADR-036): it guides operators, invokes the Rust tools, answers from cited sources
              and runs in pre-production. It does not decide conformance, does not confer status on
              operators and does not replace the conformance suite — AI output is never a protocol rule:
              it is non-normative.
            </p>
            <p>
              Inference runs locally and on-host. The state of the engine running{" "}
              <em>in this response</em> is not asserted here in fixed prose: the{" "}
              <strong className="text-ink">BanzAI</strong> panel row above is derived from the machine
              route <span className="font-mono text-[13px]">/banzai/runtime</span> (the runtime SSOT,
              ADR-036), which reports the engine, the inference location and whether there were external
              calls — and if the prose and the route diverge, the route wins. Beyond that, each answer
              publishes its own state — the execution path, the sources cited and whether an external
              model was called — so that reading the per-answer state is verifiable and does not depend on
              trust.
            </p>
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              Technical conformance with BANZA does not replace legal, regulatory, banking, KYC/KYB or
              AML/CFT obligations applicable to each operator. Nothing on this page constitutes regulatory
              approval.
            </StatusNote>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/conformance-certification">How conformance works</MoreLink>
            <MoreLink href="/en/reference/trust">The chain of trust</MoreLink>
            <MoreLink href="/en/reference/developer-resources">Start implementing</MoreLink>
            <MoreLink href="/en/reference/protocol-evolution">Protocol evolution</MoreLink>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            <a href={GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              GitHub — BANZA protocol <span className="font-mono">↗</span>
            </a>
            <a href={BANZAI_GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              GitHub — BanzAI <span className="font-mono">↗</span>
            </a>
            <Link href="/banzai#perguntar" className="link-bordo text-[13.5px]">
              Ask BanzAI <span className="font-mono">→</span>
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
