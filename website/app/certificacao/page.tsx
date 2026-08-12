import type { Metadata } from "next";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";

// M2.19G — /certificacao is the REAL owning page for BANZA Conformance & Interoperability Certification
// (Layer 2, ADR-064/065/066). It replaces the former redirect into the reference chapter. It presents the
// L2 model exactly as the canonical architecture defines it: a per-implementation, evidence-based,
// Rust-decided, reproducible, hash-bound, scoped and time-limited determination against a public,
// versioned profile. It certifies an implementation, never an entity, and confers no licence, admission
// or authorisation. Rust decides; Qwen (BanzAI) explains. No central certifying authority, no public
// certification tiers, no score, no human step.

export const metadata: Metadata = {
  title: "Certificação de Conformidade e Interoperabilidade (Camada 2)",
  description:
    "A Certificação BANZA (Camada 2) é técnica, por implementação e baseada em evidência: liga uma implementação específica (por hash) a um perfil público e versionado, com âmbito, capabilities, ambiente, evidência reproduzível e janela de validade. É decidida por motores Rust, pode expirar, ser suspensa, revogada ou substituída — e não é licença, autorização regulatória nem admissão a um esquema.",
  alternates: { canonical: "/certificacao" },
};

// The three objects of the L2 model (ADR-064): the yardstick, the subject, the verdict.
const CHAIN = [
  {
    k: "PERFIL",
    t: "Certification Profile",
    id: "interoperability-certification-profile",
    b: "O padrão público e versionado contra o qual uma implementação é medida: as suites de conformidade, os vectores de interoperabilidade, os schemas/contratos/invariantes/endpoints exigidos e a janela de validade — cada um fixado por hash. Imutável por versão; uma alteração é uma nova profile_version. Deriva apenas dos contratos do protocolo (Camada 1), não de critérios de um operador.",
  },
  {
    k: "SUJEITO",
    t: "CertifiedImplementation",
    id: "certified-implementation",
    b: "O sujeito da certificação: uma implementação identificada por implementation_id e implementation_hash — o hash de conteúdo do conjunto exacto de artefactos testado. O declarante (declared_by) é apenas atribuição/contacto, nunca o sujeito. Um build diferente é outro sujeito, que precisa da sua própria certificação. Certifica-se uma implementação, nunca uma entidade nem uma marca.",
  },
  {
    k: "VEREDICTO",
    t: "Certification Record",
    id: "certification-record",
    b: "O objecto do veredicto: liga uma CertifiedImplementation (por implementation_hash) a um Certification Profile (por profile_id + profile_version), transportando os hashes reproduzíveis da evidência, o veredicto decidido por Rust, um estado + reason_code, o âmbito (nunca mais largo do que a evidência), a janela de validade e um record_hash sobre o todo. Afirma exactamente: esta implementação passou este perfil, nesta versão, com esta evidência, neste âmbito, até esta data.",
  },
] as const;

// Exactly what a Certification Record binds to (ADR-064 D-064-03).
const BINDING = [
  { f: "implementation_id + implementation_hash", d: "O sujeito — o build exacto, ligado ao hash do seu conteúdo." },
  { f: "operador (declared_by)", d: "A entidade declarante, para atribuição e contacto — nunca o sujeito da certificação." },
  { f: "profile_id + profile_version", d: "O perfil e a versão do perfil contra os quais a implementação foi medida." },
  { f: "protocol_version", d: "A versão do protocolo BANZA a que a certificação se refere." },
  { f: "environment", d: "O ambiente em que a evidência foi produzida." },
  { f: "capabilities · âmbito", d: "As superfícies de protocolo e o âmbito (níveis de conformidade e capabilities) cobertos — nunca mais largos do que a evidência." },
  { f: "evidence (hashes)", d: "Relatório de conformidade e evidence bundle reproduzíveis, ligados por hash e re-executáveis por terceiros." },
  { f: "validity (issued_at · expires_at)", d: "A janela de validade. Fora dela a certificação deixa de ser válida." },
] as const;

// The closed, Rust-decided certification-state machine (ADR-066). Only CERTIFIED reads as valid.
const STATES = [
  { s: "NOT_CERTIFIED", tone: "neutral", d: "Estado por omissão (fail-closed). Não certificado — a ausência de um veredicto válido lê-se sempre assim." },
  { s: "CERTIFIED", tone: "ok", d: "Certificado, dentro do âmbito e da janela de validade, com a evidência a reproduzir. É o único estado que se lê como válido." },
  { s: "EXPIRED", tone: "neutral", d: "A janela de validade terminou. Não certificado." },
  { s: "SUSPENDED", tone: "neutral", d: "Suspenso. Não certificado enquanto durar a suspensão." },
  { s: "REVOKED", tone: "neg", d: "Revogado. Estado terminal — não regressa; a renovação é sempre um registo novo, nunca uma extensão no lugar." },
  { s: "SUPERSEDED", tone: "neutral", d: "Substituído por um registo mais recente. Não certificado." },
] as const;

