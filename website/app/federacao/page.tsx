import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// Editorial federation page. States the QUALIFIED federation claim (never the absolute "sem acordos
// bilaterais"/"sem intermediários"/"sem aprovação"/"federação automática para pagamentos reais") and is
// explicit that contracts, participation, risk, settlement, responsibilities and authorisation remain in
// the applicable domain. Links into the canonical reference chapter /referencia/federacao.

export const metadata: Metadata = {
  title: "Federação",
  description:
    "A federação BANZA permite descoberta e verificação técnica através de regras e perfis comuns, reduzindo a necessidade de reconstruir integrações técnicas bilaterais entre cada par de participantes. Contratos, participação, risco, liquidação, responsabilidades e autorização permanecem no domínio aplicável. A federação de produção não está activa em pré-produção.",
  alternates: { canonical: "/federacao" },
};

const REQUIRES = [
  { t: "Âmbito de conformidade aplicável", b: "A implementação demonstra o âmbito de conformidade exigido para a rota pretendida." },
  { t: "Metadata e evidência válidas e frescas", b: "Signed Protocol Metadata e evidência verificáveis, dentro da janela de frescura." },
  { t: "Ausência da Revocation List", b: "Chaves e artefactos não constam da lista de revogação assinada (verificada com fecho por omissão)." },
  { t: "Condições de produção", b: "As condições públicas de produção estão satisfeitas — o que não acontece em pré-produção." },
] as const;

const REMAINS = ["Contratos", "Participação", "Risco", "Liquidação", "Responsabilidades", "Autorização"];

export default function FederacaoPage() {
  return (
    <>
      <PageHero
        eyebrow="FEDERAÇÃO"
        title={<>Interoperar por evidência, não por integração bilateral.</>}
        lede={
          <>
            A federação permite descoberta e verificação técnica através de regras e perfis comuns,
            reduzindo a necessidade de reconstruir integrações técnicas bilaterais entre cada par de
            participantes. Não é uma rede automática de pagamentos reais nem dispensa contratos,
            responsabilidades ou autorização.
          </>
        }
        chips={[
          { label: "POR EVIDÊNCIA PUBLICADA" },
          { label: "AVALIAÇÃO ABERTA DE CONFIANÇA" },
          { label: "FEDERAÇÃO DE PRODUÇÃO NÃO ACTIVA" },
        ]}
      />

      {/* O que é */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE É A FEDERAÇÃO</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              Federação é a avaliação técnica, local e por interacção, das condições para o encaminhamento
              de pagamentos entre operadores independentes — estabelecida por evidência publicada e
              verificável e pela Avaliação Aberta de Confiança sobre metadata assinada, e não pela
              reconstrução da mesma integração técnica bilateral por cada par de operadores. É por isso
              que a interoperabilidade cresce sem que cada participante tenha de reconstruir a mesma
              integração técnica com todos os outros.
            </p>
            <p>
              Isto é uma propriedade técnica do protocolo — descoberta e verificação por regras e perfis
              comuns. Não é «sem intermediários», «sem aprovação» nem uma rede que liga pagamentos reais
              por si só.
            </p>
          </div>
        </Container>
      </Section>

      {/* O que a federação exige */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE A FEDERAÇÃO EXIGE</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Encaminhar para um par não é automático: cada condição é verificável e todas têm de se
            verificar. Em pré-produção, a federação de produção não está activa.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {REQUIRES.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* O que permanece no domínio aplicável */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE PERMANECE NO DOMÍNIO APLICÁVEL</div>
          <p className="mb-6 text-[15px] leading-[1.7] text-ink-3">
            A federação técnica reduz o trabalho de integração entre pares — mas não absorve o que pertence
            aos operadores, aos esquemas e aos reguladores. Permanecem, no domínio aplicável a cada
            participante:
          </p>
          <div className="mb-8 flex flex-wrap gap-2">
            {REMAINS.map((m) => (
              <span key={m} className="rounded-protocol border border-line bg-white px-3 py-1.5 font-mono text-[11px] text-ink-4">{m}</span>
            ))}
          </div>
          <StatusNote tone="pend">
            A interoperabilidade e a federação técnicas não constituem aprovação regulatória e não
            substituem contratos, obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT. A
            liquidação e o movimento de dinheiro real ocorrem sob as autorizações próprias de cada
            operador — e permanecem desactivados em pré-produção.
          </StatusNote>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/federacao">Federação — capítulo da Referência</MoreLink>
            <MoreLink href="/confianca">A confiança que sustenta a federação</MoreLink>
            <MoreLink href="/arquitectura">A arquitectura em três camadas</MoreLink>
            <MoreLink href="/estado">Estado verificável do protocolo</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
