import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { RegistrySearch, type RegistryEntry } from "./RegistrySearch";

// /registo-tecnico is the REAL owning page for the BANZA Technical Registry (Camada 2, ADR-033): the single
// public, root-verifiable, read-only INDEX of L2 artefacts — implementations, certification records,
// conformance evidence and revocations — verifiable by any third party with no account. M2.19G+ reframes it
// from an explanatory document into an EXPLORER: a live status band, a search affordance, four areas with
// valid empty states, and the machine routes as the source of truth. It reads the state live from the public
// machine routes (server-side, ISR, fail-safe) instead of asserting it in prose, so the page can never drift
// from what the routes return. It is STRICTLY independent of the Camada 3 scheme participant directory: being
// listed is never admission and never authorisation. Detailed definitions live in the Reference/glossário —
// this page links to them rather than restating them.

export const metadata: Metadata = {
  title: "Registo Técnico BANZA — explorador público de conformidade (Camada 2)",
  description:
    "O Registo Técnico BANZA é o índice público, verificável por raiz e apenas de leitura da camada de certificação (Camada 2): implementações, certificações, evidência e revogações. Consulte, pesquise e verifique — o estado actual é lido directamente das rotas máquina públicas (GET /operators), e o registo vazio é um estado válido e verificável.",
  alternates: { canonical: "/registo-tecnico" },
};

// ── Live state, read from the public machine routes (never fabricated) ────────────────────────────────
// The machine routes are served from the same public origin as /banzai/runtime. We fetch server-side with a
// short ISR window + a hard timeout and validate-or-null, so a stale/foreign/garbled payload or an outage is
// shown as an honest "estado não confirmado" — never as a fabricated entry and never as a crash.
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
    if (!res.ok) return null; // 503/500 (incl. the /operators outage → []) is "não confirmado", not "vazio"
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
  // Element-safe: a garbled array (e.g. [null]) must degrade to "não confirmado", never crash the later
  // .filter(e => e.result …). Mirror validateOperators' per-element object check.
  if (!r.evidence.every((e) => e && typeof e === "object")) return null;
  return { count: r.count, production_certificates: r.production_certificates, evidence: r.evidence as { result?: string }[] };
};

const validateRevocation = (raw: unknown): RevocationEnvelope | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return typeof r.count === "number" ? { count: r.count } : null;
};

// ── The four registry areas (the explorer body) ──────────────────────────────────────────────────────
const AREAS = [
  {
    key: "implementacoes",
    title: "Implementações",
    route: "/operators",
    what: "As implementações indexadas e a evidência verificável que cada uma publica.",
    empty: "Nenhuma implementação publicada neste ambiente. O registo vazio é um estado válido e verificável.",
  },
  {
    key: "certificacoes",
    title: "Certificações",
    route: "/conformance/evidence",
    what: "O veredicto, ligado por hash, entre uma implementação e um perfil público — com âmbito e validade.",
    empty: "Nenhuma certificação activa neste ambiente. Só o estado CERTIFIED se lê como válido; qualquer outro é não-certificado.",
  },
  {
    key: "evidencia",
    title: "Evidência",
    route: "/conformance/evidence",
    what: "Evidência de conformidade publicada, reproduzível por qualquer terceiro a partir dos hashes.",
    empty: "Nenhuma evidência publicada neste ambiente. Uma verificação de conformidade é evidência técnica — não um selo.",
  },
  {
    key: "revogacoes",
    title: "Revogações",
    route: "/federation/revocation-list.json",
    what: "Chaves e artefactos de protocolo revogados. Mecanismo de segurança e trust — não licença nem sanção.",
    empty: "Nenhuma revogação neste ambiente. Envelope válido, zero entradas — estado vazio válido; a leitura é com fecho por omissão.",
  },
] as const;

