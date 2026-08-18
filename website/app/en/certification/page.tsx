import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// English edition of the certification page — the highest-risk translation in Block C, and the one whose
// failure mode is the most consequential: every simplification broadens the claim.
//
// The Portuguese page is built around narrowness. A certification binds to a closed set of fields and
// "outside them, it asserts nothing". So the qualifiers travel intact: implementation hash, profile and
// profile version, protocol version, environment, capabilities and scope, evidence hashes, validity window.
// "X is BANZA-certified" is precisely the sentence this page exists to prevent, and no phrasing here may
// collapse into it.
//
// Two distinctions are load-bearing and pinned as executable properties: the subject of certification is an
// IMPLEMENTATION identified by content hash — the declaring operator is attribution and contact, never the
// subject — and the three determinations never imply one another. A valid certification may be a
// prerequisite for admission, but never produces it, and neither produces regulatory authorisation.
//
// Cross-checked against the architecture page for contradiction only. It carries the compact Layer 2
// description; this page carries the detail. More detail is allowed; reversal is not.

export const metadata: Metadata = {
  title: "Conformance and Interoperability Certification (Layer 2)",
  description:
    "BANZA Certification (Layer 2) is technical, per implementation and evidence-based: it binds a specific implementation (by hash) to a public, versioned profile, with scope, capabilities, environment, reproducible evidence and a validity window. It is decided by Rust engines, and can expire, be suspended, revoked or superseded — and it is not a licence, regulatory authorisation or admission to a scheme.",
  alternates: {
    canonical: "/en/certification",
    languages: { "pt-PT": "/certificacao", en: "/en/certification" },
  },
};

const CHAIN = [
  {
    k: "PROFILE",
    t: "Certification Profile",
    id: "interoperability-certification-profile",
    b: "The public, versioned standard an implementation is measured against: the conformance suites, the interoperability vectors, the required schemas/contracts/invariants/endpoints and the validity window — each fixed by hash. Immutable per version; a change is a new profile_version. It derives only from the protocol contracts (Layer 1), never from an operator's criteria.",
  },
  {
    k: "SUBJECT",
    t: "CertifiedImplementation",
    id: "certified-implementation",
    b: "The subject of certification: an implementation identified by implementation_id and implementation_hash — the content hash of the exact artifact set tested. The declarant (declared_by) is attribution and contact only, never the subject. A different build is a different subject, needing its own certification. An implementation is certified, never an entity and never a brand.",
  },
  {
    k: "VERDICT",
    t: "Certification Record",
    id: "certification-record",
    b: "The verdict object: it binds a CertifiedImplementation (by implementation_hash) to a Certification Profile (by profile_id + profile_version), carrying the reproducible evidence hashes, the verdict decided by Rust, a state + reason_code, the scope (never broader than the evidence), the validity window and a record_hash over the whole. It asserts exactly: this implementation passed this profile, at this version, with this evidence, in this scope, until this date.",
  },
] as const;

const BINDING = [
  { f: "implementation_id + implementation_hash", d: "The subject — the exact build, bound to the hash of its content." },
  { f: "operator (declared_by)", d: "The declaring entity, for attribution and contact — never the subject of the certification." },
  { f: "profile_id + profile_version", d: "The profile and profile version the implementation was measured against." },
  { f: "protocol_version", d: "The BANZA protocol version the certification refers to." },
  { f: "environment", d: "The environment in which the evidence was produced." },
  { f: "capabilities · scope", d: "The protocol surfaces and the scope (conformance levels and capabilities) covered — never broader than the evidence." },
  { f: "evidence (hashes)", d: "Reproducible conformance report and evidence bundle, hash-linked and re-runnable by third parties." },
  { f: "validity (issued_at · expires_at)", d: "The validity window. Outside it the certification is no longer valid." },
] as const;

