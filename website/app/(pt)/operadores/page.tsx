import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// M2.15B — Operadores is one of the three distinct public destinations in the global navigation.
// It is the human EXPLAINER of operator roles + verifiable evidence: the canonical registry surface is
// the Registo Técnico live explorer (/registo-tecnico; machine route /operators). It shows what that registry indexes (manifests, metadata, evidence, technical
// state, trust state, revocation) and how to verify each claim directly via the machine routes. It is
// NOT a list of certified, approved, licensed or official operators — in BANZA participation is shown by
// verifiable evidence, never granted by a central authority. When no operators are published, the honest
// state is the empty registry, and this page says so.

export const metadata: Metadata = {
  title: "Operadores — papéis, implementações e evidência",
  description:
    "Operadores no protocolo BANZA — papéis, implementações e evidência verificável. O estado actual verifica-se directamente nas rotas máquina públicas (GET /operators); o índice canónico é o Registo Técnico. O registo não é uma lista de operadores licenciados, aprovados ou admitidos — a participação demonstra-se por evidência verificável, não é concedida por uma autoridade central.",
  alternates: { canonical: "/operadores" },
};

// The distinct roles the public surface must keep separate (ADR-032/060/061). The registry certifies
// implementations, never entities — so "certified operator" is never a thing here.
const ROLES = [
  { k: "ENTIDADE", t: "Entidade", b: "Uma pessoa colectiva independente — uma empresa. É o titular de direitos e obrigações, não o sujeito da certificação." },
  { k: "OPERADOR", t: "Operador", b: "A entidade responsável que implementa o BANZA para processar pagamentos nos seus próprios sistemas, sob as suas próprias autorizações regulatórias. O BANZA não é um operador. Validar um operador é avaliar uma das suas implementações publicadas." },
  { k: "IMPLEMENTAÇÃO", t: "Implementação", b: "O sistema técnico avaliado e o sujeito da certificação: um conjunto de artefactos/build específico, identificado por hash de conteúdo — nunca uma entidade nem uma marca. Um operador pode publicar várias." },
  { k: "IMPLEMENTAÇÃO CERTIFICADA", t: "Implementação certificada", b: "Uma implementação que demonstrou conformidade e interoperabilidade contra um perfil público e versionado, ligada ao seu hash. Um build diferente é outro sujeito." },
  { k: "PARTICIPANTE DE ESQUEMA", t: "Participante de esquema", b: "Uma entidade/implementação admitida por um esquema operacional (Camada 3) segundo as regras desse esquema. Constar no registo técnico não é ser admitido a um esquema." },
  { k: "UTILIZADOR FINAL", t: "Utilizador final", b: "A pessoa que usa o produto de um operador. Não é parte do protocolo nem do registo — a sua relação é com o operador." },
] as const;

// Registry state — mirrors the machine routes (the verifiable source); this page is the human reading.
const PANEL = [
  { label: "Registo Técnico BANZA", value: "0 entradas — /operators devolve []" },
  { label: "production_certificates", value: "false — sem artefactos de produção indexados" },
  { label: "Revocation List", value: "Envelope válido, zero entradas — estado vazio válido; leitura com fecho por omissão" },
  { label: "Metadata de confiança", value: "Em preparação — depende da cerimónia offline da chave raiz" },
] as const;

// What the registry indexes per published operator (neutral, evidence-first framing).
const INDEXED = [
  { title: "Manifestos publicados", body: "O manifesto que um operador publica para se descrever e apontar a sua metadata e evidência." },
  { title: "Metadados", body: "Metadata de protocolo verificável do operador, ligada às chaves de assinatura delegadas do protocolo." },
  { title: "Evidência verificável", body: "Evidência de conformidade reproduzível por terceiros: hashes recalculáveis e automação re-executável." },
  { title: "Estados técnicos", body: "O estado técnico derivado e recalculável de cada entrada — função dos artefactos publicados, nunca um selo concedido por uma autoridade nem um estatuto auto-declarado." },
  { title: "Verificação da cadeia", body: "A ancoragem da metadata e da evidência nas chaves delegadas do Manifesto de Chaves, recalculável por qualquer parte. A avaliação de confiança entre pares é local e por interacção — nunca um estado indexado." },
  { title: "Revogação", body: "Chaves e artefactos revogados. Mecanismo de segurança e trust do protocolo — não licença nem sanção." },
] as const;

// Operator-relevant machine routes (the verifiable source of the registry state).
const MACHINE_ROUTES = [
  {
    path: "/operators",
    what: "Registo Técnico BANZA — índice de metadata e evidência verificável publicada por operadores.",
    today: "Lista vazia ([]) — nenhuma evidência de operador está indexada. A ausência do registo não é proibição regulatória.",
  },
  {
    path: "/conformance/evidence",
    what: "Rota canónica: evidência de conformidade publicada, reproduzível por qualquer terceiro.",
    today: "Cada registo declara a versão da automação, os hashes e a janela de frescura que permitem reproduzi-lo.",
  },
  {
    path: "/federation/revocation-list.json",
    what: "Revocation List — chaves e artefactos de protocolo revogados. Mecanismo de segurança e trust, não licença nem sanção.",
    today: "Existe em estado inicial de pré-produção: envelope válido, zero entradas.",
  },
] as const;

