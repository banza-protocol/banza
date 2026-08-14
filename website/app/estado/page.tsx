import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { GITHUB_URL, BANZAI_GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Estado do Protocolo",
  description:
    "Estado verificável do protocolo BANZA: pré-produção, registo público sem evidência indexada, publicação de produção da metadata de confiança dependente das condições públicas de produção. Verifique directamente pelas rotas máquina públicas.",
  alternates: { canonical: "/estado" },
};

// Static, citable status panel. Values mirror the machine routes below — the machine routes are the
// verifiable source; this page is the human explanation. The BanzAI row is NOT static: it is derived
// server-side from the runtime SSOT route (GET /banzai/runtime, ADR-042), so the page can never
// contradict what the service actually reports. Where prose and the route differ, the route wins.
const PANEL_STATIC = [
  { label: "Especificação", value: "v1.0 — congelada", tone: "ok" },
  { label: "Arquitectura", value: "Três camadas — Camada 1 protocolo aberto · Camada 2 certificação de conformidade e interoperabilidade · Camada 3 esquemas operacionais independentes", tone: "ok" },
  { label: "Ambiente", value: "Pré-produção", tone: "pend" },
  { label: "Registo Técnico BANZA (Camada 2)", value: "0 entradas — /operators devolve []", tone: "pend" },
  { label: "production_certificates", value: "false — sem registos de certificação de produção", tone: "pend" },
  { label: "Certificação de conformidade e interoperabilidade (Camada 2)", value: "Modelo activo — por implementação, baseado em evidência e decidido por Rust; sem certificação de produção", tone: "pend" },
  { label: "Verificação de conformidade", value: "Disponível — produz evidência reproduzível por terceiros", tone: "ok" },
  { label: "Operador Zero", value: "Implementação de referência só de leitura · NOT_CERTIFIED · sem dinheiro real · validada no BanzAI a partir dos seus endpoints públicos", tone: "ok" },
  { label: "Pagamentos reais", value: "Desactivados — a activação depende de uma única porta com fecho por omissão", tone: "pend" },
  { label: "Banzami Operational Scheme (Camada 3)", value: "Em preparação regulatória — autorização não concedida", tone: "pend" },
] as const;

// ADR-042 — the runtime SSOT. The BanzAI panel row is derived from GET /banzai/runtime (server-side).
// If the route is unreachable or reports an unrecognised schema/mode/status, we render a NEUTRAL, honest
// fallback — NEVER a hardcoded "Qwen local activo" (that string may only appear when the route itself
// confirms mode=local_qwen). The stable framing wraps the route-derived engine substring.
const RUNTIME_ORIGIN = process.env.BANZA_RUNTIME_ORIGIN || "https://banza.network";
const BANZAI_PREFIX = "Interface humana primária do protocolo";
const BANZAI_SUFFIX = "estado por resposta · não normativo · pré-produção";
const BANZAI_FALLBACK = `${BANZAI_PREFIX} · ${BANZAI_SUFFIX}`;
const KNOWN_MODES = ["local_qwen", "external_hosted", "mock", "degraded"];
const KNOWN_STATUS = ["ok", "degraded", "unknown"];

type BanzaiRow = { value: string; tone: "ok" | "pend" };

// Compose the engine substring from the route payload only (mode / status / inference_location /
// external_calls). "Qwen local activo" is emitted ONLY when the route confirms an ok local_qwen mode.
function engineLineFromRuntime(rt: Record<string, unknown>): BanzaiRow {
  const status = String(rt.status);
  const mode = String(rt.mode);
  const inference = String(rt.inference_location);
  const external = Boolean(rt.external_calls);
  const parts: string[] = [];
  if (status === "degraded") {
    parts.push("motor de modelo degradado — modelo indisponível");
  } else if (status === "unknown") {
    parts.push("estado do motor por confirmar");
  } else if (mode === "local_qwen") {
    parts.push("Qwen local activo");
  } else if (mode === "external_hosted") {
    parts.push("modelo externo alojado");
  } else if (mode === "mock") {
    parts.push("motor determinístico (mock)");
  } else {
    parts.push("motor activo");
  }
  if (inference === "local") parts.push("inferência local on-host");
  else if (inference === "external") parts.push("inferência externa");
  else if (inference === "none") parts.push("sem inferência de modelo");
  parts.push(external ? "com chamadas externas" : "sem chamadas externas");
  const tone: "ok" | "pend" = status === "ok" ? "ok" : "pend";
  return { value: `${BANZAI_PREFIX} · ${parts.join(" · ")} · ${BANZAI_SUFFIX}`, tone };
}

// Server-side read of the runtime SSOT. Short revalidate mirrors the route's max-age=15; any failure or
// an unrecognised schema/mode/status → the neutral honest fallback (never a hardcoded engine claim).
async function fetchBanzaiRow(): Promise<BanzaiRow> {
  try {
    const res = await fetch(`${RUNTIME_ORIGIN}/banzai/runtime`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { value: BANZAI_FALLBACK, tone: "pend" };
    const rt = (await res.json()) as Record<string, unknown>;
    if (
      rt.schema_version !== "banzai-runtime/1" ||
      !KNOWN_MODES.includes(String(rt.mode)) ||
      !KNOWN_STATUS.includes(String(rt.status))
    ) {
      return { value: BANZAI_FALLBACK, tone: "pend" };
    }
    return engineLineFromRuntime(rt);
  } catch {
    return { value: BANZAI_FALLBACK, tone: "pend" };
  }
}

const MACHINE_ROUTES = [
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
    what: "Runtime SSOT do BanzAI (ADR-042): projecção sem segredos do estado de execução — modo, localização da inferência, chamadas externas, disponibilidade do modelo e prontidão dos motores determinísticos. Telemetria não normativa (authoritative: false), distinta dos artefactos de confiança assinados em /.well-known/banza/*.",
    today: "Devolve JSON versionado (schema_version: banzai-runtime/1). O painel BanzAI acima é derivado desta rota — se divergirem, a rota ganha.",
  },
] as const;