const STATES = [
  { s: "NOT_CERTIFIED", tone: "neutral", d: "The default state (fail-closed). Not certified — the absence of a valid verdict always reads this way." },
  { s: "CERTIFIED", tone: "ok", d: "Certified, within scope and within the validity window, with the evidence reproducing. It is the only state that reads as valid." },
  { s: "EXPIRED", tone: "neutral", d: "The validity window has ended. Not certified." },
  { s: "SUSPENDED", tone: "neutral", d: "Suspended. Not certified for the duration of the suspension." },
  { s: "REVOKED", tone: "neg", d: "Revoked. A terminal state — it does not come back; a renewal is always a new record, never an extension in place." },
  { s: "SUPERSEDED", tone: "neutral", d: "Superseded by a more recent record. Not certified." },
] as const;

const REASON_CODES = [
  { c: "OK_CONFORMANT_INTEROPERABLE", d: "Conformant and interoperable — the only positive verdict." },
  { c: "FAIL_CONFORMANCE", d: "Failed the conformance verification." },
  { c: "FAIL_INTEROPERABILITY", d: "Failed the interoperability verification." },
  { c: "FAIL_EVIDENCE_INCOMPLETE", d: "Evidence incomplete or not reproducible." },
  { c: "FAIL_EVIDENCE_EXPIRED", d: "Evidence outside the freshness window." },
  { c: "FAIL_VALIDITY_WINDOW", d: "Outside the record's validity window." },
  { c: "FAIL_REVOKED", d: "Present on the revocation list." },
] as const;

const DETERMINATIONS = [
  { t: "Technical certification", layer: "Layer 2 · BANZA", d: "An implementation demonstrated conformance and interoperability against a public profile. Decided by Rust, over evidence." },
  { t: "Admission to a scheme", layer: "Layer 3 · scheme", d: "An operational scheme admits an entity/implementation as a participant, under its own rules. It may require valid certification — it is never implied by it." },
  { t: "Regulatory authorisation", layer: "regulator", d: "The competent regulator authorises a regulated financial activity, under the applicable legal framework. BANZA is not a party: it does not grant it, does not represent it and does not replace it." },
] as const;

function toneClasses(tone: string) {
  return tone === "ok"
    ? "border-ok/40 text-ok"
    : tone === "neg"
      ? "border-bordo/40 text-bordo"
      : "border-line text-ink-5";
}

