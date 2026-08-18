import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// English edition of the trust page, translated semantically from the Portuguese one.
//
// Two translation hazards were handled deliberately.
//
// First, the Portuguese title — "Confiar sem pedir permissão a ninguém" — is about not needing a
// certificate authority, NOT about the protocol being permissionless. "Permissionless" is a term of art
// this page must not acquire in translation, so the English says what the Portuguese means: trust is
// computed locally rather than granted by an issuer.
//
// Second, this page does NOT state the Root threshold as a concrete N-of-M. It says custody is split by
// threshold, that no single person can reconstruct the root, and that the concrete N-of-M is operational
// configuration. Adding "3 authorities, 2-of-3" here would be introducing a claim the source page does not
// make — accurate elsewhere, but not this page's statement. Translation preserves scope, including the
// scope of what is left unsaid.

export const metadata: Metadata = {
  title: "Trust",
  description:
    "Trust in BANZA is an Open Trust Evaluation: public registry metadata, Signed Protocol Metadata and conformance evidence, verified locally against delegated keys endorsed by the root, closed by default and with no certificate authority. It distinguishes key revocation from metadata/artifact revocation and from Certification Record revocation.",
  alternates: {
    canonical: "/en/trust",
    languages: { "pt-PT": "/confianca", en: "/en/trust" },
  },
};

const INPUTS = [
  {
    t: "Public registry metadata",
    b: "What an implementation publishes about itself, indexed in the technical registry for consultation without authentication. In official validation these artifacts are fetched exclusively from the implementation's public endpoints, by a secure Rust fetch layer — never by the browser (ADR-034).",
  },
  {
    t: "Signed Protocol Metadata",
    b: "Metadata signed by the delegated key of the protocol-metadata domain, anchored to the Trust Root through the Key Manifest — an assertion about artifacts, never about a participant.",
  },
  {
    t: "Conformance evidence",
    b: "Evidence reproducible by third parties: recomputable hashes and re-runnable automation, with the same result.",
  },
] as const;

const REVOCATION = [
  {
    t: "Key revocation",
    b: "A public key ceases to be valid — through expiry of its validity window or through entry on the signed Revocation List. Private keys never appear and are never transmitted.",
  },
  {
    t: "Metadata/artifact revocation",
    b: "Protocol metadata, a release or a delegated key are withdrawn via the Revocation List, an object signed by the delegated key of the revocation domain (authority traced to the root through the Key Manifest). It is a security mechanism, not a regulatory sanction.",
  },
  {
    t: "Certification Record revocation",
    b: "A certification record transitions to REVOKED through the certification state machine (decided in Rust). REVOKED is terminal — it does not come back; a new certification is a new record.",
  },
] as const;

export default function EnTrustPage() {
  return (
    <>
      <PageHero
        eyebrow="TRUST"
        title={<>Trust without asking anyone for permission.</>}
        lede={
          <>
            In BANZA trust is computed, not granted. A peer decides locally whether to route to another by
            combining public metadata, signed protocol metadata and conformance evidence — verified against
            delegated keys endorsed by the root, closed by default. BANZA issues no credentials and operates
            no central issuing entity.
          </>
        }
        chips={[
          { label: "OPEN TRUST EVALUATION" },
          { label: "NO CERTIFICATE AUTHORITY" },
          { label: "CLOSED BY DEFAULT" },
          { label: "LOCAL VERIFICATION" },
        ]}
      />

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">THE OPEN TRUST EVALUATION</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Three verifiable inputs — no word of honour.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            The evaluation is deterministic, local and without human intervention. It does not depend on a
            certificate issued by an authority — it depends on artifacts that any peer verifies for itself.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            {INPUTS.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">SIGNATURES AND KEYS</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              <strong className="text-ink">A signature is about artifacts, not about people.</strong> The
              Trust Root signs only the Key Manifest; the manifest authorises the delegated keys, and those
              are what sign the artifacts of their respective domains — protocol metadata, conformance
              evidence and the Revocation List. A signature does not authorise payments, does not create
              operators, does not issue licences and does not certify any operator.
            </p>
            <p>
              <strong className="text-ink">The key manifest publishes public keys only</strong> and their
              domains, with validity windows and a hash for tamper evidence. Private keys never appear. In
              pre-production there are no production keys: they are prepared but gated until the offline
              root-key ceremony. Custody is split by threshold — no single person reconstructs the root, and
              the concrete N-of-M is operational configuration — and closed by default: whatever cannot be
              obtained and verified is treated as absent, never as valid.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REVOCATION — THREE DISTINCT OBJECTS</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            &ldquo;Revoke&rdquo; is not one thing. Three objects are distinguished, with different mechanisms
            and different effects — none of them a licence or a regulatory sanction.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {REVOCATION.map((r) => (
              <div key={r.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{r.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.b}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              There is no certificate authority: the BANZA trust model is open and verified locally.
              Evaluated trust does not replace legal, regulatory, banking, KYC/KYB or AML/CFT obligations.
              Nothing on this page constitutes regulatory approval.
            </StatusNote>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/reference/trust">Trust — Reference chapter</MoreLink>
            <MoreLink href="/en/federation">How trust underpins federation</MoreLink>
            <MoreLink href="/en/why-banza">Why BANZA exists</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
