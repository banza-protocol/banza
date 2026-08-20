import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getReferenceChapters, getReferenceMeta } from "@/lib/reference";
import { GITHUB_URL } from "@/lib/site";

// Reference INDEX — the cover, framing and index of the canonical protocol reference. It orients the
// reader; the chapters explain. The full single-page rendering lives at /referencia/completa; each
// chapter at /referencia/<slug>. Copy here is page-authored (sober, self-contained) rather than pulled
// from the markdown Resumo Executivo, so the entry page stays a door — not a chapter 0.

export const metadata: Metadata = {
  title: "Referência do Protocolo",
  description:
    "A referência descritiva oficial do protocolo BANZA v1.0 (pré-produção), organizada por capítulos: arquitectura, confiança, conformidade, evidência, federação e governação. Descreve o protocolo; não confere estatuto a qualquer operador.",
  alternates: { canonical: "/referencia" },
};

// Current, verified public state — invariants only, never transitory runtime values. Live detail: /estado.
const ESTADO: string[] = [
  "Protocolo BANZA v1.0, em pré-produção.",
  "Zero operadores em produção — o Registo Técnico devolve uma lista vazia.",
  "Nenhuma certificação de produção; o modelo de Certificação de Conformidade e Interoperabilidade (Camada 2) está activo.",
  "Pagamentos reais desligados.",
  "A implementação de referência (Operador Zero) existe apenas em ambiente de testes, apenas de leitura.",
  "A federação de produção ainda não está activa.",
];

// Essential onward links — chapter routes are canonical; /estado and /decisoes are their own surfaces.
const CONTINUAR: [string, string][] = [
  ["/estado", "Estado verificável"],
  ["/referencia/certificacao", "Conformidade e Certificação"],
  ["/referencia/confianca", "Confiança"],
  ["/referencia/programadores", "Recursos para Programadores"],
];

export default function ReferenciaPage() {
  const chapters = getReferenceChapters();
  const { version } = getReferenceMeta();

  return (
    <>
      {/* Hero */}
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(44px,6vw,80px)]">
          <div className="band-eyebrow mb-4">REFERÊNCIA DO PROTOCOLO</div>
          <h1 className="font-display max-w-[20ch] text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.05] text-creme-high">
            Referência do Protocolo BANZA
          </h1>
          <p className="mt-5 max-w-[62ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">
            Especificações, arquitectura, perfis, confiança, conformidade, evidência, federação e
            governação do protocolo BANZA — organizadas por capítulos.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRÉ-PRODUÇÃO"].map((c) => (
              <span key={c} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {c}
              </span>
            ))}
          </div>
        </Container>
      </header>

      {/* Sobre esta Referência */}
      <section className="border-b border-line bg-paper">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="eyebrow mb-4">SOBRE ESTA REFERÊNCIA</div>
          <div className="max-w-[74ch] space-y-4 text-[15px] leading-[1.7] text-ink-4">
            <p>
              Esta é a referência descritiva oficial do protocolo BANZA. Organiza por capítulos os
              conceitos, regras e superfícies públicas do protocolo. As fontes canónicas e
              verificáveis — os contratos, os invariantes, os vectores de conformidade, a metadata
              assinada e a evidência publicada — definem os requisitos aplicáveis; esta referência
              descreve-as e organiza-as, não as substitui.
            </p>
            <p>
              Os ADRs registam decisões adoptadas e os RFCs apresentam propostas ainda em processo de
              governação. A Referência é autocontida — pode ser lida sem consultar outras fontes — mas
              remete para elas quando definem o detalhe técnico. Quando uma afirmação depende do estado
              actual de uma implementação, deve ser confirmada nas superfícies verificáveis
              apropriadas.
            </p>
            <p>
              A conformidade protocolar de uma implementação é demonstrada por evidência verificável e
              reproduzível, não por aprovação humana central. A certificação de uma implementação, a
              admissão de um operador a um esquema e a autorização para operação real são decisões
              institucionais distintas. Cada operador é uma entidade independente e responde pelas suas
              obrigações legais e regulatórias.
            </p>
          </div>
        </Container>
      </section>

      {/* Estado actual */}
      <section className="border-b border-line bg-paper-2">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div className="eyebrow">ESTADO ACTUAL</div>
            <Link href="/estado" className="btn-ghost">
              Estado verificável em detalhe <span className="font-mono">→</span>
            </Link>
          </div>
          <ul className="max-w-[80ch] space-y-2.5">
            {ESTADO.map((fact) => (
              <li key={fact} className="flex gap-3 text-[14px] leading-[1.6] text-ink-4">
                <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-bordo/60" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Índice de capítulos */}
      <section className="bg-paper">
        <Container width="site" className="py-[clamp(32px,4vw,56px)]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">CAPÍTULOS · {chapters.length}</div>
              <h2 className="h-section m-0">Leia por capítulo.</h2>
            </div>
            <Link href="/referencia/completa" className="btn-ghost">
              Referência completa (página única) <span className="font-mono">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <Link
                key={c.slug}
                href={`/referencia/${c.slug}`}
                className="group rounded-cardish border border-line bg-white px-[20px] py-[18px] no-underline transition-colors hover:border-bordo/40"
              >
                <div className="mb-2 font-mono text-[10.5px] tracking-[0.1em] text-ink-5">
                  CAPÍTULO {String(c.num).padStart(2, "0")}
                </div>
                <div className="mb-1.5 text-[15.5px] font-semibold leading-[1.3] text-ink group-hover:text-bordo">
                  {c.title.replace(/^\d+\.\s*/, "")}
                </div>
                <div className="text-[13px] leading-[1.55] text-ink-4">{c.summary}</div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Decisões e evolução */}
      <section className="border-t border-line bg-paper-2">
        <Container width="site" className="py-[clamp(32px,4vw,52px)]">
          <div className="grid gap-5 md:grid-cols-[1.6fr_auto] md:items-center">
            <div>
              <div className="mb-3 font-mono text-[11px] tracking-eyebrow text-bordo">DECISÕES E EVOLUÇÃO</div>
              <p className="m-0 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
                O protocolo evolui por processo documentado. Os contratos, as specs e as versões
                publicadas determinam os requisitos aplicáveis; os ADRs registam decisões adoptadas e o
                seu racional; os RFCs apresentam propostas ainda sujeitas ao processo de governação. A
                biblioteca pública é apresentada na língua original e não substitui esta referência.
              </p>
            </div>
            <Link href="/decisoes" className="btn-ghost justify-self-start md:justify-self-end">
              Ver ADRs e RFCs <span className="font-mono">→</span>
            </Link>
          </div>
        </Container>
      </section>

      {/* Continuar */}
      <section className="border-t border-line bg-paper">
        <Container width="site" className="py-[clamp(36px,5vw,64px)]">
          <div className="mb-5 font-mono text-[11px] tracking-eyebrow text-bordo">CONTINUAR</div>
          <div className="flex flex-wrap gap-3">
            {CONTINUAR.map(([href, label]) => (
              <Link key={href} href={href} className="btn-ghost">
                {label} <span className="font-mono">→</span>
              </Link>
            ))}
            <a href={GITHUB_URL} rel="noopener" className="btn-ghost">
              GitHub <span className="font-mono">↗</span>
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