export default function EnCertificationPage() {
  return (
    <>
      <PageHero
        eyebrow="CERTIFICATION · CONFORMANCE AND INTEROPERABILITY (LAYER 2)"
        title={<>An implementation is certified. With evidence. Decided by engines, not by people.</>}
        lede={
          <>
            Conformance and Interoperability Certification is BANZA&rsquo;s second institutional layer: a
            per-implementation determination, evidence-based, decided by Rust engines, reproducible,
            hash-bound, scoped and time-limited. It certifies that a specific implementation demonstrated
            conformance and interoperability against a public, versioned profile — nothing more.
          </>
        }
        chips={[
          { label: "PER IMPLEMENTATION" },
          { label: "EVIDENCE-BASED" },
          { label: "DECIDED BY RUST" },
          { label: "SCOPED AND TIME-LIMITED" },
        ]}
      />

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT CERTIFICATION IS — AND IS NOT</div>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-bordo">IS</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">
                BANZA certification is a technical certification of a specific implementation, limited to the
                profile, version, environment, capabilities, scope and validity stated.
              </p>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">IS NOT</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">
                BANZA certification does not constitute a financial licence, regulatory authorisation,
                automatic admission to a scheme, commercial approval or institutional guarantee.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
            There is no certifying authority, no centrally issued certificate chain, no entity or brand is
            certified, there are no public certification tiers, no score and no human approval. The verdict is
            a reproducible fact about an implementation, decided by deterministic engines and verifiable by
            any third party.
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">THE MODEL · PROFILE → IMPLEMENTATION → RECORD</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Three objects, one verdict.
          </h2>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            A public profile defines the standard; an implementation identified by hash is the subject; a
            certification record binds the two with the evidence and a verdict decided by Rust.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {CHAIN.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{c.k}</div>
                <div className="mb-1.5 text-[15.5px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="mb-2 font-mono text-[11px] text-ink-5">{c.id}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT THE CERTIFICATION RECORD BINDS TO</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            Every certification is bound to a closed set of fields. Outside them, it asserts nothing. That is
            what makes it narrow, verifiable and impossible to over-interpret.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            {BINDING.map((r) => (
              <div key={r.f} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <div className="mb-1 font-mono text-[12px] leading-[1.4] text-bordo">{r.f}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">LIFECYCLE · CLOSED STATE MACHINE</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            A certification lives in time — and can stop being valid.
          </h2>
          <p className="mb-8 max-w-[78ch] text-[15px] leading-[1.7] text-ink-4">
            The state of a certification is governed by a closed, total and deterministic state machine,
            decided only by the Rust engine. Only <strong className="text-ink">CERTIFIED</strong> reads as
            valid; any other state is not certified. No person, model or configuration can perform, extend or
            reverse a transition, and no Layer 2 transition propagates to scheme admission (Layer 3) or to the
            regulator.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {STATES.map((st) => (
              <div key={st.s} className={`rounded-cardish border bg-white px-[20px] py-[16px] ${toneClasses(st.tone)}`}>
                <div className="mb-1.5 font-mono text-[12.5px] font-semibold tracking-[0.04em]">{st.s}</div>
                <div className="text-[13px] leading-[1.6] text-ink-4">{st.d}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            <strong className="text-ink">REVOKED is terminal.</strong> A revoked record is not reactivated: a
            new certification is always a new record, with its own evidence and validity window — never an
            extension of the previous one.
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REASON CODES · CLOSED VOCABULARY, DECIDED BY RUST</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            Every verdict carries a reason_code from a closed enum — machine-readable, decided only by the
            Rust engines. The local model that explains (BanzAI) never invents or changes a reason code.
            Illustrative subset:
          </p>
          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            {REASON_CODES.map((r) => (
              <div key={r.c} className="rounded-cardish border border-line bg-white px-[18px] py-[14px]">
                <div className="mb-1 font-mono text-[12px] text-ink">{r.c}</div>
                <div className="text-[13px] leading-[1.55] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">THREE DISTINCT DETERMINATIONS</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Technical certification&nbsp;&ne;&nbsp;Scheme admission&nbsp;&ne;&nbsp;Regulatory authorisation
          </h2>
          <p className="mb-8 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            These are three separate determinations, with different owners. None implies another. A valid
            certification may be a prerequisite for an admission — but never produces it, and none of them
            produces a regulatory authorisation.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {DETERMINATIONS.map((d) => (
              <div key={d.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{d.layer}</div>
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{d.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{d.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              Appearing as certified is not being admitted to a scheme, nor being authorised to operate.
              Technical conformance does not replace legal, regulatory, banking, KYC/KYB or AML/CFT
              obligations, which are entirely the operator&rsquo;s.
            </StatusNote>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">HOW IT IS VERIFIED · RUST DECIDES, QWEN EXPLAINS</div>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            The verdict is produced by deterministic Rust engines over the published evidence, is hash-bound
            and is reproducible: any third party re-runs the verification and obtains the same hashes, with no
            account and without trusting this site. The certification record is published in the Technical
            Registry. BanzAI explains what was decided — it never decides, certifies or changes a state or
            reason code.
          </p>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            Official validation uses exclusively artifacts obtained from the selected implementation&rsquo;s
            public endpoints: BanzAI resolves the target in the Technical Registry (operator → implementation
            → canonical origin → discovery) and fetches each artifact through a secure Rust fetch layer —
            never through the browser (ADR-034). The result is specific to the implementation, the profile,
            the version, the environment, the scope, the artifacts and the moment of evaluation. Technical
            validation is not issued certification; technical certification is not admission to a scheme nor
            regulatory authorisation.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/technical-registry">Technical Registry — where certifications are published</MoreLink>
            <MoreLink href="/en/reference/conformance-certification">Reference — Conformance and Certification</MoreLink>
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/architecture">The three-layer architecture</MoreLink>
            <MoreLink href="/en/trust">Trust — verifiable evaluation with no central authority</MoreLink>
            <MoreLink href="/en/reference/operators">Reference — Operators</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