// The canonical certification states published by the registry (ADR-032). Only CERTIFIED reads as valid.
const STATES = [
  { s: "NOT_CERTIFIED", d: "Por omissão (fecho por omissão). Não certificado." },
  { s: "CERTIFIED", d: "Certificado, no âmbito e na janela de validade. Único estado válido." },
  { s: "EXPIRED", d: "Validade terminada." },
  { s: "SUSPENDED", d: "Suspenso." },
  { s: "REVOKED", d: "Revogado. Estado terminal." },
  { s: "SUPERSEDED", d: "Substituído por um registo mais recente." },
] as const;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-cardish border border-line bg-white px-[20px] py-[16px]">
      <div className="mb-1 break-words font-mono text-[10px] tracking-[0.07em] text-ink-5">{label.toUpperCase()}</div>
      <div className="break-words text-[22px] font-semibold leading-[1.15] text-ink tabular-nums">{value}</div>
    </div>
  );
}

export default async function RegistoTecnicoPage() {
  const [operators, evidence, revocation] = await Promise.all([
    fetchJson<OperatorRow[]>("/operators", validateOperators),
    fetchJson<EvidenceEnvelope>("/conformance/evidence", validateEvidence),
    fetchJson<RevocationEnvelope>("/federation/revocation-list.json", validateRevocation),
  ]);

  const dash = "—";
  const num = (n: number | null | undefined) => (typeof n === "number" ? String(n) : dash);
  const implementations = operators === null ? null : operators.length;
  // Não existe ainda um store nem rota máquina de registos de certificação (ADR-032); o valor mantém-se 0
  // até esses registos serem indexados e expostos por rota própria — nunca derivado de linhas de evidência
  // de conformidade (evidência ≠ certificação). null apenas quando a rota de evidência não confirma.
  const certifications = evidence === null ? null : 0;
  const evidenceCount = evidence === null ? null : evidence.count;
  const revocations = revocation === null ? null : revocation.count;

  const anyConfirmed = operators !== null || evidence !== null || revocation !== null;
  const allConfirmed = operators !== null && evidence !== null && revocation !== null;
  // "Has entries" is a POSITIVE test over confirmed counts (a null count never counts as an entry), so a
  // partial outage can never masquerade as "com entradas". Only all-four-confirmed-and-zero reads as the
  // verified-empty state; a mix of confirmed-zero and unconfirmed is honestly "parcialmente confirmado".
  const hasEntries =
    (implementations ?? 0) > 0 || (certifications ?? 0) > 0 || (evidenceCount ?? 0) > 0 || (revocations ?? 0) > 0;

  // The closed set the search box filters over (client-side only; never fetches a target — ADR-034).
  // null = /operators NOT confirmed (outage/invalid payload) — distinct from the verified-empty [].
  const entries: RegistryEntry[] | null = operators === null ? null : operators.map((o) => ({
    id: o.operator_id,
    label: o.operator_name ?? o.operator_id,
    kind: "operador",
  }));

  const stateChip = hasEntries
    ? { label: "REGISTO COM ENTRADAS", tone: "ok" as const }
    : allConfirmed
      ? { label: "REGISTO VAZIO (VERIFICADO)", tone: "pend" as const }
      : !anyConfirmed
        ? { label: "ESTADO NÃO CONFIRMADO", tone: "pend" as const }
        : { label: "ESTADO PARCIALMENTE CONFIRMADO", tone: "pend" as const };

  return (
    <>
      <PageHero
        eyebrow="REGISTO TÉCNICO BANZA"
        title={<>Consulte, pesquise e verifique — informação técnica, não um selo.</>}
        lede={
          <>
            O Registo Técnico BANZA é o índice público, verificável por raiz e apenas de leitura da camada de
            certificação (Camada 2): implementações, certificações, evidência e revogações. Legível por
            qualquer terceiro, sem conta e sem confiar em nenhum operador.
          </>
        }
        chips={[{ label: "PÚBLICO E VERIFICÁVEL" }, { label: "SEM CONTA" }, { label: "PRÉ-PRODUÇÃO" }, stateChip]}
      />

      {/* Live status band — read from the machine routes, never asserted in prose. */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">ESTADO DO REGISTO · AGORA</div>
          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Ambiente" value="Pré-produção" />
            <Metric label="Implementações publicadas" value={num(implementations)} />
            <Metric label="Certificações activas" value={num(certifications)} />
            <Metric label="Evidência publicada" value={num(evidenceCount)} />
            <Metric label="Revogações" value={num(revocations)} />
          </div>
          <p className="mt-4 text-[11.5px] leading-[1.6] text-ink-5">
            <span className="font-semibold text-ink-4">Fonte:</span> rotas máquina públicas ·{" "}
            <span className="font-mono">GET /operators, /conformance/evidence, /federation/revocation-list.json</span>.{" "}
            {anyConfirmed
              ? "Os números acima são lidos dessas rotas. Um «—» indica que a rota não pôde ser confirmada agora."
              : "As rotas não puderam ser confirmadas agora — estado não confirmado; verifique directamente nas rotas máquina."}
          </p>
        </Container>
      </Section>

      {/* Search — the primary affordance of an explorer. */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">PESQUISAR NO REGISTO</div>
          <RegistrySearch entries={entries} />
        </Container>
      </Section>

      {/* The four areas, each with a live count and a valid empty state. */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE ESTÁ REGISTADO</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {AREAS.map((a) => {
              const count =
                a.key === "implementacoes"
                  ? implementations
                  : a.key === "certificacoes"
                    ? certifications
                    : a.key === "evidencia"
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
                      Não foi possível confirmar o estado desta área agora — verifique directamente na rota máquina.
                    </div>
                  ) : null}
                  <a href={a.route} className="link-bordo mt-2 inline-block break-all font-mono text-[12px]" title={`Abrir ${a.route} (devolve JSON)`}>
                    {a.route}
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[13px] leading-[1.6] text-ink-5">
            {implementations === 0 ? (
              <>
                Hoje nenhuma implementação está indexada — <span className="font-mono">/operators</span> devolve{" "}
                <span className="font-mono">[]</span>.{" "}
              </>
            ) : implementations === null ? (
              <>Estado de indexação não confirmado — verifique directamente na rota máquina. </>
            ) : (
              <>{implementations} implementação(ões) indexada(s). </>
            )}
            Estados canónicos de certificação (ADR-032):{" "}
            {STATES.map((st, i) => (
              <span key={st.s}>
                <span className="font-mono text-ink-4">{st.s}</span>
                {i < STATES.length - 1 ? " · " : ""}
              </span>
            ))}
            . Só <strong className="text-ink">CERTIFIED</strong> se lê como válido — decidido de forma
            determinística e reproduzível.
          </p>
        </Container>
      </Section>

      {/* How to read the registry — the boundary, condensed (details live in the Reference/glossário). */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">COMO INTERPRETAR O REGISTO</div>
          <h2 className="mb-3 font-serif text-[clamp(20px,2.6vw,30px)] font-semibold leading-[1.18] tracking-[-0.01em] text-ink">
            Constar no registo não é ser admitido, nem estar autorizado.
          </h2>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            O Registo Técnico é a superfície da camada de certificação (Camada 2) e é estritamente independente
            do directório de participantes de um esquema operacional (Camada 3). Estar listado significa apenas
            que existe evidência técnica verificável sobre uma implementação. A certificação técnica é uma
            determinação distinta da admissão a um esquema e da autorização regulatória — e nenhuma implica as
            outras.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
            {[
              ["Operador ≠ implementação", "A certificação aplica-se a uma implementação concreta, identificada por hash — nunca à entidade em abstracto."],
              ["Certificação ≠ admissão", "A admissão a um esquema é uma determinação do próprio esquema (Camada 3), independente da certificação."],
              ["Certificação ≠ autorização", "A autorização para operar pertence à autoridade reguladora competente, não ao protocolo."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-cardish border border-line bg-white px-[18px] py-[16px]">
                <div className="mb-1.5 text-[14px] font-semibold leading-[1.3] text-ink">{t}</div>
                <div className="text-[13px] leading-[1.6] text-ink-4">{b}</div>
              </div>
            ))}
          </div>
          <StatusNote tone="pend">
            <span className="font-semibold">O registo não lista operadores licenciados, aprovados ou admitidos.</span>{" "}
            Não há aqui nenhuma «entidade certificada» como estatuto global. A implementação de referência
            (Operador Zero) não é contada como participante real: existe apenas como referência de leitura,
            nunca aparece como operador publicado e nunca é participante de esquema.
          </StatusNote>
        </Container>
      </Section>

      {/* Machine routes — verify without trusting this site. */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFIQUE SEM CONFIAR NESTE SITE · ROTAS MÁQUINA</div>
          <p className="mb-6 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            O registo é uma superfície de máquina: cada rota devolve JSON puro, verificável por qualquer
            terceiro sem conta. Se o que está escrito nesta página não coincidir com o que estas rotas
            devolvem, as rotas ganham.
          </p>
          <div className="flex flex-col gap-[12px]">
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/operators" className="link-bordo break-all font-mono text-[13px]" title="Abrir /operators (devolve JSON)">
                /operators
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">O índice público de metadata e evidência verificável publicada por operadores.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Hoje: {implementations === null ? "estado não confirmado." : implementations === 0 ? "lista vazia ([]) — nenhuma implementação indexada. Um registo vazio é o estado correcto, não uma falha." : `${implementations} implementação(ões) indexada(s).`}
              </div>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/conformance/evidence" className="link-bordo break-all font-mono text-[13px]" title="Abrir /conformance/evidence (devolve JSON)">
                /conformance/evidence
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">Evidência de conformidade publicada, reproduzível por qualquer terceiro.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Hoje: {evidenceCount === null ? "estado não confirmado." : `${evidenceCount} registo(s) de evidência.`}
              </div>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
              <a href="/federation/revocation-list.json" className="link-bordo break-all font-mono text-[13px]" title="Abrir /federation/revocation-list.json (devolve JSON)">
                /federation/revocation-list.json
              </a>
              <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">A lista de revogação — chaves e artefactos revogados. Mecanismo de segurança e trust.</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">
                Hoje: {revocations === null ? "estado não confirmado." : `envelope válido, ${revocations} entrada(s); leitura com fecho por omissão.`}
              </div>
            </div>
          </div>
          {allConfirmed && !hasEntries ? (
            <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
              <strong className="text-ink">Registo vazio, honestamente.</strong> Hoje nenhuma implementação está
              indexada e nenhuma certificação de produção existe. A publicação de produção da metadata de
              confiança depende da cerimónia da chave raiz. O vazio é a afirmação verificável de que ainda não há
              evidência publicada.
            </p>
          ) : (
            <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
              <strong className="text-ink">O registo publica apenas o que foi verificado.</strong> O estado
              actual lê-se nas rotas máquina acima; um registo vazio, quando confirmado, é a afirmação
              verificável de que ainda não há evidência publicada. A publicação de produção da metadata de
              confiança depende da cerimónia da chave raiz.
            </p>
          )}
        </Container>
      </Section>

      {/* Continue — Reference-owned detail lives behind these links, not restated above. */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/certificacao">Como funciona a certificação (Camada 2)</MoreLink>
            <MoreLink href="/operadores">Operadores — registo público</MoreLink>
            <MoreLink href="/estado">Estado verificável do protocolo</MoreLink>
            <MoreLink href="/glossario">Glossário — os conceitos, com precisão</MoreLink>
            <MoreLink href="/banzai">Validar uma implementação com o BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
