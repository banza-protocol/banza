import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

// The protocol-status page's content, one entry per edition, under a single shape.
//
// This page was authored twice. The two files were near-identical in structure — the divergence the
// parity signature caught was a single onward link that carried a fragment in one edition and not the
// other — but "near-identical by coincidence" is exactly the state that drifts. The structure now lives
// in one view (StatusView) and the two editions differ only in what is written here.
//
// The copy is each edition's EXISTING published text, moved rather than retranslated. Portuguese is the
// canonical structure; nothing was reworded on either side while consolidating.
//
// One thing is deliberately NOT here: the BanzAI panel row. It is derived from the runtime SSOT by
// lib/runtimeStatusRow.ts, which both editions share, so the page cannot contradict what the service
// reports. Two copies of "what is the runtime doing" could disagree, and the row exists precisely so they
// cannot. The locale selects words, never the verdict.

type PanelRow = { label: string; value: string; tone: string };
type MachineRoute = { path: string; what: string; today: string };

export type StatusContent = {
  metaTitle: string;
  metaDescription: string;
  hero: { eyebrow: string; title: ReactNode; lede: ReactNode; chips: { label: string }[] };
  panelEyebrow: string;
  intro: ReactNode;
  schemeNote: ReactNode;
  routesEyebrow: string;
  routesTitle: string;
  routesLede: ReactNode;
  readingEyebrow: string;
  reading: ReactNode;
  note: ReactNode;
  continueEyebrow: string;
  more: string[];
  github: string[];
  ask: string;
  panel: readonly PanelRow[];
  routes: readonly MachineRoute[];
  openRoute: (path: string) => string;
  todayLabel: string;
};

