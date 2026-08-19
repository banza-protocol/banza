import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { RegistrySearch, type RegistryEntry } from "@/components/registry/RegistrySearch";

// English edition of the Technical Registry explorer, translated semantically from the Portuguese one.
//
// The page reads its state LIVE from the public machine routes rather than asserting it in prose, and that
// is the property most easily lost in translation: the four honest outcomes are "has entries", "verified
// empty", "partially confirmed" and "unconfirmed", and the one that must never be flattened is the last.
// An outage is NOT an empty registry. Every count is validate-or-null, a null renders as an em dash, and
// "has entries" is a positive test over confirmed counts so a partial outage can never read as populated.
//
// "Registry" in English pulls hard towards a list of licensed firms, which is exactly what this is not, so
// the boundary the Portuguese page states is carried in full: being listed is not admission and not
// authorisation; certification attaches to an implementation identified by hash, never to an entity as a
// global status; and the reference implementation is never counted as a real participant.
//
// Nothing is imported from elsewhere. The certification record's fields, the trust chain and the three
// layers belong to other pages; this one names the six canonical states and links out for the rest.

export const metadata: Metadata = {
  title: "BANZA Technical Registry — public conformance explorer (Layer 2)",
  description:
    "The BANZA Technical Registry is the public, root-verifiable, read-only index of the certification layer (Layer 2): implementations, certifications, evidence and revocations. Consult, search and verify — the current state is read directly from the public machine routes (GET /operators), and an empty registry is a valid, verifiable state.",
  alternates: {
    canonical: "/en/technical-registry",
    languages: { "pt-PT": "/registo-tecnico", en: "/en/technical-registry" },
  },
};

const REGISTRY_ORIGIN =
  process.env.BANZA_REGISTRY_ORIGIN || process.env.BANZA_RUNTIME_ORIGIN || "https://banza.network";

type OperatorRow = { operator_id: string; operator_name?: string; operator_url?: string; status?: string };
type EvidenceEnvelope = { count: number; production_certificates: boolean; evidence: { result?: string }[] };
type RevocationEnvelope = { count: number };