// A closed enum of machine-readable reason codes decided only by Rust (ADR-064/066). Illustrative subset.
const REASON_CODES = [
  { c: "OK_CONFORMANT_INTEROPERABLE", d: "Conforme e interoperável — o único veredicto positivo." },
  { c: "FAIL_CONFORMANCE", d: "Falhou a verificação de conformidade." },
  { c: "FAIL_INTEROPERABILITY", d: "Falhou a verificação de interoperabilidade." },
  { c: "FAIL_EVIDENCE_INCOMPLETE", d: "Evidência incompleta ou não reproduzível." },
  { c: "FAIL_EVIDENCE_EXPIRED", d: "Evidência fora da janela de frescura." },
  { c: "FAIL_VALIDITY_WINDOW", d: "Fora da janela de validade do registo." },
  { c: "FAIL_REVOKED", d: "Presente na lista de revogação." },
] as const;

// The three distinct determinations that never imply one another (ADR-061 non-propagation).
const DETERMINATIONS = [
  { t: "Certificação técnica", layer: "Camada 2 · BANZA", d: "Uma implementação demonstrou conformidade e interoperabilidade contra um perfil público. Decidida por Rust, sobre evidência." },
  { t: "Admissão a esquema", layer: "Camada 3 · esquema", d: "Um esquema operacional admite uma entidade/implementação como participante, segundo as suas próprias regras. Pode exigir certificação válida — nunca é implicada por ela." },
  { t: "Autorização regulatória", layer: "regulador", d: "O regulador competente autoriza uma actividade financeira regulada, ao abrigo do quadro legal aplicável. O BANZA não é parte: não a concede, não a representa e não a substitui." },
] as const;

function toneClasses(tone: string) {
  return tone === "ok"
    ? "border-ok/40 text-ok"
    : tone === "neg"
      ? "border-bordo/40 text-bordo"
      : "border-line text-ink-5";
}