export const STATUS_CONTENT: Record<Locale, StatusContent> = {
  pt: {
    metaTitle: "Estado do Protocolo",
    metaDescription:
      "Estado verificável do protocolo BANZA: pré-produção, registo público sem evidência indexada, publicação de produção da metadata de confiança dependente das condições públicas de produção. Verifique directamente pelas rotas máquina públicas.",
    hero: {
      eyebrow: "ESTADO DO PROTOCOLO",
      title: <>O que é verdade hoje — e como verificá-lo.</>,
      lede: (
        <>
          Esta página resume o estado público do BANZA em linguagem simples e aponta para as
            rotas máquina onde qualquer pessoa — regulador, auditor, operador ou programador —
            pode verificar cada afirmação directamente, sem confiar neste website.
        </>
      ),
      chips: [
      { label: "PRÉ-PRODUÇÃO" },
      { label: "ESPECIFICAÇÃO v1.0.0 PUBLICADA" },
      { label: "REGISTO PÚBLICO SEM EVIDÊNCIA INDEXADA" },
      { label: "ESTADO VERIFICÁVEL" },
      ],
    },
    panelEyebrow: "PAINEL DE ESTADO · ESTADO VERIFICÁVEL",
    intro: (
      <>
        A especificação BANZA v1.0.0 está publicada e é publicamente verificável, mas ainda não está
            congelada para implementação externa: nenhum alvo BANZA externamente congelado foi publicado e
            nenhum ensaio de implementação independente foi conduzido, pelo que a arquitectura de 1.0.0
            continua a ser completada. A arquitectura
            organiza-se em três camadas — o protocolo (Camada 1), a certificação de conformidade e
            interoperabilidade (Camada 2, por implementação e decidida por Rust) e os esquemas operacionais
            independentes (Camada 3) — com o BanzAI como interface humana transversal, não uma camada. A produção —
            Manifesto de Chaves, metadata de protocolo assinada, federação entre operadores e
            certificação de produção — depende da cerimónia offline da chave raiz e da primeira
            evidência de conformidade de produção publicada. Até lá, o estado correcto do registo
            público é <em>vazio</em>, e é exactamente isso que as rotas máquina devolvem.
      </>
    ),
    schemeNote: (
      <>
        A Banzami é a operadora designada do primeiro Banzami Operational Scheme. A camada
            operacional encontra-se em preparação regulatória e os pagamentos reais permanecem
            desactivados.
      </>
    ),
    routesEyebrow: "VERIFIQUE SEM CONFIAR NESTE SITE · ROTAS MÁQUINA",
    routesTitle: "As rotas máquina são a fonte verificável do estado público.",
    routesLede: (
      <>
        Cada rota devolve JSON puro, sem redireccionamentos para HTML. O que está escrito
            nesta página tem de coincidir com o que estas rotas devolvem — se não coincidir,
            as rotas ganham.
      </>
    ),
    readingEyebrow: "LEITURA CORRECTA DO ESTADO",
    reading: (
      <>
        <p>
              <strong className="text-ink">Um PASS é evidência verificável.</strong> A verificação
              de conformidade está disponível hoje e produz evidência reproduzível: hashes que
              qualquer terceiro recalcula e uma automação que qualquer terceiro re-executa,
              obtendo o mesmo resultado. É isso que um par avalia — não a palavra de ninguém.
            </p>
            <p>
              <strong className="text-ink">A certificação (Camada 2) é por implementação.</strong> A
              certificação de conformidade e interoperabilidade é uma determinação por implementação,
              baseada em evidência e decidida pelos motores Rust contra um perfil público e
              versionado. Certifica uma implementação, nunca uma entidade, e não é licença, admissão
              a scheme nem autorização regulatória. O modelo está activo; nenhum registo de
              certificação de produção existe hoje (<span className="font-mono text-[13px]">production_certificates = false</span>).
            </p>
            <p>
              <strong className="text-ink">O registo vazio é o estado honesto.</strong>{" "}
              <span className="font-mono text-[13px]">/operators = []</span> não é uma falha: é a
              afirmação verificável de que nenhuma evidência publicada está indexada hoje. O
              Registo Técnico BANZA é o índice público e verificável dos artefactos da Camada 2 e é
              independente do directório de participantes de qualquer esquema (Camada 3). Não é uma
              lista de operadores licenciados, aprovados ou admitidos pela BANZA — no BANZA a
              participação demonstra-se por evidência verificável, não é concedida por uma autoridade
              central. Operador A/B/C existem apenas na documentação, como exemplos.
            </p>
            <p>
              <strong className="text-ink">O Operador Zero é a implementação de referência.</strong>{" "}
              É a implementação canónica de referência do protocolo, apenas de leitura: expõe
              identidade, manifest, capabilities, endpoints, metadata, chaves e evidência para
              descoberta e verificação. Não movimenta dinheiro real e não presta serviços
              financeiros; está NOT_CERTIFIED e toda a validação humana é iniciada no BanzAI. O
              operador é a entidade responsável; a implementação é o sistema técnico avaliado. A
              validação oficial utiliza exclusivamente artefactos obtidos dos endpoints públicos da
              implementação (via uma camada segura de fetch em Rust, nunca o navegador), e o Operador
              Zero é o exemplo canónico inicial, mas utiliza exactamente o mesmo processo de validação
              aplicado a qualquer futura implementação publicada (ADR-034).
            </p>
            <p>
              <strong className="text-ink">Os manifestos existem para verificação pública.</strong>{" "}
              O manifesto raiz e o manifesto de chaves publicam os artefactos de confiança do
              protocolo. A Raiz de Confiança assina apenas o Manifesto de Chaves; as chaves delegadas
              assinam os artefactos dos respectivos domínios — metadata do protocolo, evidência de
              conformidade e revogações. A raiz não autoriza operadores, não emite licença e não
              autoriza pagamentos. Em pré-produção as rotas devolvem envelopes honestos; as versões de
              produção dependem da cerimónia da chave raiz, que é offline e controlada.
            </p>
            <p>
              <strong className="text-ink">A Revocation List existe, em estado inicial.</strong> A
              Revocation List é um mecanismo de segurança e trust do protocolo. Não é licença,
              sanção regulatória ou autorização financeira. Hoje é um envelope válido com zero
              entradas. Um par que não consiga obter e verificar a lista assinada e fresca trata-a
              como material não fiável — nunca como lista vazia (fail-closed).
            </p>
            <p>
              <strong className="text-ink">BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.</strong>{" "}
              O BanzAI é a interface humana primária e transversal entre humanos/operadores e o protocolo (ADR-036):
              guia operadores, invoca as ferramentas Rust, responde com base em fontes citadas e corre em
              pré-produção. Não decide conformidade, não confere estatuto a operadores e não substitui a
              suite de conformidade — o output de IA nunca é regra do protocolo: é não normativo.
            </p>
            <p>
              A inferência corre localmente e on-host. O estado do motor em execução{" "}
              <em>nesta resposta</em> não é afirmado aqui em prosa fixa: o painel{" "}
              <strong className="text-ink">BanzAI</strong> acima é derivado da rota máquina{" "}
              <span className="font-mono text-[13px]">/banzai/runtime</span> (o SSOT de runtime,
              ADR-036), que reporta o motor, a localização da inferência e se houve chamadas
              externas — se a prosa e a rota divergirem, a rota ganha. Além disso, cada resposta
              publica o seu próprio estado — o caminho de execução, as fontes citadas e se houve
              chamada a modelo externo — de modo a que a leitura do estado por resposta seja
              verificável e não dependa de confiança.
            </p>
      </>
    ),
    note: (
      <>
        A conformidade técnica com o BANZA não substitui obrigações legais, regulatórias,
              bancárias, KYC/KYB ou AML/CFT aplicáveis a cada operador. Nada nesta página
              constitui aprovação regulatória.
      </>
    ),
    continueEyebrow: "CONTINUAR",
    more: [
      "Como funciona a conformidade",
      "A cadeia de confiança",
      "Começar a implementar",
      "Evolução do Protocolo",
    ],
    github: [
      "GitHub — protocolo BANZA",
      "GitHub — BanzAI",
    ],
    ask: "Perguntar ao BanzAI",
    panel: [
  // NOT "congelada": contracts/production/protocol-version.json is the authority and says
  // lifecycle_state.protocol_frozen = false, with _release_state "Pre-release. No externally frozen
  // BANZA target has been published". Versioned and frozen are different states (the Reference already
  // forbids "especificação congelada" for the same reason), and this panel must not contradict the
  // artifact it exists to summarise.
  { label: "Especificação", value: "v1.0.0 — publicada e versionada; ainda não congelada para implementação externa", tone: "pend" },
  { label: "Arquitectura", value: "Três camadas — Camada 1 protocolo aberto · Camada 2 certificação de conformidade e interoperabilidade · Camada 3 esquemas operacionais independentes", tone: "ok" },
  { label: "Ambiente", value: "Pré-produção", tone: "pend" },
  { label: "Registo Técnico BANZA (Camada 2)", value: "0 entradas — /operators devolve []", tone: "pend" },
  { label: "production_certificates", value: "false — sem registos de certificação de produção", tone: "pend" },
  { label: "Certificação de conformidade e interoperabilidade (Camada 2)", value: "Modelo activo — por implementação, baseado em evidência e decidido por Rust; sem certificação de produção", tone: "pend" },
  { label: "Verificação de conformidade", value: "Disponível — produz evidência reproduzível por terceiros", tone: "ok" },
  { label: "Operador Zero", value: "Implementação de referência só de leitura · NOT_CERTIFIED · sem dinheiro real · validada no BanzAI a partir dos seus endpoints públicos", tone: "ok" },
  { label: "Pagamentos reais", value: "Desactivados — a activação depende de uma única porta com fecho por omissão", tone: "pend" },
  { label: "Banzami Operational Scheme (Camada 3)", value: "Em preparação regulatória — autorização não concedida", tone: "pend" },
],
    routes: [
  {
    path: "/.well-known/banza/root.json",
    what: "Manifesto raiz do protocolo (artefacto público de confiança).",
    today: "Envelope de pré-produção — a publicação de produção depende da cerimónia offline da chave raiz.",
  },
  {
    path: "/.well-known/banza/key-manifest.json",
    what: "Manifesto de chaves públicas de assinatura delegadas.",
    today: "Envelope de pré-produção — nenhuma chave de assinatura de produção existe antes da cerimónia da chave raiz.",
  },
  {
    path: "/operators",
    what: "Registo Técnico BANZA — superfície pública e apenas de leitura; índice verificável dos artefactos da Camada 2 (metadata e evidência publicada por operadores sobre as suas implementações). Independente de qualquer directório de participantes de um esquema (Camada 3).",
    today: "Lista vazia ([]) — nenhuma evidência publicada está indexada. Ausência do registo não é proibição regulatória.",
  },
  {
    path: "/federation/revocation-list.json",
    what: "Revocation List — chaves e artefactos de protocolo revogados. Mecanismo de segurança e trust, não licença nem sanção.",
    today: "Existe em estado inicial de pré-produção: envelope válido, zero entradas.",
  },
  {
    path: "/conformance/evidence",
    what: "Rota canónica: evidência de conformidade publicada, reproduzível por qualquer terceiro.",
    today: "Cada registo declara a versão da automação, os hashes e a janela de frescura que permitem reproduzi-lo.",
  },
  {
    path: "/banzai/runtime",
    what: "Runtime SSOT do BanzAI (ADR-036): projecção sem segredos do estado de execução — modo, localização da inferência, chamadas externas, disponibilidade do modelo e prontidão dos motores determinísticos. Telemetria não normativa (authoritative: false), distinta dos artefactos de confiança assinados em /.well-known/banza/*.",
    today: "Devolve JSON versionado (schema_version: banzai-runtime/1). O painel BanzAI acima é derivado desta rota — se divergirem, a rota ganha.",
  },
],
    openRoute: (p: string) => `Abrir ${p} (devolve JSON)`,
    todayLabel: "Hoje",
  },
  en: {
    metaTitle: "Protocol Status",
    metaDescription:
      "The verifiable public state of the BANZA protocol: pre-production, specification v1.0.0 published and versioned but not yet frozen for external implementation, a public registry with no indexed evidence, and production publication of the trust metadata dependent on the offline root-key ceremony. Verify each claim directly through the public machine routes.",
    hero: {
      eyebrow: "PROTOCOL STATUS",
      title: <>What is true today — and how to check it.</>,
      lede: (
        <>
          This page states the public state of BANZA in plain language and points at the machine
            routes where anyone — a regulator, an auditor, an operator or a developer — can verify
            each claim directly, without trusting this website.
        </>
      ),
      chips: [
      { label: "PRE-PRODUCTION" },
      { label: "SPECIFICATION v1.0.0 PUBLISHED" },
      { label: "PUBLIC REGISTRY WITH NO INDEXED EVIDENCE" },
      { label: "VERIFIABLE STATE" },
      ],
    },
    panelEyebrow: "STATUS PANEL · VERIFIABLE STATE",
    intro: (
      <>
        The BANZA v1.0.0 specification is published and publicly verifiable, but it is not yet frozen
            for external implementation: no externally frozen BANZA target has been published and no
            independent implementation trial has been conducted, so the architecture of 1.0.0 is still
            being completed. The architecture is organised in three layers — the protocol (Layer 1),
            conformance and interoperability certification (Layer 2, per implementation and decided by
            Rust) and independent operational schemes (Layer 3) — with BanzAI as a transversal human
            interface, not a layer. Production — the Key Manifest, signed protocol metadata, federation
            between operators and production certification — depends on the offline root-key ceremony and
            on the first published production conformance evidence. Until then the correct state of the
            public registry is <em>empty</em>, and that is exactly what the machine routes return.
      </>
    ),
    schemeNote: (
      <>
        Banzami is the designated scheme operator of the first Banzami Operational Scheme. The
            operational layer is in regulatory preparation and real payments remain switched off.
      </>
    ),
    routesEyebrow: "VERIFY WITHOUT TRUSTING THIS SITE · MACHINE ROUTES",
    routesTitle: "The machine routes are the verifiable source of the public state.",
    routesLede: (
      <>
        Each route returns plain JSON, with no redirect to HTML. What is written on this page has to
            match what these routes return — and if it does not, the routes win.
      </>
    ),
    readingEyebrow: "READING THE STATE CORRECTLY",
    reading: (
      <>
        <p>
              <strong className="text-ink">A PASS is verifiable evidence.</strong> Conformance
              verification is available today and produces reproducible evidence: hashes any third party
              recomputes and automation any third party re-runs, obtaining the same result. That is what a
              peer evaluates — not anyone&rsquo;s word.
            </p>
            <p>
              <strong className="text-ink">Certification (Layer 2) is per implementation.</strong>{" "}
              Conformance and interoperability certification is a per-implementation determination, based
              on evidence and decided by the Rust engines against a public, versioned profile. It
              certifies an implementation, never an entity, and it is not a licence, scheme admission or
              regulatory authorisation. The model is active; no production certification record exists
              today (<span className="font-mono text-[13px]">production_certificates = false</span>).
            </p>
            <p>
              <strong className="text-ink">The empty registry is the honest state.</strong>{" "}
              <span className="font-mono text-[13px]">/operators = []</span> is not a failure: it is the
              verifiable statement that no published evidence is indexed today. The BANZA Technical
              Registry is the public, verifiable index of Layer 2 artifacts and is independent of any
              scheme&rsquo;s participant directory (Layer 3). It is not a list of operators licensed,
              approved or admitted by BANZA — in BANZA participation is demonstrated by verifiable
              evidence, it is not granted by a central authority. Operator A/B/C exist only in the
              documentation, as examples.
            </p>
            <p>
              <strong className="text-ink">Operator Zero is the reference implementation.</strong> It is
              the protocol&rsquo;s canonical reference implementation, read-only: it exposes identity,
              manifest, capabilities, endpoints, metadata, keys and evidence for discovery and
              verification. It moves no real money and provides no financial services; it is
              NOT_CERTIFIED, and every human validation is initiated in BanzAI. The operator is the
              responsible entity; the implementation is the technical system evaluated. Official
              validation uses exclusively artifacts fetched from that implementation&rsquo;s public
              endpoints, through a secure Rust fetch layer and never the browser, and Operator Zero is the
              first canonical example — but it goes through exactly the same validation process that
              applies to any future published implementation (ADR-034).
            </p>
            <p>
              <strong className="text-ink">The manifests exist for public verification.</strong> The root
              manifest and the key manifest publish the protocol&rsquo;s trust artifacts. The Trust Root
              signs only the Key Manifest; the delegated keys sign the artifacts of their respective
              domains — protocol metadata, conformance evidence and revocations. The root does not
              authorise operators, does not issue licences and does not authorise payments. In
              pre-production the routes return honest envelopes; the production versions depend on the
              root-key ceremony, which is offline and controlled.
            </p>
            <p>
              <strong className="text-ink">The Revocation List exists, in its initial state.</strong> The
              Revocation List is a protocol security and trust mechanism. It is not a licence, a
              regulatory sanction or a financial authorisation. Today it is a valid envelope with zero
              entries. A peer that cannot obtain and verify the signed, fresh list treats it as
              unreliable material — never as an empty list (closed by default).
            </p>
            <p>
              <strong className="text-ink">
                BanzAI guides; the engines verify; the evidence proves; the competent authority decides.
              </strong>{" "}
              BanzAI is the primary, transversal human interface between people and operators and the
              protocol (ADR-036): it guides operators, invokes the Rust tools, answers from cited sources
              and runs in pre-production. It does not decide conformance, does not confer status on
              operators and does not replace the conformance suite — AI output is never a protocol rule:
              it is non-normative.
            </p>
            <p>
              Inference runs locally and on-host. The state of the engine running{" "}
              <em>in this response</em> is not asserted here in fixed prose: the{" "}
              <strong className="text-ink">BanzAI</strong> panel row above is derived from the machine
              route <span className="font-mono text-[13px]">/banzai/runtime</span> (the runtime SSOT,
              ADR-036), which reports the engine, the inference location and whether there were external
              calls — and if the prose and the route diverge, the route wins. Beyond that, each answer
              publishes its own state — the execution path, the sources cited and whether an external
              model was called — so that reading the per-answer state is verifiable and does not depend on
              trust.
            </p>
      </>
    ),
    note: (
      <>
        Technical conformance with BANZA does not replace legal, regulatory, banking, KYC/KYB or
              AML/CFT obligations applicable to each operator. Nothing on this page constitutes regulatory
              approval.
      </>
    ),
    continueEyebrow: "CONTINUE",
    more: [
      "How conformance works",
      "The chain of trust",
      "Start implementing",
      "Protocol evolution",
    ],
    github: [
      "GitHub — BANZA protocol",
      "GitHub — BanzAI",
    ],
    ask: "Ask BanzAI",
    panel: [
  {
    label: "Specification",
    value: "v1.0.0 — published and versioned; not yet frozen for external implementation",
    tone: "pend",
  },
  {
    label: "Architecture",
    value:
      "Three layers — Layer 1 open protocol · Layer 2 conformance and interoperability certification · Layer 3 independent operational schemes",
    tone: "ok",
  },
  { label: "Environment", value: "Pre-production", tone: "pend" },
  { label: "BANZA Technical Registry (Layer 2)", value: "0 entries — /operators returns []", tone: "pend" },
  { label: "production_certificates", value: "false — no production certification records", tone: "pend" },
  {
    label: "Conformance and interoperability certification (Layer 2)",
    value:
      "Model active — per implementation, evidence-based and decided by Rust; no production certification",
    tone: "pend",
  },
  {
    label: "Conformance verification",
    value: "Available — produces evidence third parties can reproduce",
    tone: "ok",
  },
  {
    label: "Operator Zero",
    value:
      "Read-only reference implementation · NOT_CERTIFIED · no real money · validated in BanzAI from its own public endpoints",
    tone: "ok",
  },
  {
    label: "Real payments",
    value: "Switched off — activation depends on a single gate that is closed by default",
    tone: "pend",
  },
  {
    label: "Banzami Operational Scheme (Layer 3)",
    value: "In regulatory preparation — authorisation not granted",
    tone: "pend",
  },
],
    routes: [
  {
    path: "/.well-known/banza/root.json",
    what: "The protocol's root manifest (a public trust artifact).",
    today:
      "A pre-production envelope — production publication depends on the offline root-key ceremony.",
  },
  {
    path: "/.well-known/banza/key-manifest.json",
    what: "Manifest of the delegated public signing keys.",
    today:
      "A pre-production envelope — no production signing key exists before the root-key ceremony.",
  },
  {
    path: "/operators",
    what: "The BANZA Technical Registry — a public, read-only surface; the verifiable index of Layer 2 artifacts (metadata and evidence published by operators about their implementations). Independent of any scheme's participant directory (Layer 3).",
    today:
      "An empty list ([]) — no published evidence is indexed. Absence from the registry is not a regulatory prohibition.",
  },
  {
    path: "/federation/revocation-list.json",
    what: "The Revocation List — revoked protocol keys and artifacts. A security and trust mechanism, not a licence and not a sanction.",
    today: "Present in its initial pre-production state: a valid envelope with zero entries.",
  },
  {
    path: "/conformance/evidence",
    what: "The canonical route: published conformance evidence, reproducible by any third party.",
    today:
      "Each record declares the automation version, the hashes and the freshness window that make it reproducible.",
  },
  {
    path: "/banzai/runtime",
    what: "The BanzAI runtime SSOT (ADR-036): a secret-free projection of execution state — mode, inference location, external calls, model availability and readiness of the deterministic engines. Non-normative telemetry (authoritative: false), distinct from the signed trust artifacts under /.well-known/banza/*.",
    today:
      "Returns versioned JSON (schema_version: banzai-runtime/1). The BanzAI panel row above is derived from this route — if they diverge, the route wins.",
  },
],
    openRoute: (p: string) => `Open ${p} (returns JSON)`,
    todayLabel: "Today",
  },
};
