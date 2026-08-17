import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { CANONICAL_PROFILES } from "@/lib/canonicalProfiles.generated";
import { GITHUB_URL } from "@/lib/site";
import { alternatesFor, ROUTE_PAIRS } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { absolute: "BANZA — An open financial interoperability protocol" },
  description:
    "BANZA defines public rules, versioned profiles and verifiable mechanisms so that independent implementations can publish an implementation and demonstrate conformance and interoperability.",
  alternates: alternatesFor("/en"),
};

// The English edition's entry point. It is a complete page, not a shell: everything it states is
// stated here in full. Where a subject has no English page yet it says so plainly and links to the
// Portuguese edition, rather than presenting an empty route as if it were written.
//
// Profile names come from lib/canonicalProfiles.generated.ts, derived from the normative registry.
// Nothing about a profile is spelled out here: a second table would drift, which is how L4 once came
// to read as "production certified".

const F_SERIF = "var(--font-serif), serif";
const F_MONO = "var(--font-mono), monospace";

const PRINCIPLES: { name: string; text: string }[] = [
  {
    name: "Robust",
    text: "correct and deterministic under independent implementation, adversarial input and boundary conditions",
  },
  {
    name: "Resilient",
    text: "contains failures, preserves safe operation where possible and recovers deterministically without weakening the protocol's guarantees",
  },
  {
    name: "Secure",
    text: "critical properties enforced by construction, failing closed when they cannot be established",
  },
  { name: "Simple", text: "the smallest mechanism sufficient for the required property" },
];

const INVARIANTS: string[] = [
  "Open specification — the applicable rules, contracts and profiles are public and versioned.",
  "Implementation independence — no particular implementation constitutes the protocol.",
  "Independent verification — published artifacts allow any party to evaluate the applicable claims.",
  "Operational independence — no central infrastructure is required to carry messages or funds.",
  "Separation of decisions — conformance, certification, scheme admission and regulatory authorisation stay distinct.",
];

const LAYERS: { title: string; text: string }[] = [
  {
    title: "Layer 1 — Open protocol",
    text: "The public rules: contracts, messages, schemas, invariants, identity, discovery, trust, revocation, conformance and evidence.",
  },
  {
    title: "Layer 2 — Conformance and interoperability certification",
    text: "Evaluates a bounded implementation against public versioned profiles, by evidence and deterministic decision.",
  },
  {
    title: "Layer 3 — Independent operational schemes",
    text: "Schemes that may adopt the protocol in order to operate, under their own framework.",
  },
];

/** What each profile adds. Descriptive prose in English; the identifier and canonical name are not
 * ours to write and are read from the generated vocabulary. */
const PROFILE_ADDS: Record<string, string> = {
  L0: "Instantiate the protocol safely: reachable, valid manifest, integer monetary units",
  L1: "Wallets, transfers, double-entry ledger, idempotency, traceability",
  L2: "Payment requests, dynamic QR, instant execution",
  L3: "Routing and settlement between operators, reconciliation, signed metadata",
  L4: "Verifiable integration with external infrastructures, defined by profile",
};

const STATUS: { label: string; value: string }[] = [
  { label: "Protocol version", value: "1.0.0" },
  { label: "Lifecycle", value: "PRE-PRODUCTION — not frozen, not released" },
  { label: "Independent external implementation", value: "Not demonstrated" },
  { label: "Independent trial", value: "Not started" },
  { label: "Production operators · active certifications", value: "0 · 0" },
  { label: "Real-money operation", value: "Disabled" },
];