export default async function EstadoPage() {
  const banzaiRow = await fetchBanzaiRow();
  const PANEL = [...PANEL_STATIC, { label: "BanzAI", value: banzaiRow.value, tone: banzaiRow.tone }];
  return (
    <>
      <PageHero
        eyebrow="ESTADO DO PROTOCOLO"
        title={<>O que é verdade hoje — e como verificá-lo.</>}
        lede={
          <>
            Esta página resume o estado público do BANZA em linguagem simples e aponta para as
            rotas máquina onde qualquer pessoa — regulador, auditor, operador ou programador —
            pode verificar cada afirmação directamente, sem confiar neste website.
          </>
        }
        chips={[
          { label: "PRÉ-PRODUÇÃO" },
          { label: "ESPECIFICAÇÃO v1.0 CONGELADA" },
          { label: "REGISTO PÚBLICO SEM EVIDÊNCIA INDEXADA" },
          { label: "ESTADO VERIFICÁVEL" },
        ]}
      />

      {/* Painel de estado (estático; a fonte verificável são as rotas máquina) */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">PAINEL DE ESTADO · ESTADO VERIFICÁVEL</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {PANEL.map((r) => (
              <div key={r.label} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{r.label.toUpperCase()}</div>
                <div className="text-[14.5px] font-semibold leading-[1.45] text-ink">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            A especificação BANZA v1.0 está congelada e é publicamente verificável. A arquitectura
            organiza-se em três camadas — o protocolo (Camada 1), a certificação de conformidade e
            interoperabilidade (Camada 2, por implementação e decidida por Rust) e os esquemas operacionais
            independentes (Camada 3) — com o BanzAI como interface humana transversal, não uma camada. A produção —
            Manifesto de Chaves, metadata de protocolo assinada, federação entre operadores e
            certificação de produção — depende da cerimónia offline da chave raiz e da primeira
            evidência de conformidade de produção publicada. Até lá, o estado correcto do registo
            público é <em>vazio</em>, e é exactamente isso que as rotas máquina devolvem.
          </p>
          <p className="mt-4 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            A Banzami é a operadora designada do primeiro Banzami Operational Scheme. A camada
            operacional encontra-se em preparação regulatória e os pagamentos reais permanecem
            desactivados.
          </p>
        </Container>
      </Section>

      {/* Rotas máquina — a fonte verificável */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">VERIFIQUE SEM CONFIAR NESTE SITE · ROTAS MÁQUINA</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            As rotas máquina são a fonte verificável do estado público.
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">
            Cada rota devolve JSON puro, sem redireccionamentos para HTML. O que está escrito
            nesta página tem de coincidir com o que estas rotas devolvem — se não coincidir,
            as rotas ganham.
          </p>
          <div className="flex flex-col gap-[12px]">
            {MACHINE_ROUTES.map((r) => (
              <div key={r.path} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <a
                  href={r.path}
                  className="link-bordo break-all font-mono text-[13px]"
                  title={`Abrir ${r.path} (devolve JSON)`}
                >
                  {r.path}
                </a>
                <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">{r.what}</div>
                <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">Hoje: {r.today}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* O que cada termo significa */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">LEITURA CORRECTA DO ESTADO</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
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
              aplicado a qualquer futura implementação publicada (ADR-038).
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
              O BanzAI é a interface humana primária e transversal entre humanos/operadores e o protocolo (ADR-042):
              guia operadores, invoca as ferramentas Rust, responde com base em fontes citadas e corre em
              pré-produção. Não decide conformidade, não confere estatuto a operadores e não substitui a
              suite de conformidade — o output de IA nunca é regra do protocolo: é não normativo.
            </p>
            <p>
              A inferência corre localmente e on-host. O estado do motor em execução{" "}
              <em>nesta resposta</em> não é afirmado aqui em prosa fixa: o painel{" "}
              <strong className="text-ink">BanzAI</strong> acima é derivado da rota máquina{" "}
              <span className="font-mono text-[13px]">/banzai/runtime</span> (o SSOT de runtime,
              ADR-042), que reporta o motor, a localização da inferência e se houve chamadas
              externas — se a prosa e a rota divergirem, a rota ganha. Além disso, cada resposta
              publica o seu próprio estado — o caminho de execução, as fontes citadas e se houve
              chamada a modelo externo — de modo a que a leitura do estado por resposta seja
              verificável e não dependa de confiança.
            </p>
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">
              A conformidade técnica com o BANZA não substitui obrigações legais, regulatórias,
              bancárias, KYC/KYB ou AML/CFT aplicáveis a cada operador. Nada nesta página
              constitui aprovação regulatória.
            </StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">CONTINUAR</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href="/referencia/certificacao">Como funciona a conformidade</MoreLink>
            <MoreLink href="/referencia/confianca">A cadeia de confiança</MoreLink>
            <MoreLink href="/referencia/programadores">Começar a implementar</MoreLink>
            <MoreLink href="/referencia/roteiro">Evolução do Protocolo</MoreLink>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            <a href={GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              GitHub — protocolo BANZA <span className="font-mono">↗</span>
            </a>
            <a href={BANZAI_GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              GitHub — BanzAI <span className="font-mono">↗</span>
            </a>
            <Link href="/banzai#perguntar" className="link-bordo text-[13.5px]">
              Perguntar ao BanzAI <span className="font-mono">→</span>
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
