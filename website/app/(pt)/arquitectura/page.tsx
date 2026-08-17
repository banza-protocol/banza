import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// Real page that OWNS the canonical three-layer institutional architecture (ADR-004..063): L1 Protocol /
// L2 Conformance & Interoperability Certification / L3 Banzami Operational Scheme, with BanzAI as the
// single transversal interface (NOT a layer). It deliberately replaces the older "três zonas" framing
// and states the three-way separation certification != scheme admission != regulatory authorisation.

export const metadata: Metadata = {
  title: "Arquitectura",
  description:
    "A arquitectura do BANZA em três camadas: Camada 1 Protocolo aberto, Camada 2 Certificação de Conformidade e Interoperabilidade (por implementação, baseada em evidência, decidida em Rust) e Camada 3 Esquemas operacionais independentes — esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações; o primeiro é o Esquema Operacional Banzami, com a Banzami como operadora designada do esquema (preparação regulatória em curso, pagamentos reais desactivados). O BanzAI é a interface humana primária e transversal — não é uma camada.",
  alternates: { canonical: "/arquitectura" },
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
    tag: "Camada 1",
    name: "BANZA · Protocolo",
    role: "Aberto e neutro",
    body:
      "A camada comum a todos os operadores: as regras públicas que definem o que é correcto. Não executa nada e não pertence a nenhum operador.",
    bullets: [
      "Contratos (OpenAPI), esquemas e mensagens",
      "Invariantes financeiros e reason codes",
      "Identidade técnica, manifestos e metadata assinada",
      "Descoberta, perfis, confiança e revogação",
      "Registo técnico e federação",
    ],
  },
  {
    tag: "Camada 2",
    name: "Certificação de Conformidade e Interoperabilidade",
    role: "Por implementação · baseada em evidência · decidida em Rust",
    body:
      "Uma determinação reproduzível e ligada por hash de que uma implementação demonstrou conformidade e interoperabilidade contra um perfil público e versionado, com âmbito e validade limitados. Certifica uma implementação (identificada pelo hash do artefacto), nunca uma entidade.",
    bullets: [
      "Perfil de certificação público e versionado",
      "Conformidade + interoperabilidade como evidência",
      "Veredicto decidido pelos motores Rust, com reason code",
      "Estados: NOT_CERTIFIED · CERTIFIED · EXPIRED · SUSPENDED · REVOKED · SUPERSEDED",
      "Não é licença, admissão a um esquema nem autorização regulatória",
    ],
  },
  {
    tag: "Camada 3",
    name: "Esquemas operacionais independentes",
    role: "O primeiro: Esquema Operacional Banzami · em preparação regulatória",
    body:
      "Esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações. O primeiro é o Esquema Operacional Banzami, promovido e administrado pela Banzami — Tecnologia e Serviços, Lda. como operadora designada do esquema, condicionado à obtenção do enquadramento regulatório aplicável. É um esquema entre outros possíveis; a certificação BANZA não lhe é exclusiva. BANZA não é a Banzami.",
    bullets: [
      "Admissão de participantes segundo as regras do próprio esquema",
      "Diretório de participantes distinto do registo técnico (Camada 2)",
      "Separado da Camada 1 e da Camada 2 em infraestrutura, chaves e dados",
    ],
    status: "Operadora designada do esquema: Banzami · preparação regulatória em curso · pagamentos reais desactivados.",
  },
];

// Three separate determinations — none implies another (non-propagation).
const DETERMINATIONS = [
  {
    t: "Certificação técnica (Camada 2)",
    b: "«esta implementação passou este perfil, com esta evidência, neste âmbito, até esta data». Decidida em Rust. Não concede acesso a nenhum esquema nem autoriza actividade regulada.",
  },
  {
    t: "Admissão a um esquema (Camada 3)",
    b: "a decisão de um esquema de admitir um participante, segundo a sua própria diligência, elegibilidade e contratos. Pode exigir certificação válida, mas nunca é implicada por ela.",
  },
  {
    t: "Autorização regulatória",
    b: "concedida pelo regulador competente para conduzir actividade financeira regulada. O BANZA não é parte: não a concede, não a acelera e não a substitui.",
  },
] as const;

export default function ArquitecturaPage() {
  return (
    <>
      <PageHero
        eyebrow="ARQUITECTURA"
        title={<>Três camadas. Uma interface.</>}
        lede={
          <>
            O BANZA separa, de forma permanente, o que é a regra, o que prova que uma implementação a
            respeita e o que é operar um serviço real. São três camadas distintas — protocolo,
            certificação técnica e esquema operacional — atravessadas por uma interface humana primária e transversal, o
            BanzAI, que não é uma quarta camada.
          </>
        }
        chips={[
          { label: "Camada 1 · PROTOCOLO" },
          { label: "Camada 2 · CERTIFICAÇÃO TÉCNICA" },
          { label: "Camada 3 · ESQUEMA OPERACIONAL" },
          { label: "BANZAI · INTERFACE TRANSVERSAL" },
        ]}
      />

      {/* As três camadas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">AS TRÊS CAMADAS</div>
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

      {/* BanzAI transversal */}
      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">BANZAI — INTERFACE HUMANA PRIMÁRIA E TRANSVERSAL</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              O <strong className="text-ink">BanzAI</strong> é a interface humana primária e transversal, em{" "}
              <span className="font-mono text-[13px]">/banzai</span>, através da qual as pessoas executam
              cada fluxo de trabalho ao longo das três camadas — perguntar e validar. Orienta, invoca os
              motores Rust e explica; consumidores máquina mantêm acesso directo às APIs.
            </p>
            <p>
              O BanzAI <strong className="text-ink">não é uma camada nem uma autoridade</strong>: não
              decide, não certifica, não admite, não publica, não activa fundos e não altera um estado ou
              reason code. <strong className="text-ink">O Rust decide; o Qwen explica</strong> — uma vez, e
              nunca decide.
            </p>
          </div>
        </Container>
      </Section>

      {/* Três determinações distintas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">TRÊS DETERMINAÇÕES DISTINTAS</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Certificar não é admitir; admitir não é autorizar.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            São três decisões separadas, com donos diferentes. Nenhuma implica outra — não há propagação
            entre camadas.
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
              A conformidade técnica com o BANZA não substitui obrigações legais, regulatórias, bancárias,
              KYC/KYB ou AML/CFT. Contratos, elegibilidade, risco, liquidação, responsabilidades e
              autorização permanecem no domínio aplicável a cada operador e esquema. Nada nesta página
              constitui aprovação regulatória.
            </StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/arquitectura">Arquitectura — capítulo da Referência</MoreLink>
            <MoreLink href="/confianca">Confiança e verificação</MoreLink>
            <MoreLink href="/federacao">Federação</MoreLink>
            <MoreLink href="/governanca">Governança aberta</MoreLink>
            <MoreLink href="/banzai">Explorar com o BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