export default function EnglishHome() {
  const untranslated = ROUTE_PAIRS.filter((p) => p.en === null && p.key !== "operator-zero");

  return (
    <>
      <PageHero
        eyebrow="Open protocol · pre-production"
        title="An open financial interoperability protocol"
        lede="Public, versioned rules — contracts, messages, profiles, invariants and conformance mechanisms — that independent implementations adopt in order to interoperate and produce evidence any third party can reproduce."
      />

      <Section tone="paper">
        <Container width="site" data-reveal>
          <p style={{ fontFamily: F_SERIF, fontSize: 17, lineHeight: 1.65, maxWidth: "68ch" }}>
            Financial interoperability already exists, through banks, shared settlement infrastructures
            and common messaging standards. What is usually missing is a public basis on which that
            interoperability can be <em>demonstrated</em>: specifications, tests and results a third
            party can implement, compare and reproduce without asking anyone&rsquo;s permission. BANZA
            is that basis.
          </p>
          <p
            style={{
              fontFamily: F_SERIF,
              fontSize: 17,
              lineHeight: 1.65,
              maxWidth: "68ch",
              marginTop: 18,
            }}
          >
            BANZA is not a bank, a PSP, a wallet, a payment operator, a central switch, a settlement
            operator, an operational scheme, a blockchain or a consensus network. It holds no funds,
            keeps no customer accounts, executes no settlement and grants no regulatory authorisation.
            Operators do those things, on their own infrastructure, under their own authorisations.
          </p>
          <StatusNote>
            This page is orientation, not a normative source. Normative authority is the Normative
            Manifest and the artifacts it indexes; where this page and a normative artifact diverge, the
            artifact prevails.
          </StatusNote>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">FOUR FUNDAMENTAL PRINCIPLES</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            BANZA R²S²
          </h2>
          <p style={{ fontFamily: F_SERIF, fontSize: 16.5, lineHeight: 1.65, maxWidth: "68ch" }}>
            Four principles, and only four — the criterion by which design decisions are taken, not a
            description of what the protocol does. Written <code style={{ fontFamily: F_MONO }}>R2S2</code>{" "}
            in ASCII.
          </p>
          <dl style={{ marginTop: 22, display: "grid", gap: 14 }}>
            {PRINCIPLES.map((p) => (
              <div key={p.name} style={{ display: "grid", gap: 4 }}>
                <dt style={{ fontFamily: F_SERIF, fontSize: 16, fontWeight: 600 }}>{p.name}</dt>
                <dd style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, margin: 0, maxWidth: "64ch" }}>
                  {p.text}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, marginTop: 20, maxWidth: "68ch" }}>
            <strong>Safety before availability.</strong> Resilience never permits unsafe continuation:
            where trust, authorisation, integrity or correctness cannot be established, refusing is the
            correct behaviour. <code style={{ fontFamily: F_MONO }}>Fail closed</code> is one of the
            eight Protocol Structural Properties, not a fifth principle.
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">FIVE</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Architectural invariants
          </h2>
          <ol style={{ display: "grid", gap: 10, paddingLeft: 20 }}>
            {INVARIANTS.map((t) => (
              <li key={t} style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "66ch" }}>
                {t}
              </li>
            ))}
          </ol>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, marginTop: 18 }}>
            <strong>The reference implementation implements BANZA; it does not define BANZA.</strong>
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">RESPONSIBILITIES, NOT STAGES</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Three institutional layers
          </h2>
          <dl style={{ display: "grid", gap: 16 }}>
            {LAYERS.map((l) => (
              <div key={l.title} style={{ display: "grid", gap: 4 }}>
                <dt style={{ fontFamily: F_SERIF, fontSize: 16, fontWeight: 600 }}>{l.title}</dt>
                <dd style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, margin: 0, maxWidth: "66ch" }}>
                  {l.text}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, marginTop: 18, maxWidth: "68ch" }}>
            <strong>
              Technical certification ≠ scheme admission ≠ regulatory authorisation
            </strong>
            , and none propagates to another. These layers are not the L0–L4 profiles: one axis divides
            responsibility between institutions, the other measures one implementation&rsquo;s technical
            reach.
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">L0 – L4</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Conformance profiles
          </h2>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "68ch" }}>
            Cumulative technical capability demonstrated by one implementation — never a status of the
            entity.
          </p>
          <div style={{ overflowX: "auto", marginTop: 18 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 560, width: "100%" }}>
              <thead>
                <tr>
                  {["Profile", "Name", "What it adds"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: "left",
                        fontFamily: F_MONO,
                        fontSize: 10.5,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#978B7C",
                        borderBottom: "1px solid rgba(0,0,0,0.1)",
                        padding: "0 12px 8px 0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CANONICAL_PROFILES.map((p) => (
                  <tr key={p.level}>
                    <th
                      scope="row"
                      style={{
                        textAlign: "left",
                        fontFamily: F_MONO,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "10px 12px 10px 0",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        verticalAlign: "top",
                      }}
                    >
                      {p.level}
                    </th>
                    <td
                      style={{
                        fontFamily: F_SERIF,
                        fontSize: 15,
                        fontWeight: 600,
                        padding: "10px 12px 10px 0",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        verticalAlign: "top",
                      }}
                    >
                      {p.name}
                    </td>
                    <td
                      style={{
                        fontFamily: F_SERIF,
                        fontSize: 15,
                        lineHeight: 1.55,
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        verticalAlign: "top",
                      }}
                    >
                      {PROFILE_ADDS[p.level]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: F_SERIF, fontSize: 15, lineHeight: 1.6, marginTop: 14, maxWidth: "68ch" }}>
            L4 is profile-parameterized; no concrete external profile is published, so L4 remains
            unevaluated. In this phase only L0 is executable — the other profiles are requirements, and
            the site never presents them as run.
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT IT IS, AND WHAT IT IS NOT</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            L0 — Protocol Sandbox
          </h2>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.65, maxWidth: "68ch" }}>
            L0 is the environment in which an implementation is built, tested and demonstrated against
            BANZA, using test material and test values. It exercises real protocol semantics: canonical
            representation, identifiers, signatures and digests, states, reason codes, idempotency,
            deterministic vectors and evidence.
          </p>
          <ul style={{ display: "grid", gap: 8, marginTop: 16, paddingLeft: 20 }}>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "66ch" }}>
              <strong>Technical conformance is not regulatory authorization.</strong>
            </li>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "66ch" }}>
              <strong>BANZA certification is not operational admission.</strong>
            </li>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "66ch" }}>
              <strong>Passing L0 does not mean production approval.</strong>
            </li>
          </ul>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.65, marginTop: 16, maxWidth: "68ch" }}>
            A protocol sandbox is not a regulatory sandbox. BANZA operates no supervisory programme and
            is institutionally separate from any regulator&rsquo;s initiative; whether a regulated
            activity requires authorisation is decided by the competent authority under the applicable
            legal framework, not by a profile and not by a conformance verdict. None of this places L0
            outside the law — obligations that already apply continue to apply. Test material stays test
            material: an artifact produced for L0 is never valid production material.
          </p>
          <MoreLink href={`${GITHUB_URL}/blob/main/docs/governance/certification-boundary.md`}>
            The full boundary, on GitHub
          </MoreLink>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFIABLE STATE</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Current status
          </h2>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr)",
              gap: 10,
              maxWidth: "68ch",
            }}
          >
            {STATUS.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px 14px",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  paddingBottom: 8,
                }}
              >
                <dt style={{ fontFamily: F_SERIF, fontSize: 15 }}>{s.label}</dt>
                <dd style={{ fontFamily: F_MONO, fontSize: 12.5, margin: 0, color: "#4A4038" }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ fontFamily: F_SERIF, fontSize: 15, lineHeight: 1.6, marginTop: 16, maxWidth: "68ch" }}>
            Merging a change does not release the protocol, and deploying does not freeze it. Assurance
            gates <code style={{ fontFamily: F_MONO }}>AG-0…AG-9</code> run on normal change;{" "}
            <code style={{ fontFamily: F_MONO }}>AG-10</code> is a release and freeze gate, evaluated
            deliberately for one exact candidate, and it has not been run.
          </p>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">GITHUB IS A FIRST-CLASS SURFACE</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Where the specification lives
          </h2>
          <ul style={{ display: "grid", gap: 10, paddingLeft: 20 }}>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5 }}>
              <Link href={`${GITHUB_URL}/blob/main/contracts/production/normative-manifest.json`}>
                Normative Manifest
              </Link>{" "}
              — every normative artifact, with its digest and tier.
            </li>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5 }}>
              <Link href={`${GITHUB_URL}/blob/main/docs/reference/en/BANZA_REFERENCE.md`}>
                Reference (English, official translation)
              </Link>{" "}
              · <Link href={`${GITHUB_URL}/blob/main/docs/reference/pt/BANZA_REFERENCIA.md`}>
                Portuguese, canonical
              </Link>
            </li>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5 }}>
              <Link href="/whitepaper/banza-whitepaper-v1.0-en.pdf">Whitepaper (English, PDF)</Link> ·{" "}
              <Link href="/whitepaper/banza-whitepaper-v1.0-pt.pdf">Portuguese, canonical</Link>
            </li>
            <li style={{ fontFamily: F_SERIF, fontSize: 15.5 }}>
              <Link href={GITHUB_URL}>The repository</Link> — specifications, contracts, conformance
              vectors, decisions and assurance.
            </li>
          </ul>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">BEING TRANSLATED</div>
          <h2 className="mb-4 font-serif text-[clamp(22px,3vw,32px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Pages currently published in Portuguese only
          </h2>
          <p style={{ fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 1.6, maxWidth: "68ch" }}>
            The English edition is being published page by page. These subjects are already public in
            Portuguese; the English editions are not written yet, and this site does not present an
            unwritten page as if it existed.
          </p>
          <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 14, padding: 0, listStyle: "none" }}>
            {untranslated.map((p) => (
              <li key={p.key}>
                <Link href={p.pt} hrefLang="pt-PT" style={{ fontFamily: F_MONO, fontSize: 12.5 }}>
                  {p.pt}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