async function fetchJson<T>(path: string, validate: (raw: unknown) => T | null): Promise<T | null> {
  try {
    const res = await fetch(`${REGISTRY_ORIGIN}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null; // an outage is "unconfirmed", never "empty"
    return validate(await res.json());
  } catch {
    return null;
  }
}

const validateOperators = (raw: unknown): OperatorRow[] | null =>
  Array.isArray(raw) && raw.every((r) => r && typeof r === "object" && typeof (r as OperatorRow).operator_id === "string")
    ? (raw as OperatorRow[])
    : null;

const validateEvidence = (raw: unknown): EvidenceEnvelope | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.count !== "number" || typeof r.production_certificates !== "boolean" || !Array.isArray(r.evidence)) return null;
  if (!r.evidence.every((e) => e && typeof e === "object")) return null;
  return { count: r.count, production_certificates: r.production_certificates, evidence: r.evidence as { result?: string }[] };
};

const validateRevocation = (raw: unknown): RevocationEnvelope | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return typeof r.count === "number" ? { count: r.count } : null;
};

const AREAS = [
  {
    key: "implementations",
    title: "Implementations",
    route: "/operators",
    what: "The indexed implementations and the verifiable evidence each one publishes.",
    empty: "No implementation is published in this environment. An empty registry is a valid, verifiable state.",
  },
  {
    key: "certifications",
    title: "Certifications",
    route: "/conformance/evidence",
    what: "The hash-linked verdict between an implementation and a public profile — with its scope and validity.",
    empty: "No active certification in this environment. Only CERTIFIED reads as valid; anything else is not certified.",
  },
  {
    key: "evidence",
    title: "Evidence",
    route: "/conformance/evidence",
    what: "Published conformance evidence, reproducible by any third party from the hashes.",
    empty: "No evidence published in this environment. A conformance run is technical evidence — not a seal.",
  },
  {
    key: "revocations",
    title: "Revocations",
    route: "/federation/revocation-list.json",
    what: "Revoked protocol keys and artifacts. A security and trust mechanism — not a licence and not a sanction.",
    empty: "No revocation in this environment. A valid envelope with zero entries — a valid empty state; read closed by default.",
  },
] as const;

// The canonical certification states published by the registry. Only CERTIFIED reads as valid.
const STATES = [
  { s: "NOT_CERTIFIED", d: "The default (closed by default). Not certified." },
  { s: "CERTIFIED", d: "Certified, within scope and within the validity window. The only valid state." },
  { s: "EXPIRED", d: "Validity has ended." },
  { s: "SUSPENDED", d: "Suspended." },
  { s: "REVOKED", d: "Revoked. A terminal state." },
  { s: "SUPERSEDED", d: "Superseded by a more recent record." },
] as const;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-cardish border border-line bg-white px-[20px] py-[16px]">
      <div className="mb-1 break-words font-mono text-[10px] tracking-[0.07em] text-ink-5">{label.toUpperCase()}</div>
      <div className="break-words text-[22px] font-semibold leading-[1.15] text-ink tabular-nums">{value}</div>
    </div>
  );
}

export default async function EnTechnicalRegistryPage() {
  const [operators, evidence, revocation] = await Promise.all([
    fetchJson<OperatorRow[]>("/operators", validateOperators),
    fetchJson<EvidenceEnvelope>("/conformance/evidence", validateEvidence),
    fetchJson<RevocationEnvelope>("/federation/revocation-list.json", validateRevocation),
  ]);

  const dash = "—";
  const num = (n: number | null | undefined) => (typeof n === "number" ? String(n) : dash);
  const implementations = operators === null ? null : operators.length;
  // There is no certification-record store or machine route yet; the value stays 0 until such records are
  // indexed and exposed by their own route — never derived from conformance evidence rows, because
  // evidence is not certification. null only when the evidence route does not confirm.
  const certifications = evidence === null ? null : 0;
  const evidenceCount = evidence === null ? null : evidence.count;
  const revocations = revocation === null ? null : revocation.count;

  const anyConfirmed = operators !== null || evidence !== null || revocation !== null;
  const allConfirmed = operators !== null && evidence !== null && revocation !== null;
  const hasEntries =
    (implementations ?? 0) > 0 || (certifications ?? 0) > 0 || (evidenceCount ?? 0) > 0 || (revocations ?? 0) > 0;

  const entries: RegistryEntry[] | null = operators === null ? null : operators.map((o) => ({
    id: o.operator_id,
    label: o.operator_name ?? o.operator_id,
    kind: "operator",
  }));

  const stateChip = hasEntries
    ? { label: "REGISTRY HAS ENTRIES", tone: "ok" as const }
    : allConfirmed
      ? { label: "REGISTRY EMPTY (VERIFIED)", tone: "pend" as const }
      : !anyConfirmed
        ? { label: "STATE UNCONFIRMED", tone: "pend" as const }
        : { label: "STATE PARTIALLY CONFIRMED", tone: "pend" as const };

  return (
    <>
      <PageHero
        eyebrow="BANZA TECHNICAL REGISTRY"
        title={<>Consult, search and verify — technical information, not a seal.</>}
        lede={
          <>
            The BANZA Technical Registry is the public, root-verifiable, read-only index of the
            certification layer (Layer 2): implementations, certifications, evidence and revocations.
            Readable by any third party, with no account and without trusting any operator.
          </>
        }
        chips={[{ label: "PUBLIC AND VERIFIABLE" }, { label: "NO ACCOUNT" }, { label: "PRE-PRODUCTION" }, stateChip]}
      />

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REGISTRY STATE · NOW</div>
          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Environment" value="Pre-production" />
            <Metric label="Published implementations" value={num(implementations)} />
            <Metric label="Active certifications" value={num(certifications)} />
            <Metric label="Published evidence" value={num(evidenceCount)} />
            <Metric label="Revocations" value={num(revocations)} />
          </div>
          <p className="mt-4 text-[11.5px] leading-[1.6] text-ink-5">
            <span className="font-semibold text-ink-4">Source:</span> public machine routes ·{" "}
            <span className="font-mono">GET /operators, /conformance/evidence, /federation/revocation-list.json</span>.{" "}
            {anyConfirmed
              ? "The numbers above are read from those routes. An “—” means the route could not be confirmed just now."
              : "The routes could not be confirmed just now — state unconfirmed; verify directly at the machine routes."}
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">SEARCH THE REGISTRY</div>
          <RegistrySearch entries={entries} locale="en" />
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">WHAT IS REGISTERED</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {AREAS.map((a) => {
              const count =
                a.key === "implementations"
                  ? implementations
                  : a.key === "certifications"
                    ? certifications
                    : a.key === "evidence"
                      ? evidenceCount
                      : revocations;
              const confirmed = count !== null && count !== undefined;
              return (
                <div key={a.key} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div className="text-[15px] font-semibold text-ink">{a.title}</div>
                    <div className="font-mono text-[13px] tabular-nums text-bordo">{confirmed ? count : dash}</div>
                  </div>
                  <div className="text-[13px] leading-[1.6] text-ink-4">{a.what}</div>
                  {confirmed && count === 0 ? (
                    <div className="mt-2 text-[12.5px] leading-[1.6] text-ink-5">{a.empty}</div>
                  ) : !confirmed ? (
                    <div className="mt-2 text-[12.5px] leading-[1.6] text-pend">
                      The state of this area could not be confirmed just now — verify directly at the machine route.
                    </div>
                  ) : null}
                  <a href={a.route} className="link-bordo mt-2 inline-block break-all font-mono text-[12px]" title={`Open ${a.route} (returns JSON)`}>
                    {a.route}
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[13px] leading-[1.6] text-ink-5">
            {implementations === 0 ? (
              <>
                No implementation is indexed today — <span className="font-mono">/operators</span> returns{" "}
                <span className="font-mono">[]</span>.{" "}
              </>
            ) : implementations === null ? (
              <>Indexing state unconfirmed — verify directly at the machine route. </>
            ) : (
              <>{implementations} implementation(s) indexed. </>
            )}
            Canonical certification states:{" "}
            {STATES.map((st, i) => (
              <span key={st.s}>
                <span className="font-mono text-ink-4">{st.s}</span>
                {i < STATES.length - 1 ? " · " : ""}
              </span>
            ))}
            . Only <strong className="text-ink">CERTIFIED</strong> reads as valid — decided
            deterministically and reproducibly.
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">HOW TO READ THE REGISTRY</div>
          <h2 className="mb-3 font-serif text-[clamp(20px,2.6vw,30px)] font-semibold leading-[1.18] tracking-[-0.01em] text-ink">
            Appearing in the registry is not being admitted, and not being authorised.
          </h2>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            The Technical Registry is the surface of the certification layer (Layer 2) and is strictly
            independent of an operational scheme&rsquo;s participant directory (Layer 3). Being listed means
            only that verifiable technical evidence about an implementation exists. Technical certification
            is a determination distinct from admission to a scheme and from regulatory authorisation — and
            none of them implies the others.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
            {[
              ["Operator ≠ implementation", "Certification applies to a concrete implementation, identified by hash — never to the entity in the abstract."],
              ["Certification ≠ admission", "Admission to a scheme is the scheme's own determination (Layer 3), independent of certification."],
              ["Certification ≠ authorisation", "Authorisation to operate belongs to the competent regulatory authority, not to the protocol."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-cardish border border-line bg-white px-[18px] py-[16px]">
                <div className="mb-1.5 text-[14px] font-semibold leading-[1.3] text-ink">{t}</div>
                <div className="text-[13px] leading-[1.6] text-ink-4">{b}</div>
              </div>
            ))}
          </div>
          <StatusNote tone="pend">
            <span className="font-semibold">The registry does not list licensed, approved or admitted operators.</span>{" "}
            There is no &ldquo;certified entity&rdquo; here as a global status. The reference implementation
            (Operator Zero) is not counted as a real participant: it exists only as a read-only reference, it
            never appears as a published operator and it is never a scheme participant.
          </StatusNote>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFY WITHOUT TRUSTING THIS SITE · MACHINE ROUTES</div>
          <p className="mb-6 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            The registry is a machine surface: each route returns plain JSON, verifiable by any third party
            without an account. If what is written on this page does not match what these routes return, the
            routes win.
          </p>
          <div className="flex flex-col gap-[12px]">
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/operators" className="link-bordo break-all font-mono text-[13px]" title="Open /operators (returns JSON)">
                /operators
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">The public index of metadata and verifiable evidence published by operators.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Today: {implementations === null ? "state unconfirmed." : implementations === 0 ? "an empty list ([]) — no implementation indexed. An empty registry is the correct state, not a failure." : `${implementations} implementation(s) indexed.`}
              </div>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/conformance/evidence" className="link-bordo break-all font-mono text-[13px]" title="Open /conformance/evidence (returns JSON)">
                /conformance/evidence
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">Published conformance evidence, reproducible by any third party.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Today: {evidenceCount === null ? "state unconfirmed." : `${evidenceCount} evidence record(s).`}
              </div>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/federation/revocation-list.json" className="link-bordo break-all font-mono text-[13px]" title="Open /federation/revocation-list.json (returns JSON)">
                /federation/revocation-list.json
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">The revocation list — revoked keys and artifacts. A security and trust mechanism.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Today: {revocations === null ? "state unconfirmed." : `a valid envelope, ${revocations} entr${revocations === 1 ? "y" : "ies"}; read closed by default.`}
              </div>
            </div>
          </div>
          {allConfirmed && !hasEntries ? (
            <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
              <strong className="text-ink">Empty, honestly.</strong> No implementation is indexed today and
              no production certification exists. Production publication of the trust metadata depends on the
              root-key ceremony. The emptiness is the verifiable statement that there is not yet any published
              evidence.
            </p>
          ) : (
            <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
              <strong className="text-ink">The registry publishes only what has been verified.</strong> The
              current state is read from the machine routes above; an empty registry, once confirmed, is the
              verifiable statement that there is not yet any published evidence. Production publication of the
              trust metadata depends on the root-key ceremony.
            </p>
          )}
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUE</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/en/certification">How certification works (Layer 2)</MoreLink>
            <MoreLink href="/en/operators">Operators — public registry</MoreLink>
            <MoreLink href="/en/status">The protocol&rsquo;s verifiable state</MoreLink>
            <MoreLink href="/en/glossary">Glossary — the concepts, precisely</MoreLink>
            <MoreLink href="/banzai">Validate an implementation with BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
