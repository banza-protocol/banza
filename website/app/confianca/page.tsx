import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// Editorial trust page. Presents the Open Trust Evaluation (open trust model, sem autoridade
// certificadora), Signed Protocol Metadata as an assertion about ARTIFACTS (never participants), the
// key manifest (public keys only), and
// the three distinct kinds of revocation (key vs metadata/artifact vs Certification Record). Links into
// the canonical reference chapter /referencia/confianca for the full specification.

export const metadata: Metadata = {
  title: "Confiança",
  description:
    "A confiança no BANZA é uma Avaliação Aberta de Confiança: metadata do registo público, Signed Protocol Metadata e evidência de conformidade, verificadas localmente contra chaves delegadas endossadas pela raiz, com fecho por omissão e sem qualquer autoridade certificadora. Distingue revogação de chave, de metadata/artefacto e de Certification Record.",
  alternates: { canonical: "/confianca" },
};

const INPUTS = [
  { t: "Metadata do registo público", b: "O que uma implementação publica sobre si, indexado no registo técnico para consulta sem autenticação. Na validação oficial, estes artefactos são obtidos exclusivamente dos endpoints públicos da implementação, por uma camada segura de fetch em Rust — nunca pelo navegador (ADR-068)." },
  { t: "Signed Protocol Metadata", b: "Metadata assinada pela chave delegada do domínio protocol-metadata, ancorada na Raiz de Confiança através do Manifesto de Chaves — uma afirmação sobre artefactos, nunca sobre um participante." },
  { t: "Evidência de conformidade", b: "Evidência reproduzível por terceiros: hashes recalculáveis e automação re-executável, com o mesmo resultado." },
] as const;

const REVOCATION = [
  {
    t: "Revogação de chave",
    b: "Uma chave pública deixa de ser válida — por expiração da janela de validade ou por entrada na Revocation List assinada. Chaves privadas nunca aparecem nem são transmitidas.",
  },
  {
    t: "Revogação de metadata/artefacto",
    b: "Metadata de protocolo, uma release ou uma chave delegada são retiradas via Revocation List, um objecto assinado pela chave delegada do domínio de revogação (autoridade rastreada à raiz através do Manifesto de Chaves). É um mecanismo de segurança, não uma sanção regulatória.",
  },
  {
    t: "Revogação de Certification Record",
    b: "Um registo de certificação transita para REVOKED pela máquina de estados de certificação (decidida em Rust). REVOKED é terminal — não ressuscita; uma nova certificação é um registo novo.",
  },
] as const;

export default function ConfiancaPage() {
  return (
    <>
      <PageHero
        eyebrow="CONFIANÇA"
        title={<>Confiar sem pedir permissão a ninguém.</>}
        lede={
          <>
            No BANZA a confiança é calculada, não concedida. Um par decide localmente se encaminha para
            outro combinando metadata pública, metadata de protocolo assinada e evidência de conformidade —
            verificadas contra chaves delegadas endossadas pela raiz, com fecho por omissão. O BANZA não
            emite credenciais nem opera uma entidade central de emissão.
          </>
        }
        chips={[
          { label: "AVALIAÇÃO ABERTA DE CONFIANÇA" },
          { label: "SEM AUTORIDADE CERTIFICADORA" },
          { label: "FECHO POR OMISSÃO" },
          { label: "VERIFICAÇÃO LOCAL" },
        ]}
      />

      {/* O que a avaliação combina */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">A AVALIAÇÃO ABERTA DE CONFIANÇA</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Três entradas verificáveis — nenhuma palavra de honra.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            A avaliação é determinística, local e sem intervenção humana. Não depende de um certificado
            emitido por uma autoridade — depende de artefactos que qualquer par verifica por si.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            {INPUTS.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Assinaturas e chaves */}
      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">ASSINATURAS E CHAVES</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              <strong className="text-ink">A assinatura é sobre artefactos, não sobre pessoas.</strong> A
              Raiz de Confiança assina apenas o Manifesto de Chaves; o manifesto autoriza as chaves
              delegadas, e são estas que assinam os artefactos dos respectivos domínios — metadata de
              protocolo, evidência de conformidade e a Revocation List. Uma assinatura não autoriza
              pagamentos, não cria operadores, não emite licenças e não certifica nenhum operador.
            </p>
            <p>
              <strong className="text-ink">O manifesto de chaves publica apenas chaves públicas</strong> e
              os seus domínios, com janelas de validade e um hash para evidência de adulteração. As chaves
              privadas nunca aparecem. Em pré-produção não existem chaves de produção: estão preparadas mas
              gated até à cerimónia offline da chave raiz. Custódia repartida por limiar — nenhuma pessoa
              isolada reconstrói a raiz; o N-de-M concreto é configuração operacional — e fecho por
              omissão: o que não se consegue obter e verificar é tratado como ausente, nunca como válido.
            </p>
          </div>
        </Container>
      </Section>

      {/* Revogação — três objectos distintos */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REVOGAÇÃO — TRÊS OBJECTOS DISTINTOS</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            «Revogar» não é uma única coisa. Distinguem-se três objectos, com mecanismos e efeitos
            diferentes — nenhum deles é uma licença ou uma sanção regulatória.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {REVOCATION.map((r) => (
              <div key={r.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{r.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.b}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              Não existe autoridade certificadora: o modelo de confiança do BANZA é aberto e verificado
              localmente. A confiança avaliada não substitui obrigações legais, regulatórias, bancárias,
              KYC/KYB ou AML/CFT. Nada nesta página constitui aprovação regulatória.
            </StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/confianca">Confiança — capítulo da Referência</MoreLink>
            <MoreLink href="/federacao">Como a confiança sustenta a federação</MoreLink>
            <MoreLink href="/estado">Estado verificável do protocolo</MoreLink>
            <MoreLink href="/banzai">Explorar com o BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
