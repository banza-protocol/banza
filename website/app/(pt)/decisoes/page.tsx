import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GitHubMark } from "@/components/GitHubMark";
import { DecisionsExplorer } from "@/components/decisoes/DecisionsExplorer";
import { decisions, decisionCategories } from "@/lib/decisions";
import { GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Decisões do Protocolo · ADRs e RFCs · BANZA",
  description:
    "Consulte ADRs e RFCs do protocolo BANZA — o registo canónico das decisões técnicas e propostas que documentam. Para implementar o protocolo, leia-os em conjunto com a Referência BANZA, contratos e invariantes aplicáveis.",
  alternates: { canonical: "/decisoes" },
};

const adrCount = decisions.filter((d) => d.type === "ADR").length;
const rfcCount = decisions.filter((d) => d.type === "RFC").length;

export default function DecisoesPage() {
  return (
    <>
      <PageHero
        eyebrow="GOVERNAÇÃO · DECISÕES"
        title="Decisões do Protocolo"
        lede={
          <>
            ADRs e RFCs que documentam a evolução técnica do BANZA. Cada documento é o registo
            canónico da decisão ou proposta que documenta; para implementar o protocolo, leia-os
            em conjunto com a Referência BANZA, os contratos e os invariantes aplicáveis.
          </>
        }
        chips={[
          { label: "PROTOCOLO", tone: "neutral" },
          { label: "GOVERNAÇÃO", tone: "neutral" },
          { label: `${adrCount} ADRs · ${rfcCount} RFCs`, tone: "neutral" },
          { label: "BANZAI EXPLICA, NÃO DECIDE", tone: "pend" },
        ]}
      />

      {/* NOTA PRUDENTE */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-center">
            <p className="m-0 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
              As <strong className="font-semibold text-ink-2">ADRs</strong> (Registos de Decisão
              de Arquitectura, nível normativo N3) são o registo canónico das decisões técnicas que
              documentam. As <strong className="font-semibold text-ink-2">RFCs</strong> (Pedidos de
              Comentários, N4) são o registo canónico das propostas e discussões técnicas que
              documentam — algumas ainda em rascunho. Para implementar o protocolo, leia estes
              documentos em conjunto com a{" "}
              <Link href="/referencia" className="link-bordo">Referência BANZA</Link>, os contratos
              e os invariantes aplicáveis. O{" "}
              <Link href="/banzai" className="link-bordo">BanzAI</Link> é explicativo e não normativo.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`${GITHUB_URL}/tree/main/docs`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-[7px] rounded-[3px] border border-line bg-white px-[14px] py-[9px] text-[13px] text-ink-2 no-underline hover:border-bordo/40 hover:text-bordo"
              >
                <GitHubMark size={14} />
                Código-fonte no GitHub
              </a>
              <Link
                href="/referencia/governacao"
                className="inline-flex items-center rounded-[3px] border border-line bg-white px-[14px] py-[9px] text-[13px] text-ink-2 no-underline hover:border-bordo/40 hover:text-bordo"
              >
                Processo de governação
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* EXPLORADOR */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <DecisionsExplorer decisions={decisions} categories={decisionCategories} locale="pt" />
        </Container>
      </Section>
    </>
  );
}
