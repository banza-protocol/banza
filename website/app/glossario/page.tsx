import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container, StatusNote } from "@/components/ui";

// M2.19G (§26) — /glossario is the REAL owning page for the canonical, current-only glossary of the BANZA
// architecture (three layers · single BanzAI interface · read-only reference). Each term carries a short
// definition, a full definition, a technical id where one exists, the canonical page that owns it, related
// terms and a "não confundir com" line. It defines ONLY current concepts — retired framings (a central
// certifying authority, per-entity certificates, public certification levels, removed surfaces) are never
// defined here as current concepts.

export const metadata: Metadata = {
  title: "Glossário — os conceitos do BANZA, com precisão",
  description:
    "Glossário canónico e actual do BANZA: operador, implementação, validação por endpoints, rascunho, origem canónica, descoberta, camada segura de fetch, participante, perfil, capability, conformidade, interoperabilidade, certificação, admissão, autorização, evidência, confiança, revogação, registo, federação, esquema e recibo — cada termo com definição, id técnico, página canónica, termos relacionados e o que não confundir.",
  alternates: { canonical: "/glossario" },
};

type Term = {
  name: string;
  en?: string;
  id?: string;
  short: string;
  full: string;
  href: string;
  hrefLabel: string;
  related: string[];
  notConfuse: string;
};

