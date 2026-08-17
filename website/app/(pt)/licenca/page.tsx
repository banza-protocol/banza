import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Licença e marcas",
  description:
    "O BANZA é open source sob Apache License 2.0. A licença não concede automaticamente direitos sobre as marcas BANZA, BanzAI ou Banzami. Atribuição em NOTICE; política de marcas em TRADEMARKS.",
  alternates: { canonical: "/licenca" },
};

export default function LicencaPage() {
  return (
    <>
      <PageHero
        eyebrow="LICENÇA E MARCAS"
        title={<>Open source sob Apache-2.0 — marcas à parte.</>}
        lede={
          <>
            O código, contratos e especificações do BANZA são open source sob a{" "}
            <strong>Apache License 2.0</strong>. A licença não concede automaticamente direitos de uso das
            marcas BANZA, BanzAI ou Banzami — a licença e a marca são tratadas separadamente.
          </>
        }
        chips={[{ label: "APACHE LICENSE 2.0" }, { label: "PROTOCOLO FINANCEIRO ABERTO" }, { label: "MARCAS À PARTE" }]}
      />

      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE A LICENÇA COBRE</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              A <strong className="text-ink">Apache License 2.0</strong> concede direitos de usar, reproduzir,
              modificar e distribuir o código e a documentação cobertos, nos seus termos. Não é preciso pedir
              autorização à Banzami para usar, estudar, modificar ou distribuir o código coberto pela licença.
              O texto canónico está em <a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener" className="link-bordo">LICENSE</a>;
              a atribuição institucional em <a href={`${GITHUB_URL}/blob/main/NOTICE`} rel="noopener" className="link-bordo">NOTICE</a>.
            </p>
            <p>
              A <strong className="text-ink">licença não concede direitos de marca.</strong> O uso dos nomes e
              logótipos BANZA, BanzAI e Banzami rege-se pela política de marcas em{" "}
              <a href={`${GITHUB_URL}/blob/main/TRADEMARKS.md`} rel="noopener" className="link-bordo">TRADEMARKS.md</a>.
              É permitida referência nominativa, atribuição, forks que se declarem forks e afirmações de
              compatibilidade («implementa o protocolo BANZA») que não sugiram aprovação, certificação ou parceria.
            </p>
            <p>
              O BANZA foi criado originalmente pela <strong className="text-ink">BANZAMI - TECNOLOGIA E
              SERVIÇOS, LDA.</strong> (criadora original e mantenedora institucional inicial) e é governado por
              processos públicos do repositório (ver <Link href="/governanca" className="link-bordo">governança</Link>).
              O BANZA é um protocolo financeiro aberto — não é banco, PSP, carteira nem operador financeiro.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener" className="link-bordo">LICENSE ↗</a>
            <a href={`${GITHUB_URL}/blob/main/NOTICE`} rel="noopener" className="link-bordo">NOTICE ↗</a>
            <a href={`${GITHUB_URL}/blob/main/TRADEMARKS.md`} rel="noopener" className="link-bordo">TRADEMARKS ↗</a>
            <Link href="/governanca" className="link-bordo">Governança</Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