export default function CertificacaoPage() {
  return (
    <>
      <PageHero
        eyebrow="CERTIFICAÇÃO · CONFORMIDADE E INTEROPERABILIDADE (CAMADA 2)"
        title={<>Certifica-se uma implementação. Com evidência. Decidido por motores, não por pessoas.</>}
        lede={
          <>
            A Certificação de Conformidade e Interoperabilidade é a segunda camada institucional do BANZA:
            uma determinação por implementação, baseada em evidência, decidida por motores Rust,
            reproduzível, ligada por hash, com âmbito e prazo. Certifica que uma implementação específica
            demonstrou conformidade e interoperabilidade contra um perfil público e versionado — nada mais.
          </>
        }
        chips={[
          { label: "POR IMPLEMENTAÇÃO" },
          { label: "BASEADA EM EVIDÊNCIA" },
          { label: "DECIDIDA POR RUST" },
          { label: "COM PRAZO E ÂMBITO" },
        ]}
      />

      {/* As duas frases canónicas — o que a certificação é, e o que não é. */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">O QUE A CERTIFICAÇÃO É — E NÃO É</div>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-bordo">É</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">
                A certificação BANZA é uma certificação técnica de uma implementação específica, limitada ao
                perfil, versão, ambiente, capabilities, âmbito e validade indicados.
              </p>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">NÃO É</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">
                A certificação BANZA não constitui licença financeira, autorização regulatória, admissão
                automática num scheme, aprovação comercial ou garantia institucional.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">
            Não há autoridade certificadora, não há cadeia de certificados emitida centralmente, não se
            certifica uma entidade nem uma marca, não há níveis públicos de certificação, não há pontuação e
            não há aprovação humana. O veredicto é um facto reproduzível sobre uma implementação, decidido por
            motores determinísticos e verificável por qualquer terceiro.
          </p>
        </Container>
      </Section>

      {/* A cadeia: perfil → implementação → registo */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">O MODELO · PERFIL → IMPLEMENTAÇÃO → REGISTO</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Três objectos, um veredicto.
          </h2>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            Um perfil público define o padrão; uma implementação identificada por hash é o sujeito; um
            registo de certificação liga os dois com a evidência e um veredicto decidido por Rust.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {CHAIN.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{c.k}</div>
                <div className="mb-1.5 text-[15.5px] font-semibold leading-[1.3] text-ink">{c.t}</div>
                <div className="mb-2 font-mono text-[11px] text-ink-5">{c.id}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{c.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Ao que o registo se liga */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">A QUE O REGISTO DE CERTIFICAÇÃO SE LIGA</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            Cada certificação está ligada a um conjunto fechado de campos. Fora deles, não afirma nada. É
            isto que a torna estreita, verificável e impossível de sobre-interpretar.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            {BINDING.map((r) => (
              <div key={r.f} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <div className="mb-1 font-mono text-[12px] leading-[1.4] text-bordo">{r.f}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Ciclo de vida — a máquina de estados fechada */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CICLO DE VIDA · MÁQUINA DE ESTADOS FECHADA</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Uma certificação vive no tempo — e pode deixar de valer.
          </h2>
          <p className="mb-8 max-w-[78ch] text-[15px] leading-[1.7] text-ink-4">
            O estado de uma certificação é governado por uma máquina de estados fechada, total e
            determinística, decidida apenas pelo motor Rust. Só <strong className="text-ink">CERTIFIED</strong>{" "}
            se lê como válido; qualquer outro estado é não-certificado. Nenhuma pessoa, modelo ou configuração
            pode efectuar, alargar ou reverter uma transição, e nenhuma transição da Camada 2 se propaga para a
            admissão a um esquema (Camada 3) nem para o regulador.
          </p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {STATES.map((st) => (
              <div key={st.s} className={`rounded-cardish border bg-white px-[20px] py-[16px] ${toneClasses(st.tone)}`}>
                <div className="mb-1.5 font-mono text-[12.5px] font-semibold tracking-[0.04em]">{st.s}</div>
                <div className="text-[13px] leading-[1.6] text-ink-4">{st.d}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            <strong className="text-ink">REVOKED é terminal.</strong> Um registo revogado não é reactivado:
            uma nova certificação é sempre um registo novo, com a sua própria evidência e janela de validade —
            nunca uma extensão da anterior.
          </p>
        </Container>
      </Section>

      {/* Reason codes */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">REASON CODES · VOCABULÁRIO FECHADO, DECIDIDO POR RUST</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">
            Cada veredicto transporta um reason_code de um enum fechado — legível por máquina, decidido apenas
            pelos motores Rust. O modelo local que explica (BanzAI) nunca inventa nem altera um reason code.
            Subconjunto ilustrativo:
          </p>
          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            {REASON_CODES.map((r) => (
              <div key={r.c} className="rounded-cardish border border-line bg-white px-[18px] py-[14px]">
                <div className="mb-1 font-mono text-[12px] text-ink">{r.c}</div>
                <div className="text-[13px] leading-[1.55] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* As três determinações distintas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">TRÊS DETERMINAÇÕES DISTINTAS</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            Certificação técnica&nbsp;&ne;&nbsp;Admissão a esquema&nbsp;&ne;&nbsp;Autorização regulatória
          </h2>
          <p className="mb-8 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            São três determinações separadas, com donos diferentes. Nenhuma implica outra. Uma certificação
            válida pode ser um pré-requisito para uma admissão — mas nunca a produz, e nenhuma delas produz
            uma autorização regulatória.
          </p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {DETERMINATIONS.map((d) => (
              <div key={d.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{d.layer}</div>
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{d.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{d.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              Constar como certificado não é ser admitido a um esquema nem estar autorizado a operar. A
              conformidade técnica não substitui obrigações legais, regulatórias, bancárias, KYC/KYB ou
              AML/CFT, que são inteiramente do operador.
            </StatusNote>
          </div>
        </Container>
      </Section>

      {/* Como se verifica */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">COMO SE VERIFICA · RUST DECIDE, QWEN EXPLICA</div>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            O veredicto é produzido por motores Rust determinísticos sobre a evidência publicada, é ligado por
            hash e é reproduzível: qualquer terceiro re-executa a verificação e obtém os mesmos hashes, sem
            conta e sem confiar neste site. O registo de certificação é publicado no Registo Técnico. O BanzAI
            explica o que foi decidido — nunca decide, certifica nem altera um estado ou reason code.
          </p>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">
            A validação oficial utiliza exclusivamente artefactos obtidos dos endpoints públicos da
            implementação seleccionada: o BanzAI resolve o alvo no Registo Técnico (operador →
            implementação → origem canónica → descoberta) e obtém cada artefacto por uma camada segura de
            fetch em Rust — nunca pelo navegador (ADR-068). O resultado é específico da implementação, do
            profile, da versão, do ambiente, do âmbito, dos artefactos e do momento da avaliação. Validação
            técnica não é certificação emitida; certificação técnica não é admissão num scheme nem
            autorização regulatória.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/registo-tecnico">Registo Técnico — onde as certificações são publicadas</MoreLink>
            <MoreLink href="/banzai?mode=validation&target=operator-zero&workflow=full">Validar com o BanzAI (prontidão de certificação)</MoreLink>
            <MoreLink href="/referencia/certificacao">Referência — Conformidade e Certificação</MoreLink>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/operadores">Operadores — registo público</MoreLink>
            <MoreLink href="/estado">Estado verificável do protocolo</MoreLink>
            <MoreLink href="/glossario">Glossário — os conceitos, com precisão</MoreLink>
            <MoreLink href="/referencia/confianca">Confiança — avaliação verificável sem autoridade central</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