// Ordered pedagogically: papéis → cadeia de certificação → determinações → confiança → registo/federação →
// esquema → recibos. Definitions are grounded in artifacts/m2-19g/canonical-concept-matrix.json.
const TERMS: Term[] = [
  {
    name: "Operador",
    en: "operator",
    id: "operator",
    short: "Entidade independente que implementa o protocolo e processa pagamentos sob as suas próprias autorizações.",
    full: "Um operador é qualquer entidade jurídica independente que implementa o BANZA para processar pagamentos nos seus próprios sistemas, sob as suas próprias autorizações regulatórias. No plano do protocolo está sujeito apenas a verificação de conformidade — os mesmos testes públicos e determinísticos para todos. Fora do protocolo, todas as obrigações legais, regulatórias, bancárias, KYC/KYB e AML/CFT são inteiramente suas. O BANZA não é um operador. O operador é a entidade responsável; validar um operador é avaliar uma das suas implementações publicadas (ADR-068).",
    href: "/operadores",
    hrefLabel: "Operadores — registo público",
    related: ["Implementação", "Participante de esquema", "Autorização regulatória"],
    notConfuse: "com «implementação» (o operador é a entidade responsável; a implementação é o sistema técnico avaliado) nem com «participante de esquema».",
  },
  {
    name: "Implementação",
    en: "implementation",
    id: "certified-implementation",
    short: "O sistema técnico avaliado e o sujeito da certificação: um build específico, identificado por hash de conteúdo — nunca uma entidade ou marca.",
    full: "Uma implementação é o sistema técnico avaliado — identificada por um implementation_id estável e por um implementation_hash, o hash de conteúdo do conjunto exacto de artefactos testado. A certificação liga-se a esse hash: um build diferente é um sujeito diferente, que precisa da sua própria certificação. A entidade declarante (declared_by) é atribuição/contacto, nunca o sujeito. Um operador pode publicar várias implementações (demonstração, sandbox, pré-produção, produção); a validação oficial obtém os artefactos de cada uma dos endpoints públicos da sua origem canónica (ADR-068).",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Operador", "Perfil", "Validação por endpoints"],
    notConfuse: "com «operador» — o operador é a entidade responsável; a implementação é o sistema técnico avaliado.",
  },
  {
    name: "Participante de esquema",
    en: "scheme participant",
    id: "scheme-participant",
    short: "Entidade/implementação admitida como participante de um esquema operacional específico (Camada 3).",
    full: "Um participante de esquema é uma entidade/implementação que um esquema específico (o Esquema Operacional Banzami, ou qualquer esquema independente) admitiu segundo as suas próprias regras de elegibilidade, diligência e contratos. A pertença ao directório de participantes do esquema (Camada 3) é separada do Registo Técnico (Camada 2): pode exigir certificação válida, mas nunca é implicada por ela.",
    href: "/referencia/arquitectura",
    hrefLabel: "Arquitectura — as três camadas",
    related: ["Admissão a esquema", "Esquema operacional", "Operador"],
    notConfuse: "com «implementação certificada» — constar no registo técnico não é ser admitido a um esquema.",
  },
  {
    name: "Perfil",
    en: "Certification Profile",
    id: "interoperability-certification-profile",
    short: "O padrão público e versionado contra o qual uma implementação é certificada.",
    full: "Um perfil de certificação define, para um dado nível de conformidade e conjunto de capabilities, as suites de conformidade, os vectores de interoperabilidade, os schemas/contratos/invariantes/endpoints exigidos e a janela de validade que uma implementação tem de satisfazer — cada um fixado por hash. É imutável por versão (uma alteração é uma nova profile_version) e deriva apenas dos contratos do protocolo (Camada 1).",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Conformidade", "Capability", "Registo de certificação"],
    notConfuse: "com «capability» — o perfil exige capabilities; não é uma capability.",
  },
  {
    name: "Capability",
    en: "capability",
    id: "capability",
    short: "Uma superfície de protocolo que uma implementação declara implementar — descritiva, não uma permissão.",
    full: "Uma capability é uma superfície de protocolo nomeada (por exemplo «payment-intents», «qr», «federation») que um candidato declara no seu Operator Manifest e que um perfil de certificação exige. Descreve comportamento pretendido/demonstrado; não é uma permissão nem uma concessão. O âmbito de um registo de certificação nunca é mais largo do que a evidência.",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Perfil", "Operator Manifest", "Conformidade"],
    notConfuse: "com «autorização» ou «licença» — declarar uma capability não concede qualquer permissão.",
  },
  {
    name: "Conformidade",
    en: "conformance",
    id: "conformance",
    short: "Verificação determinística e reproduzível de que uma implementação respeita os contratos e invariantes.",
    full: "Conformidade é a verificação pública, determinística e reproduzível (suites + vectores) de que uma implementação obedece aos contratos, schemas e invariantes financeiros do protocolo, num dado âmbito. O resultado é evidência ligada por hash, que um terceiro re-executa para reproduzir os hashes. Um resultado positivo é evidência verificável — não certificação, licença nem autorização.",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Interoperabilidade", "Evidência", "Perfil"],
    notConfuse: "com «certificação» — a conformidade alimenta a certificação, mas não é a certificação.",
  },
  {
    name: "Interoperabilidade",
    en: "interoperability",
    id: "interoperability",
    short: "Capacidade verificada de implementações independentes trocarem pagamentos sob as mesmas regras.",
    full: "Interoperabilidade é a capacidade verificada de implementações conformes e independentes encaminharem e liquidarem pagamentos entre si sob os mesmos invariantes, estabelecida por evidência e pela Avaliação Aberta de Confiança — e não pela reconstrução da mesma integração técnica bilateral por cada par de operadores. No modelo da Camada 2 é medida por vectores de interoperabilidade e reportada, alimentando o veredicto de certificação.",
    href: "/referencia/federacao",
    hrefLabel: "Referência — Federação",
    related: ["Conformidade", "Federação", "Certificação"],
    notConfuse: "com «federação» — a interoperabilidade é a capacidade medida; a federação é a operação entre operadores que dela depende.",
  },
  {
    name: "Certificação",
    en: "certification",
    id: "conformance-interoperability-certification",
    short: "Camada 2: determinação por implementação, baseada em evidência e decidida por Rust, contra um perfil versionado.",
    full: "A Certificação de Conformidade e Interoperabilidade (Camada 2) é uma determinação por implementação, baseada em evidência, decidida por motores Rust, reproduzível, ligada por hash, com âmbito e prazo, de que uma implementação demonstrou conformidade e interoperabilidade contra um perfil público e versionado — sujeita a suspensão/revogação. Certifica uma implementação, nunca uma entidade, e não confere estatuto para além de «esta implementação passou este perfil, nesta versão, com esta evidência».",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Perfil", "Registo de certificação", "Registo Técnico"],
    notConfuse: "com «admissão a esquema» e com «autorização regulatória» — não é licença, admissão nem autorização.",
  },
  {
    name: "Registo de certificação",
    en: "Certification Record",
    id: "certification-record",
    short: "O objecto do veredicto: liga uma implementação a um perfil, com evidência, âmbito, validade, estado e hash.",
    full: "Um registo de certificação liga uma CertifiedImplementation (por implementation_hash) a um perfil (por profile_id + profile_version), transportando os hashes reproduzíveis da evidência, o veredicto decidido por Rust, um estado + reason_code, o âmbito (nunca mais largo do que a evidência), a janela de validade e um record_hash sobre o todo.",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Certificação", "Perfil", "Revogação"],
    notConfuse: "com um certificado aberto ou uma cadeia de certificados — é um registo estreito, datado e reproduzível.",
  },
  {
    name: "Prontidão de certificação",
    en: "certification readiness",
    short: "O resultado agregado de validar uma implementação — indica preparação, não é a certificação.",
    full: "Prontidão de certificação é o resultado, decidido por Rust, de percorrer a jornada de validação de nove passos sobre uma implementação. Indica que a implementação está preparada para ser certificada contra um perfil; não é, por si só, uma certificação, nem confere qualquer estatuto.",
    href: "/banzai?mode=validation&target=operator-zero&workflow=full",
    hrefLabel: "Validar com o BanzAI",
    related: ["Certificação", "Evidência", "Recibo"],
    notConfuse: "com «certificação» — estar pronto para certificar não é estar certificado.",
  },
  {
    name: "Admissão a esquema",
    en: "scheme admission",
    id: "scheme-admission",
    short: "A decisão de um esquema de admitir uma entidade/implementação como participante — separada da certificação.",
    full: "Admissão a esquema é a decisão de um esquema operacional (o Esquema Operacional Banzami, ou qualquer esquema independente) de admitir uma entidade/implementação como participante, segundo a sua própria diligência, elegibilidade e contratos. É um passo separado e posterior que pode exigir certificação válida como pré-requisito, mas nunca é implicado por ela.",
    href: "/referencia/arquitectura",
    hrefLabel: "Arquitectura — as três camadas",
    related: ["Participante de esquema", "Esquema operacional", "Certificação"],
    notConfuse: "com «certificação» (a certificação não admite ninguém) e com «autorização regulatória».",
  },
  {
    name: "Autorização regulatória",
    en: "regulatory authorisation",
    id: "regulatory-authorisation",
    short: "A concessão, pelo regulador competente, para exercer actividade financeira regulada. O BANZA não é parte.",
    full: "Autorização regulatória é concedida pelo regulador competente a um operador/participante, ao abrigo do quadro legal aplicável, para exercer actividade financeira regulada. O BANZA não é parte: não a concede, não a detém, não a representa, não a acelera nem a substitui, não emite licenças e não substitui qualquer regulador. A certificação (Camada 2) e a admissão a esquema (Camada 3) nunca a implicam.",
    href: "/estado",
    hrefLabel: "Estado verificável",
    related: ["Admissão a esquema", "Esquema operacional", "Operador"],
    notConfuse: "com «certificação» e com «admissão a esquema» — são determinações distintas, com donos distintos.",
  },
  {
    name: "Evidência",
    en: "Evidence Bundle",
    id: "evidence-bundle",
    short: "Um pacote reproduzível de artefactos e referências de estado, ligados por hash — um pacote de entradas, não um certificado.",
    full: "Uma evidência (evidence bundle) liga os artefactos e as referências de estado — prontidão, garantia, estado do gate de protocolo, relatório de conformidade — que um candidato publica como evidência de conformidade verificável. É reproduzível e verificável de forma independente, e por si só não concede nada: não é um certificado. Tem de verificar contra o material de chaves públicas ligado ao manifesto que nomeia.",
    href: "/certificacao",
    hrefLabel: "Certificação (Camada 2)",
    related: ["Conformidade", "Registo de certificação", "Operator Manifest"],
    notConfuse: "com «certificado» — a evidência é o insumo verificável; o veredicto é o registo de certificação.",
  },
  {
    name: "Confiança",
    en: "Open Trust Evaluation",
    id: "open-trust-evaluation",
    short: "Avaliação Aberta de Confiança: verificação determinística, local e sem intervenção humana, de encaminhar para um par.",
    full: "Confiança no BANZA é a Avaliação Aberta de Confiança = metadata do registo público + metadata de protocolo assinada + evidência de conformidade, verificada contra chaves delegadas endossadas pela raiz, com semântica de fecho por omissão e sem qualquer passo humano. Um par calcula a resposta localmente, sem consulta central. Não existe autoridade certificadora.",
    href: "/referencia/confianca",
    hrefLabel: "Referência — Confiança",
    related: ["Signed Protocol Metadata", "Revogação", "Federação"],
    notConfuse: "com «certificação» — a confiança avalia artefactos assinados para encaminhar; não emite estatuto de operador.",
  },
  {
    name: "Revogação",
    en: "revocation",
    id: "revocation",
    short: "Retirada assinada e datada de chaves/artefactos (ou de uma certificação) — mecanismo de segurança, não sanção.",
    full: "Revogação é a retirada assinada e datada de chaves/artefactos de protocolo, através da lista de revogação pública (um objecto assinado pela chave delegada do domínio de revogação — nunca pela raiz), e de certificações através da máquina de estados (CERTIFIED|SUSPENDED|EXPIRED → REVOKED, terminal). É um mecanismo de segurança e trust do protocolo, nunca uma licença, sanção regulatória ou autorização financeira. Fecho por omissão: quem não obtém e verifica uma lista assinada fresca trata o material como não fiável.",
    href: "/referencia/confianca",
    hrefLabel: "Referência — Confiança",
    related: ["Confiança", "Registo de certificação", "Registo Técnico"],
    notConfuse: "com uma sanção regulatória — é um mecanismo técnico de segurança e trust.",
  },
  {
    name: "Registo Técnico",
    en: "BANZA Technical Registry",
    id: "banza-technical-registry",
    short: "O índice público e verificável por raiz de artefactos da camada de certificação (Camada 2).",
    full: "O Registo Técnico BANZA é o índice único, público, verificável por raiz e apenas de leitura dos artefactos da Camada 2 — implementações, perfis, registos de certificação e as respectivas revogações — verificável por qualquer terceiro sem conta e sem confiar na palavra de nenhum operador. É estritamente independente do directório de participantes de um esquema (Camada 3): constar no registo técnico nunca é «admitido» nem «autorizado». O estado actual lê-se em /registo-tecnico e directamente na rota máquina /operators — o registo vazio é um estado válido e verificável.",
    href: "/registo-tecnico",
    hrefLabel: "Registo Técnico",
    related: ["Registo de certificação", "Certificação", "Operador"],
    notConfuse: "com um directório de participantes de esquema — o registo técnico não é uma lista de admitidos.",
  },
  {
    name: "Federação",
    en: "federation",
    id: "federation",
    short: "Avaliação técnica, local e por interacção, das condições para encaminhar pagamentos entre operadores — por evidência + confiança.",
    full: "Federação é a avaliação técnica, local e por interacção, das condições para o encaminhamento de pagamentos entre operadores independentes — estabelecida por evidência publicada e verificável e pela Avaliação Aberta de Confiança sobre metadata assinada, e não pela reconstrução da mesma integração técnica bilateral por cada par de operadores. Exige o âmbito de conformidade aplicável, metadata/evidência assinada e fresca, ausência da lista de revogação e as condições de produção. A federação de produção não está activa em pré-produção.",
    href: "/referencia/federacao",
    hrefLabel: "Referência — Federação",
    related: ["Interoperabilidade", "Confiança", "Revogação"],
    notConfuse: "com «rede em directo» — em pré-produção a federação de produção não está activa.",
  },
  {
    name: "Esquema Operacional Banzami",
    en: "Banzami Operational Scheme",
    id: "banzami-operational-scheme",
    short: "O primeiro esquema operacional independente construído sobre o BANZA (Camada 3), com a Banzami como operadora designada do esquema, em preparação regulatória.",
    full: "O Esquema Operacional Banzami é o primeiro esquema operacional construído sobre o BANZA (Camada 3), promovido, desenhado e administrado pela Banzami — Tecnologia e Serviços, Lda. como operadora designada do esquema, condicionado à obtenção do quadro regulatório aplicável. O seu estado é REGULATORY_AUTHORIZATION_IN_PROGRESS; fundos reais, carteiras, liquidação e participantes reais estão em fecho por omissão até existir evidência formal. O BANZA não é a Banzami, e a certificação BANZA não é exclusiva deste esquema.",
    href: "/referencia/arquitectura",
    hrefLabel: "Arquitectura — as três camadas",
    related: ["Admissão a esquema", "Participante de esquema", "Autorização regulatória"],
    notConfuse: "com o «protocolo» — o BANZA (Camada 1) é aberto e neutro; o esquema (Camada 3) é um esquema operacional independente construído sobre ele, com uma operadora designada.",
  },
  {
    name: "Recibo",
    en: "OperationReceipt · JourneyReceipt",
    id: "operation-receipt",
    short: "Registo por passo (e agregado) de uma jornada de validação: o que correu e o que o motor Rust decidiu.",
    full: "Um OperationReceipt é o artefacto por passo emitido em cada um dos nove passos de validação: regista o passo, o resultado/razão decidido por Rust e a metadata do caminho de execução (qwen_calls, external_calls). Um JourneyReceipt agrega os nove recibos numa jornada completa. O Qwen explica; o Rust decide. Nenhum recibo é um certificado.",
    href: "/banzai",
    hrefLabel: "BanzAI",
    related: ["Prontidão de certificação", "Evidência", "Registo de certificação"],
    notConfuse: "com «certificado» — um recibo é a evidência do que foi validado num passo, não um veredicto de certificação.",
  },
  {
    name: "Validação por endpoints",
    en: "endpoint-originated validation",
    id: "endpoint-originated-validation",
    short: "A validação oficial obtém todos os artefactos avaliados exclusivamente dos endpoints públicos da implementação seleccionada.",
    full: "A validação oficial utiliza exclusivamente artefactos obtidos dos endpoints públicos da implementação seleccionada (ADR-068). Nenhum conteúdo colado, ficheiro carregado, URL do utilizador, fixture local ou mock de frontend entra na jornada oficial: o BanzAI resolve o alvo no Registo Técnico (operador → implementação → origem canónica → descoberta) e obtém cada artefacto pela camada segura de fetch em Rust — nunca pelo navegador. O resultado é específico da implementação, do profile, da versão, do ambiente, do âmbito, dos artefactos e do momento da avaliação.",
    href: "/referencia/banzai",
    hrefLabel: "Referência — BanzAI",
    related: ["Rascunho de validação", "Origem canónica", "Camada segura de fetch"],
    notConfuse: "com «rascunho de validação» — o rascunho verifica conteúdo local e não é evidência oficial.",
  },
  {
    name: "Rascunho de validação",
    en: "draft validation",
    id: "draft-validation",
    short: "Uma ferramenta local para programadores, separada da jornada oficial, que verifica um conteúdo carregado ou colado.",
    full: "A validação de rascunho verifica apenas um conteúdo local e não constitui evidência oficial (ADR-068 §4.5). Carregar ou colar artefactos é permitido apenas nesta ferramenta de rascunho, claramente marcada e isolada da jornada oficial; o seu resultado é um DRAFT_VALIDATION_RESULT: local, não-autoritativo, nunca evidência. A jornada oficial nunca consome conteúdo de rascunho.",
    href: "/referencia/banzai",
    hrefLabel: "Referência — BanzAI",
    related: ["Validação por endpoints", "Recibo", "Evidência"],
    notConfuse: "com «validação por endpoints» — só a validação por endpoints públicos é oficial.",
  },
  {
    name: "Origem canónica",
    en: "canonical origin",
    id: "canonical-origin",
    short: "A origem pública HTTPS de uma implementação, resolvida no Registo Técnico, de onde todos os seus artefactos oficiais são obtidos.",
    full: "A origem canónica (canonical_origin) é a origem pública e estável de uma implementação — por exemplo https://zero.banza.network — registada no Registo Técnico e usada como base para resolver a descoberta e os restantes endpoints. A camada segura de fetch fixa o host nesta origem: um artefacto obtido de qualquer outro host é recusado. Uma implementação sem origem canónica não é um alvo de validação elegível.",
    href: "/registo-tecnico",
    hrefLabel: "Registo Técnico",
    related: ["Descoberta", "Validação por endpoints", "Registo Técnico"],
    notConfuse: "com uma URL fornecida pelo utilizador — a origem canónica vem do Registo Técnico, nunca do pedido.",
  },
  {
    name: "Descoberta",
    en: "discovery",
    id: "discovery",
    short: "O documento publicado por uma implementação na sua origem canónica que anuncia identidade e o mapa dos seus endpoints públicos.",
    full: "A descoberta (discovery) é o primeiro artefacto da jornada de validação: publicado na origem canónica, declara operator_id, implementation_id, protocol_version, ambiente e perfil, e o mapa dos endpoints públicos (manifest, chaves, metadata assinada, capabilities, conformidade, revogação, federação, evidence bundle, traces). O motor de descoberta verifica que a identidade coincide com o alvo resolvido e que os endpoints estão ligados ao host esperado.",
    href: "/registo-tecnico",
    hrefLabel: "Registo Técnico",
    related: ["Origem canónica", "Validação por endpoints", "Recibo"],
    notConfuse: "com o manifesto — a descoberta anuncia os endpoints; o manifesto descreve o operador.",
  },
  {
    name: "Camada segura de fetch",
    en: "secure artifact fetcher",
    id: "secure-artifact-fetcher",
    short: "O componente Rust, SSRF-hardened, que realiza toda a obtenção oficial de artefactos — nunca o navegador.",
    full: "A camada segura de fetch (engines/banza-artifact-fetcher) é o único componente que alcança os endpoints públicos de uma implementação. É Rust (ADR-037/ADR-068 §4.7): fixa o host no Registo, exige HTTPS, bloqueia loopback/gamas privadas/link-local e a metadata de nuvem, proíbe redireccionamentos entre hosts, limita tamanho e tempo, valida o tipo de media e o TLS, recusa content-encoding não-identidade e liga cada resposta a hash, carimbo temporal e (quando aplicável) assinatura. Os motores de decisão sem rede recebem o conteúdo já obtido.",
    href: "/referencia/banzai",
    hrefLabel: "Referência — BanzAI",
    related: ["Validação por endpoints", "Origem canónica", "Recibo"],
    notConfuse: "com o navegador — a obtenção oficial nunca é feita pelo frontend, e o fetcher nunca decide um veredicto.",
  },
];

