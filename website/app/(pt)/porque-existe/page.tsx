import type { Metadata } from "next";
import { PageHero, Section, Container, MoreLink } from "@/components/ui";

// Short editorial page framing WHY BANZA exists (fragmentation + the per-pair bilateral-integration
// burden), with no absolute claims. It does not duplicate the reference — the full rationale lives in
// chapter 2, /referencia/porque-existe, which this page links to.

export const metadata: Metadata = {
  title: "Por que o BANZA existe",
  description:
    "A interoperabilidade entre operadores já existe — assegurada por integrações par a par e por infraestruturas partilhadas de participação controlada. O que raramente é público e reproduzível por terceiros é a camada de especificação, conformidade e evidência. O BANZA acrescenta essa camada aberta; complementa as infraestruturas em uso, não as substitui.",
  alternates: { canonical: "/porque-existe" },
};

export default function PorqueExistePage() {
  return (
    <>
      <PageHero
        eyebrow="POR QUE EXISTE"
        title={<>Uma camada aberta sobre a interoperabilidade que já existe.</>}
        lede={
          <>
            A interoperabilidade entre operadores já é assegurada — por integrações par a par e por
            infraestruturas partilhadas de participação controlada. O que falta, e que o BANZA acrescenta, é
            uma camada aberta em que as regras, os testes e a evidência são públicos e reproduzíveis por
            terceiros. O BANZA complementa as infraestruturas em uso; não as substitui.
          </>
        }
        chips={[{ label: "CAMADA ABERTA" }, { label: "INTEROPERABILIDADE VERIFICÁVEL" }, { label: "PROTOCOLO FINANCEIRO ABERTO" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">O PROBLEMA</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              A interoperabilidade operacional entre operadores já existe — através de integrações
              negociadas par a par e de infraestruturas partilhadas de participação controlada (adesão,
              adequação técnica e autorização). Estes modelos asseguram a operação, mas as respectivas
              especificações, testes e resultados costumam ser privados ou estar disponíveis apenas aos
              participantes autorizados.
            </p>
            <p>
              A consequência é que um terceiro raramente consegue reproduzir de forma independente a
              validação técnica: as regras, os vectores de teste e a evidência não são públicos. Cada nova
              integração repete trabalho semelhante, com critérios ligeiramente diferentes e resultados
              difíceis de comparar.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">A RESPOSTA DO BANZA</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              O BANZA acrescenta uma camada aberta a essa interoperabilidade: regras públicas, perfis
              versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica.
              Uma implementação que siga o protocolo pode demonstrar conformidade e interoperar através de um
              perfil comum — e qualquer terceiro pode reproduzir essa validação a partir dos mesmos
              artefactos públicos. O BANZA complementa as infraestruturas em uso; não as substitui.
            </p>
            <p>
              O protocolo é operador-neutro e a participação demonstra-se por evidência verificável, não por
              aprovação privada. É a base pública sobre a qual operadores independentes podem competir nos
              produtos e cooperar na interoperabilidade.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/porque-existe">Racional completo — capítulo da Referência</MoreLink>
            <MoreLink href="/referencia/o-que-e">O que é o BANZA</MoreLink>
            <MoreLink href="/arquitectura">A arquitectura em três camadas</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
