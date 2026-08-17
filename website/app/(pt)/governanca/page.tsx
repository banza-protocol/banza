import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Governança aberta",
  description:
    "O BANZA foi criado originalmente pela Banzami e é mantido como protocolo financeiro aberto através de governação pública no GitHub: issues, pull requests, ADRs, RFCs, specs e releases.",
  alternates: { canonical: "/governanca" },
};

const MECHANISMS = [
  "Issues", "Pull requests", "Revisão de código", "ADRs", "RFCs",
  "Especificações", "Releases", "Testes de conformidade", "Evidência pública",
];

export default function GovernancaPage() {
  return (
    <>
      <PageHero
        eyebrow="GOVERNANÇA ABERTA"
        title={<>Governação pública, hoje — no GitHub.</>}
        lede={
          <>
            O BANZA foi criado originalmente pela <strong>BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.</strong>,
            criadora original e mantenedora institucional inicial. A governação do protocolo é aberta
            hoje e ocorre no repositório público GitHub — não é uma promessa futura.
          </>
        }
        chips={[{ label: "PROTOCOLO FINANCEIRO ABERTO" }, { label: "GOVERNAÇÃO PÚBLICA" }, { label: "APACHE-2.0" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">COMO O PROTOCOLO EVOLUI</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              Uma mudança entra no protocolo por artefactos públicos:{" "}
              <span className="font-mono text-[13px]">proposta → issue/RFC/ADR → revisão → implementação → testes → merge → release → actualização da referência</span>.
              Qualquer pessoa pode propor; os maintainers activos revêem e integram segundo o processo público.
            </p>
            <p>
              A <strong className="text-ink">Banzami é a criadora original e mantenedora institucional
              inicial</strong>, mas o protocolo é governado por processos públicos do repositório. Nenhum
              operador é aprovado ou certificado por decisão privada; mudanças normativas exigem artefactos
              públicos.
            </p>
            <p>
              A governação <strong className="text-ink">não licencia, não aprova e não certifica
              operadores</strong>, não emite licenças financeiras e não substitui reguladores. O{" "}
              <strong className="text-ink">BanzAI guia e explica; não cria regras</strong> — novas regras
              entram apenas pela governação pública. Os operadores implementam o protocolo de forma
              independente e publicam evidência verificável; a interoperabilidade entre pares baseia-se em
              evidência, não em aprovação privada.
            </p>
            <p>
              A participação na governação <strong className="text-ink">não concede automaticamente direitos
              de marca</strong> (ver <Link href="/licenca" className="link-bordo">licença e marcas</Link>).
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {MECHANISMS.map((m) => (
              <span key={m} className="rounded-protocol border border-line bg-white px-3 py-1.5 font-mono text-[11px] text-ink-4">{m}</span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/referencia/governacao" className="link-bordo">Referência · Governança</Link>
            <a href={`${GITHUB_URL}/blob/main/GOVERNANCE.md`} rel="noopener" className="link-bordo">GOVERNANCE.md ↗</a>
            <a href={`${GITHUB_URL}/blob/main/MAINTAINERS.md`} rel="noopener" className="link-bordo">MAINTAINERS.md ↗</a>
            <Link href="/decisoes" className="link-bordo">ADRs e RFCs</Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