export default function GlossarioPage() {
  return (
    <>
      <PageHero
        eyebrow="GLOSSÁRIO · ARQUITECTURA ACTUAL"
        title={<>Os conceitos do BANZA — cada um com o seu significado exacto.</>}
        lede={
          <>
            Um glossário canónico e actual: cada termo com uma definição curta, uma definição completa, o seu
            id técnico quando existe, a página que o define, os termos relacionados e o que não confundir com
            ele. Reflecte apenas a arquitectura actual — três camadas, uma interface BanzAI transversal e uma
            implementação de referência apenas de leitura.
          </>
        }
        chips={[
          { label: "CANÓNICO" },
          { label: "APENAS TERMOS ACTUAIS" },
          { label: `${TERMS.length} TERMOS` },
        ]}
      />

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2">
            {TERMS.map((term) => (
              <article
                key={term.name}
                id={term.id ?? undefined}
                className="rounded-cardish border border-line bg-white px-[22px] py-[20px]"
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="font-serif text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
                    {term.name}
                  </h2>
                  {term.en && <span className="text-[12.5px] italic leading-[1.3] text-ink-5">{term.en}</span>}
                </div>
                {term.id && <div className="mb-2.5 font-mono text-[11px] text-bordo">{term.id}</div>}
                <p className="mb-3 text-[14.5px] font-medium leading-[1.6] text-ink-3">{term.short}</p>
                <p className="mb-4 text-[13.5px] leading-[1.65] text-ink-4">{term.full}</p>
                <dl className="space-y-2 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-x-2 text-[12.5px] leading-[1.55]">
                    <dt className="font-mono tracking-[0.04em] text-ink-5">RELACIONADOS</dt>
                    <dd className="text-ink-4">{term.related.join(" · ")}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[12.5px] leading-[1.55]">
                    <dt className="font-mono tracking-[0.04em] text-ink-5">NÃO CONFUNDIR</dt>
                    <dd className="text-ink-4">{term.notConfuse}</dd>
                  </div>
                </dl>
                <div className="mt-3.5">
                  <Link href={term.href} className="link-bordo text-[13px]">
                    {term.hrefLabel} <span className="font-mono">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <StatusNote tone="pend">
            Este glossário define apenas conceitos da arquitectura actual. Termos e superfícies retirados em
            realinhamentos anteriores não são definidos aqui como conceitos correntes; o histórico dessas
            decisões vive nos ADRs e RFCs.
          </StatusNote>
        </Container>
      </Section>
    </>
  );
}
