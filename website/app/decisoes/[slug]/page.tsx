import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section, Container, StatusNote } from "@/components/ui";
import { GitHubMark } from "@/components/GitHubMark";
import { decisions, getDecision } from "@/lib/decisions";
import { getDecisionMarkdown } from "@/lib/decisions-content";
import { DecisionMarkdown } from "@/components/decisoes/DecisionMarkdown";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return decisions.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getDecision(slug);
  if (!d) return { title: "Documento não encontrado · Decisões · BANZA" };
  const description =
    d.type === "ADR"
      ? "Leia esta decisão de arquitectura do protocolo BANZA, apresentada na língua original. Uma ADR é o registo canónico da decisão que documenta e deve ser lida em conjunto com a Referência BANZA, contratos e invariantes aplicáveis."
      : "Leia esta proposta ou discussão técnica do protocolo BANZA, apresentada na língua original. Uma RFC é o registo canónico da proposta que documenta, mas não altera por si só as regras actuais enquanto não for aceite e reflectida nos documentos aplicáveis.";
  return {
    title: `${d.id} · Decisões do Protocolo · BANZA`,
    description,
    alternates: { canonical: `/decisoes/${d.slug}` },
  };
}

export default async function DecisionDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = getDecision(slug);
  if (!d) notFound();

  const body = getDecisionMarkdown(slug);
  // Canonical documents live at decisions/adr and decisions/rfc (there is no docs/adr|docs/rfc).
  // This base is joined with relative hrefs inside the rendered body to build GitHub blob URLs, so
  // a wrong base silently 404s every sibling link (M2.9F).
  const baseDir = d.type === "ADR" ? "decisions/adr" : "decisions/rfc";
  const related = d.related
    .map((id) => decisions.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const banzaiPrompt =
    d.type === "ADR"
      ? `Explica o ${d.id} em linguagem simples, destacando que é o registo canónico da decisão de arquitectura que documenta, mas que deve ser lido em conjunto com a Referência BANZA, contratos e invariantes aplicáveis para implementação. Este documento não confere certificação.`
      : `Explica o ${d.id} em linguagem simples, destacando que é o registo canónico da proposta ou discussão técnica que documenta, mas que não altera por si só as regras actuais do protocolo enquanto não for aceite e reflectida nos documentos normativos aplicáveis. Este documento não confere certificação.`;
  const isADR = d.type === "ADR";

  const META: { k: string; v: string }[] = [
    { k: "Tipo", v: d.type === "ADR" ? "ADR · Registo de Decisão de Arquitectura" : "RFC · Pedido de Comentários" },
    { k: "Estado", v: d.status },
    { k: "Nível normativo", v: d.normativeLevel },
    { k: "Tema", v: d.category },
    ...(d.date ? [{ k: "Data", v: d.date }] : []),
    { k: "Caminho", v: d.path },
  ];

  return (
    <>
      <PageHero
        eyebrow={`${d.type} · ${d.id}`}
        title={d.title}
        lede={<>{d.summary}</>}
        chips={[
          { label: d.type, tone: "neutral" },
          { label: d.status.toUpperCase(), tone: d.state === "activo" ? "ok" : "pend" },
          { label: `NÍVEL ${d.normativeLevel}`, tone: "neutral" },
        ]}
      />

      {/* Breadcrumb */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <nav aria-label="Trilho" className="mb-8 font-mono text-[12px] text-ink-5">
            <Link href="/decisoes" className="text-ink-4 no-underline hover:text-bordo">
              Decisões do Protocolo
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-ink-2">{d.id}</span>
          </nav>

          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-start">
            {/* Metadata + actions */}
            <div>
              <div className="overflow-hidden rounded-cardish border border-line bg-white">
                {META.map((row, i) => (
                  <div
                    key={row.k}
                    className={`grid grid-cols-[minmax(120px,160px)_1fr] ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <div className="bg-paper-2 px-5 py-[13px] font-mono text-[11px] tracking-[0.06em] text-ink-5">
                      {row.k.toUpperCase()}
                    </div>
                    <div className="break-words px-5 py-[13px] text-[13.5px] text-ink-2">{row.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={d.canonicalUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-[7px] rounded-[3px] border border-bordo bg-bordo px-[15px] py-[10px] text-[13.5px] font-semibold text-white no-underline hover:bg-bordo-deep"
                >
                  <GitHubMark size={14} />
                  Ler documento completo no GitHub
                </a>
                <Link
                  href={`/banzai?doc=${encodeURIComponent(d.id)}&q=${encodeURIComponent(banzaiPrompt)}`}
                  className="inline-flex items-center rounded-[3px] border border-line bg-white px-[15px] py-[10px] text-[13.5px] text-ink-2 no-underline hover:border-seal hover:text-seal"
                >
                  Explicar com BanzAI
                </Link>
                <Link href="/decisoes" className="text-[13px] text-ink-4 no-underline hover:text-bordo">
                  <span aria-hidden="true" className="font-mono">←</span> Voltar às decisões
                </Link>
              </div>

              {related.length > 0 ? (
                <div className="mt-9">
                  <div className="mb-3 font-mono text-[11px] tracking-[0.08em] text-ink-5">RELACIONADOS</div>
                  <ul className="flex list-none flex-wrap gap-2 p-0">
                    {related.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/decisoes/${r.slug}`}
                          className="inline-flex items-center gap-2 rounded-[3px] border border-line bg-white px-[11px] py-[6px] text-[12.5px] text-ink-3 no-underline hover:border-bordo/40 hover:text-bordo"
                        >
                          <span className="font-mono text-[11px] text-ink-5">{r.id}</span>
                          {r.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Prudent side note */}
            <aside className="md:sticky md:top-[92px]">
              <StatusNote tone="pend">
                <span className="mb-1 block font-semibold">O que este documento é — e não é.</span>
                {isADR ? (
                  <>
                    Uma ADR é o registo canónico da decisão de arquitectura que documenta. Explica o
                    contexto técnico, a decisão tomada e as suas razões. Para implementar o protocolo,
                    deve ser lida em conjunto com a{" "}
                    <Link href="/referencia" className="link-bordo">Referência BANZA</Link>, os
                    contratos e os invariantes aplicáveis.
                  </>
                ) : (
                  <>
                    Uma RFC é o registo canónico da proposta ou discussão técnica que documenta.
                    Explica o contexto técnico, a proposta, as alternativas em análise e a possível
                    evolução do protocolo. Enquanto não for aceite e reflectida nos documentos
                    normativos aplicáveis, não altera por si só as regras actuais do protocolo.
                  </>
                )}
                {" "}Não aprova operadores nem confere certificação. O BanzAI explica, mas não
                decide, não certifica e não substitui os documentos normativos aplicáveis.
              </StatusNote>
              <p className="mt-4 text-[12px] leading-[1.6] text-ink-5">
                Estado do protocolo: pré-produção · <span className="font-mono">/operators = []</span> ·{" "}
                <span className="font-mono">production_certificates = false</span>.
              </p>
            </aside>
          </div>
        </Container>
      </Section>

      {/* Conteúdo completo — língua original, sem tradução */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="mx-auto max-w-[900px]">
            <div className="mb-6">
              <StatusNote tone="pend">
                {isADR ? (
                  <>
                    Uma ADR é o registo canónico da decisão de arquitectura que documenta. Explica o
                    contexto técnico, a decisão tomada e as suas razões. Para implementar o protocolo,
                    esta decisão deve ser lida em conjunto com a{" "}
                    <Link href="/referencia" className="link-bordo">Referência BANZA</Link>, os
                    contratos e os invariantes aplicáveis.
                  </>
                ) : (
                  <>
                    Uma RFC é o registo canónico da proposta ou discussão técnica que documenta.
                    Explica o contexto técnico, a proposta, as alternativas em análise e a possível
                    evolução do protocolo. Enquanto não for aceite e reflectida nos documentos
                    normativos aplicáveis, não altera por si só as regras actuais do protocolo.
                  </>
                )}{" "}
                Este documento é apresentado na sua língua original e não aprova operadores,
                não confere certificação e não substitui obrigações legais ou regulatórias. O BanzAI pode
                ajudar a explicar este documento, mas não decide, não certifica e não substitui os
                documentos normativos aplicáveis.
              </StatusNote>
            </div>

            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <div className="font-mono text-[11px] tracking-[0.1em] text-ink-5">
                DOCUMENTO ORIGINAL · CONTEÚDO COMPLETO
              </div>
              <a
                href={d.canonicalUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-[6px] font-mono text-[11px] text-ink-4 no-underline hover:text-bordo"
              >
                <GitHubMark size={12} />
                {d.path}
              </a>
            </div>

            {body ? (
              <DecisionMarkdown markdown={body} baseDir={baseDir} />
            ) : (
              <StatusNote tone="neg">
                Conteúdo completo temporariamente indisponível. Consulte o documento original no
                GitHub através da ligação acima.
              </StatusNote>
            )}

            <p className="mt-10 border-t border-line pt-5 text-[12.5px] leading-[1.6] text-ink-5">
              Para implementar o protocolo, leia este documento em conjunto com a{" "}
              <Link href="/referencia" className="link-bordo">Referência BANZA</Link>, os contratos e
              os invariantes aplicáveis. O BanzAI ajuda a explicar, mas não decide, não certifica e
              não substitui os documentos normativos aplicáveis.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