export default function OperadoresPage() {
  return (
    <>
      <PageHero
        eyebrow="OPERADORES · PAPÉIS E EVIDÊNCIA"
        title={<>Quem participa no protocolo — e a evidência que o prova.</>}
        lede={
          <>
            Esta página explica os papéis — entidade, operador, implementação — e a evidência
            verificável que demonstra participação. O índice canónico é o Registo Técnico BANZA
            (explorável em /registo-tecnico; rota máquina /operators). Não é uma lista de operadores
            licenciados, aprovados ou admitidos: no BANZA a participação demonstra-se por evidência
            verificável, não é concedida por uma autoridade central. Hoje o registo está vazio — e é
            exactamente isso que as rotas máquina devolvem.
          </>
        }
        chips={[
          { label: "PRÉ-PRODUÇÃO" },
          { label: "NENHUM OPERADOR PUBLICADO" },
          { label: "EVIDÊNCIA VERIFICÁVEL" },
          { label: "SEM AUTORIDADE CENTRAL" },
        ]}
      />

      {/* Quem é quem — entidade / operador / implementação / participante / utilizador */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">QUEM É QUEM</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Entidade, operador, implementação — não são a mesma coisa.
          </h2>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            A certificação BANZA aplica-se a implementações, não a entidades. Distinguir estes papéis é o
            que impede o registo de ser lido como uma lista de entidades aprovadas centralmente.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{r.k}</div>
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{r.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.b}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            Não se certifica um operador nem uma entidade. O que se certifica é uma implementação, ligada
            ao hash do seu artefacto — e um build diferente é outro sujeito, que precisa da sua própria
            certificação. <strong className="text-ink">O operador é a entidade responsável; a implementação
            é o sistema técnico avaliado.</strong> Por isso, validar um operador é avaliar uma das suas
            implementações publicadas: o BanzAI resolve o alvo neste registo (operador → implementação →
            origem canónica → descoberta) e a validação oficial utiliza exclusivamente artefactos obtidos
            dos endpoints públicos dessa implementação, por uma camada segura de fetch em Rust — nunca pelo
            navegador (ADR-034).
          </p>
        </Container>
      </Section>

      {/* Estado do registo (estático; a fonte verificável são as rotas máquina) */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">ESTADO DO REGISTO · ESTADO VERIFICÁVEL</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {PANEL.map((r) => (
              <div key={r.label} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{r.label.toUpperCase()}</div>
                <div className="text-[14.5px] font-semibold leading-[1.45] text-ink">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            <strong className="text-ink">Nenhum operador publicado.</strong> Nenhuma evidência de
            operador está indexada hoje. O registo vazio não é uma falha: é a afirmação verificável de
            que ainda não há evidência publicada. A publicação de produção da metadata de confiança
            depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.
          </p>
        </Container>
      </Section>

      {/* O que o registo indexa */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE O REGISTO INDEXA</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Cada entrada é evidência verificável — nunca um selo concedido.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Quando um operador publica, o registo indexa a sua metadata e a sua evidência para
            verificação pública. O que se lê aqui tem de coincidir com o que as rotas máquina devolvem.
          </p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {INDEXED.map((c) => (
              <div key={c.title} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{c.title}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.body}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Rotas máquina — a fonte verificável */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFIQUE SEM CONFIAR NESTE SITE · ROTAS MÁQUINA</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Cada rota devolve JSON puro. Se o que está escrito nesta página não coincidir com o que
            estas rotas devolvem, as rotas ganham.
          </p>
          <div className="flex flex-col gap-[12px]">
            {MACHINE_ROUTES.map((r) => (
              <div key={r.path} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <a href={r.path} className="link-bordo break-all font-mono text-[13px]" title={`Abrir ${r.path} (devolve JSON)`}>
                  {r.path}
                </a>
                <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">{r.what}</div>
                <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">Hoje: {r.today}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              O Registo Técnico BANZA é um índice de metadata e evidência verificável. Não é uma lista
              de operadores licenciados, aprovados ou admitidos pela BANZA, e a conformidade técnica não
              substitui obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT aplicáveis a cada
              operador. Nada nesta página constitui aprovação regulatória. Operador A/B/C existem apenas
              na documentação, como exemplos.
            </StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/operadores">Operadores — capítulo da Referência</MoreLink>
            <MoreLink href="/estado">Estado verificável do protocolo</MoreLink>
            <MoreLink href="/referencia/certificacao">Como funciona a conformidade e a evidência</MoreLink>
            <MoreLink href="/banzai">Explorar com o BanzAI</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
