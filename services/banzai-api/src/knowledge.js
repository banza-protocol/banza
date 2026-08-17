// BanzAI local knowledge base (fixtures) + RUST_WRAPPER_ONLY glue.
//
// ADR-038 / R6: retrieval, normalization and scoring are RUST — engines/banzai-api-kb compiled to Node
// WASM (src/rustkb), a byte-parity port of the former JS algorithm (proven identical on 50/50 checks).
// This file now keeps only DATA (SOURCES/ENTRIES/answers) and thin glue: `normalize` and `retrieveTopK`
// call the Rust engine; `retrieve`/`buildContext` compose over the returned ids. There is NO JS
// scoring/matching/ranking here (RUST_WRAPPER_ONLY). This module itself makes no model calls
// (llm_calls=0); it feeds deterministic, source-anchored data into the FactualPackage.
//
// Deterministic, source-anchored answers for the protocol questions BanzAI must be able to
// answer even without the local model. Every entry cites real protocol documents so
// the answer stays grounded; the local model explains once and never decides. BanzAI explains; it never decides,
// certifies, or invents operators. If nothing matches well enough, retrieval
// returns null and the API says it did not find sufficient sources.
//
// Routing (ADR-036, M2.8G) is decided by the Rust routing policy (engines/banzai-api-kb → route.rs),
// NOT by these entries. A normal grounded question with sufficient sources goes to the local model
// (Qwen) by DEFAULT; the deterministic answers here are served only for an explicit critical-boundary
// intent, a safety refusal, no-source, or as the fallback when the model fails/times-out/is rejected.
// `critical: true` marks the entries the routing policy may serve deterministically for a boundary
// intent (protocol identity/guardrail); it is descriptive metadata, not the routing switch.

import crypto from "node:crypto";
import { createRequire } from "node:module";

// R6 (ADR-038): retrieval/normalization/scoring is Rust — engines/banzai-api-kb compiled to Node WASM,
// loaded synchronously here. This JS module keeps ENTRIES/SOURCES/answers as DATA and only maps the ids
// the Rust engine returns; it performs NO matching, scoring, ranking or normalization of its own.
const kb = createRequire(import.meta.url)("./rustkb/banzai_api_kb.js");

// The profile facts BanzAI states, DERIVED from the normative registry by
// tools/gen-canonical-profiles-rs.py. Identifiers, canonical names, purposes and inheritance are read
// from here and never written here: a second hand-maintained L0-L4 table is a drift path, and the one
// that goes stale is always the one a reader sees. The prose around them is localized presentation; the
// facts inside are not translated and not re-authored.
const PROFILE_FACTS = createRequire(import.meta.url)("./canonicalProfiles.generated.json");

// Current lifecycle state, DERIVED from contracts/production/protocol-version.json by
// tools/gen-banzai-lifecycle-facts.py. Read here, never written here: version, pre-production and the
// freeze / independent-implementation / trial booleans have one owner, and a copy that can be edited
// separately is a copy that will one day disagree. AG-10 is deliberately absent — no tracked artifact
// records its run state, so there is nothing to derive.
const LIFECYCLE = createRequire(import.meta.url)("./lifecycleFacts.generated.json").facts;

// Canonical source references (path + title). These are the citations BanzAI returns.
export const SOURCES = {
  claudeMd: { id: "CLAUDE.md", title: "BANZA — Open Financial Protocol (repo guide)", path: "CLAUDE.md" },
  adr018: { id: "ADR-001", title: "Open financial protocol — implementation independence", path: "decisions/adr/ADR-001-*.md" },
  adr019: { id: "ADR-001", title: "Operator separation", path: "decisions/adr/ADR-001-*.md" },
  adr025: { id: "ADR-001", title: "Ecosystem naming inversion (canonical)", path: "decisions/adr/ADR-001-*.md" },
  adr048: { id: "ADR-029", title: "Canonical verification routes and pre-production behaviour", path: "decisions/adr/ADR-029-*.md" },
  adr049: { id: "ADR-027", title: "Private keys never reside on serving infrastructure", path: "decisions/adr/ADR-027-*.md" },
  adr050: { id: "ADR-036", title: "BanzAI as native protocol agent", path: "decisions/adr/ADR-036-*.md" },
  annex: { id: "ANNEX", title: "BANZA Network Infrastructure (annex)", path: "docs/governance/ANNEX-BANZA-NETWORK-INFRASTRUCTURE.md" },
  state: { id: "protocol_state", title: "PostgreSQL protocol_state (pre-production marker)", path: "infra/banza-network/postgres/init/001_schema.sql" },
  governance: { id: "GOVERNANCE", title: "BANZA governance & maintainers (Banzami = original creator / initial maintainer)", path: "GOVERNANCE.md" },
  fedQuickstart: { id: "SPEC-FED", title: "Federation operator quickstart (spec/federation)", path: "spec/federation/FEDERATION_OPERATOR_QUICKSTART.md" },
  adr038: { id: "ADR-025", title: "Open protocol trust model without a central CA", path: "decisions/adr/ADR-025-*.md" },
  adr079: { id: "ADR-025", title: "Canonical trust signing model reconciliation (Model A)", path: "decisions/adr/ADR-025-trust-without-a-certificate-authority.md" },
  adr039: { id: "ADR-031", title: "Operator self-publication and machine-verifiable conformance", path: "decisions/adr/ADR-031-*.md" },
  adr040: { id: "ADR-025", title: "Federation trust evaluation without certificates", path: "decisions/adr/ADR-025-*.md" },
  adr002: { id: "ADR-002", title: "Protocol, implementation and operator separation", path: "decisions/adr/ADR-002-protocol-implementation-and-operator-separation.md" },
  adr005sep: { id: "ADR-005", title: "Certification, admission and authorisation do not propagate", path: "decisions/adr/ADR-005-certification-admission-and-authorisation-do-not-propagate.md" },
  adr059: { id: "ADR-004", title: "BANZA three-layer institutional architecture", path: "decisions/adr/ADR-004-three-institutional-layers.md" },
  adr060: { id: "ADR-006", title: "Banzami Operational Scheme (designated operator; BANZA ≠ Banzami)", path: "decisions/adr/ADR-006-the-designated-operator-and-its-conflict-of-interest.md" },
  adr062: { id: "ADR-007", title: "Regulatory-state boundary and the RealMoneyActivationGate", path: "decisions/adr/ADR-007-regulatory-state-and-the-real-money-activation-gate.md" },
  adr064: { id: "ADR-032", title: "BANZA Conformance & Interoperability Certification (Layer 2)", path: "decisions/adr/ADR-032-certification-records-and-their-lifecycle.md" },
  adr065: { id: "ADR-033", title: "BANZA Technical Registry", path: "decisions/adr/ADR-033-the-banza-technical-registry.md" },
  adr066: { id: "ADR-032", title: "Closed certification-state machine", path: "decisions/adr/ADR-032-certification-records-and-their-lifecycle.md" },
  conformanceSuite: { id: "CONFORMANCE", title: "BANZA conformance suite", path: "conformance/README.md" },
  adrIndex: { id: "ADR-INDEX", title: "Architecture Decision Records (index)", path: "decisions/adr/README.md" },
  adr006: { id: "ADR-012", title: "Double-entry ledger", path: "decisions/adr/ADR-012-double-entry-ledger-and-monetary-precision.md" },
  invariants: { id: "invariants", title: "Financial invariants registry (INV-LEDGER/WALLET/SETTLE/IDEM/RECON/QR)", path: "contracts/invariants.json" },
  opManifestSchema: { id: "SCHEMA-OP-MANIFEST", title: "Operator manifest schema (production baseline)", path: "contracts/production/operator-manifest.production.schema.json" },
  fedManifestSchema: { id: "SCHEMA-FED-MANIFEST", title: "Federation manifest extension schema", path: "contracts/federation/federation-manifest.json" },
  brlSchema: { id: "SCHEMA-BRL", title: "BANZA Revocation List (BRL) schema", path: "contracts/federation/revocation-list.json" },
  keyManifestSchema: { id: "SCHEMA-KEY-MANIFEST", title: "BANZA Key Manifest schema", path: "contracts/federation/key-manifest.json" },
  evidenceModel: { id: "FED-EVIDENCE", title: "Federation conformance evidence model", path: "spec/federation/FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md" },
  // M2.9A (ADR-036) operator-facing sources for the agent's operational guidance.
  gettingStarted: { id: "GETTING-STARTED", title: "Getting started with BANZA (operator entry point)", path: "docs/reference/getting-started.md" },
  specOverview: { id: "SPEC-OVERVIEW", title: "BANZA protocol overview (layers; implementation is the operator's)", path: "spec/overview.md" },
  fedFlow: { id: "SPEC-FED-FLOW", title: "Federation protocol flow", path: "spec/federation/FEDERATION_PROTOCOL_FLOW.md" },
  fedTrustModel: { id: "SPEC-FED-TRUST", title: "Federation trust model (Open Trust Evaluation)", path: "spec/federation/FEDERATION_TRUST_MODEL.md" },
  // M2.12B (ADR-035) — the Operador Zero reference payment-operator SIMULATOR.
  adr052: { id: "ADR-035", title: "Operador Zero — reference payment-operator simulator", path: "decisions/adr/ADR-035-operator-zero-the-read-only-reference-implementation.md" },
  // M2.13B — legal / stack / implementation sources for the basic-question answers + the action boundary.
  license: { id: "LICENSE", title: "Apache-2.0 licence (protocol)", path: "LICENSE" },
  notice: { id: "NOTICE", title: "NOTICE (attribution)", path: "NOTICE" },
  readme: { id: "README", title: "BANZA — Open Financial Protocol (repo README)", path: "README.md" },
  infraRunbook: { id: "infra-runbook", title: "BANZA network deployment runbook (Docker Compose, nginx)", path: "infra/banza-network/README.md" },
  ozEngine: { id: "operator-zero-core", title: "Operador Zero Rust engine", path: "engines/operator-zero-core/" },
  ozE2eRoot: { id: "operator-zero-e2e-root", title: "Operador Zero E2E Demo Root (Ed25519)", path: "engines/operator-zero-e2e-root/" },
  ozLab: { id: "OperadorZeroReference", title: "Operador Zero read-only reference surface (website)", path: "website/components/operador-zero/OperadorZeroReference.tsx" },
  ozMiddleware: { id: "middleware", title: "Host-aware routing (zero.banza.network)", path: "website/middleware.ts" },
  rustPolicy: { id: "ADR-038", title: "Rust-first policy for official BANZA/BanzAI engines", path: "decisions/adr/ADR-038-*.md" },
  // M2.14C-FIX2 — short technology/stack queries cite the relevant ADR.
  adrPostgres: { id: "ADR-013", title: "PostgreSQL as protocol-state store (not a financial DB)", path: "decisions/adr/ADR-013-*.md" },
  adrLocalInference: { id: "ADR-036", title: "BanzAI local Qwen inference runtime (on-host, no external calls)", path: "decisions/adr/ADR-036-*.md" },
  governanceProc: { id: "GOVERNANCE", title: "BANZA governance & change process (RFC/ADR/PR)", path: "GOVERNANCE.md" },
  // M2.13B PR2 — repository-wide knowledge: retrieval, indexer, provider, boundary, guards. Since
  // M2.19G.6 (ADR-036) the BanzAI runtime/engines are consolidated into this monorepo and indexed here.
  banzaiApiKb: { id: "banzai-api-kb", title: "BanzAI Rust retrieval/routing engine (WASM)", path: "engines/banzai-api-kb/" },
  repoIndexer: { id: "banzai-repo-indexer", title: "BanzAI Rust repository-wide indexer", path: "engines/banzai-repo-indexer/" },
  docIndexer: { id: "banzai-doc-indexer", title: "BanzAI Rust documentation indexer", path: "engines/banzai-doc-indexer/" },
  pipelineJs: { id: "pipeline.js", title: "BanzAI answer pipeline (glue)", path: "services/banzai-api/src/pipeline.js" },
  providerJs: { id: "provider.js", title: "BanzAI local_qwen provider (no external calls)", path: "services/banzai-api/src/provider.js" },
  routeRs: { id: "route.rs", title: "BanzAI routing + action boundary (Rust)", path: "engines/banzai-query-core/src/route.rs" },
  actionGuard: { id: "check-banzai-action-boundary.sh", title: "Action boundary guard", path: "tools/check-banzai-action-boundary.sh" },
  repoSafetyGuard: { id: "check-banzai-repo-knowledge-safety.sh", title: "Repo knowledge-safety guard", path: "tools/check-banzai-repo-knowledge-safety.sh" },
  repoKnowledgeGuard: { id: "check-banzai-repository-wide-knowledge.sh", title: "Repository-wide knowledge guard", path: "tools/check-banzai-repository-wide-knowledge.sh" },
  zeroSub: { id: "zeroSubdomain.ts", title: "zero.banza.network routing (host-aware)", path: "website/lib/zeroSubdomain.ts" },
  ozApp: { id: "app/(pt)/oz", title: "Operador Zero standalone surface", path: "website/app/(pt)/oz/" },
  banzaiCore: { id: "banzai-core", title: "BanzAI Rust core (deterministic; no LLM/network)", path: "engines/banzai-query-core/" },
  banzaiRepo: { id: "banzai-source", title: "BanzAI active source — this monorepo (services/banzai-api + engines/banzai-*)", path: "services/banzai-api" },
  // M2.13C — sources for the answer-quality gap fixes (crates, guards, CI, index state).
  enginesDir: { id: "engines/", title: "Motores Rust oficiais (ADR-038)", path: "engines/" },
  leakGuard: { id: "check-private-key-leak.sh", title: "Guard anti-fuga de chave privada", path: "tools/check-private-key-leak.sh" },
  identityGuard: { id: "check-operator-contamination.sh", title: "Guard de neutralidade / anti-contaminação de marca", path: "tools/check-operator-contamination.sh" },
  ciWorkflows: { id: ".github/workflows", title: "CI (identity-guard.yml, rust-engines.yml, …)", path: ".github/workflows/" },
  indexManifest: { id: "banzai-repo-index-manifest.json", title: "Manifesto do índice repo-wide (contagens/commits/hash)", path: "engines/banzai-query-core/src/repoindex/banzai-repo-index-manifest.json" },
  adr005: { id: "ADR-001", title: "Protocol-first product development (norma antes do produto)", path: "decisions/adr/ADR-001-*.md" },
  // M2.13C-B — institutional-origin sources (creator, creation date, initial maintainer, open governance).
  maintainers: { id: "MAINTAINERS", title: "BANZA maintainers — institutional origin + maintainer model", path: "MAINTAINERS.md" },
  // M2.13C-C — the controlled protocol + fintech-domain glossary (explanatory layer B/C source).
  glossary: { id: "PROTOCOL-GLOSSARY", title: "BANZA protocol + fintech-domain controlled glossary", path: "docs/reference/PROTOCOL_GLOSSARY.md" },
  // M2.14B — Operator Zero Only demo/example policy.
  adr053: { id: "ADR-035", title: "Operator Zero Only demo and example policy", path: "decisions/adr/ADR-035-operator-zero-the-read-only-reference-implementation.md" },
  // M2.14C — governance / developer vocabulary sources (repo governance, engineering & process).
  govGlossary: { id: "GOVERNANCE-GLOSSARY", title: "BANZA governance & developer controlled glossary", path: "docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md" },
  rfcIndex: { id: "RFC-INDEX", title: "Requests for Comments (protocol change proposals)", path: "decisions/rfc/" },
  contributing: { id: "CONTRIBUTING", title: "How to contribute (RFC/ADR/PR/CI change process)", path: "CONTRIBUTING.md" },
  changelog: { id: "CHANGELOG", title: "BANZA changelog (release history)", path: "CHANGELOG.md" },
  makefile: { id: "MAKEFILE", title: "Make targets — guards, checks, engines", path: "Makefile" },
  ciWorkflows: { id: "CI-WORKFLOWS", title: "Continuous integration workflows", path: ".github/workflows/" },
  guardsDir: { id: "GUARDS", title: "Repository guards (automated checks)", path: "tools/" },
  runbookDoc: { id: "RUNBOOK", title: "Operational runbook (activation, smoke tests, rollback)", path: "docs/guides/OPERADOR_ZERO_SUBDOMAIN_ACTIVATION.md" },
  reportsDir: { id: "REPORTS", title: "Milestone & audit reports", path: "docs/quality/" },
  specDir: { id: "SPEC", title: "Protocol specifications", path: "spec/" },
  protocolVersionContract: { id: "PROTOCOL-VERSION", title: "Protocol version and current lifecycle state (normative descriptor)", path: "contracts/production/protocol-version.json" },
  profilesRegistry: { id: "CONFORMANCE-PROFILES", title: "Conformance profile registry (normative)", path: "contracts/production/conformance-profiles.production.json" },
  contractsDir: { id: "CONTRACTS", title: "Protocol contracts (OpenAPI, JSON schemas)", path: "contracts/" },
};

const s = (...keys) => keys.map((k) => SOURCES[k]);

// Knowledge entries. `keywords` drive matching; `answer` is the deterministic body.

/** The profile levels, in registry order, as a compact PT/EN line each. */
function profileLines(lang) {
  return PROFILE_FACTS.profiles
    .map((p) => {
      const builds =
        p.includes && p.includes.length
          ? lang === "pt"
            ? ` Inclui ${p.includes.join(", ")}.`
            : ` Includes ${p.includes.join(", ")}.`
          : "";
      return `- **${p.level} — ${p.name}**: ${p.purpose}${builds}`;
    })
    .join("\n");
}

/** The L4 state, which readers ask about directly and which the registry states plainly. */
function l4Note(lang) {
  const l4 = PROFILE_FACTS.profiles.find((p) => p.external_profile_required);
  if (!l4) return "";
  const none = !(l4.published_external_profiles || []).length;
  if (!none) return "";
  return lang === "pt"
    ? ` O **${l4.level}** é parametrizado por um **perfil externo**: a sua reivindicação nomeia um perfil de interoperabilidade externa concreto. **Nenhum perfil externo está publicado**, pelo que o **${l4.level}** define o mecanismo e não existe hoje demonstração executável dele.`
    : ` **${l4.level}** is parameterized by an **external profile**: a claim names a concrete external-interoperability profile. **No external profile is published**, so ${l4.level} defines the mechanism and no executable demonstration of it exists today.`;
}

/**
 * One entry per registered profile, plus the list. Generated from the derived facts rather than written
 * out, so the set cannot drift from the registry and an unregistered level has no entry to reach.
 */
function profileEntries() {
  const list = {
    id: "def-profiles",
    deterministic: true,
    critical: true,
    keywords: [
      "perfis do banza", "quais sao os perfis", "quais sao os perfis do banza", "perfis de conformidade",
      "lista de perfis", "niveis de conformidade", "perfis l0 a l4", "l0 a l4",
      "banza profiles", "what are banza profiles", "conformance profiles", "profile levels",
      "list of profiles", "l0 to l4",
    ],
    answer:
      `Os **perfis de conformidade** do **BANZA** são **${PROFILE_FACTS.profiles.length}**, do **${PROFILE_FACTS.profiles[0].level}** ao **${PROFILE_FACTS.profiles[PROFILE_FACTS.profiles.length - 1].level}**:\n\n${profileLines("pt")}\n\nUm perfil mede **capacidade técnica demonstrada**, e não é um estado de certificação, uma admissão operacional, uma permissão regulatória nem uma aprovação para produção.${l4Note("pt")}\n\n---\n\nBANZA defines **${PROFILE_FACTS.profiles.length}** conformance profiles, **${PROFILE_FACTS.profiles[0].level}** through **${PROFILE_FACTS.profiles[PROFILE_FACTS.profiles.length - 1].level}**:\n\n${profileLines("en")}\n\nA profile measures **demonstrated technical capability**. It is never a certification state, an operational admission, a regulatory permission or a production approval.${l4Note("en")}`,
    sources: s("profilesRegistry", "govGlossary"),
  };

  const perLevel = PROFILE_FACTS.profiles.map((p) => ({
    id: `def-profile-${p.level.toLowerCase()}`,
    deterministic: true,
    critical: true,
    keywords: [
      `o que e ${p.level.toLowerCase()}`, `o que e o ${p.level.toLowerCase()}`, `perfil ${p.level.toLowerCase()}`,
      `what is ${p.level.toLowerCase()}`, `${p.level.toLowerCase()} profile`, `profile ${p.level.toLowerCase()}`,
    ],
    answer:
      `O **${p.level}** é o perfil **${p.name}**. ${p.purpose}` +
      (p.includes && p.includes.length ? ` Inclui ${p.includes.join(", ")}.` : "") +
      (p.awarded_by_sandbox_runner
        ? ` É demonstrável por um executor de sandbox.`
        : ` **Não** é atribuído por um executor de sandbox — a sua evidência não pode ser produzida por uma única implementação em ambiente simulado.`) +
      ` Um perfil mede **capacidade técnica**, não é certificação, admissão operacional nem autorização regulatória.` +
      (p.external_profile_required ? l4Note("pt") : "") +
      `\n\n---\n\n**${p.level}** is the **${p.name}** profile. ${p.purpose}` +
      (p.includes && p.includes.length ? ` Includes ${p.includes.join(", ")}.` : "") +
      (p.awarded_by_sandbox_runner
        ? ` It is demonstrable by a sandbox runner.`
        : ` It is **not** awarded by a sandbox runner — its evidence cannot be produced by a single implementation in a simulated environment.`) +
      ` A profile measures **technical capability**; it is not certification, operational admission or regulatory authorization.` +
      (p.external_profile_required ? l4Note("en") : ""),
    sources: s("profilesRegistry", "govGlossary"),
  }));

  return [list, ...perLevel];
}


/**
 * The lifecycle fact family. One generated fact object, several question dimensions — version, lifecycle
 * state, protocol freeze, L0 freeze, independent implementation, trial — rather than a hand-written
 * sentence per phrasing. PT and EN are two presentations of the SAME fact: neither is separately editable.
 */
function lifecycleEntries() {
  const V = LIFECYCLE.protocol_version;
  const state = LIFECYCLE.pre_production ? "PRE-PRODUCTION" : "PRODUCTION";
  const yn = (b, pt) => (b ? (pt ? "Sim" : "Yes") : pt ? "Não" : "No");
  const src = s("protocolVersionContract", "govGlossary");

  return [
    {
      id: "def-lifecycle-version",
      deterministic: true,
      critical: true,
      keywords: [
        "versao actual do banza", "versao atual do banza", "qual e a versao do banza", "versao do banza",
        "current banza version", "what is the current banza version", "banza version", "protocol version",
        "versao do protocolo",
      ],
      answer:
        `A versão actual do **BANZA** é **${V}**, no estado **${state}**. A versão identifica o protocolo e a sua compatibilidade — **não** é um estado de release, **não** significa que o protocolo esteja congelado, e **não** é uma aprovação para produção.\n\n---\n\nThe current **BANZA** version is **${V}**, in the **${state}** state. A version identifies the protocol and its compatibility — it is **not** a release state, it does **not** mean the protocol is frozen, and it is **not** a production approval.`,
      sources: src,
    },
    {
      id: "def-lifecycle-status",
      deterministic: true,
      critical: true,
      keywords: [
        "banza esta em producao", "o banza esta em producao", "banza em producao", "estado do banza",
        "pre-producao", "pre producao", "is banza in production", "banza in production",
        "banza production status", "lifecycle status",
      ],
      answer:
        `O **BANZA** está em **${state}**. ${LIFECYCLE.pre_production ? "Isto significa que o protocolo, os contratos e a conformidade estão publicados e verificáveis, mas **nenhum operador real foi criado**, **nenhum certificado de produção é emitido**, e o **BANZA não movimenta fundos** — a operação financeira real pertence a operadores autorizados, sob o enquadramento legal aplicável." : ""}\n\n---\n\n**BANZA** is in **${state}**. ${LIFECYCLE.pre_production ? "The protocol, contracts and conformance material are published and verifiable, but **no real operator has been created**, **no production certificate is issued**, and **BANZA moves no funds** — real financial operation belongs to authorised operators under the applicable legal framework." : ""}`,
      sources: src,
    },
    {
      id: "def-lifecycle-protocol-freeze",
      deterministic: true,
      critical: true,
      keywords: [
        "protocolo foi congelado", "o protocolo ja foi congelado", "protocolo congelado",
        "congelamento do protocolo", "has the protocol been frozen", "protocol frozen",
        "is the protocol frozen", "protocol freeze",
      ],
      answer:
        `**${yn(LIFECYCLE.protocol_frozen, true)}.** ${LIFECYCLE.protocol_frozen ? "" : "Nenhum alvo **BANZA** externamente congelado foi publicado. Congelamento é um facto **distinto** da versão: o protocolo tem versão **" + V + "** e continua **não congelado**. Enquanto não for congelado para implementação externa, a arquitectura ainda está a ser completada."}\n\n---\n\n**${yn(LIFECYCLE.protocol_frozen, false)}.** ${LIFECYCLE.protocol_frozen ? "" : "No externally frozen **BANZA** target has been published. Freezing is a fact **separate** from the version: the protocol is at version **" + V + "** and remains **unfrozen**. Until it is frozen for external implementation, the architecture is still being completed."}`,
      sources: src,
    },
    {
      id: "def-lifecycle-l0-freeze",
      deterministic: true,
      critical: true,
      keywords: [
        "l0 foi congelado", "o l0 ja foi congelado", "l0 congelado", "congelamento do l0",
        "has l0 been frozen", "is l0 frozen", "l0 freeze", "l0 frozen",
      ],
      answer:
        `**${yn(LIFECYCLE.l0_frozen, true)}.** ${LIFECYCLE.l0_frozen ? "" : "O alvo do ensaio externo **não foi seleccionado nem congelado**, e nenhum pacote final de ensaio foi publicado. Que o **L0** **exista** como perfil é um facto **diferente** de o L0 estar **congelado**."}\n\n---\n\n**${yn(LIFECYCLE.l0_frozen, false)}.** ${LIFECYCLE.l0_frozen ? "" : "The external trial target has **not been selected or frozen**, and no final trial package has been published. That **L0** **exists** as a profile is a **different** fact from L0 being **frozen**."}`,
      sources: src,
    },
    {
      id: "def-lifecycle-independent-implementation",
      deterministic: true,
      critical: true,
      keywords: [
        "implementacao independente demonstrada", "ja existe uma implementacao independente",
        "existe implementacao independente", "implementacao independente",
        "independent implementation demonstrated", "has banza been independently implemented",
        "independent implementation", "independently implemented",
      ],
      answer:
        `**${LIFECYCLE.independent_implementation_demonstrated ? "Sim" : "Não — ainda não demonstrada"}.** ${LIFECYCLE.independent_implementation_demonstrated ? "" : "Nenhum ensaio de implementação independente foi conduzido. Isto é **distinto** de: a implementação de referência, o material derivado em sala limpa, e a garantia interna — **nenhum** desses é uma implementação independente. O que ainda não existe é uma implementação **externa e independente** demonstrada."}\n\n---\n\n**${LIFECYCLE.independent_implementation_demonstrated ? "Yes" : "No — not yet demonstrated"}.** ${LIFECYCLE.independent_implementation_demonstrated ? "" : "No independent implementation trial has been conducted. This is **distinct** from the reference implementation, from clean-room derived material, and from internal assurance — **none** of those is an independent implementation. What does not yet exist is a demonstrated **external, independent** implementation."}`,
      sources: src,
    },
    {
      id: "def-lifecycle-trial",
      deterministic: true,
      critical: true,
      keywords: [
        "ensaio independente ja comecou", "o ensaio independente comecou", "ensaio independente",
        "trial independente", "has the independent trial started", "independent trial started",
        "independent trial", "trial status",
      ],
      answer:
        `**${LIFECYCLE.independent_trial_started ? "Sim" : "Não — ainda não começou"}.** ${LIFECYCLE.independent_trial_started ? "" : "Nenhum ensaio de implementação independente foi conduzido. Não há participante, data, alvo congelado nem resultado a reportar — nada disso existe ainda."}\n\n---\n\n**${LIFECYCLE.independent_trial_started ? "Yes" : "No — not started"}.** ${LIFECYCLE.independent_trial_started ? "" : "No independent implementation trial has been conducted. There is no participant, date, frozen target or outcome to report — none of those exists yet."}`,
      sources: src,
    },
  ];
}

export const ENTRIES = [
  {
    id: "what-is-banza",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["banza", "o que e banza", "que e banza", "what is banza", "define banza", "banza e o que",
      // "O que é o BANZA?" carries the article the shorter keyword lacks. Coverage is measured by the
      // keyword being CONTAINED in the query, so a keyword longer than the phrasing it should match never
      // fires — English settled and Portuguese did not, on the most basic question the engine answers.
      "o que e o banza", "que e o banza", "what is the banza", "arquitetura de tres camadas", "tres camadas", "arquitetura do banza", "three layer architecture", "three-layer", "protocolo financeiro aberto", "open financial protocol"],
    // Declared DETERMINISTIC. What BANZA is, is stable knowledge and must not depend on a model.
    //
    // This was attempted once and reverted: seventeen call sites across twelve tests used a
    // "what is BANZA" question as their FIXTURE to reach the grounded trunk, so settling the answer
    // removed the path they exercised and they failed for reasons unrelated to what they assert. Those
    // fixtures now request a synthesis query by ROLE (SUPPORTED_SYNTHESIS_QUERY), which is what they
    // always meant, so the two concerns are finally independent.
    deterministic: true,
    answer:
      "BANZA é um protocolo financeiro aberto e neutro em relação a operadores. Define regras, invariantes, contratos e critérios de conformidade que qualquer operador pode implementar. Não é um operador, uma carteira, um processador de pagamentos nem um produto comercial.",
    // `claudeMd` was in this set and is NOT eligible public establishing evidence. The presentation filter
    // dropped it from the card, so nothing ever looked wrong — but the evidence GRAPH declared an
    // internal repository guide as part of what establishes the protocol's identity, and that is the
    // claim, not the rendering. Replaced by the public README, which is the repository's own entry point
    // for what BANZA is. Corrected BEFORE the deterministic declaration, not after: promoting an entry
    // whose establishing set is partly internal would have shipped the defect with more authority.
    sources: s("readme", "adr018", "specOverview"),
  },
  {
    id: "what-is-banzami",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["o que e o banzami", "o que e banzami", "que e banzami", "banzami e o que", "quem e o banzami", "quem e banzami", "what is banzami", "who is banzami", "banzami"],
    answer:
      "Banzami é a entidade/ecossistema que criou e mantém o projecto — o criador original e mantenedor institucional inicial. BANZA é o protocolo financeiro aberto e neutro. BanzAI é o agente IA do protocolo BANZA. São camadas distintas: Banzami (organização) ≠ BANZA (protocolo) ≠ BanzAI (agente). O BanzAI não transforma o Banzami em regra do protocolo nem confunde empresa, protocolo e agente; a governação é aberta e a conformidade demonstra-se por evidência verificável, não por uma autoridade central.",
    sources: s("governance", "adr025", "claudeMd"),
  },
  {
    id: "is-banza-an-operator",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banza e um operador", "banza is an operator", "banza e operador", "banza opera"],
    answer:
      "Não. BANZA é o protocolo, não um operador. Operadores são externos e implementam o protocolo; a infraestrutura BANZA hospeda apenas a superfície pública do protocolo e o BanzAI, nunca lógica de operador (carteira, ledger de operador, KYC/KYB, pagamentos ou contas).",
    sources: s("annex", "adr019"),
  },
  {
    id: "certified-operators",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["operadores certificados", "certified operators", "quem sao os operadores", "que operadores"],
    answer:
      "No BANZA a participação demonstra-se por evidência verificável, não é concedida por uma autoridade central — não existem operadores certificados. Neste estado de pré-produção nenhum operador publicou evidência: a rota /operators reflecte o registo ao vivo, que não lista operadores. Operador A/B/C existem apenas em documentação e exemplos, nunca no registo ao vivo. A publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
    sources: s("annex", "adr048", "state"),
  },
  {
    id: "pass-is-not-certificate",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["pass da conformance", "pass e certificado", "conformance suite e certificado", "pass conformance certificado", "pass is a certificate"],
    answer:
      "Não. Um PASS da conformance suite é evidência técnica verificável, não um certificado. Não confere estatuto a nenhum operador: no BANZA a participação demonstra-se por evidência, não por certificação central. A publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
    sources: s("adr048", "state", "annex"),
  },
  {
    id: "banzai-cannot-certify",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banzai pode emitir certificado", "banzai emite certificado", "banzai can certify", "banzai certifica"],
    answer:
      "Não. O BanzAI é o agente nativo do protocolo, não normativo: guia, invoca os motores verificáveis, explica regras, documentos e evidência e cita as suas fontes. Não emite certificados, não confere estatuto a nenhum operador e não substitui a conformance suite. BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide — o output de IA nunca é regra do protocolo.",
    sources: s("adr050", "annex"),
  },
  {
    // M2.14F — capabilities & limits. A "o que o BanzAI pode e não pode fazer?" question wants a
    // STRUCTURED answer (pode / não pode / regra prática), not a yes/no "Não…". Authored clean; the
    // emphasis layer bolds the entities; the section headers are literal markdown bold.
    id: "banzai-capabilities",
    critical: true,
    keywords: ["o que o banzai pode e nao pode fazer", "capacidades do banzai", "limites do banzai", "o que o banzai faz", "o que o banzai pode fazer", "o que o banzai nao pode fazer", "what can banzai do", "banzai capabilities"],
    answer:
      "O BanzAI é o agente IA nativo do protocolo BANZA: ajuda a compreender, implementar e verificar o protocolo, mas não cria regras nem substitui os motores verificáveis.\n\n**O que pode fazer:**\n- explicar regras, documentos, ADRs, manifestos, evidência e fluxos do BANZA;\n- orientar operadores a preparar manifestos, evidence bundles e testes de conformidade;\n- invocar ou orientar os motores verificáveis e citar as fontes do protocolo;\n- ajudar a explorar os fluxos demo do Operador Zero (artefactos só de leitura, em KZ_DEMO, sem dinheiro real).\n\n**O que não pode fazer:**\n- certificar, aprovar ou licenciar operadores;\n- substituir a governança, as ADR/RFC ou a conformance suite;\n- criar regra normativa do protocolo;\n- movimentar fundos, executar pagamentos ou operar dinheiro real;\n- transformar KZ_DEMO em dinheiro real.\n\nRegra prática: o BanzAI guia, os motores verificam e a evidência prova — o output de IA nunca é regra do protocolo.",
    sources: s("adr050", "annex"),
  },
  {
    // M2.14I (ADR-036) — BanzAI is the PRIMARY human-operator interface. "qual é o papel do BanzAI?",
    // "o BanzAI é a interface principal?", "o BanzAI substitui os motores?" get this deterministic,
    // on-message answer. It states the primary-interface role AND the boundaries, and carries the
    // 4-clause canonical phrase.
    id: "banzai-role",
    critical: true,
    keywords: [],
    answer:
      "O **BanzAI** é a interface humana primária e transversal para humanos e operadores interagirem com o protocolo **BANZA**.\n\nInterpreta pedidos, consulta a referência, orienta implementação, encaminha para motores verificáveis, explica resultados e ajuda a preparar evidência técnica. Sabe onde estão as capacidades — Guia, Manifest, Conformidade, Trust, Federação, Evidence Bundle, Traces, Referência, Programadores e Repositório — e encaminha para a etapa, documento, motor ou evidência correcta.\n\nMas o **BanzAI** **não** é fonte normativa, não certifica, não aprova operadores, não licencia, não publica operadores e não movimenta fundos, e **não substitui os motores verificáveis**, a evidência técnica ou a governança aberta.\n\nRegra prática: **BanzAI** guia; os motores verificam; a evidência prova; a autoridade competente decide.",
    sources: s("adr050", "annex", "claudeMd"),
  },
  {
    // M2.14I (ADR-036) — BanzAI is the primary interactive interface, but NOT mandatory for machine
    // surfaces. "todos os operadores devem usar o BanzAI?", "as APIs dependem do BanzAI?", "o BanzAI é
    // obrigatório para integração máquina-máquina?" → this answer.
    id: "banzai-not-mandatory",
    critical: true,
    keywords: [],
    answer:
      "Para a experiência interactiva do workbench, o **BanzAI** é a interface primária recomendada para humanos e operadores.\n\nMas o protocolo **BANZA** continua aberto e verificável por APIs, manifests, schemas, endpoints públicos e motores verificáveis — superfícies técnicas independentes da IA. **Integrações máquina-máquina não dependem obrigatoriamente do BanzAI**; qualquer sistema pode verificar o protocolo directamente pelos motores, schemas, manifests e endpoints.\n\nO **BanzAI** é a interface primária humano-operador, não um gatekeeper central nem um requisito de integração máquina-máquina.",
    sources: s("adr050", "annex", "claudeMd"),
  },
  {
    // M2.14I (ADR-036) — who verifies / BanzAI vs the engines. "quem verifica os resultados?", "qual é a
    // diferença entre BanzAI e os motores Rust/WASM?" → this answer.
    id: "banzai-vs-engines",
    critical: true,
    keywords: [],
    answer:
      "Os motores determinísticos **Rust/WASM** (conformidade, trust, verificação de invariantes, geração de evidence bundle) calculam e **verificam** os resultados técnicos. O **BanzAI** orienta, encaminha, invoca quando suportado e **explica** os resultados; a evidência prova.\n\nA diferença: os motores são a autoridade técnica verificável e reproduzível; o **BanzAI** é a interface humana primária que guia até eles — não os substitui nem decide por eles.\n\nRegra prática: **BanzAI** guia; os motores verificam; a evidência prova; a autoridade competente decide.",
    sources: s("adr050", "annex", "conformanceSuite"),
  },
  {
    id: "who-signs-protocol-metadata",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["quem assina a protocol metadata", "quem assina protocol metadata", "quem assina a metadata", "quem assina os metadados", "quem assina metadados do protocolo", "who signs protocol metadata", "assinatura da protocol metadata", "signed protocol metadata quem assina"],
    answer:
      "A **Signed Protocol Metadata** é assinada pela **chave delegada do domínio protocol-metadata**, cuja autoridade rastreia à Raiz de Confiança através do **Manifesto de Chaves** — a raiz assina **apenas** o Manifesto de Chaves, nunca a metadata directamente (INV-ROOT-004; ADR-025). As restantes chaves delegadas assinam os artefactos dos seus domínios: a BRL pela chave do domínio de revogação (INV-ROOT-005) e a evidência de conformidade pelo domínio conformance-evidence. Nenhuma assinatura autoriza operadores, pagamentos ou licenças.",
    sources: s("adr079", "adr038", "annex"),
  },
  {
    id: "what-is-m2-milestone",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["o que e m2", "o que e o m2", "o que e m3", "o que sao m2 e m3", "m2 no banza", "m3 no banza", "what is m2", "milestone m2", "marco m2"],
    answer:
      "«M2» e «M3» eram códigos internos de milestone do projecto — não são conceitos do protocolo e deixaram de ser usados nas superfícies públicas. As condições técnicas reais que representavam permanecem por extenso: a publicação de produção depende da **cerimónia offline da chave raiz** e da **primeira evidência de conformidade de produção publicada**. Nos contratos máquina sobrevivem apenas identificadores técnicos congelados (por exemplo, o estado `M2_PROTOCOL_IMPLEMENTATION` e o `m2_gate_status` calculado pelo motor Rust do protocol gate) — nomes de estados de contrato, não fases públicas do protocolo.",
    sources: s("state", "annex"),
  },
  {
    id: "root-keys",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["onde vivem as root keys", "root keys", "chaves raiz", "issuing keys", "onde estao as chaves"],
    answer:
      "As root keys são offline e controladas por cerimónia; as chaves de emissão de produção também nunca residem na VM de serviço. A infraestrutura serve apenas artefactos públicos assinados e não guarda chaves privadas nem realiza assinatura.",
    sources: s("adr049", "annex"),
  },
  {
    id: "how-to-query-brl",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["como consultar a brl", "consultar brl", "revocation list", "lista de revogacao", "query brl", "revogar chave", "revogacao de chave", "chave de assinatura delegada", "delegated signing key revocation", "revogacao", "revocation", "banza revocation list", "como funciona a revogacao", "operador revogado", "operador suspenso", "revoked operator"],
    answer:
      "A BRL (lista de revogação) é consultada na rota máquina GET /federation/revocation-list.json, servida como JSON pela verification-api. Em pré-produção devolve um envelope honesto (versão, entradas vazias, next_update) sem fingir dados de produção.",
    sources: s("adr048", "annex"),
  },
  {
    id: "empty-operators-meaning",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["operators vazio", "operators vazia", "empty operators", "/operators vazio", "significa operators vazio", "operators mean", "significa /operators", "o que e /operators", "what does /operators mean", "/operators list"],
    answer:
      "Uma /operators vazia significa que nenhum operador publicou evidência verificável. É o estado correto de pré-produção: no BANZA a participação demonstra-se por evidência, não é concedida por autoridade central; a publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
    sources: s("annex", "adr048"),
  },
  {
    id: "banza-processes-payments",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banza processa pagamentos", "banza processes payments", "banza faz pagamentos", "banza executa pagamentos", "banza paga", "processa pagamentos"],
    answer:
      "Não. BANZA não processa pagamentos. É o protocolo que define as regras (invariantes, contratos, conformidade); a execução de pagamentos pertence aos operadores, na infraestrutura deles. A infraestrutura BANZA não tem carteira, ledger de operador, KYC/KYB nem contas de utilizador final.",
    sources: s("annex", "adr019", "claudeMd"),
  },
  {
    id: "banza-limits",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["limites do banza", "limits of banza", "o que banza nao faz", "banza nao tem", "limites banza", "limites do protocolo", "limite do protocolo", "limite de estado", "protocol limits", "postgresql", "postgres", "saldos financeiros", "operador de referencia deixar de operar", "reference operator ceases", "independencia do protocolo", "protocol independence"],
    answer:
      "BANZA não tem carteira, ledger de operador, KYC/KYB, pagamentos, contas de utilizador final nem nomes comerciais de operadores. Qualquer coisa dessa natureza pertence a um operador, noutro lugar. BANZA define apenas as regras do protocolo, conformidade, certificação e federação. O PostgreSQL guarda estado de protocolo (marcador de pré-produção, Registo Técnico), não valor financeiro nem saldos. O protocolo é independente de qualquer operador: se o operador de referência deixar de operar, as especificações, contratos e conformidade do BANZA permanecem disponíveis.",
    sources: s("annex", "claudeMd", "state"),
  },
  {
    id: "financial-invariants",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["invariantes financeiros", "financial invariants", "invariantes do protocolo", "invariantes", "protocol invariants", "inv-ledger", "inv-wallet", "inv-settle", "inv-idem", "inv-recon", "inv-qr", "dupla entrada", "double-entry", "double entry ledger", "ledger de dupla entrada", "razao de dupla entrada", "how does the double-entry ledger work", "codigo qr", "qr code", "pagamento por qr", "resolucao de qr", "resolucao unica", "qr unico", "uso unico", "saldos derivados", "saldo derivado", "derivados do ledger", "ledger-derived", "sem saldo negativo", "saldo da carteira", "saldos das carteiras"],
    answer:
      "As invariantes financeiras são as garantias de integridade do protocolo: INV-LEDGER (dupla entrada, imutabilidade, precisão, atomicidade), INV-WALLET (sem saldo negativo, saldos derivados do ledger), INV-SETTLE (identidade do montante de liquidação), INV-IDEM (segurança de replay/idempotência), INV-RECON (ligação de lançamentos, reconciliação externa) e INV-QR (resolução única, uso único dinâmico, expiração). O ledger de dupla entrada (ADR-012) exige que cada débito tenha um crédito correspondente. Estas invariantes são obrigatórias para qualquer operador; o BanzAI cita as fontes e não as redefine.",
    sources: s("invariants", "adr006", "claudeMd"),
  },
  {
    id: "protocol-decisions-adrs",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["adr 0", "que diz a adr", "o que diz a adr", "decisao arquitetural", "decisoes arquiteturais", "architecture decision", "architecture decision record", "onde estao as decisoes", "lista de adrs", "adrs do banza", "registro de decisoes", "list of adrs", "adr list", "list the adrs", "which adrs", "which adrs govern", "adrs govern"],
    answer:
      "As decisões de arquitetura do BANZA são registadas como ADRs (Architecture Decision Records) em decisions/adr/ e listadas em /decisoes. Cada ADR documenta o contexto, a decisão e as consequências de uma escolha do protocolo. Para o conteúdo de uma ADR específica (por exemplo o ledger de dupla entrada na ADR-012), consulta o documento correspondente em decisions/adr/ — o BanzAI orienta e cita fontes, não reproduz nem reinterpreta o texto normativo.",
    sources: s("adrIndex", "claudeMd"),
  },
  // ── M2.8G grounded entries (ADR-036): non-critical topics that the routing policy sends to the
  // local model by default. `answer` is the source-anchored grounding excerpt AND the deterministic
  // fallback used only if the model fails, times out or is rejected by the validator. ──
  {
    id: "how-to-federate",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "como federar", "como federar um operador", "federar um operador", "federar operador",
      "federacao entre operadores", "como funciona a federacao", "federacao de operadores",
      "operador federar", "pode federar", "como um operador federa", "how to federate",
      "interop", "interoperar", "interoperate",
      "interoperability", "interoperabilidade", "operator to operator", "manifest",
      "manifest de operador", "operator manifest", "manifesto de operador",
    ],
    answer:
      "No BANZA, a participação não é aprovada por uma entidade central; é demonstrada por evidência verificável. Em alto nível, o operador implementa o protocolo, publica o manifest/metadata exigido, disponibiliza os endpoints relevantes, produz evidência de conformidade e permite que outros participantes verifiquem localmente essa evidência antes de interoperar. O BanzAI pode orientar, mas não aprova, não certifica e não decide federação.",
    sources: s("fedQuickstart", "adr040", "adr039"),
  },
  {
    id: "how-to-demonstrate-conformance",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "como demonstrar conformidade", "demonstrar conformidade", "como provar conformidade",
      "provar conformidade", "conformidade como operador", "evidencia de conformidade",
      "como ser conforme", "prova de conformidade", "how to demonstrate conformance",
      "conformance evidence", "demonstrar compatibilidade", "conformidade", "evidence bundle",
      "pacote de evidencias", "pacote de evidencia", "bundle de evidencias", "operador aprovado",
      "aprovado por evidencia", "auto-publicacao", "self-publication", "niveis de certificacao",
      "niveis l0", "l0 a l4", "operador certificado", "evidencia publica", "que evidencia publica",
      // M2.9A fuzz M4 — EN coverage gaps.
      "conformant", "am i conformant", "how do i prove", "prove conformance", "conformance levels",
      "l0 to l4", "tests to pass", "how many tests", "conformance level",
      "quantos testes", "testes preciso passar", "demonstro que sou conforme", "sou conforme",
    ],
    answer:
      "Um operador demonstra conformidade através de uma implementação concreta, por evidência verificável — não por aprovação central. A implementação corre a conformance suite (perfil L0 e seguintes), e o operador publica os artefactos e a evidência de conformidade e disponibiliza os endpoints exigidos, para que qualquer participante verifique localmente essa evidência. Um PASS é evidência técnica, não um certificado; o BanzAI orienta e cita fontes, mas não certifica nem confere estatuto.",
    sources: s("conformanceSuite", "adr039", "adr048"),
  },
  {
    id: "how-trust-works",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "como funciona trust", "como funciona o trust", "trust no protocolo", "modelo de confianca",
      "como funciona a confianca", "confianca no banza", "trust model", "avaliacao de confianca",
      "como funciona o trust no protocolo", "revogacao de operador",
      "revogar operador", "operador revogado", "operator revocation", "revoke an operator",
      "trust evaluation", "open trust", "open trust evaluation", "como funciona trust evaluation",
      "como funciona a avaliacao de confianca", "avaliacao de trust", "fail closed", "fail-closed",
      "metadata assinada", "signed protocol metadata", "trust root", "raiz de confianca",
      // M2.9A fuzz round-7 — evaluation paraphrases.
      "evaluated for trust", "get evaluated for trust", "como sou avaliado", "avaliado quanto a confianca",
    ],
    answer:
      "No BANZA a confiança é avaliada por evidência verificável, sem autoridade certificadora central. Cada participante avalia localmente a metadata assinada do protocolo, o manifest do operador e a evidência de conformidade publicada, aplicando verificações determinísticas (Open Trust Evaluation) que falham em caso de dúvida (fail-closed). Não há CA nem certificados de operador; a interoperabilidade depende de evidência que qualquer parte pode reverificar.",
    sources: s("adr038", "adr040", "annex"),
  },
  // ── M2.9A operational agent entries (ADR-036): practical, operator-facing guidance grounded ONLY in
  // real protocol sources. The routing policy sends these to the local model (Qwen) by default; the
  // `answer` doubles as the grounding excerpt and the deterministic fallback. Non-normative: BanzAI
  // guides — it never certifies, approves, licenses or decides federation. ──
  {
    id: "operator-onboarding",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "onde comeco", "por onde comeco", "por onde comecar", "onde comecar", "como comeco",
      // Third person, the phrasing a reader actually uses when asking about someone else ("por onde
      // começa um operador?"). It was missing, and the question only matched at all because the
      // interrogative "onde" was being counted as topic evidence — so demoting interrogatives to the
      // function words they are exposed the real gap. Completing the conjugation is the fix; keeping a
      // question word as a content signal would have been the crutch.
      "por onde comeca", "onde comeca", "por onde comeca um operador", "onde comeca um operador",
      "como comeca um operador", "como comeco como operador", "comeco com o meu operador",
      "onde comeco com o meu operador",
      "como comecar", "quero comecar", "primeiros passos", "primeiros passos como operador",
      "getting started", "how do i start", "where do i start", "where to start",
      "quero implementar um operador", "quero criar um operador", "quero ser operador",
      "implementar um operador", "criar um operador", "montar um operador", "novo operador",
      "como me torno operador", "onboarding", "onboarding de operador", "operator onboarding",
      "operator quickstart", "quais sao os primeiros passos", "como participo", "como participar",
      "como entro na rede", "quais os passos para operador",
    ],
    answer:
      "No BANZA um operador não é aceite por aprovação central: demonstra conformidade com evidência verificável que qualquer parte pode reverificar. Comece pelo guia de entrada (docs/reference/getting-started.md). Caminho prático:\n" +
      "1) Ler a especificação e os princípios (spec/overview.md e a referência) e conhecer os níveis de conformidade L0–L4.\n" +
      "2) Implementar os contratos/schemas relevantes (contracts/: OpenAPI, QR, eventos) na sua própria infraestrutura, em qualquer tecnologia.\n" +
      "3) Garantir as invariantes financeiras (dupla entrada, valores inteiros sem vírgula flutuante, atomicidade, saldos derivados do ledger, idempotência).\n" +
      "4) Criar o manifesto de DESCOBERTA (JSON servido em /.well-known/banza/operator.json) com operator_id, environment, simulated, production_allowed e capabilities booleanas; validar contra o schema de descoberta publicado (conformance/manifests/schema.json). O manifesto de candidate-submission (com supported_levels e key_manifest_url) pertence ao onboarding (ADR-037) e nunca é servido na rota de descoberta (ADR-029).\n" +
      "5) Correr a conformance suite contra o seu endpoint e gerar o evidence bundle.\n" +
      "6) Publicar o manifest, a metadata assinada do protocolo e a evidência de conformidade num URL estável; os pares correm a Open Trust Evaluation localmente e decidem interoperar.\n" +
      "Neste estado de pré-produção o registo ao vivo /operators não lista operadores e a publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada. O BanzAI pode gerar um manifest ilustrativo ou uma checklist, mas não certifica, não aprova, não licencia e não decide federação; a autorização regulatória pertence à autoridade competente do operador.",
    sources: s("gettingStarted", "fedQuickstart", "conformanceSuite", "opManifestSchema", "adr039", "annex"),
  },
  {
    id: "implementation-steps",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "o que preciso implementar", "o que tenho de implementar", "o que o operador implementa",
      "como implemento o protocolo", "como implementar o protocolo banza", "implementar o protocolo",
      "passos de implementacao", "what must i implement", "what do i implement",
      "operator implementation", "requisitos de implementacao", "o que implemento na minha infra",
      "implementar o ledger", "como implementar o ledger", "implementacao do operador",
      "idempotencia", "idempotency", "ciclo de vida do pagamento", "payment lifecycle",
      "ciclo de vida do qr", "qr lifecycle",
    ],
    answer:
      "Para satisfazer o protocolo, o operador implementa na SUA infraestrutura as invariantes financeiras obrigatórias: INV-LEDGER (dupla entrada — cada débito tem crédito; ledger imutável append-only; valores em unidades menores inteiras, sem vírgula flutuante; lançamento atómico), INV-WALLET (saldos sempre derivados do ledger, sem saldo negativo), INV-SETTLE (identidade bruto = líquido + taxa), INV-IDEM (idempotência/segurança de replay), INV-RECON (ligação e reconciliação de lançamentos) e INV-QR (resolução única, uso único, expiração). O ledger de dupla entrada está na ADR-012; os ciclos de vida de pagamento e de QR estão nas specs. A BANZA não move nem custodia fundos — a camada de implementação e a conformidade pertencem ao operador. O BanzAI explica e cita fontes; não redefine invariantes.",
    sources: s("specOverview", "invariants", "adr006", "claudeMd"),
  },
  // ── M2.8H safe illustrative examples (ADR-036 §examples) — pedagogical, NON-NORMATIVE, derived from
  // the published contracts/schemas. Fictitious `operator.example` domain. An example never certifies,
  // approves or licenses an operator, is never sufficient for production, and never substitutes the
  // conformance suite. `answer` doubles as the model's grounding excerpt and the deterministic fallback. ──
  {
    id: "example-operator-manifest",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de manifesto", "exemplo de manifest", "exemplo de ficheiro manifesto",
      "exemplo de um manifesto", "exemplo de um ficheiro manifesto", "manifest example",
      "example manifest", "example operator manifest", "manifesto de operador exemplo",
      "manifesto em json", "manifest em json", "manifesto exemplo", "da exemplo de manifesto",
      "mostra um manifesto", "como ficaria o manifesto", "exemplo manifesto operador",
      "me da um manifest de operador", "me da um manifesto de operador", "da um manifest de operador",
      "gera um manifest de operador", "gerar um manifest de operador", "mostra um manifest de operador",
      "cria um manifest de operador", "quero um manifest de operador", "um manifest de operador",
      "me da um manifest", "gera um manifest", "mostra um manifest", "manifest de operador exemplo",
      "exemplo de manifest de operador", "exemplo de manifesto de operador",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um manifesto de operador BANZA. Serve apenas de orientação — a forma exacta segue o schema publicado (operator-manifest). Um manifesto não certifica nem activa um operador: em pré-produção `simulated` é true e `production_allowed` não move fundos; a autorização regulatória é validada pela autoridade do operador, nunca pelo BANZA.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"candidate\",\n  \"simulated\": true,\n  \"production_allowed\": false,\n  \"protocol_version\": \"1.0\",\n  \"base_url\": \"https://operator.example\",\n  \"capabilities\": [\"payments\", \"wallet\"],\n  \"supported_levels\": [\"L0\", \"L1\"],\n  \"key_manifest_url\": \"https://operator.example/.well-known/banza/key-manifest.json\",\n  \"operator_regulatory_declaration\": { \"authority\": \"<autoridade-do-operador>\", \"authorised\": false },\n  \"created_at\": null\n}\n```\n\nO domínio `operator.example` é fictício. Um manifesto válido é evidência técnica, não um certificado.",
    sources: s("opManifestSchema", "adr019", "annex"),
  },
  {
    id: "example-federation-manifest",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de federation manifest", "exemplo de manifesto de federacao", "federation manifest example",
      "exemplo de metadata de federacao", "federation metadata example", "manifesto de federacao exemplo",
      "exemplo federacao json",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO da extensão de federação de um manifesto de operador (serve-se em /.well-known/banza/operator.json, a validar contra o schema publicado). Não confere estatuto nem substitui a evidência de conformidade.\n\n```json\n{\n  \"federation_version\": \"1\",\n  \"protocol_metadata_url\": \"https://operator.example/.well-known/banza/signed-protocol-metadata.json\",\n  \"interop_endpoint\": \"https://operator.example/banza/interop\",\n  \"supports_federation\": true,\n  \"cross_operator_routing\": true,\n  \"cross_operator_settlement\": false,\n  \"federation_capabilities\": [\"routing\"]\n}\n```\n\nDomínio `operator.example` fictício. A interoperabilidade depende de evidência verificável, não desta declaração.",
    sources: s("fedManifestSchema", "adr040", "fedQuickstart"),
  },
  {
    id: "example-revocation-list",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de revocation list", "exemplo de brl", "exemplo de lista de revogacao",
      "revocation list example", "brl example", "exemplo brl json", "como e a revocation list",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de uma BANZA Revocation List (BRL). A BRL real é assinada por uma chave delegada de revogação e publicada em https://banza.network/federation/revocation-list.json; em pré-produção vem vazia. É evidência verificável, não uma decisão de autoridade central.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"issuer\": \"banza-revocation\",\n  \"issuer_key_id\": \"<key-id-de-revogacao>\",\n  \"issued_at\": \"2026-01-01T00:00:00Z\",\n  \"expires_at\": \"2026-01-01T06:00:00Z\",\n  \"revoked\": [],\n  \"signature\": \"<assinatura-base64url>\"\n}\n```\n\nOs operadores devem obter uma BRL fresca (≤6h) e não interoperar com operadores nela listados.",
    sources: s("brlSchema", "adr040", "annex"),
  },
  {
    id: "example-key-manifest",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de key manifest", "exemplo de manifesto de chaves", "key manifest example",
      "exemplo key manifest json", "como e o key manifest", "o que e key manifest", "key manifest",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um BANZA Key Manifest — o mecanismo de distribuição do trust anchor, assinado pela Root Key e publicado em https://banza.network/.well-known/banza/key-manifest.json. Uma issuing key que não apareça num Key Manifest válido assinado pela root não é uma chave BANZA. As chaves privadas nunca residem na infraestrutura de serviço.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"published_at\": \"2026-01-01T00:00:00Z\",\n  \"root_key_id\": \"<root-key-id>\",\n  \"root_public_key\": \"<chave-publica-root-base64url>\",\n  \"expires_at\": \"2027-01-01T00:00:00Z\",\n  \"keys\": [ { \"key_id\": \"<issuing-key-id>\", \"domain\": \"protocol-metadata\", \"public_key\": \"<...>\" } ],\n  \"manifest_signature\": \"<assinatura-root-base64url>\"\n}\n```",
    sources: s("keyManifestSchema", "adr049", "annex"),
  },
  {
    id: "example-evidence-bundle",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de evidence bundle", "exemplo de pacote de evidencias", "evidence bundle example",
      "exemplo de evidencia de conformidade", "conformance evidence example", "exemplo evidence json",
      "como e o evidence bundle",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO da forma de um pacote de evidência de conformidade que um operador publica para reverificação. Um PASS é evidência técnica verificável, não um certificado, e não é suficiente para produção nem substitui a conformance suite.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"level\": \"L1\",\n  \"suite_version\": \"1.0\",\n  \"result\": \"PASS\",\n  \"generated_at\": \"2026-01-01T00:00:00Z\",\n  \"artifacts\": [ { \"name\": \"conformance-report\", \"url\": \"https://operator.example/banza/evidence/report.json\" } ],\n  \"signature\": \"<assinatura-base64url>\"\n}\n```\n\nA forma exacta segue o modelo de evidência de federação e os schemas publicados; `operator.example` é fictício.",
    sources: s("evidenceModel", "conformanceSuite", "adr039"),
  },
  {
    id: "example-invalid-manifest",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: [
      "exemplo de manifesto invalido", "manifesto invalido", "exemplo invalido", "invalid manifest example",
      "porque e invalido", "manifest invalido exemplo",
    ],
    answer:
      "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um manifesto INVÁLIDO e porquê. Serve para aprendizagem; não é normativo.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"production\",\n  \"simulated\": false,\n  \"production_allowed\": true\n}\n```\n\nPorque é inválido: (1) faltam campos obrigatórios (protocol_version, base_url, capabilities, supported_levels, key_manifest_url, operator_regulatory_declaration); (2) em pré-produção `simulated` tem de ser true; (3) `production_allowed=true` não move fundos nem é validado pelo BANZA — a autorização pertence à autoridade do operador. Um manifesto nunca certifica nem activa um operador.",
    sources: s("opManifestSchema", "adr019"),
  },
  // M2.12B (ADR-035) — Operador Zero. `critical: true` so the answer is served DETERMINISTICALLY:
  // this is a demo-boundary-sensitive topic (a simulator that must never read as a bank/PSP/certified
  // operator), so the safe, brand-free wording is fixed here rather than left to the local model.
  {
    id: "what-is-operador-zero",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: [
      "operador zero", "o que e o operador zero", "o que e operador zero", "que e operador zero",
      "operador-zero", "operator zero", "operator-zero", "what is operador zero", "what is operator zero",
      "simulador de operador", "simulador de operador de pagamentos", "kz_demo", "kz demo",
      "o operador zero e um banco", "operador zero e um psp", "operador zero e real",
      "operador zero certifica", "adr-052", "adr052", "zero.banza.network",
    ],
    answer:
      "O Operador Zero é a **implementação de referência só de leitura** do protocolo BANZA (demo). Demonstra o protocolo de ponta a ponta — contas, saldos, pagamentos QR, reembolsos, reconciliação, confiança, federação e evidence bundle — na unidade de demonstração KZ_DEMO (sem valor real); é só de leitura, não tem ledger interactivo nem mutável e não se auto-valida. Não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não movimenta dinheiro real; não presta serviços financeiros e não representa autorização, certificação ou licença. Cada artefacto que publica declara demo_only: true, monetary_value: false e production_allowed: false, e nunca aparece em /operators como operador real. Serve para demonstrar e verificar o protocolo de ponta a ponta; a evidência que produz é evidência técnica local, não certificação. Tem superfície própria e dedicada, só de leitura, em zero.banza.network (a antiga rota do apex /operador-zero foi descontinuada e responde 410).",
    sources: s("adr052", "annex"),
  },
  {
    // M2.13A — the DEMO Operator Root is NOT the protocol Trust Root. Kept deterministic because the
    // local model once answered "Sim" (wrong) to this boundary question.
    id: "operador-zero-demo-root-vs-trust-root",
    critical: true,
    keywords: [
      "demo operator root", "demo operador root", "raiz demo do operador zero",
      "demo operator root e a trust root", "operador zero trust root", "operator zero trust root",
      "trust root do protocolo", "raiz demo trust root",
    ],
    answer:
      "Não. A Demo Operator Root do Operador Zero é uma raiz demonstrativa (demo_only): existe apenas para assinar e verificar os artefactos do Operador Zero, a implementação de referência só de leitura — key manifest, revogação, manifest, evidence bundle e traces — na unidade de demonstração KZ_DEMO. NÃO é a Trust Root do protocolo BANZA, não autoriza produção, não certifica nem licencia operadores, e nunca aparece em /operators. A raiz demo declara explicitamente not_protocol_trust_root: true e production_allowed: false. A Trust Root do protocolo BANZA é estabelecida pela cerimónia offline de raiz, sob custódia repartida por limiar (nenhuma entidade isolada a controla; o N-de-M concreto é configuração operacional), descrita no modelo de confiança do protocolo e é independente de qualquer operador. Qualquer verificação que a raiz demo produz é evidência técnica local, não certificação.",
    sources: s("adr052", "adr038"),
  },
  {
    // M2.13A — reconciliation conserves the fictional KZ_DEMO balance.
    id: "operador-zero-reconciliation",
    critical: true,
    keywords: [
      "reconciliacao operador zero", "reconciliacao consistencia", "reconciliacao prova consistencia",
      "como a reconciliacao prova", "reconciliacao ledger ficticio", "reconciliacao kz_demo",
    ],
    answer:
      "A reconciliação do Operador Zero não confia nos saldos: percorre os movimentos desde a posição de abertura e re-deriva o total, em unidades inteiras sem floats (double-entry — cada débito tem o crédito correspondente). No fluxo demo, um pagamento QR de 1500 KZ_DEMO e um reembolso parcial de 500 KZ_DEMO ajustam as contas, e o total fictício de 100 000 KZ_DEMO é conservado na abertura e no fecho. Tudo é KZ_DEMO fictício — monetary_value: false, sem dinheiro real. Uma transacção inválida é recusada antes do movimento, por isso não deixa entradas no ledger. A prova está no motor Rust e no trace, não na resposta do BanzAI: é evidência técnica local, não certificação.",
    sources: s("adr052", "adr006"),
  },
  {
    // M2.13A — a revoked key blocks trust fail-closed (protocol + simulator).
    id: "operador-zero-revocation",
    critical: true,
    keywords: [
      "chave revogada", "chave for revogada", "se a chave for revogada", "revogacao operador zero",
      "revogacao trust", "revoked key trust", "revogacao chave demo",
    ],
    answer:
      "Se uma chave for revogada, o trust é bloqueado — fecho por omissão (fail-closed). No protocolo BANZA a revogação é publicada na BANZA Revocation List (BRL); no Operador Zero, a Demo Operator Root avalia a lista de revogação demo e, se a chave de assinatura estiver revogada, a avaliação de trust devolve blocked e a jornada não progride (nenhuma evidência falsa é produzida). A chave activa não revogada permanece válida apenas como demo; a raiz demo não certifica nem autoriza produção. Isto é verificado pelo motor Rust (assinatura Ed25519 + verificação da lista de revogação), com a chave privada nunca committada — evidência técnica local, não certificação.",
    sources: s("adr052", "brlSchema"),
  },

  // ── M2.14A — Operador Zero demo journey / status / approval-vs-validation (deterministic) ────────
  {
    // M2.14A — "aprovado?" / "foi validado?" — correct the vocabulary: it is DEMO validation, never
    // approval/certification. The word "aprovado" is not a normative state in BANZA.
    id: "operador-zero-approval-vs-validation",
    critical: true,
    keywords: [
      "operador zero aprovado", "operador zero foi aprovado", "operador zero esta aprovado",
      "operador zero foi validado", "operador zero esta validado", "operador zero validado",
      "operator zero approved", "operator zero validated", "operador zero aprovacao",
    ],
    answer:
      "No BANZA **não se usa \"aprovado\" nem \"aprovação\"** como estado — e nada aqui é certificação. O Operador Zero está **avaliado como implementação de referência só de leitura**: a jornada de validação no BanzAI pode ser concluída e isso produz **evidência técnica local**, não aprovação, certificação, licença nem autorização financeira. O Operador Zero é a **implementação de referência (demo, só de leitura)** do protocolo — não é banco, não é PSP, não é carteira, não é operador financeiro licenciado, não movimenta dinheiro real (usa KZ_DEMO) e **nunca aparece em /operators como operador real**. Podes ver o estado técnico em zero.banza.network. O termo correcto é **validação com evidência técnica local** — não aprovação.",
    sources: s("adr052", "annex"),
  },
  {
    // M2.14A — does the Operador Zero appear in /operators? Deterministic: no (real registry stays []).
    id: "operador-zero-in-operators",
    critical: true,
    keywords: [
      "operador zero aparece em operators", "operador zero em /operators", "operador zero /operators",
      "operador zero na lista de operadores", "operador zero consta em operators",
      "operator zero in /operators", "operator zero appears in operators",
    ],
    answer:
      "**Não.** A rota **/operators** é o registo ao vivo de operadores **reais**; neste estado de pré-produção não lista operadores (a baseline honesta do protocolo é `production_certificates: false`). O Operador Zero é a **implementação de referência só de leitura** (demo_only, KZ_DEMO, sem dinheiro real) e **nunca aparece em /operators como operador real** — vive na sua superfície dedicada, só de leitura, **zero.banza.network**, numa zona separada das implementações de referência (demo). As implementações de referência (demo) nunca são misturadas com operadores reais. O seu estado — avaliado como implementação de referência só de leitura — é evidência técnica local, não certificação.",
    sources: s("adr052", "annex"),
  },
  {
    // M2.14A — where do I see the Operador Zero status? Deterministic: zero.banza.network.
    id: "operador-zero-status-where",
    critical: true,
    keywords: [
      "onde vejo o estado do operador zero", "estado do operador zero", "status do operador zero",
      "onde ver o estado do operador zero", "where is operator zero status", "operator zero status",
    ],
    answer:
      "O estado do Operador Zero vê-se em **zero.banza.network** — a sua superfície dedicada, só de leitura, publica o estado técnico ao vivo a partir dos artefactos publicados: **avaliado como implementação de referência só de leitura**, com o estado de cada uma das nove etapas da jornada de validação (Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidence Bundle → Prontidão de certificação), na moeda de demonstração KZ_DEMO, sem dinheiro real (real_money: false), sem produção (production_allowed: false) e não certificação (certification: false). Não há pontuação agregada — o estado é categórico por etapa. É **evidência técnica local** — não certificação, não aprovação nem licença financeira — e o Operador Zero **não aparece em /operators** como operador real.",
    sources: s("adr052", "annex"),
  },
  {
    // M2.14A — how do I use the Operador Zero in BanzAI, and why not load everything at once?
    id: "operador-zero-banzai-journey",
    critical: true,
    keywords: [
      "como uso o operador zero no banzai", "como usar o operador zero", "como comeco o operador zero",
      "operador zero carrega tudo de uma vez", "por que nao carrega tudo de uma vez",
      "operador zero etapa por etapa", "jornada do operador zero no banzai", "proxima etapa depois do manifest",
      "how do i use operator zero in banzai",
    ],
    answer:
      "No BanzAI, o Operador Zero é a implementação de referência que **validas etapa por etapa** — não se carrega tudo de uma só vez. Inicias uma **sessão de validação** (só a identidade: operator-zero, KZ_DEMO, demo_only) e depois percorres a jornada de 9 etapas: **Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidence Bundle → Prontidão de certificação**. Cada etapa expõe apenas os seus ficheiros e só **avança para a seguinte depois de passar** (evidência técnica local), tal como qualquer operador que implementa o protocolo. Não carrega tudo de uma vez porque a evidência tem de ser produzida etapa a etapa. Depois do **Manifesto** seguem-se as **Chaves** e a **Conformidade**. É evidência técnica local, não certificação; o Operador Zero não é operador real e não aparece em /operators. Corre em `/banzai?mode=validation&target=operator-zero&workflow=full` — o Rust decide, o Qwen explica.",
    sources: s("adr052", "annex"),
  },

  // ── M2.13B — basic-question answers (deterministic; served via route.rs critical_entry) ─────────
  {
    id: "protocol-license",
    critical: true,
    keywords: ["qual e a licenca", "licenca do protocolo", "que licenca", "licenca banza", "protocol license", "which license", "licenciamento", "licenca do repo", "licenca do codigo", "e open source", "codigo aberto"],
    answer:
      "O **código** do protocolo BANZA é open source sob a **Apache License 2.0** (ficheiro LICENSE na raiz do repositório, com um NOTICE de atribuição): uma licença permissiva que qualquer operador pode usar para implementar o protocolo. **Distinção de domínios importante:** esta é uma licença de *software* — **não** é uma licença/autorização *financeira*. Não autoriza operar pagamentos nem prestar serviços financeiros; essa autorização pertence às entidades competentes e fica fora do protocolo. As **marcas** (trademarks) também não são concedidas pela licença de código (regidas por NOTICE/TRADEMARKS). O BANZA não licencia, aprova nem certifica operadores.",
    sources: s("license", "notice"),
  },
  {
    // M2.13C-A — the FINANCIAL/regulatory authorisation domain, kept apart from the software licence.
    id: "financial-authorization",
    critical: true,
    keywords: ["licenca financeira", "autorizacao financeira", "autorizacao regulatoria", "licenca de operador", "operador precisa de licenca", "quem licencia um operador", "o banza licencia operadores", "regulador", "entidade competente", "apache autoriza pagamentos", "financial license", "financial authorization", "does an operator need a license"],
    answer:
      "**Não** — e é importante separar dois domínios. (1) A licença do **código** do protocolo é a **Apache-2.0** (open source): permite implementar o protocolo, mas **não substitui** uma licença ou autorização *financeira*. (2) A **autorização financeira/regulatória** (por exemplo perante o banco central ou a entidade competente, para operar pagamentos ou prestar serviços financeiros) é responsabilidade do **próprio operador**, perante as autoridades competentes, e fica **fora do protocolo BANZA**. O BANZA **não emite licenças financeiras, não licencia, não aprova e não certifica operadores**; no protocolo, a participação técnica demonstra-se por **evidência de conformidade verificável**, não por uma licença concedida por uma autoridade central.",
    sources: s("gettingStarted", "adr018", "adr019"),
  },
  {
    // M2.13C-B — institutional ORIGIN of the protocol: original creator, historical creation date,
    // initial maintainer, open governance. A historical/attribution fact — never operational authority.
    id: "protocol-origin",
    critical: true,
    keywords: ["quem criou o banza", "quem fundou o banza", "quem e o criador", "criador original", "quem desenvolveu o banza", "quem disponibilizou o banza", "origem do banza", "origem institucional", "quando foi criado o banza", "data de criacao do banza", "em que dia o banza foi criado", "quem criou o banza e quando", "quem mantem o banza", "mantenedor institucional inicial", "quem e dono do banza", "relacao entre banzami e banza", "a banzami criou o banza", "who created banza", "who founded banza", "who originally created", "original creator of banza", "when was banza created", "banza creation date", "who owns banza", "initial maintainer", "institutional origin"],
    answer:
      "O **BANZA** foi originalmente criado em **01/08/2025 (1 de agosto de 2025)** pela **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, indicada como criadora original e mantenedora institucional inicial. Essa é a **origem institucional/histórica** do protocolo — a data de criação/disponibilização inicial, **não** uma data de produção, certificação, autorização financeira nem de operador activo. Hoje o BANZA é disponibilizado como **protocolo financeiro aberto (open source)** e a sua evolução decorre **publicamente no repositório**, através de governança, issues, pull requests, revisões, ADRs, RFCs, specs e releases. Essa origem **não** significa que a entidade criadora aprove, certifique, licencie ou controle operadores, nem que seja operador ou PSP: os operadores são independentes e as autorizações financeiras ficam fora do protocolo.",
    sources: s("notice", "maintainers", "readme"),
  },
  {
    id: "banza-stack-language",
    critical: true,
    keywords: ["em que linguagem foi criado", "que linguagem de programacao", "linguagem de programacao", "programming language", "que stack", "qual a stack", "tecnologia usada", "que tecnologias"],
    answer:
      "A stack do BANZA é **Rust-first para os motores oficiais** (ADR-038): conformidade, trust/crypto, invariantes, a implementação de referência Operador Zero e o motor de conhecimento do BanzAI são em **Rust** (compilado para WASM quando corre no browser/Node). O **website** (incluindo a superfície de referência só de leitura do Operador Zero e o routing) é **TypeScript/React/Next.js**; os artefactos são **JSON**; os guards são shell + o binário Rust banza-repo-guards; a orquestração usa Bash. O TypeScript/JS é só UI/glue.",
    sources: s("rustPolicy", "readme"),
  },
  // ── M2.14C-FIX2 — short technology / stack terms resolve deterministically (never no_source). The
  //    entity emphasis layer bolds Rust/WASM/BANZA/BanzAI/… on render; answers are authored clean and
  //    stay operator-neutral + Rust-first accurate (ADR-038). Package/binary/infra identifiers are in
  //    inline code so they are never re-formatted.
  {
    id: "def-rust", critical: true,
    deterministic: true,
    keywords: ["rust", "linguagem rust", "rust no banza", "rust language"],
    answer:
      "Rust é a linguagem principal dos motores oficiais do BANZA — a regra do projecto é Rust-first (ADR-038): conformidade, trust/crypto, invariantes, validação, a implementação de referência Operador Zero e o motor de conhecimento do BanzAI. Quando precisam de correr no browser ou no Node.js, esses motores compilam para WASM. TypeScript/React/Next.js ficam sobretudo em website, UI e glue — não como motor crítico.",
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-wasm", critical: true,
    deterministic: true,
    keywords: ["wasm", "webassembly", "web assembly", "compilado para wasm"],
    answer:
      "WASM (WebAssembly) é o alvo de compilação dos motores Rust do BANZA para correrem no browser e no Node.js. O mesmo código Rust-first (ADR-038) — por exemplo o motor de conhecimento do BanzAI e a implementação de referência Operador Zero — serve o servidor e o cliente sem reescrever a lógica crítica.",
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-typescript", critical: true,
    deterministic: true,
    keywords: ["typescript", "javascript", "ts", "js"],
    answer:
      "TypeScript (e JavaScript) é usado sobretudo na camada de website, UI e glue do BANZA (React/Next.js). A regra do projecto é Rust-first (ADR-038): a lógica crítica fica em Rust; TypeScript/JS é UI/glue, nunca motor crítico.",
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-web-frontend", critical: true,
    deterministic: true,
    keywords: ["react", "next.js", "nextjs", "next js", "frontend", "framework do website"],
    answer:
      "React e Next.js formam a framework do website do BANZA (em TypeScript) — a camada de UI/glue, incluindo o laboratório do Operador Zero e o routing. Não são motores críticos: esses são Rust-first (ADR-038).",
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-json-format", critical: true,
    deterministic: true,
    keywords: ["json", "formato json", "artefactos json"],
    answer:
      "JSON é o formato dos artefactos do BANZA: manifests de operador, evidence bundles, fixtures do Operador Zero e payloads de contrato. É dados, não lógica — a lógica crítica é Rust-first (ADR-038).",
    sources: s("readme", "rustPolicy"),
  },
  {
    id: "def-bash-shell", critical: true,
    deterministic: true,
    keywords: ["bash", "shell", "shell script", "scripts"],
    answer:
      "Bash orquestra os scripts e os guards do BANZA (por `make` e no CI). A lógica dos gates de higiene do repositório vive em Rust (o binário `banza-repo-guards`); o shell é apenas o invólucro fino (ADR-038).",
    sources: s("rustPolicy", "guardsDir"),
  },
  {
    id: "def-node", critical: true,
    deterministic: true,
    keywords: ["node", "node.js", "nodejs"],
    answer:
      "Node.js corre o serviço `banzai-api` e carrega os motores Rust compilados para WASM. A lógica crítica continua Rust-first (ADR-038); Node/TypeScript é runtime e glue, não motor.",
    sources: s("rustPolicy", "readme"),
  },
  // M2.19C — the three-layer institutional architecture, served deterministically (Rust decides;
  // route.rs::critical_entry → def-three-layer-architecture). Canonical wording tracks ADR-004.
  {
    id: "def-three-layer-architecture", critical: true,
    deterministic: true,
    keywords: ["tres camadas", "arquitectura institucional", "arquitetura institucional", "three-layer", "camadas do banza"],
    answer:
      "A arquitectura institucional do BANZA tem três camadas, separadas por responsabilidade, infraestrutura e chaves:\n\n1. **Camada 1 — Protocolo BANZA**: o protocolo financeiro aberto e neutro (regras, contratos, invariantes, perfis, identidade técnica, metadados assinados, trust, revogação, registo técnico, federação e verificação pública). Não é banco, PSP, carteira, EMI nem operador; não detém nem move fundos.\n2. **Camada 2 — Certificação de Conformidade e Interoperabilidade**: certifica, por implementação, que uma implementação demonstrou conformidade e interoperabilidade com um perfil público e versionado — baseada em evidência, decidida por Rust, com âmbito e validade limitados e sujeita a revogação. Não é licença, não é admissão a scheme e não é autorização regulatória.\n3. **Camada 3 — Esquemas operacionais independentes**: esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações. O primeiro é o Esquema Operacional Banzami, com a Banzami como operadora designada do esquema, condicionado ao enquadramento regulatório aplicável; os fundos reais permanecem desactivados até existir evidência formal.\n\nO BanzAI é a interface humana transversal às três camadas — não uma quarta autoridade. O Rust compreende, encaminha, executa, valida e decide; o Qwen local explica.",
    sources: s("adr059"),
  },
  // M2.19C — the L3 Operational Scheme (ADR-006), deterministic; distinct from the entity Banzami.
  {
    id: "def-operational-scheme", critical: true,
    deterministic: true,
    keywords: ["banzami operational scheme", "operational scheme", "scheme operacional", "operador designado"],
    answer:
      "O Banzami Operational Scheme é a primeira concretização da Camada 3 (esquemas operacionais independentes) da arquitectura do BANZA: um scheme operacional construído sobre o protocolo, com a Banzami — Tecnologia e Serviços, Lda. como operadora designada. Está condicionado à obtenção do enquadramento regulatório aplicável — o estado é `REGULATORY_AUTHORIZATION_IN_PROGRESS` e os fundos reais, carteiras, liquidação e participantes reais permanecem desactivados (fail-closed) até existir evidência formal. É distinto do protocolo: BANZA ≠ Banzami. A certificação BANZA não é exclusiva deste scheme, e a continuidade do protocolo não depende da continuidade comercial do scheme.",
    sources: s("adr060", "adr062"),
  },
  // M2.19D — the L2 conformance & interoperability certification concept (ADR-032/065/066), deterministic.
  {
    id: "def-l2-certification", critical: true,
    deterministic: true,
    keywords: ["certificacao de conformidade e interoperabilidade", "certificacao tecnica", "certification record", "certified implementation", "certification profile", "technical registry"],
    answer:
      "A **Certificação de Conformidade e Interoperabilidade** é a Camada 2 do BANZA: certifica **tecnicamente** que uma *implementação* (identificada pelo hash do artefacto) demonstrou conformidade e interoperabilidade contra um perfil público e versionado. O resultado é um registo decidido por Rust, vinculado a evidência e hash, com âmbito e validade limitados, e sujeito a expiração, suspensão, revogação e supersession (a renovação é sempre um registo novo). Certifica uma **implementação**, nunca uma entidade. **Não** é licença, **não** é autorização regulatória e **não** é admissão a scheme — a certificação nunca implica admissão e a admissão nunca implica autorização. Os registos são publicados no **Registo Técnico** do BANZA, verificável por qualquer terceiro sem conta e independente do directório de participantes de um scheme.",
    sources: s("adr064", "adr065", "adr066"),
  },
  {
    id: "def-qwen", critical: true,
    deterministic: true,
    keywords: ["qwen", "modelo local", "inferencia local", "local model"],
    answer:
      "Qwen é o modelo de linguagem local do BanzAI (ADR-036): corre on-host, sem chamadas externas — external_model_called permanece false. As respostas determinísticas nem sequer usam o modelo; o Qwen só é invocado para perguntas fundamentadas que precisam de geração.",
    sources: s("adrLocalInference", "readme"),
  },
  {
    id: "def-postgresql", critical: true,
    deterministic: true,
    keywords: ["postgresql", "postgres", "base de dados"],
    answer:
      "PostgreSQL é o armazenamento de estado do protocolo no BANZA (ADR-013), não uma base de dados financeira: não guarda saldos reais nem movimenta fundos. É um detalhe de infraestrutura interno, não exposto publicamente.",
    sources: s("adrPostgres"),
  },
  {
    id: "def-pgvector", critical: true,
    deterministic: true,
    keywords: ["pgvector", "indice vectorial", "vector index"],
    answer:
      "pgvector é a extensão de índice vectorial usada pelo indexador do BANZA para pesquisa semântica sobre a documentação do protocolo. É um detalhe de infraestrutura interno (ADR-013).",
    sources: s("adrPostgres"),
  },
  {
    id: "def-nginx", critical: true,
    deterministic: true,
    keywords: ["nginx", "reverse proxy", "proxy"],
    answer:
      "nginx é o reverse-proxy que serve o BANZA na mesma origem (website mais `banzai-api`). É um detalhe de infraestrutura; não altera nenhuma regra do protocolo.",
    sources: s("infraRunbook", "rustPolicy"),
  },
  {
    id: "def-docker", critical: true,
    deterministic: true,
    keywords: ["docker", "compose", "containers", "implantacao"],
    answer:
      "O BANZA é implantado com Docker (compose) a partir de um bundle reprodutível com tags de imagem fixas. É um detalhe de infraestrutura de implantação, não uma regra do protocolo.",
    sources: s("infraRunbook", "rustPolicy"),
  },
  {
    id: "def-banzai-agent", critical: true,
    deterministic: true,
    keywords: ["banzai", "o que e banzai", "what is banzai", "agente banzai"],
    answer:
      "BanzAI é a interface humana primária e transversal entre humanos/operadores e o protocolo BANZA (ADR-036): interpreta pedidos, consulta a referência, orienta a implementação, encaminha para os motores verificáveis e explica os resultados. Guia, invoca os motores e cita fontes; não decide, não certifica, não aprova operadores, não licencia, não publica operadores e não movimenta fundos. Corre um modelo local (Qwen) on-host, sem chamadas externas. É distinto do BANZA (o protocolo) e do Banzami (a organização). BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.",
    sources: s("readme", "rustPolicy"),
  },
  {
    id: "operador-zero-language",
    critical: true,
    keywords: ["em que linguagem foi criado o operador zero", "linguagem do operador zero", "operador zero linguagem", "operator zero language", "que linguagem operador zero"],
    answer:
      "O Operador Zero tem o **motor/core em Rust** (`engines/operator-zero-core` — ledger fictício KZ_DEMO, trust demo, federação demo, evidence, traces; e `engines/operator-zero-e2e-root` para a raiz de assinatura Ed25519 demo). A **interface** (o laboratório interactivo) é **TypeScript/React/Next.js** em `website/`, com routing no middleware. Os **artefactos** são **JSON**. Não foi \"criado em português\" — o português é apenas a língua da UI e da documentação.",
    sources: s("ozEngine", "ozLab", "adr052"),
  },
  {
    id: "operador-zero-files",
    critical: true,
    keywords: ["que ficheiros implementam o operador zero", "ficheiros do operador zero", "onde esta implementado o operador zero", "files implement operator zero", "codigo do operador zero", "que ficheiros fazem o operador zero"],
    answer:
      "O Operador Zero é implementado por: **motor Rust** `engines/operator-zero-core` (ledger/trust/federação/evidence/traces) e `engines/operator-zero-e2e-root` (raiz de assinatura Ed25519 demo); **artefactos** em `examples/operators/zero/` (manifest, key-manifest, revocation-list, evidence-bundle, traces, ledger, payments) e `examples/operators/zero/e2e-root/`; **website** `website/components/operador-zero/OperadorZeroReference.tsx` (superfície só de leitura) + `website/app/(pt)/oz/` (rota interna) + `website/lib/operadorZero*.ts`; a validação corre no **modo de validação do BanzAI** (`/banzai?mode=validation`), integrado em `website/components/banzai/BanzaiValidationMode.tsx`, executada pelos motores Rust; **routing** `website/middleware.ts` + `website/lib/zeroSubdomain.ts` (zero.banza.network); **guards** `tools/check-operator-zero*.sh` + `tools/check-zero-subdomain*.sh`; **decisões** ADR-035 e ADR-035; **relatórios** em `docs/quality/M2_12*`, `M2_13A*` e `M2_19EF*`.",
    sources: s("ozEngine", "ozLab", "ozMiddleware", "adr052"),
  },
  {
    // M2.13B — WHERE Operador Zero lives. Deterministic so cache/stale answers can never say it lives
    // at the retired apex /operador-zero. Canonical surface = zero.banza.network.
    id: "operador-zero-location",
    critical: true,
    keywords: ["onde vive o operador zero", "onde esta o operador zero", "onde fica o operador zero", "where does operator zero live", "url do operador zero", "endereco do operador zero"],
    answer:
      "O Operador Zero vive na sua superfície própria e dedicada **zero.banza.network** — um subdomínio standalone, com shell próprio (sem o cabeçalho/nav/rodapé globais do BANZA). Os endpoints demonstrativos vivem na raiz desse subdomínio. A antiga rota do apex **/operador-zero foi descontinuada e responde 410 Gone** (não redirecciona, não renderiza). Não uses /operador-zero como fonte nem fallback.",
    sources: s("ozMiddleware", "adr052"),
  },
  {
    // M2.13B — does /operador-zero still exist? Deterministic, unambiguous: no, 410 Gone.
    id: "operador-zero-apex-status",
    critical: true,
    keywords: ["o operador-zero ainda existe", "operador-zero ainda existe", "a rota operador zero ainda existe", "operador zero foi descontinuado", "operador-zero 410", "does /operador-zero still exist"],
    answer:
      "Não. A rota do apex **/operador-zero foi descontinuada** e responde **410 Gone** — não redirecciona e não renderiza o laboratório. A superfície canónica do Operador Zero é agora **zero.banza.network** (subdomínio standalone). O BanzAI nunca usa /operador-zero como rota, fonte ou fallback.",
    sources: s("ozMiddleware", "adr052"),
  },

  // ── M2.13B PR2 — repository-wide technical answers (deterministic; cite real repo paths). Backed by
  // the Rust repo-wide index; served via route.rs critical_entry so they never fall into no_source. ──
  {
    id: "banzai-language",
    critical: true,
    keywords: ["em que linguagem foi criado o banzai", "linguagem do banzai", "que linguagem banzai", "banzai language", "banzai foi criado em", "que stack o banzai"],
    answer:
      "O BanzAI é **Rust-first** (ADR-038): os motores oficiais são em **Rust** compilado para **WASM**. O runtime canónico vive **neste repositório** (`banza-protocol/banza`): `engines/banzai-query-core` (routing, resolução, recuperação, fundamentação e validação) e `engines/banzai-api-kb` (que o re-exporta e o compila para WASM), mais `engines/banzai-doc-indexer` e `engines/banzai-repo-indexer` (indexação) — todos Rust. A **camada de serviço/glue** (`services/banzai-api`) é **TypeScript/Node** — apenas I/O e transporte, sem lógica de motor. O desenvolvimento activo do BanzAI reside inteiramente neste monorepo (ADR-036); não existe um repositório BanzAI separado.",
    sources: s("rustPolicy", "banzaiApiKb", "banzaiCore"),
  },
  {
    id: "banzai-retrieval",
    critical: true,
    keywords: ["como funciona o retrieval do banzai", "retrieval do banzai", "como o banzai recupera", "banzai retrieval", "como o banzai encontra fontes", "como o banzai procura"],
    answer:
      "O retrieval do BanzAI é **determinístico e em Rust** (`engines/banzai-api-kb`, WASM). Fluxo por pergunta: (1) `route()` decide a via — fronteira de acção → recusa determinística, intenção crítica → resposta vetada, pergunta com fontes → modelo local, sem fonte → \"evidência insuficiente\"; (2) para perguntas com fundamento, pontua as entradas curadas (`retrieveTopK`) e enriquece com excertos reais do **índice documental** e do **índice repo-wide** (`banzai-repo-indexer`: BANZA + BanzAI, com categoria e caminho); (3) o `pipeline.js` (glue) monta o contexto e chama o modelo **local** (local_qwen). A pontuação/ordenação é toda Rust; o JS é só I/O.",
    sources: s("banzaiApiKb", "repoIndexer", "pipelineJs"),
  },
  {
    id: "how-banzai-answers",
    critical: true,
    keywords: ["como o banzai sabe responder", "como o banzai responde", "de onde vem a resposta do banzai", "como o banzai gera a resposta", "how does banzai know"],
    answer:
      "O BanzAI responde a partir de conhecimento **curado + indexado do repositório**, nunca de opinião. Primeiro, a fronteira de acção e a fronteira crítica (Rust, `route.rs`) decidem se a pergunta é recusada ou tem resposta vetada determinística. Se for uma pergunta legítima com fundamento, o motor Rust recupera as fontes (entradas curadas + índice repo-wide de ambos os repositórios) e o modelo **local** (local_qwen) redige a resposta ancorada nessas fontes citáveis. Não há chamadas externas (`external_model_called=false`) e o modelo nunca decide a via.",
    sources: s("banzaiApiKb", "repoIndexer", "pipelineJs"),
  },
  {
    id: "banzai-external-calls",
    critical: true,
    keywords: ["o banzai usa chamadas externas", "banzai chamadas externas", "o banzai chama api externa", "banzai external calls", "o banzai envia dados para fora", "banzai usa openai", "o banzai usa a nuvem"],
    answer:
      "**Não.** O BanzAI corre inteiramente na infraestrutura do protocolo com um modelo **local** (local_qwen via llama.cpp interno) e **não faz chamadas a modelos externos** — `external_model_called` é sempre `false`. O núcleo Rust (`engines/banzai-query-core`, compilado para WASM em `engines/banzai-api-kb`) é determinístico, sem LLM, sem rede e sem GPU. Nenhum dado da pergunta sai do host para um provedor externo.",
    sources: s("providerJs", "banzaiCore", "rustPolicy"),
  },
  {
    id: "action-boundary-location",
    critical: true,
    keywords: ["onde esta definido o action boundary", "onde esta a fronteira de acao", "onde vive o action boundary", "action boundary definido", "onde esta a fronteira de accao", "where is the action boundary"],
    answer:
      "A fronteira de acção (Action Boundary) está definida em **Rust**, em `engines/banzai-query-core/src/route.rs`, na função `action_boundary` (Tier 0.5 de `route()`), que devolve uma recusa determinística com `intent=action_boundary` para pedidos perigosos — nunca chamando o modelo. É verificada pelo guard `tools/check-banzai-action-boundary.sh` (`make banzai-action-boundary-check`) e servida pelo `pipeline.js`.",
    sources: s("routeRs", "actionGuard"),
  },
  {
    id: "guards-banzai",
    critical: true,
    keywords: ["que guards protegem o banzai", "guards do banzai", "quais guards do banzai", "banzai guards", "que checks protegem o banzai"],
    answer:
      "O BanzAI é protegido por vários guards (`make`, verificados em CI): `banzai-action-boundary-check` (recusas determinísticas), `banzai-repo-knowledge-safety-check` (índice/KB sem segredos), `banzai-repository-wide-knowledge-check` (cobertura repo-wide), `banzai-qwen-routing-check` (routing Qwen-first), `banzai-agent-quality-check`, `banzai-knowledge-quality-check`, `banzai-document-aware-agent-check`, `banzai-document-explanation-quality-check`, `banzai-local-inference-check`, `banzai-public-interface-check` e `banzai-release-qa-check`, mais os guards partilhados `identity-check`, `purity-check`, `rust-rule-check` e `private-key-leak-check`. Os scripts estão em `tools/check-banzai-*.sh`.",
    sources: s("actionGuard", "repoSafetyGuard", "repoKnowledgeGuard"),
  },
  {
    id: "guards-operador-zero",
    critical: true,
    keywords: ["que guards protegem o operador zero", "guards do operador zero", "quais guards do operador zero", "operador zero guards", "que checks protegem o operador zero"],
    answer:
      "O Operador Zero é protegido por sete guards (`make`, em CI): `operator-zero-check` (invariantes do motor), `operator-zero-vocabulary-contract-check`, `operator-zero-public-hardening-check`, `operator-zero-standalone-surface-check`, `operator-zero-full-e2e-check` (validação E2E Ed25519), `zero-subdomain-routing-check` e `zero-subdomain-design-check`. Todos garantem que o OZ permanece `demo_only`/`KZ_DEMO`, nunca em `/operators`, nunca certifica, e que `zero.banza.network` é a superfície canónica. Scripts em `tools/check-operator-zero*.sh` e `tools/check-zero-subdomain*.sh`.",
    sources: s("adr052", "repoKnowledgeGuard"),
  },
  {
    id: "norm-vs-implementation",
    critical: true,
    keywords: ["diferenca entre norma e implementacao", "norma vs implementacao", "diferenca norma implementacao", "normativo vs implementacao", "o que e norma e o que e implementacao", "difference between norm and implementation"],
    answer:
      "No BANZA, a **norma** (normativo) define *o que é correcto* — as regras do protocolo: referência, especificações, contratos, schemas, invariantes e RFCs normativos (em `docs/reference`, `spec/`, `contracts/`). A **implementação** é *como* um operador ou o próprio ecossistema cumpre a norma — o código: motores Rust (`engines/`), o website (`website/`), guards e CI. A norma é operator-neutral e vem primeiro (ADR-001: protocolo antes do produto); a implementação consome a norma. O BanzAI classifica as fontes por categoria (`normative` vs `implementation`) precisamente para não confundir regra com código.",
    sources: s("specOverview", "rustPolicy", "gettingStarted"),
  },
  {
    id: "operator-zero-crate",
    critical: true,
    keywords: ["que crate rust valida o operador zero", "crate que valida o operador zero", "que crate valida o operador zero", "qual crate rust do operador zero", "rust crate operator zero"],
    answer:
      "O Operador Zero é validado pelo crate Rust **`engines/operator-zero-core`** (ledger fictício KZ_DEMO com conservação e reconciliação re-derivada, trust demo, federação demo, evidence, traces e fronteira fail-closed), complementado por **`engines/operator-zero-e2e-root`** (raiz de assinatura Ed25519 demo para a validação E2E — chave privada nunca committada). A verificação corre em `make operator-zero-check` e `make operator-zero-full-e2e-check`.",
    sources: s("ozEngine", "ozE2eRoot", "adr052"),
  },
  {
    id: "banzai-index-crate",
    critical: true,
    keywords: ["que crate rust indexa o conhecimento do banzai", "crate que indexa o banzai", "qual crate indexa o conhecimento", "que crate faz o indice do banzai", "rust crate indexes banzai knowledge"],
    answer:
      "O conhecimento repo-wide do BanzAI é indexado pelo crate Rust **`engines/banzai-repo-indexer`**: percorre o monorepo BANZA (que desde a ADR-036 inclui o runtime e os motores BanzAI), aplica exclusões de segurança, classifica cada ficheiro em 12 categorias, faz chunking por tipo e emite `banzai-repo-index.json` + manifesto/cobertura/exclusões/segurança. A documentação do protocolo é indexada por **`engines/banzai-doc-indexer`**, e o motor de **retrieval/scoring** que consome os índices é **`engines/banzai-api-kb`** (WASM).",
    sources: s("repoIndexer", "docIndexer", "banzaiApiKb"),
  },
  {
    id: "zero-endpoints",
    critical: true,
    keywords: ["que endpoints existem no zero.banza.network", "endpoints do zero.banza.network", "endpoints do operador zero", "quais endpoints zero banza network", "que endpoints tem o operador zero", "zero.banza.network endpoints"],
    answer:
      "O `zero.banza.network` serve dez endpoints JSON demonstrativos na raiz do subdomínio: `manifest`, `key-manifest`, `revocation-list`, `conformance/evidence`, `federation/metadata`, `evidence-bundle`, `traces/full-e2e`, `ledger/demo`, `payments/demo-qr` e `payments/demo-refund` (cada um servido como `/<nome>.json`; POST devolve 405, desconhecido 404). São artefactos `demo_only` em KZ_DEMO fictício — o OZ nunca aparece em `/operators`. O routing host-aware está em `website/lib/zeroSubdomain.ts` + `website/middleware.ts`.",
    sources: s("zeroSub", "adr052"),
  },
  {
    id: "zero-middleware-files",
    critical: true,
    keywords: ["que ficheiros implementam o middleware do zero.banza.network", "ficheiros do middleware zero", "middleware do zero banza network", "que ficheiros fazem o routing do zero", "middleware files zero banza network"],
    answer:
      "O routing/middleware do `zero.banza.network` é implementado por: **`website/middleware.ts`** (intercepta por `Host`, reescreve `/`→`/oz` e `/<art>.json`→`/oz/<art>.json`, e redirecciona `/banzai*` para o apex); **`website/lib/zeroSubdomain.ts`** (a lógica pura `resolveZeroRoute`, incluindo os tipos `gone` para o apex `/operador-zero` a 410 e `notfound`); e a superfície própria em **`website/app/(pt)/oz/`** (`page.tsx` + `[...artifact]/route.ts`). É verificado por `make zero-subdomain-routing-check`.",
    sources: s("ozMiddleware", "zeroSub", "ozApp"),
  },

  // ── M2.13C — answer-quality gap fixes (deterministic; served via route.rs critical_entry) ────────
  {
    id: "notice-content",
    critical: true,
    keywords: ["o que diz o notice", "que diz o notice", "conteudo do notice", "ficheiro notice", "what does the notice say", "notice do protocolo"],
    answer:
      "O ficheiro **NOTICE** (junto à licença Apache-2.0) contém a **atribuição** do projecto: identifica o criador original e mantenedor institucional inicial e as notas de direitos de autor, como exige a Apache-2.0. **Não concede marcas** — o uso de marcas (trademarks) é regido separadamente por NOTICE/TRADEMARKS, não pela licença de código. A licença de código é permissiva (qualquer operador pode implementar o protocolo); a marca não.",
    sources: s("notice", "governanceProc"),
  },
  {
    id: "rust-crates",
    critical: true,
    keywords: ["que crates rust existem", "quais crates rust", "crates rust do repo", "que crates rust no repo", "rust crates in the repo", "lista de crates rust", "que motores rust existem"],
    answer:
      "Os motores oficiais são Rust (ADR-038), em `engines/`. Entre os crates: **`banzai-api-kb`** (retrieval + routing + fronteira de acção, WASM), **`banzai-repo-indexer`** (indexador repo-wide), **`banzai-doc-indexer`** (indexador da documentação), **`operator-zero-core`** e **`operator-zero-e2e-root`** (motor + raiz Ed25519 demo do Operador Zero), **`banza-repo-guards`** (gates de pureza/contaminação), **`banza-trust`**/**`banza-conformance`** e afins. TypeScript/React é só UI/glue.",
    sources: s("enginesDir", "rustPolicy"),
  },
  {
    id: "how-banzai-refuses",
    critical: true,
    keywords: ["como o banzai decide quando recusar", "como o banzai decide recusar", "como o banzai recusa", "quando o banzai recusa", "como decide recusar um pedido", "how does banzai decide to refuse"],
    answer:
      "O BanzAI decide recusar de forma **determinística, em Rust**, antes de qualquer geração: em `engines/banzai-query-core/src/route.rs`, o `route()` avalia primeiro a fronteira de segurança e depois a **fronteira de acção** (`action_boundary`, Tier 0.5). Se o pedido é uma acção destrutiva ou de autoridade (apagar docs, remover guards/bypass CI, alterar Trust Root, publicar/certificar operador, expor/gerar segredos, dinheiro real, reintroduzir a rota descontinuada do apex /operador-zero — que responde 410, superfície canónica é zero.banza.network —, infra destrutiva), devolve `intent=action_boundary` com uma recusa vetada e uma alternativa segura — **nunca chama o modelo (Qwen)**. É verificado por `make banzai-action-boundary-check`.",
    sources: s("routeRs", "actionGuard"),
  },
  {
    id: "who-implements-protocol",
    critical: true,
    keywords: ["quem implementa o protocolo", "quem implementa o banza", "quem constroi o protocolo", "who implements the protocol", "quem faz a implementacao do protocolo", "tem de ser em rust", "obrigatoriamente rust", "implementacoes em rust", "precisa de rust", "banza exige rust", "implementacoes banza rust", "linguagem obrigatoria"],
    answer:
      "O protocolo BANZA é a **norma** (operator-neutral); quem o **implementa** são os **operadores** — qualquer operador pode implementá-lo em qualquer linguagem/stack que satisfaça os invariantes. O BANZA define as regras (contracts, spec, invariantes, conformidade); não é ele próprio um operador nem um PSP. O desenvolvimento é protocol-first (a norma vem antes do produto do operador — ADR-001). O Operador Zero é apenas a **implementação de referência** (demo, só de leitura), não um operador real.",
    sources: s("specOverview", "adr018", "adr005"),
  },
  {
    id: "guards-secret-leak",
    critical: true,
    keywords: ["que guards impedem fuga de private key", "que guard impede fuga de chave", "guard de private key", "que impede vazamento de chave", "private key leak guard", "que guard protege segredos"],
    answer:
      "A fuga de material secreto é impedida por **`make private-key-leak-check`** (`tools/check-private-key-leak.sh`): bloqueia blocos PEM de chave privada, ficheiros de chave/segredo committados, passphrases em texto e tokens de segredo. Complementa-o o **indexador repo-wide**, que faz um scan de conteúdo fail-closed (só salta chaves PEM armored reais) e o **`banzai-repo-knowledge-safety-check`**, que prova que a KB e o índice não têm segredos. Além disso, o `action_boundary` recusa pedidos para expor/gerar segredos.",
    sources: s("leakGuard", "repoIndexer", "repoSafetyGuard"),
  },
  {
    id: "guard-brand-contamination",
    critical: true,
    keywords: ["que guard impede contaminacao de marca", "guard de contaminacao de marca", "que impede marca de operador", "guard de neutralidade", "operator brand guard", "que guard bloqueia marca comercial"],
    answer:
      "A contaminação por marca comercial de operador é impedida por **`make identity-check`** (`tools/check-operator-contamination.sh`, motor `engines/banza-repo-guards`): nenhuma marca comercial de operador pode aparecer no repositório; o índice repo-wide também limpa por chunk quaisquer marcas. Só a atribuição do criador/mantenedor é permitida em superfícies legais/governança (allowlist).",
    sources: s("identityGuard", "enginesDir"),
  },
  {
    id: "banzai-ci",
    critical: true,
    keywords: ["que ci valida o banzai", "qual ci valida o banzai", "que workflow valida o banzai", "banzai ci", "que pipeline valida o banzai", "que ci corre para o banzai"],
    answer:
      "O BanzAI é validado em CI por jobs em **`.github/workflows/identity-guard.yml`** (fronteira de acção, repo-wide knowledge, repo-knowledge-safety, qwen-routing, agent/knowledge/document-aware quality, release-qa, public-interface, local-inference, …) e por **`.github/workflows/rust-engines.yml`** (fmt/clippy/test dos crates Rust, incluindo `banzai-api-kb` e `banzai-repo-indexer`). Guards partilhados (identity/purity/rust-rule/private-key-leak) também correm.",
    sources: s("ciWorkflows", "repoKnowledgeGuard"),
  },
  {
    id: "banzai-index-state",
    critical: true,
    keywords: ["qual e o estado actual do banzai", "estado actual do banzai", "o banzai conhece o repo banzai", "banzai conhece o repositorio banzai", "quantos ficheiros foram indexados", "quantos chunks foram indexados", "quantos ficheiros chunks", "que testes foram adicionados na m2.13b", "current state of banzai", "does banzai know the banzai repo"],
    answer:
      "Estado actual do BanzAI: é um agente **read-only** com conhecimento **repo-wide** do monorepo `banza-protocol/banza`. Com a ADR-036 o BanzAI foi consolidado neste monorepo — o runtime (`services/banzai-api`) e os motores (`engines/banzai-*`) vivem aqui e são indexados como parte do repo (`banzai_in_monorepo: true`); não existe um repositório BanzAI separado — o antigo `banza-protocol/banzai` foi eliminado definitivamente (ADR-036). O índice cobre documentação, decisões, código, website, guards, relatórios, licenças e artefactos do Operador Zero — as contagens exactas estão no manifesto `banzai-repo-index-manifest.json`. Retrieval e routing são Rust (WASM); o modelo é local (`external_model_called=false`) e a fronteira de acção recusa pedidos perigosos.",
    sources: s("indexManifest", "repoIndexer"),
  },

  // ── M2.13B — Action Boundary refusals (served via route.rs action_boundary; NEVER the model) ────
  {
    id: "refuse-delete-document",
    critical: true,
    keywords: [],
    answer:
      "Não posso apagar ou remover documentos do protocolo (ADRs, RFCs, specs, referência, relatórios). O BanzAI é read-only e apagar decisões/normas comprometeria a integridade e a auditabilidade do protocolo. Alternativa segura: proponha a mudança via um novo ADR/RFC que **supersede** o anterior (nunca apagar o histórico), abra um PR com revisão e CI, e mantenha o documento original como registo. Posso ajudar a redigir esse ADR/RFC, a explicar o impacto e a montar a checklist de revisão.",
    sources: s("governanceProc"),
  },
  {
    id: "refuse-remove-guard-or-bypass-ci",
    critical: true,
    keywords: [],
    answer:
      "Não posso remover guards (identity-check, private-key-leak-check, purity-check, rust-rule, etc.) nem contornar o CI ou fazer merge com checks vermelhos / `--admin`. Estes controlos protegem o protocolo e a segurança; desactivá-los é uma alteração de risco elevado. Alternativa segura: se um guard precisa de ajuste, proponha uma alteração **estreita e justificada** via PR, com um teste que prove o novo comportamento, revisão e CI verde. Posso ajudar a explicar o risco, a desenhar o teste e a redigir o PR.",
    sources: s("governanceProc"),
  },
  {
    id: "refuse-modify-trust-root",
    critical: true,
    keywords: [],
    answer:
      "Não posso alterar a Trust Root do protocolo BANZA nem substituir a root key. A Trust Root é estabelecida por uma cerimónia offline de raiz sob governança, com custódia repartida por limiar e não é modificável por um pedido a um agente. Alternativa segura: qualquer mudança de raiz segue o processo de governança documentado, com custódia, revisão e evidência. Posso explicar o modelo de confiança e o processo, mas não executo nem oriento a substituição da raiz.",
    sources: s("governanceProc"),
  },
  {
    id: "refuse-publish-or-certify-operator",
    critical: true,
    keywords: [],
    answer:
      "Não posso publicar, certificar, aprovar nem licenciar operadores, nem colocar o Operador Zero em `/operators`. O BanzAI guia e explica; **não certifica nem decide produção**, e o Operador Zero é a implementação de referência só de leitura (demo-only) que nunca é um operador real. A participação no protocolo demonstra-se por **evidência de conformidade verificável**, avaliada pelos motores e sob governança — não por uma decisão do agente. Posso explicar como um operador demonstra conformidade através de uma implementação concreta e como submeter essa evidência.",
    sources: s("adr052", "governanceProc"),
  },
  {
    // M2.14G — the operator publication / registry-admission / production-activation / certification /
    // licensing / federation action boundary. A firm, deterministic refusal (never claims execution)
    // with a safe preparation alternative. Plain canonical entities so the emphasis layer bolds them.
    id: "refuse-operator-publication",
    critical: true,
    keywords: [],
    answer:
      "Não posso publicar, admitir, aprovar, certificar, licenciar, activar nem federar operadores, nem adicioná-los a `/operators` ou a qualquer registry/lista pública. O BANZA é um protocolo financeiro aberto: operadores independentes preparam manifestos, evidência e testes, mas a participação é **demonstrada por evidência verificável** — não é concedida por uma acção do BanzAI nem por uma autoridade central do protocolo. No BANZA a baseline honesta do protocolo é `production_certificates: false` e um PASS é resultado de verificação técnica, não certificado, licença nem aprovação; o Operador Zero é apenas a implementação de referência só de leitura (demo, usa KZ_DEMO, sem dinheiro real) e nunca é um operador real. Posso ajudar a preparar o manifesto, o key manifest, a revocation list e o evidence bundle, rever a checklist de conformidade e explicar como outros participantes verificam localmente a compatibilidade técnica.",
    sources: s("adr052", "governanceProc"),
  },
  {
    // M2.14H — technical tool routing. A "valida esse manifesto: {…}" request gets an ARTEFACT ANALYSIS
    // + next steps, not a generic Operador Zero description. Honest about the engine boundary (the full
    // Rust/WASM validator runs in the Manifest step); never certifies/approves/publishes.
    id: "tool-validate-manifest",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido para **validar um manifesto de operador**.\n\n**Análise da estrutura** — um manifesto de operador deve declarar, entre outros: `manifest_version`, `operator_id`, `name`, `environment` (sandbox/produção), `base_url`, `key_manifest_url`, `conformance_url`, `supported_levels`, e as flags de demonstração (`simulated`, `production_allowed`). Se for o perfil demo do **Operador Zero**, terá `operator_id: operator-zero`, `environment: sandbox`, `simulated: true` e `production_allowed: false` — compatível com a implementação de referência só de leitura (usa **KZ_DEMO**), não com um operador real, certificação, licença ou publicação em `/operators`.\n\n**Nesta superfície** identifico e analiso a estrutura do manifesto e indico campos ausentes ou inconsistentes, mas o **motor de validação completo** (Rust/WASM) corre na etapa **Manifest** da jornada — posso encaminhar-te para lá.\n\n**Próximos pontos a validar:** key manifest, revocation list, conformance evidence e evidence bundle. Nota: validação técnica não é certificação nem aprovação; a participação demonstra-se por evidência verificável.",
    sources: s("opManifestSchema", "gettingStarted"),
  },
  {
    id: "tool-validate-conformance",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido de **verificação de conformidade**.\n\nA conformidade demonstra-se por **evidência verificável**: os motores avaliam a evidência e produzem um resultado técnico (PASS/WARN/FAIL). Um **PASS** é resultado de verificação técnica local, **não** um certificado, licença nem aprovação — e a baseline honesta do protocolo é `production_certificates: false`.\n\n**Nesta superfície** oriento a preparação e a leitura da evidência de conformidade e indico os artefactos em falta; a execução completa dos testes de conformidade corre na etapa **Conformidade** da jornada. Posso explicar os níveis (L0–L4), os campos obrigatórios e como interpretar o resultado.",
    sources: s("conformanceSuite", "evidenceModel"),
  },
  {
    id: "tool-evaluate-trust",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido de **avaliação de trust**.\n\nO trust do protocolo é avaliado a partir de metadata assinada, chaves delegadas, o Registo Técnico e a revocation list (fecho por omissão): o resultado é um **estado técnico**, não uma licença, certificação nem aprovação. Um operador revogado bloqueia o routing (INV-FEDEVAL-002).\n\n**Nesta superfície** explico o modelo de trust e os artefactos a preparar (key manifest, revocation list); a avaliação completa corre na etapa **Trust** da jornada. Posso indicar os campos a validar e como os pares verificam localmente.",
    sources: s("fedTrustModel", "keyManifestSchema"),
  },
  {
    id: "tool-prepare-federation",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido de **federação técnica**.\n\nPosso ajudar a preparar e a rever os artefactos de federação — manifesto, key manifest, revocation list e evidence bundle — para que outros participantes possam **verificar localmente** a compatibilidade técnica. Não publico o operador, não activo produção e não o adiciono a `/operators`: no BANZA a federação é demonstrada por evidência verificável, não concedida por uma acção do agente.\n\n**Nesta superfície** oriento a preparação técnica/conceptual; a verificação completa corre na etapa **Federação** da jornada.",
    sources: s("fedQuickstart", "fedManifestSchema"),
  },
  {
    id: "tool-validate-evidence-bundle",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido para **validar um evidence bundle**.\n\nUm evidence bundle agrega os artefactos técnicos (manifesto, resultados de conformidade, referências de trust, traces) como **evidência verificável** — não é uma certificação nem uma publicação. **Nesta superfície** analiso a estrutura e indico artefactos em falta; a geração/validação completa corre na etapa **Evidence Bundle** da jornada. Posso indicar os campos obrigatórios e orientar a preparação. Validação técnica não é aprovação.",
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "tool-analyze-trace",
    critical: true,
    keywords: [],
    answer:
      "Detectei um pedido para **analisar um trace / preparar um relatório**.\n\nPosso resumir a evidência do trace, apontar inconsistências e preparar um **relatório técnico** dos artefactos e resultados observados. O relatório é evidência técnica — **não** declara aprovação nem certificação. **Nesta superfície** oriento a leitura e a estrutura do relatório; os traces completos ligam-se à etapa **Traces / Relatório** da jornada.",
    sources: s("evidenceModel", "gettingStarted"),
  },
  {
    id: "refuse-expose-or-generate-secret",
    critical: true,
    keywords: [],
    answer:
      "Não posso mostrar, gerar nem guardar chaves privadas, seeds, mnemonics, tokens, passwords ou o conteúdo de `.env` no repositório. Chaves privadas nunca residem na infraestrutura de serviço nem no Git, e expô-las comprometeria a segurança. Alternativa segura: chaves demo (como a Demo Operator Root E2E do Operador Zero) são geradas de forma efémera e só o material público é committado; para produção, a custódia segue a governança. Posso explicar o modelo de custódia de chaves e como verificar assinaturas apenas com a chave pública.", // blocklist pattern: this refusal ENUMERATES secret types to reject — no key material here
    sources: s("ozE2eRoot", "governanceProc"),
  },
  {
    id: "refuse-real-money",
    critical: true,
    keywords: [],
    answer:
      "Não posso executar pagamentos reais nem transformar KZ_DEMO em dinheiro real. O Operador Zero é demo-only: `monetary_value: false`, moeda `KZ_DEMO` fictícia, `production_allowed: false`, e não movimenta fundos. Transformá-lo em dinheiro real sairia da fronteira demo e não é uma operação que o agente possa ou deva fazer. Posso explicar como funciona o ledger fictício e a fronteira demo-only.",
    sources: s("adr052"),
  },
  {
    // M2.14D — a request to EXECUTE a real financial/patrimonial operation. Deterministic action-boundary
    // refusal (never the model); offers the safe Operador Zero / KZ_DEMO simulation path. Never claims to
    // have executed anything.
    id: "refuse-financial-action",
    critical: true,
    keywords: [],
    answer:
      "Não posso executar pagamentos, transferências, reembolsos, liquidações, créditos, débitos, bloqueios de saldo, cash-in/cash-out, criação de carteiras/contas nem qualquer movimento de dinheiro. O **BANZA** é um protocolo e o **BanzAI** apenas explica, orienta e valida evidência técnica — não movimenta fundos nem actua como operador financeiro. Só operadores independentes implementam serviços financeiros, sujeitos ao seu enquadramento legal e regulatório. Caminho seguro: posso explicar como esse fluxo é representado no protocolo, ou simulá-lo com o **Operador Zero** usando **KZ_DEMO**, sem dinheiro real — o resultado é apenas evidência técnica local.",
    sources: s("adr052", "adr019"),
  },
  {
    id: "refuse-reintroduce-operador-zero",
    critical: true,
    keywords: [],
    answer:
      "Não posso reintroduzir a rota antiga `/operador-zero` no apex nem usá-la como fonte/fallback. Ela foi descontinuada intencionalmente (responde 410); a superfície canónica do Operador Zero é **zero.banza.network**, e os endpoints canónicos vivem na raiz desse subdomínio. Reactivar a rota antiga criaria duplicação e confusão de identidade. Alternativa segura: se houver uma razão para mudar o routing, proponha via ADR/PR com revisão e os guards de routing verdes.",
    sources: s("adr052", "governanceProc"),
  },
  {
    id: "refuse-infra-destructive",
    critical: true,
    keywords: [],
    answer:
      "Não posso apagar ou desactivar infraestrutura (PostgreSQL, nginx, backups, DNS, TLS, Cloudflare). São acções destrutivas e fora do âmbito read-only do agente, e podem comprometer o serviço e a integridade dos dados. Alternativa segura: mudanças de infraestrutura seguem um runbook com validação, janela controlada e rollback; posso ajudar a explicar o impacto, os passos de validação e o plano de rollback, mas não executo nem oriento a destruição.",
    sources: s("governanceProc"),
  },

  // ── M2.14B — Operator Zero Only demo/example policy (ADR-035) ──────────────────────────────────
  {
    id: "only-official-example",
    critical: true,
    keywords: [
      "unico exemplo oficial", "qual e o unico exemplo", "existe outro exemplo", "outro exemplo alem do operador zero",
      "exemplo l0", "o que aconteceu ao exemplo l0", "manifesto valido l0", "posso usar sample operator",
      "sample operator", "manifesto valido generico", "manifesto generico valido", "porque tudo usa operador zero",
      "porque tudo e operador zero", "exemplo demo oficial", "operator zero only",
    ],
    answer:
      "O **único exemplo demo oficial** do BANZA é o **Operador Zero** (ADR-035, Operator Zero Only). Não existem exemplos, demos, samples ou operadores fictícios paralelos — todo exemplo público deriva do Operador Zero (`operator-zero`, KZ_DEMO, `demo_only`). O antigo exemplo genérico de manifesto e as identidades fictícias (operadores de amostra com domínios `.example` de teste) foram convertidos para Operador Zero. Placeholders abstractos (`<operator_id>`, `<base_url>`) podem existir em specs/OpenAPI, mas **não são exemplos demo**. O Operador Zero **não é operador real**, **não aparece em /operators**, e a evidência que produz é **evidência técnica local**, **não certificação**.",
    sources: s("adr053", "adr052"),
  },
  {
    id: "manual-upload-not-example",
    critical: true,
    keywords: [
      "upload manual e exemplo oficial", "o upload manual e exemplo", "carregar json e exemplo",
      "upload manual exemplo", "posso testar meu proprio json", "posso testar o meu json", "testar meu json",
      "carregar json avancado", "fixtures internas sao exemplos publicos", "fixtures internas exemplos",
      "fixtures internas sao exemplos",
    ],
    answer:
      "Não. O **upload manual de JSON** no BanzAI é um **modo avançado / ferramenta**, **não** um exemplo oficial: valida um payload que trazes, mas **não entra na jornada demo**, **não desbloqueia artefactos demo**, **não é guardado como operador** e **não aparece** em /operators nem em zero.banza.network. O **único exemplo demo oficial** é o Operador Zero (ADR-035). As **fixtures internas de teste** também **não são exemplos públicos** — são estritamente internas (não aparecem na UI, nas docs públicas nem no índice) e não usam identidades de exemplo públicas.",
    sources: s("adr053", "adr052"),
  },

  // ── M2.13C-C — protocol + fintech-domain vocabulary (deterministic definitions; short-query safe) ──
  // Each answer follows the contract: short definition → relation to BANZA → safety/regulatory boundary
  // → cited sources. General fintech explanations are NEVER stated as BANZA rules; fintech terms are
  // never a financial licence; a demo simulation is never production. All are boundary-safe and brand-free.

  // Layer A — protocol-normative
  {
    id: "def-federation",
    deterministic: true,
    critical: true, keywords: ["federar", "o que e federar", "federacao", "o que e federacao", "o que significa federacao", "como federar", "federation", "what is federation", "what does federate mean", "federate", "peer"],
    answer:
      "No **BANZA**, a **federação** é a avaliação técnica, **local e por interacção**, das condições para o encaminhamento de pagamentos entre operadores independentes — sobre metadados de federação, manifest, trust/key manifest, revogação e **evidência verificável** publicada. Publicar evidência demonstra elegibilidade; cada encaminhamento continua sujeito à avaliação completa. Federar **não** é aprovação central, certificação, licença financeira nem entrada automática em produção.",
    sources: s("fedQuickstart", "fedFlow", "specOverview", "adr040"),
  },
  {
    id: "def-interoperability",
    deterministic: true,
    critical: true, keywords: ["interoperabilidade", "o que e interoperabilidade", "interoperability", "what is interoperability", "interoperar"],
    answer:
      "**Interoperabilidade** é a capacidade de operadores independentes trabalharem em conjunto sob as mesmas regras do protocolo. No **BANZA**, é demonstrada por federação e evidência verificável — não implica aprovação central nem produção automática.",
    sources: s("specOverview", "fedFlow", "adr018"),
  },
  {
    id: "def-manifest",
    deterministic: true,
    critical: true, keywords: ["manifest", "o que e manifest", "operator manifest", "manifesto do operador", "what is a manifest", "what is manifest"],
    answer:
      "**Manifest** (operator manifest) é o documento de metadados que descreve um operador candidato — identidade, ambiente, capacidades e os endpoints que o protocolo espera. No **BANZA**, validar um manifest gera **evidência técnica local**; **não cria operador real nem certifica**.",
    sources: s("opManifestSchema", "gettingStarted"),
  },
  {
    id: "def-key-manifest",
    deterministic: true,
    critical: true, keywords: ["key manifest", "o que e key manifest", "keymanifest", "what is a key manifest"],
    answer:
      "**Key manifest** é o documento que declara as chaves de assinatura de um operador, usado na avaliação de trust. Só a **chave pública** é necessária para verificar; chaves privadas nunca residem na infraestrutura de serviço.",
    sources: s("keyManifestSchema", "fedTrustModel"),
  },
  {
    id: "def-trust",
    deterministic: true,
    critical: true, keywords: ["trust", "o que e trust", "confianca", "o que e confianca", "what is trust"],
    answer:
      "**Trust**, no **BANZA**, é a **avaliação verificável por máquina** sobre metadados assinados, key manifest e revogação, com **fecho por omissão (fail-closed)** — material inválido ou revogado bloqueia. Não é aprovação central nem certificação.",
    sources: s("fedTrustModel", "adr038", "keyManifestSchema"),
  },
  {
    id: "def-trust-root",
    deterministic: true,
    critical: true, keywords: ["trust root", "o que e trust root", "raiz de confianca", "o que e a trust root", "what is the trust root", "root do protocolo"],
    answer:
      "A **Trust Root** é a raiz de confiança do **próprio protocolo** (estabelecida pela cerimónia de raiz), **independente de qualquer operador**. É distinta da **Demo Operator Root** do Operador Zero, que é apenas uma raiz demonstrativa e **não** é a Trust Root do protocolo.",
    sources: s("fedTrustModel", "adr038"),
  },
  {
    id: "def-revocation",
    deterministic: true,
    critical: true, keywords: ["revogacao", "o que e revogacao", "revogar", "revocation", "revocation list", "o que e revocation list", "brl", "what is revocation"],
    answer:
      "**Revogação** marca uma chave como já não confiável. No **BANZA** publica-se na **BANZA Revocation List (BRL)**; uma chave revogada **bloqueia o trust (fail-closed)** e a jornada não progride. É verificação técnica, não uma decisão de aprovação.",
    sources: s("brlSchema", "fedTrustModel"),
  },
  {
    id: "def-conformance",
    deterministic: true,
    critical: true, keywords: ["conformidade", "o que e conformidade", "conformance", "o que e conformance", "what is conformance"],
    answer:
      "**Conformidade** é demonstrar compatibilidade com o protocolo por **evidência verificável** — verificações determinísticas que produzem PASS/WARN/FAIL. Um resultado é **evidência técnica**, não aprovação humana, licença ou certificação.",
    sources: s("conformanceSuite", "evidenceModel", "adr039"),
  },
  {
    id: "def-pass",
    deterministic: true,
    critical: true, keywords: ["pass", "o que e pass", "o que e o pass", "what is pass", "passou"],
    answer:
      "**PASS** é um resultado de validação de conformidade que passou: **evidência técnica local verificável**. **Não** é um certificado, aprovação ou licença, e não confere estatuto a nenhum operador.",
    sources: s("conformanceSuite", "evidenceModel"),
  },
  {
    id: "def-evidence-bundle",
    deterministic: true,
    critical: true, keywords: ["evidence bundle", "o que e evidence bundle", "bundle", "pacote de evidencia", "what is an evidence bundle"],
    answer:
      "**Evidence bundle** é o pacote de artefactos verificáveis montado a partir dos resultados realmente produzidos (conformidade, trust, federação, traces). Documenta o que aconteceu — é **evidência**, não certificação.",
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "def-evidence",
    deterministic: true,
    critical: true, keywords: ["evidencia tecnica", "o que e evidencia tecnica", "evidencia", "o que e evidencia", "trace", "o que e trace", "session summary", "o que e session summary", "sumario da sessao", "what is a trace", "evidencia e certificacao"],
    answer:
      "**Evidência técnica** no **BANZA** são artefactos verificáveis — resultados de conformidade, um **trace** de ponta a ponta, um **session summary** — que documentam o que ocorreu localmente. Evidência **não é certificação**: prova o comportamento, não confere estatuto.",
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "def-operator",
    deterministic: true,
    critical: true, keywords: ["operador", "o que e um operador", "o que e operador", "operator", "what is an operator", "what is a payment operator", "o que e um operador de pagamentos"],
    answer:
      "Um **operador** é uma parte independente que **implementa** o protocolo. Os operadores são **separados** do protocolo — o BANZA define as regras; o operador implementa o produto. Validar artefactos gera evidência; não cria operador real nem o certifica.",
    sources: s("adr019", "adr018", "specOverview"),
  },
  {
    id: "def-invariant",
    deterministic: true,
    critical: true, keywords: ["invariante", "o que e um invariante", "o que e invariante", "invariant", "what is an invariant"],
    answer:
      "Um **invariante** é uma regra de integridade não-negociável que o protocolo garante — famílias INV-LEDGER, INV-WALLET, INV-SETTLE, INV-IDEM, INV-RECON e INV-QR (dupla-entrada, sem saldo negativo, precisão inteira, idempotência, reconciliabilidade, unicidade de QR).",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-api-schema",
    deterministic: true,
    critical: true, keywords: ["schema", "o que e schema", "openapi", "o que e openapi", "contract", "o que e um contrato", "api", "o que e a api", "what is a schema", "what is openapi"],
    answer:
      "No **BANZA**, os **contratos** (OpenAPI, schemas JSON) definem a forma canónica de manifests, federação, key manifest e revogação. Um **schema** valida a estrutura de um artefacto; os contratos são a fonte de verdade que operadores implementam.",
    sources: s("opManifestSchema", "fedManifestSchema", "specOverview"),
  },

  // ── M2.14C — Layer C: governance / documentation / engineering vocabulary of the repo ──
  // Deterministic short definitions for the terms the repo itself uses (ADR, RFC, guard, CI, PR, …).
  // A record/process/check is NEVER an authority: an ADR does not certify, a guard is not a normative
  // decision, CI is not a merge with red checks, documentation does not approve an operator.
  {
    id: "def-adr",
    deterministic: true,
    critical: true, keywords: ["adr", "o que e adr", "o que e uma adr", "o que e um adr", "architecture decision record", "o que e architecture decision record", "what is an adr", "what is adr", "o que sao adrs", "para que serve uma adr"],
    answer:
      "Uma **ADR** é um **Architecture Decision Record**: um documento que regista uma decisão arquitectural importante. No **BANZA**, uma ADR documenta contexto, decisão, consequências e fronteiras de uma escolha de arquitectura ou governança (ficam em `decisions/adr/`, listadas em `/decisoes`). Uma ADR **não é código**, **não certifica** operadores e **não substitui** CI, revisão nem evidência técnica.",
    sources: s("adrIndex", "governanceProc", "govGlossary"),
  },
  {
    id: "def-rfc",
    deterministic: true,
    critical: true, keywords: ["rfc", "o que e rfc", "o que e uma rfc", "o que e um rfc", "request for comments", "what is an rfc", "what is rfc", "o que sao rfcs"],
    answer:
      "Uma **RFC** (**Request for Comments**) é uma proposta/discussão estruturada para evoluir o protocolo. No **BANZA**, uma RFC serve para discutir uma mudança **antes** de entrar como especificação, contrato, schema ou decisão (ADR), e vive em `decisions/rfc/`. Uma RFC **não é** norma final nem aprovação — é o passo de discussão do processo aberto.",
    sources: s("rfcIndex", "governanceProc", "govGlossary"),
  },
  {
    id: "def-bcj",
    deterministic: true,
    critical: true, keywords: ["bcj", "bcj 1", "bcj/1", "o que e bcj", "o que e o bcj", "banza canonical json", "canonical json", "what is bcj", "json canonico", "canonicalizacao"],
    answer:
      "O **BCJ/1** (*BANZA Canonical JSON*) é a **forma canónica de bytes** do protocolo: um perfil restrito do RFC 8785 (JCS). Fixa como um documento JSON se converte numa sequência de bytes única e determinística — UTF-8, membros duplicados rejeitados antes de qualquer interpretação semântica, inteiros no domínio ±(2^53−1), e **sem normalização Unicode do lado do verificador**. Assinatura, digest e identidade de pedido comparam bytes produzidos por esta regra, pelo que duas implementações que discordem aqui discordam em tudo o resto. É a primeira coisa a ler e a primeira a testar. Especificação: `spec/canonicalization.md`.",
    sources: s("specDir", "specOverview"),
  },
  {
    id: "def-root-authorization",
    deterministic: true,
    critical: true, keywords: ["quantas autoridades", "how many authorities", "threshold da raiz", "threshold da trust root", "root threshold", "trust root threshold", "quorum da raiz", "root quorum", "autoridades da raiz", "root authorities", "2 de 3", "2-de-3", "2 of 3", "2-of-3"],
    answer:
      "A **Trust Root** do **BANZA** é controlada por **três autoridades de assinatura independentes**. Uma acção autorizada pela raiz requer assinaturas de **quaisquer duas das três** (**2-de-3**); **nenhuma chave de raiz autoriza sozinha**. Perdida, comprometida ou obstrutiva **uma** autoridade, as **duas sobreviventes** substituem-na sem a sua participação; perdidas **duas**, a continuidade canónica fica **bloqueada** — uma só sobrevivente **não** restaura a raiz e **não existe chave-mestra de emergência nem via de uma só parte** (ADR-039). O limiar conta **autoridades distintas**, não entradas de assinatura: duas assinaturas da mesma autoridade valem uma aprovação. A autorização é **criptográfica e lógica** — quantos módulos seguros existem e onde vivem os dispositivos são **controlos de custódia**, e o número de dispositivos nunca determina o limiar. **Nenhuma cerimónia de produção foi realizada, não existe chave de raiz de produção e não há raiz de produção publicada.** Modelo: `docs/security/ROOT_KEY_CUSTODY_MODEL.md`; validador: `engines/banza-root-ceremony`; sucessão: `spec/root-authority-set.md`.",
    sources: s("fedTrustModel", "specDir"),
  },
  {
    id: "def-r2s2",
    deterministic: true,
    critical: true, keywords: ["r2s2", "r²s²", "principios fundamentais", "princípios fundamentais", "fundamental principles", "quais sao os principios", "quatro principios", "four principles", "robusto", "resiliente", "seguro", "simples", "robust", "resilient", "secure", "simple", "principios do banza", "design principles"],
    answer:
      "Os **Princípios Fundamentais** do **BANZA** são **quatro**, e apenas quatro — em conjunto chamam-se **BANZA R²S²** (ASCII `R2S2`): **Robusto** — comportamento correcto e determinístico perante implementações independentes, entrada adversarial e condições-limite; **Resiliente** — contém falhas, preserva operação segura onde é possível e recupera de forma determinística **sem enfraquecer as garantias do protocolo**; **Seguro** — as propriedades críticas são impostas **por construção** e **fecham por omissão** quando não podem ser estabelecidas; **Simples** — usa o **menor mecanismo suficiente** para fornecer a propriedade exigida. A ordem é canónica. **A resiliência não se sobrepõe à segurança**: nunca permite contornar confiança, autorização ou integridade apenas para continuar disponível, e **não significa ausência de indisponibilidade** — significa que uma falha é contida, explícita e recuperável, e não se transforma numa violação do protocolo. Os princípios são o **critério de decisão**, distintos das **propriedades estruturais** que o protocolo tem de possuir (Referência §3, oito) e dos **invariantes arquitecturais** que a arquitectura não pode violar (Whitepaper, cinco). **`Fecho por omissão` é uma propriedade estrutural** associada a Seguro e Resiliente — **não** é um quinto princípio. Decisão: **ADR-040**; evidência: `assurance/`.",
    sources: s("govGlossary", "specDir"),
  },
  // ── Conformance profiles — DERIVED. Every identifier, canonical name, purpose and inheritance below
  //    comes from PROFILE_FACTS, generated from contracts/production/conformance-profiles.production.json.
  //    Nothing here restates them, so a registry change cannot leave a stale answer behind, and the
  //    freshness check fails until the artifact is regenerated.
  //
  //    Profile IDENTITY is kept SEPARATE from the L0 regulatory boundary above. They answer different
  //    questions: what a level IS, versus what passing it does not confer. Collapsing them would make
  //    "o que é L0?" answer with a denial, and "passar L0 permite dinheiro real?" answer with a name.
  ...profileEntries(),
  ...lifecycleEntries(),
  // ── Implementation as an ENTITY, and its relationship to an operator. ADR-002 states both in one
  //    sentence: "A certificate is bound to an implementation — a specific artifact set — not to an
  //    entity, because entities do not pass vectors, builds do." That is the authority for what an
  //    implementation IS and for why it is not the operator.
  //
  //    These are new REPRESENTATIONS of existing repository truth, not new BANZA semantics. The
  //    component facts remain the owners: def-operator owns the operator, and the comparison below cites
  //    the relationship authority rather than restating either definition as its own.
  //
  //    Deliberately NOT claimed: that one operator may publish several implementations. It is
  //    architecturally natural and ADR-002 does not state it, so it is not asserted here.
  {
    id: "def-implementation",
    deterministic: true,
    critical: true,
    keywords: [
      "o que e uma implementacao", "o que e uma implementacao banza", "definicao de implementacao",
      "what is an implementation", "what is a banza implementation", "definition of implementation",
    ],
    answer:
      "Uma **implementação** do **BANZA** é o **sistema técnico** que implementa o protocolo — um **conjunto concreto de artefactos** (uma build identificada), não uma organização. A conformidade e a certificação avaliam **essa** implementação num âmbito determinado: um certificado liga-se a uma implementação, **não** a uma entidade, porque **entidades não passam vectores — builds passam** (ADR-002).\n\n---\n\nA **BANZA implementation** is the **technical system** that implements the protocol — a **specific artifact set** (an identified build), not an organization. Conformance and certification evaluate **that** implementation within a defined scope: a certificate binds to an implementation, **not** to an entity, because **entities do not pass vectors, builds do** (ADR-002).",
    sources: s("adr002", "specOverview"),
  },
  {
    id: "def-operator-vs-implementation",
    deterministic: true,
    critical: true,
    keywords: [
      "operador e implementacao sao a mesma coisa", "operador e uma implementacao sao a mesma coisa",
      "diferenca entre operador e implementacao", "operador vs implementacao",
      "operator and an implementation the same", "difference between an operator and an implementation",
      "operator vs implementation", "are an operator and an implementation the same thing",
    ],
    answer:
      "**Não — são coisas distintas.** Um **operador** é uma **entidade organizacional** independente que corre uma implementação; uma **implementação** é o **sistema técnico**, um conjunto concreto de artefactos. A distinção é o que torna a certificação precisa: um certificado liga-se a uma **implementação**, não a uma entidade, porque **entidades não passam vectores — builds passam** (ADR-002). Sem essa separação, o modelo de conformidade colapsaria em avalizar empresas.\n\n---\n\n**No — they are distinct.** An **operator** is an independent **organizational entity** that runs an implementation; an **implementation** is the **technical system**, a specific artifact set. The distinction is what makes certification precise: a certificate binds to an **implementation**, not to an entity, because **entities do not pass vectors, builds do** (ADR-002). Without that separation the conformance model would collapse into vouching for companies.",
    sources: s("adr002", "specOverview"),
  },
  {
    // "Quem certifica?" is grammatically an ACTOR question, and the honest answer is that BANZA defines
    // the FUNCTION and designates no universal certifying organization. Answering "Layer 2 certifies"
    // would turn an architectural layer into a legal entity; naming any body would invent one.
    id: "def-certification-actor",
    deterministic: true,
    critical: true,
    keywords: [
      "quem certifica uma implementacao", "quem certifica implementacoes", "quem certifica",
      "who certifies an implementation", "who certifies implementations", "who certifies",
      "quem emite a certificacao", "who issues certification",
    ],
    answer:
      "O **BANZA** define a **função** de certificação — a **Camada 2**, certificação de conformidade e interoperabilidade — e **não designa uma organização certificadora universal**. Certificar é avaliar **uma implementação determinada** (identificada pelo artefacto) contra um perfil público e versionado, e o resultado é **evidência técnica decidida por verificações determinísticas**, não uma aprovação institucional. O **protocolo não é, ele próprio, um certificador**; o **BanzAI não certifica**; as **autoridades de raiz não certificam** — o seu papel é criptográfico. E certificar **não** confere admissão operacional (ADR-006) nem autorização regulatória (ADR-007): são decisões separadas que não se propagam (ADR-005).\n\n---\n\n**BANZA** defines the certification **function** — **Layer 2**, conformance and interoperability certification — and **designates no universal certifying organization**. Certifying means evaluating **a defined implementation** (identified by its artifact) against a public, versioned profile, and the result is **technical evidence decided by deterministic checks**, not an institutional approval. The **protocol is not itself a certifier**; **BanzAI does not certify**; the **root authorities do not certify** — their role is cryptographic. And certification confers **neither** operational admission (ADR-006) **nor** regulatory authorization (ADR-007): those are separate decisions that do not propagate (ADR-005).",
    sources: s("adr002", "adr005sep", "govGlossary"),
  },
  {
    id: "def-resilience-boundary",
    deterministic: true,
    critical: true, keywords: ["resiliencia sobrepoe seguranca", "resiliência sobrepõe-se à segurança", "resilience override security", "resilience overrides security", "resiliencia acima da seguranca", "resilience vs security", "resiliencia zero downtime", "resilience zero downtime", "resiliencia significa zero downtime", "resilience mean zero downtime", "resiliencia indisponibilidade", "seguranca antes de disponibilidade", "safety before availability"],
    answer:
      "**Não.** A **resiliência nunca se sobrepõe à segurança**, nem a qualquer garantia de correcção do protocolo. O **BANZA** segue **segurança antes de disponibilidade**: onde a **confiança**, a **autorização**, a **integridade** ou a **correcção** não podem ser estabelecidas, o protocolo **falha ou degrada em segurança** em vez de continuar por um caminho alternativo inseguro. Em concreto, ser resiliente **não** autoriza contornar a confiança, aceitar um artefacto **não assinado** ou de origem não verificada, **estender** uma validade expirada, baixar o limiar de assinaturas nem prosseguir com verificações mais fracas para permanecer disponível — **recusar é um resultado correcto**. Resiliência também **não significa ausência de indisponibilidade**: significa que uma falha é **contida, explícita e recuperável de forma determinística**, e que **nunca se transforma numa violação do protocolo**. **Resiliente** e **Seguro** são dois dos quatro Princípios Fundamentais (**BANZA R²S²**); decisão: **ADR-040**.",
    sources: s("govGlossary", "specDir"),
  },
  // Authority-boundary question. It was answered "insufficient evidence" on the direct route while an
  // immediate contextual follow-up produced a substantive — and wrong — answer saying public contracts
  // "control" operators. The verbs of authority (controlar, governar, admitir, autorizar, mandar)
  // resolved to no subject at all, so the factual package was built empty and declined; the contextual
  // route reached sources by another path. A stable governance boundary should not need a model to be
  // decided, and it must not be decided differently depending on which route the reader arrives by.
  //
  // TECHNICAL CONSTRAINT ≠ ORGANIZATIONAL CONTROL. Contracts define interfaces and required behaviour
  // for a conformant implementation; they do not become an institutional controller of an entity.
  {
    id: "def-operator-governance-authority",
    deterministic: true,
    // Explicitly eligible for the lexical keyword index. Not because the entry is critical —
    // 136 critical entries are deliberately outside it — but because authority questions arrive
    // as free prose ("quem controla os operadores") that no subject or glossary path resolves.
    lexicalCandidate: true,
    critical: true, keywords: ["quem controla os operadores", "quem controla o operador", "quem controla os operadores banza", "o banza controla os operadores", "banza controla operadores",
      // The FALSE-PREMISE phrasings. "porque é que o BANZA controla todos os operadores?" asserts something
      // untrue and must reach the record that corrects it — measured, the interpolated quantifier stopped
      // the contiguous-phrase match and the bare token "banza" tied on score, so the question was answered
      // with the definition of BANZA instead of with the authority separation that refutes it. A follow-up
      // then inherits this corrected target, which is why the phrasing belongs here and not in a rule that
      // treats the reader's premise as the subject.
      "banza controla todos os operadores", "o banza controla todos os operadores",
      "porque e que o banza controla todos os operadores", "banza controla qualquer operador",
      "does banza control all operators", "why does banza control all operators",
      "banza controls all operators","quem manda nos operadores", "quem governa os operadores", "quem governa um operador", "quem admite um operador", "quem admite operadores", "quem autoriza um operador", "quem autoriza operadores", "quem aprova um operador", "existe uma autoridade central que controla os operadores", "autoridade central operadores", "a banzami controla os operadores", "banzami controla operadores", "o mantenedor do banza controla os operadores", "mantenedor controla operadores", "quem controla o banza", "quem controla o protocolo", "who controls operators", "who controls the operators", "does banza control operators", "who governs operators", "who governs an operator", "who admits an operator", "who admits operators", "who authorizes an operator", "who authorises an operator", "who approves an operator", "is there a central banza authority controlling operators", "central authority operators", "does banzami control operators", "does the banza maintainer control operators", "who controls banza", "who controls the protocol"],
    answer:
      "**O BANZA não estabelece uma autoridade central que controle os operadores.** Um **operador** é uma entidade organizacional independente, responsável por correr uma implementação; uma **implementação** é o sistema técnico que segue as regras (ADR-002). São coisas distintas, e uma pergunta organizacional não se responde como se um operador fosse apenas software.\n\nSe por **controlo** se entende **requisitos técnicos**: o protocolo define, em contratos e especificações públicas, os requisitos que uma implementação tem de satisfazer para ser conforme. Isso é **constrangimento técnico, não controlo organizacional** — um contrato define interfaces, representações e comportamento exigido; não se torna o controlador institucional de uma entidade.\n\nAs decisões estão separadas e nenhuma implica a outra (ADR-004, ADR-005):\n\n- **Protocolo** — especifica as regras técnicas.\n- **Implementação** — implementa essas regras.\n- **Conformidade ou certificação** — avalia uma implementação num âmbito determinado (versão do protocolo, perfil, ambiente, evidência). Avalia implementações, **não** confere admissão nem licença.\n- **Admissão e governação operacional** — pertencem, separadamente, ao esquema operacional aplicável, segundo as suas próprias regras (ADR-006).\n- **Autorização ou supervisão regulatória** — pertence, separadamente, ao enquadramento jurídico e às autoridades competentes da jurisdição aplicável (ADR-007).\n\n**Nenhuma dessas decisões é automaticamente conferida pelo BANZA.** Não há um controlador central de operadores, nem uma admissão do BANZA, nem uma autoridade regulatória do BANZA. Os mantenedores governam a evolução do protocolo no processo público, não os operadores; as autoridades de raiz desempenham o seu papel criptográfico de confiança, que não é governação operacional; e o registo técnico público indexa manifestos, versões e evidência auto-publicada — **não é uma lista de admitidos nem uma porta de entrada**.",
    sources: s("adr002", "adr059", "adr005sep", "adr060", "adr062", "govGlossary"),
  },
  {
    id: "def-l0-regulatory-boundary",
    deterministic: true,
    critical: true, keywords: ["l0 sandbox regulatorio", "l0 sandbox regulatório", "l0 regulatory sandbox", "l0 sandbox do bna", "l0 bna sandbox", "l0 lispa", "l0 e lispa", "l0 dinheiro real", "l0 movimentar dinheiro real", "l0 real money", "l0 move real funds", "l0 fundos reais", "implementar l0 sem ser operador", "testar l0 sem ser operador", "implement l0 without being an operator", "test l0 without being a financial operator", "conformidade da licenca", "certificacao da licenca", "conformidade banza da licenca para operar", "does banza conformance authorize", "does certification authorize me to operate", "passar l0 significa producao", "passar l0 producao", "passing l0 production", "l0 significa que posso entrar em producao", "l0 autoriza", "l0 confere autorizacao"],
    answer:
      "**Não.** O **L0 — Sandbox de Protocolo** permite **implementar, testar e demonstrar a interoperabilidade técnica** do **BANZA** num ambiente **controlado e não produtivo**, com material, credenciais, dados e valores **de teste** — e **não confere, substitui nem implica autorização regulatória, admissão operacional, participação num arranjo de pagamentos ou permissão para movimentar fundos reais**. Em concreto: **conformidade técnica não é autorização regulatória**, **certificação BANZA não é admissão operacional**, e **passar em L0 não é aprovação para produção** — não há progressão automática de L0 para produção, porque perfis medem **capacidade técnica** e não são níveis de licença (ADR-005). O **L0 é um sandbox de protocolo, não um sandbox regulatório**: os laboratórios e programas de autorização operados por um regulador são **institucionalmente distintos** — o **BANZA L0 não é** uma autorização, aprovação, supervisão ou programa do **Banco Nacional de Angola**, e é **distinto do LISPA**, o Laboratório de Inovação do Sistema de Pagamentos que o BNA opera; participar no L0 não é participar no LISPA. Isto **não** significa que o L0 esteja fora da lei: significa apenas que **o teste técnico não pressupõe a autorização exigida para a operação financeira real**. A lei geralmente aplicável continua a aplicar-se, e a passagem para operação real depende, **separadamente**, do enquadramento jurídico, regulatório, operacional e de governação aplicável ao operador, ao esquema e à jurisdição. O que é de teste é o **material e os valores**, não o comportamento do protocolo — e **material de teste nunca se torna válido em produção** por mudar de ambiente (ADR-023). O **BANZA** descreve esta fronteira; **não determina** se uma entidade concreta precisa de uma licença específica nem se um modelo de negócio é lícito — isso pertence ao quadro legal e à autoridade competente. Fronteira completa: `docs/governance/certification-boundary.md`.",
    sources: s("govGlossary", "specDir"),
  },
  {
    id: "def-local-execution",
    deterministic: true,
    critical: true, keywords: ["execucao local", "execução local", "servidor central", "central server", "processador central", "central processor", "central transaction processor", "consenso global", "global consensus", "execucao federada", "federated execution", "infraestrutura central", "ponto central", "banza e uma blockchain", "is banza a blockchain"],
    answer:
      "**Não.** O **BANZA** **não** exige um **processador central de transacções**, **não** usa **consenso global** e **não** reside num **servidor central** — não é uma blockchain nem uma infraestrutura partilhada de execução. A execução é **local a cada operador**: cada implementação corre na infraestrutura do próprio operador, e dois operadores interoperam por **respeitarem as mesmas regras públicas**, não por se ligarem a um ponto central comum. A execução **não é** um plano do protocolo — processar pagamentos, guardar saldos e cumprir obrigações legais pertence aos operadores, **sob** as regras do protocolo mas **fora** dele; o protocolo **não detém nem movimenta fundos** e não mantém um livro-razão global sobre o qual houvesse que chegar a acordo. As únicas superfícies comuns são de **descoberta e ancoragem de confiança** — o **Registo Técnico**, a **metadata de protocolo assinada**, a **Lista de Revogação** e o **Manifesto de Chaves** —, e **nenhuma delas movimenta fundos nem executa pagamentos**. Referência **§4 Arquitectura do Protocolo** (execução local, sem servidor central).",
    // `claudeMd` removed for the same reason as what-is-banza: an internal repository guide is not public
    // establishing evidence, and a presentation filter hiding it does not make the declaration true. Found
    // by auditing every deterministic entry rather than only the one that prompted the audit.
    sources: s("specOverview", "readme", "adr018"),
  },
  {
    id: "def-root-authority-set",
    deterministic: true,
    critical: true, keywords: ["conjunto de autoridades", "conjunto de autoridades da raiz", "root authority set", "sucessao da raiz", "sucessao de autoridades", "root succession", "substituir uma autoridade", "replace an authority", "continuidade da raiz", "root continuity", "autoridade perdida", "lost authority", "autoridade comprometida", "conjunto genese", "genesis set", "predecessor"],
    answer:
      "O **Conjunto de Autoridades da Raiz** é o artefacto que responde a **quem pode exercer a autoridade da raiz** — distinto do **Manifesto de Chaves**, que responde a **o que a raiz delega neste momento**. A raiz avança como uma **linhagem**: o **conjunto génese** (sequência 0) é aceite apenas quando o seu digest é igual a um que o verificador recebeu **explicitamente** — confiança no primeiro uso é recusada; cada conjunto seguinte nomeia o predecessor por digest, avança a sequência exactamente uma unidade e transporta assinaturas de **duas autoridades distintas do conjunto predecessor**. Um conjunto assinado pelas suas próprias chaves **não autoriza nada**. Daqui decorre a continuidade: se uma autoridade for perdida, comprometida ou obstrutiva, as **duas sobreviventes** autorizam um sucessor que a substitui, **sem a sua participação** — exigi-la tornaria o caminho 3-de-3 e dar-lhe-ia um veto. Se restar menos do que o limiar, a continuidade canónica fica **bloqueada**: não existe chave-mestra de emergência, chave de recuperação oculta nem via de uma só parte. Especificação: `spec/root-authority-set.md`; decisão: **ADR-039**; invariantes `INV-ROOT-011` a `INV-ROOT-014`.",
    sources: s("specDir", "fedTrustModel"),
  },
  {
    id: "def-trust-guarantees",
    deterministic: true,
    critical: true, keywords: ["transparencia global", "global transparency", "split-view", "split view", "consistencia de conjunto", "set consistency", "mix-and-match", "mix and match", "consistencia entre observadores", "cross-observer", "garantias de confianca", "trust guarantees", "o banza fornece transparencia global"],
    answer:
      "**Não.** O **BANZA** **não** fornece transparência global nem detecção de *split-view*. Quatro garantias distintas precisam de ser separadas: **fornece — frescura do artefacto**: um artefacto expirado não é aceite (`expires_at`); **fornece — monotonicidade local**: dentro do âmbito observado, um marcador de ordem inferior é rejeitado (`trust_version_rollback`) e o mesmo marcador com conteúdo diferente falha fechado (`trust_version_equivocation`); **não fornece — consistência de conjunto**: vários artefactos individualmente válidos e frescos não são garantidamente do mesmo estado de publicação — a expiração limita a idade de cada artefacto, **não a coerência entre eles**; **não fornece — consistência entre observadores**: dois verificadores podem observar estados diferentes sem que o protocolo o detecte. Especificação: `spec/trust-freshness.md`.",
    sources: s("specDir", "fedTrustModel"),
  },
  {
    id: "def-spec",
    deterministic: true,
    critical: true, keywords: ["spec", "o que e spec", "o que e uma spec", "specification", "especificacao", "o que e especificacao", "what is a spec", "what is a specification"],
    answer:
      "Uma **spec** (especificação) descreve as **regras, formatos, comportamento esperado e interfaces** do protocolo. No **BANZA** vive em `spec/` e deve ser distinguida da **implementação**: a spec diz o que é correcto; um operador implementa-a. Uma spec **não é** código nem certificação.",
    sources: s("specDir", "specOverview", "govGlossary"),
  },
  {
    id: "def-guard",
    deterministic: true,
    critical: true, keywords: ["guard", "o que e guard", "o que e um guard", "guards", "o que sao guards", "what is a guard", "what are guards", "verificacao automatizada"],
    answer:
      "Um **guard** é uma **verificação automatizada** que impede regressões, violações de fronteira, contaminação de marca, fuga de segredos ou quebra de regras do projecto. No **BANZA** correm por `make <nome>-check` (em `tools/`) e no CI. Um guard **não é** uma decisão normativa nem deve ser contornado — remover ou ignorar um guard é uma acção recusada.",
    sources: s("guardsDir", "makefile", "govGlossary"),
  },
  {
    id: "def-ci",
    deterministic: true,
    critical: true, keywords: ["ci", "o que e ci", "o que e o ci", "continuous integration", "integracao continua", "what is ci", "what is continuous integration"],
    answer:
      "**CI** significa **Continuous Integration**: o conjunto de **checks automatizados** que corre em cada PR para validar testes, guards, build e regras do projecto. No **BANZA** vive em `.github/workflows/`. CI **não** deve ser passado à força: fazer merge com checks vermelhos é uma acção recusada.",
    sources: s("ciWorkflows", "governanceProc", "govGlossary"),
  },
  {
    id: "def-pr",
    deterministic: true,
    critical: true, keywords: ["pr", "o que e pr", "o que e um pr", "pull request", "o que e um pull request", "what is a pr", "what is a pull request"],
    answer:
      "Um **PR** (**Pull Request**) é uma **proposta de alteração** ao repositório, revista e validada por **CI** antes do merge. No **BANZA**, um PR não deve ser fundido com checks vermelhos nem com `--admin` a contornar CI falhado — isso é uma acção recusada.",
    sources: s("governanceProc", "contributing", "govGlossary"),
  },
  {
    id: "def-issue",
    deterministic: true,
    critical: true, keywords: ["issue", "o que e issue", "o que e uma issue", "o que e um issue", "what is an issue", "what is a github issue"],
    answer:
      "Uma **issue** é um registo de **problema, proposta ou tarefa** no repositório. No **BANZA** faz parte do processo aberto (issues → discussão/RFC → PR → CI → merge). Uma issue **não é** decisão nem aprovação — é o ponto de partida da discussão.",
    sources: s("governanceProc", "contributing", "govGlossary"),
  },
  {
    id: "def-release",
    deterministic: true,
    critical: true, keywords: ["release", "o que e release", "o que e uma release", "o que e um release", "version", "versao", "o que e uma versao", "tag", "o que e uma tag", "what is a release"],
    answer:
      "Uma **release** é uma **versão publicada** do projecto, normalmente ligada a uma **tag** e ao **changelog**. No **BANZA** identifica um estado reproduzível do repositório. Uma release **não** confere estatuto a operadores nem é certificação.",
    sources: s("changelog", "governanceProc", "govGlossary"),
  },
  {
    id: "def-changelog",
    deterministic: true,
    critical: true, keywords: ["changelog", "o que e changelog", "o que e o changelog", "what is a changelog", "historico de alteracoes"],
    answer:
      "O **changelog** é o **histórico de alterações relevantes** entre versões do projecto. No **BANZA** vive em `CHANGELOG.md`. É um registo — **não** é norma nem certificação.",
    sources: s("changelog", "govGlossary"),
  },
  {
    id: "def-runbook",
    deterministic: true,
    critical: true, keywords: ["runbook", "o que e runbook", "o que e um runbook", "what is a runbook"],
    answer:
      "Um **runbook** é um **guia operacional** para executar, diagnosticar, recuperar ou manter um sistema (passos, smoke tests, rollback). No **BANZA** vivem em `docs/guides/`. Um runbook orienta a operação — **não** altera as regras do protocolo.",
    sources: s("runbookDoc", "govGlossary"),
  },
  {
    id: "def-rollback",
    deterministic: true,
    critical: true, keywords: ["rollback", "o que e rollback", "o que e um rollback", "what is a rollback", "reverter para estado anterior"],
    answer:
      "**Rollback** é o processo de **voltar a um estado anterior seguro** após uma falha ou regressão (por exemplo, repor uma configuração ou uma versão anterior). No **BANZA** os runbooks documentam o rollback de cada mudança operacional. Não afecta invariantes do protocolo.",
    sources: s("runbookDoc", "govGlossary"),
  },
  {
    id: "def-maintainer",
    deterministic: true,
    critical: true, keywords: ["maintainer", "o que e maintainer", "o que e um maintainer", "who is a maintainer", "what is a maintainer", "mantenedor", "o que e um mantenedor", "contributor", "o que e um contributor", "contribuidor"],
    answer:
      "Um **maintainer** é uma pessoa ou entidade responsável por **manter o projecto**, rever mudanças e preservar a integridade do repositório. No **BANZA** a governança é **aberta** (qualquer um contribui via issue/RFC/PR); o **Banzami** é o criador original e mantenedor institucional inicial. Ser maintainer **não** dá autoridade para certificar, aprovar ou licenciar operadores.",
    sources: s("maintainers", "governance", "govGlossary"),
  },
  {
    id: "def-governance",
    deterministic: true,
    critical: true, keywords: ["governance", "o que e governance", "o que e governanca", "governanca", "o que e a governanca", "what is governance", "modelo de governanca", "governanca aberta"],
    answer:
      "**Governança** é o **processo aberto** pelo qual o BANZA evolui: issues, RFCs, ADRs, pull requests, revisão e CI. No **BANZA** a governança é **aberta** e a conformidade demonstra-se por **evidência verificável**, não por uma autoridade central. A governança **não** certifica, aprova nem licencia operadores.",
    sources: s("governanceProc", "adrIndex", "govGlossary"),
  },
  {
    id: "def-audit-report",
    deterministic: true,
    critical: true, keywords: ["audit", "o que e audit", "audit report", "o que e um audit report", "relatorio de auditoria", "o que e auditoria", "evidence report", "what is an audit report", "what is an audit"],
    answer:
      "Um **audit report** (relatório de auditoria) documenta uma **revisão** do repositório ou de um marco — o que foi verificado, achados e conclusões. No **BANZA** vivem em `docs/quality/`. É **evidência/registo** de revisão — **não** é certificação nem aprovação de operador.",
    sources: s("reportsDir", "govGlossary"),
  },
  {
    id: "def-kz-demo",
    deterministic: true,
    critical: true, keywords: ["kz_demo", "o que e kz_demo", "kz demo", "kz_demo e dinheiro real", "kz demo dinheiro real"],
    answer:
      "**KZ_DEMO** é a unidade de demonstração (moeda fictícia) do Operador Zero, a implementação de referência só de leitura — `monetary_value: false`, `demo_only: true`. **Não é dinheiro real**, não tem valor monetário e não move fundos. Serve apenas para demonstrar e validar o protocolo de ponta a ponta.",
    sources: s("adr052", "ozEngine"),
  },

  // Layer B — fintech/payment domain (general explanation ≠ BANZA rule)
  {
    id: "def-ledger",
    deterministic: true,
    critical: true, keywords: ["ledger", "o que e ledger", "o que e o ledger", "livro razao", "what is a ledger"],
    answer:
      "**Ledger** é o registo de movimentos financeiros. No **BANZA**, o protocolo define **invariantes** de ledger de **dupla-entrada** (cada débito tem o crédito correspondente, aritmética inteira, sem floats); o BANZA **não mantém contas reais** — os saldos são sempre derivados do ledger.",
    sources: s("adr006", "invariants"),
  },
  {
    id: "def-double-entry",
    deterministic: true,
    critical: true, keywords: ["double entry", "double-entry", "o que e double entry", "partida dobrada", "dupla entrada", "what is double entry"],
    answer:
      "**Dupla-entrada (double-entry)** significa que cada débito tem um crédito correspondente e o valor é conservado. No **BANZA** é um **invariante** obrigatório do ledger — nenhum valor é criado ou destruído.",
    sources: s("adr006", "invariants"),
  },
  {
    id: "def-balance",
    deterministic: true,
    critical: true, keywords: ["saldo", "o que e saldo", "balance", "what is balance", "what is a balance"],
    answer:
      "**Saldo (balance)** é o valor de uma conta. No **BANZA**, os saldos são sempre **derivados do ledger** (nunca actualizados directamente) e nunca podem ficar negativos — é um invariante de comportamento. O protocolo não mantém contas reais.",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-available-balance",
    deterministic: true,
    critical: true, keywords: ["saldo disponivel", "o que e saldo disponivel", "available balance", "what is available balance"],
    answer:
      "**Saldo disponível** é a parte do saldo que pode ser usada numa operação. No **BANZA** aparece como invariante de comportamento (derivado do ledger); o protocolo não mantém contas reais nem move fundos.",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-reserved-balance",
    deterministic: true,
    critical: true, keywords: ["saldo reservado", "o que e saldo reservado", "reserved balance", "what is reserved balance"],
    answer:
      "**Saldo reservado** é a parte do saldo temporariamente bloqueada para uma operação pendente. No **BANZA** é um invariante de comportamento derivado do ledger; não corresponde a fundos reais retidos pelo protocolo.",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-wallet",
    deterministic: true,
    critical: true, keywords: ["wallet", "o que e wallet", "carteira", "carteira digital", "o que e carteira digital", "o que e uma carteira", "what is a wallet"],
    answer:
      "**Carteira (wallet)** é uma conta digital que detém um saldo. É um conceito que um **operador** implementa; o **BANZA não é uma carteira** — define invariantes (saldos derivados do ledger, sem saldo negativo), não guarda fundos reais.",
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-payment",
    deterministic: true,
    critical: true, keywords: ["pagamento", "o que e pagamento", "payment", "what is a payment", "pagamento instantaneo"],
    answer:
      "**Pagamento** é a transferência de valor de um ordenante (payer) para um beneficiário (payee), tipicamente via um comerciante. No **BANZA** os fluxos de pagamento são modelados por contratos e invariantes (ledger, idempotência, QR); o protocolo **não move dinheiro real**.",
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-qr",
    deterministic: true,
    critical: true, keywords: ["qr", "pagamento qr", "o que e pagamento qr", "payment request", "o que e qr", "what is a qr payment"],
    answer:
      "Um **pagamento QR** é um pedido de pagamento representado num código QR que o pagador confirma. No **BANZA** o QR tem invariantes (resolução única, uso único de QR dinâmico, expiração — INV-QR); é uma simulação/contrato, não movimento de dinheiro real.",
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-payment-link",
    deterministic: true,
    critical: true, keywords: ["payment link", "o que e payment link", "link de pagamento", "o que e link de pagamento", "what is a payment link"],
    answer:
      "Um **payment link** (link de pagamento) é uma ligação partilhável que inicia um pedido de pagamento. É um conceito de produto que um operador implementa; o **BANZA** define contratos/invariantes, não processa pagamentos reais.",
    sources: s("specOverview", "glossary"),
  },
  {
    id: "def-idempotency",
    deterministic: true,
    critical: true, keywords: ["idempotencia", "o que e idempotencia", "idempotency", "idempotent", "what is idempotency", "chave de idempotencia"],
    answer:
      "**Idempotência** significa que repetir o mesmo pedido (com a mesma **chave de idempotência**) produz o mesmo resultado, sem duplicar efeitos. No **BANZA** é um **invariante** (INV-IDEM) — toda operação financeira é replay-safe.",
    sources: s("invariants", "gettingStarted"),
  },
  {
    id: "def-webhook",
    deterministic: true,
    critical: true, keywords: ["webhook", "o que e webhook", "what is a webhook"],
    answer:
      "Um **webhook** é uma entrega de eventos de um sistema para outro (com reentrega/assinatura, quando aplicável). É um mecanismo de integração que um operador implementa; explicação geral, não uma regra normativa específica do BANZA.",
    sources: s("glossary", "specOverview"),
  },
  {
    id: "def-refund",
    deterministic: true,
    critical: true, keywords: ["reembolso", "o que e reembolso", "refund", "estorno", "o que e estorno", "reversal", "reversao", "what is a refund"],
    answer:
      "**Reembolso/estorno (refund/reversal)** é a devolução de valor ligada a uma transacção original. No **BANZA** ajusta o ledger fictício sem criar nem destruir valor (dupla-entrada); um estorno é uma reversão referenciada à operação de origem. O protocolo não move fundos reais.",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-reconciliation",
    deterministic: true,
    critical: true, keywords: ["reconciliacao", "o que e reconciliacao", "reconciliation", "what is reconciliation"],
    answer:
      "**Reconciliação** é re-derivar os saldos a partir dos movimentos (não confiar nos saldos) para confirmar que não há discrepâncias e que o total é conservado. No **BANZA** é um **invariante** (INV-RECON), externamente reconciliável.",
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-settlement",
    deterministic: true,
    critical: true, keywords: ["liquidacao", "o que e liquidacao", "settlement", "what is settlement"],
    answer:
      "Em finanças, **liquidação (settlement)** é o processo pelo qual uma obrigação de pagamento é **finalizada** entre as partes. No **BANZA**, o protocolo pode definir evidência, invariantes e interoperabilidade, mas **não liquida dinheiro real nem movimenta fundos** — a liquidação real pertence aos operadores/infra-estruturas financeiras aplicáveis.",
    sources: s("invariants", "specOverview", "glossary"),
  },
  {
    id: "def-clearing",
    deterministic: true,
    critical: true, keywords: ["compensacao", "o que e compensacao", "clearing", "what is clearing"],
    answer:
      "**Compensação (clearing)** é a fase de apuramento e troca de instruções de pagamento antes da liquidação. É um conceito do domínio de pagamentos; o **BANZA não compensa nem liquida fundos reais** — é uma camada de protocolo/interoperabilidade.",
    sources: s("glossary", "specOverview"),
  },
  {
    id: "def-fee",
    deterministic: true,
    critical: true, keywords: ["comissao", "o que e comissao", "fee", "taxa", "o que e taxa", "what is a fee"],
    answer:
      "**Comissão/taxa (fee)** é um encargo sobre uma operação. No **BANZA** os montantes seguem a aritmética do ledger (bruto/líquido, sem criação de dinheiro); a cobrança real pertence ao operador — explicação geral, não uma regra específica do protocolo.",
    sources: s("invariants", "glossary"),
  },

  // Layer C — risk / regulatory boundary (explained with caution; never a legal opinion)
  {
    id: "def-psp",
    deterministic: true,
    critical: true, keywords: ["psp", "o que e psp", "o que e um psp", "prestador de servicos de pagamento", "payment service provider", "what is a psp", "banza e psp", "banza e um psp", "is banza a psp"],
    answer:
      "**PSP** significa **prestador de serviços de pagamento** — um operador (licenciado) que presta serviços de pagamento. O **BANZA não é um PSP**; é um **protocolo**. Qualquer prestação de serviço financeiro pertence a operadores independentes e ao seu enquadramento legal/regulatório.",
    sources: s("adr018", "adr019", "glossary"),
  },
  {
    id: "def-bank",
    deterministic: true,
    critical: true, keywords: ["banco", "o que e um banco", "bank", "banza e banco", "banza e um banco", "is banza a bank", "instituicao financeira"],
    answer:
      "Um **banco** é uma instituição financeira licenciada. O **BANZA não é um banco** nem uma instituição financeira — é um protocolo aberto e neutro em relação a operadores; não detém fundos nem presta serviços financeiros.",
    sources: s("adr018", "glossary"),
  },
  {
    id: "def-fintech",
    deterministic: true,
    critical: true, keywords: ["fintech", "o que e fintech", "o que e uma fintech", "what is fintech"],
    answer:
      "**Fintech** é uma empresa/solução tecnológica no domínio financeiro. O **BANZA é um protocolo**, não uma empresa fintech operacional; operadores (que podem ser fintechs) implementam o protocolo, cada um no seu enquadramento.",
    sources: s("glossary", "adr018"),
  },
  {
    id: "def-kyc",
    deterministic: true,
    critical: true, keywords: ["kyc", "o que e kyc", "know your customer", "what is kyc"],
    answer:
      "**KYC** (Know Your Customer) é a identificação e verificação do cliente. É um requisito **regulatório/de compliance** que pertence aos operadores e às autoridades competentes; o **BANZA não define uma regra normativa de KYC** e o BanzAI não dá parecer legal.",
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-kyb",
    deterministic: true,
    critical: true, keywords: ["kyb", "o que e kyb", "know your business", "what is kyb"],
    answer:
      "**KYB** (Know Your Business) é a identificação e verificação de uma empresa/comerciante. Tal como o KYC, é um requisito regulatório dos operadores e das autoridades competentes; o **BANZA não o define** e o BanzAI não dá parecer legal.",
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-aml-cft",
    deterministic: true,
    critical: true, keywords: ["aml", "cft", "o que e aml", "aml/cft", "o que e aml/cft", "branqueamento de capitais", "lavagem de dinheiro", "what is aml", "what is aml/cft"],
    answer:
      "**AML/CFT** é a prevenção de **branqueamento de capitais** e de **financiamento do terrorismo**. É um domínio **regulatório** fora do protocolo — pertence aos operadores e às autoridades competentes. O **BANZA não define regras de AML/CFT** e o BanzAI não dá parecer legal.",
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-bna",
    deterministic: true,
    critical: true, keywords: ["bna", "o que e o bna", "o que e bna", "banco nacional de angola", "what is the bna", "banza substitui o bna", "banza substitui bna"],
    answer:
      "**BNA** é o **Banco Nacional de Angola** — o banco central / supervisor financeiro (um regulador). O **BANZA não substitui o regulador** nem qualquer sistema nacional de pagamentos; é uma camada de protocolo/interoperabilidade e não afirma integração nem decisões em nome de terceiros sem fonte.",
    sources: s("glossary", "adr018"),
  },
  {
    id: "def-sandbox",
    deterministic: true,
    critical: true, keywords: ["sandbox", "o que e sandbox", "sandbox regulatoria", "o que e sandbox regulatoria", "what is a sandbox"],
    answer:
      "**Sandbox** é um ambiente de **teste/piloto**, não de produção. Uma sandbox regulatória é um regime supervisionado para testar soluções; no **BANZA**, ambientes demo/sandbox produzem evidência técnica e **não** representam produção nem autorização.",
    sources: s("glossary", "gettingStarted"),
  },
  {
    id: "def-payment-systems",
    deterministic: true,
    critical: true, keywords: ["rail de pagamento", "o que e um rail de pagamento", "sistema de pagamentos", "o que e sistema de pagamentos", "national payment system", "payment rail", "banza substitui emis", "banza substitui os bancos", "banza substitui o sistema nacional"],
    answer:
      "**Sistemas/rails de pagamento** são a infra-estrutura partilhada que move pagamentos entre instituições (comutadores interbancários, sistemas nacionais, sistemas em tempo real). O **BANZA é uma camada de protocolo/interoperabilidade** — **não substitui nem integra** sistemas nacionais, reguladores ou bancos, e não nomeia sistemas comerciais específicos.",
    sources: s("specOverview", "adr018", "glossary"),
  },
];

// Normalise for matching: lowercase, strip accents and punctuation, collapse spaces.
export function normalize(q) {
  // Normalization is Rust (WASM). No JS normalization logic here.
  return kb.normalize_query(String(q || ""));
}

// Deterministic retrieval: score entries by keyword-substring hits; return the best
// entry above threshold, else null (→ "insufficient sources").
export function retrieve(question) {
  return retrieveTopK(question, 1)[0] || null;
}

// Look up a single entry (data) by id — used by the pipeline to serve the deterministic answer the
// routing policy selected for a critical-boundary intent.
const ENTRIES_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
/// Whether an id names a REGISTERED CRITICAL subject — one the engine claims to have a settled, sourced
/// answer for. Used to tell an internal inconsistency (we know this subject and produced no facts) from
/// ordinary absence of evidence (we know nothing about this).
export function isCriticalSubject(id) {
  if (!id) return false;
  const e = ENTRIES_BY_ID.get(id);
  if (e) return e.critical === true;
  // A concept/document id (ADR-004, a spec path) is critical when a critical entry cites it as one of its
  // establishing sources: the engine has committed to answering from that record.
  return ENTRIES.some(
    (x) => x.critical === true && (x.sources || []).some((sc) => (sc && (sc.id || sc.key)) === id),
  );
}

export function getEntry(id) {
  return ENTRIES_BY_ID.get(id) || null;
}

// M2.8G routing policy (ADR-036): the Rust engine decides how to answer — { action, entry_id, intent,
// reason }. action ∈ {"qwen","deterministic","refusal","insufficient"}. M2.8H adds short conversation
// context: `contextQuestions` are the previous USER questions (most-recent last); the Rust engine
// resolves anaphoric follow-ups ("dá exemplo aqui", "e em JSON?") into a retrieval query and returns
// { context_used, turns_used, resolved_query } too. Safety is never bypassed by context. The JS
// pipeline only executes this decision; it performs NO routing logic of its own (RUST_WRAPPER_ONLY).
/// M2.11D (QA-2) — routing WITH the operator's journey step. Layered on the base router in Rust:
/// safety and the critical boundary are decided first and unchanged.
export function routeWithJourney(question, journeyStep) {
  try {
    return JSON.parse(
      kb.route_question_with_journey_json(String(question || ""), String(journeyStep || "")),
    );
  } catch {
    return null;
  }
}

/// M2.11D (QA-3) — strip a leading echo of the question. Deterministic and narrow; the rule lives in
/// Rust (validate::strip_question_echo) so the prompt clause is not the only defence.
export function stripQuestionEcho(answer, question) {
  try {
    return String(kb.strip_question_echo_text(String(answer || ""), String(question || "")));
  } catch {
    return String(answer || "");
  }
}

export function route(question, contextQuestions = []) {
  const ctx = Array.isArray(contextQuestions) ? contextQuestions.map((q) => String(q || "")) : [];
  if (!ctx.length) return JSON.parse(kb.route_question_json(String(question || "")));
  return JSON.parse(kb.route_with_context_json(String(question || ""), JSON.stringify(ctx)));
}

// Top-K retrieval for the limited RAG context: the K best entries above threshold,
// best first. K is small by design — cost control starts at retrieval.
export function retrieveTopK(question, k = 3) {
  // Rust (WASM) does the scoring/ranking; JS only maps the returned ids back to entries (data).
  const ids = JSON.parse(kb.retrieve_topk_ids_json(String(question || ""), k));
  const byId = new Map(ENTRIES.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// M2.9A (ADR-036): top-K DOCUMENTARY chunks (real protocol-doc excerpts from the build-time indexer),
// used ONLY to ENRICH the grounded context with additional real citations. Rust (WASM) scores; JS maps.
// Returns [{path,title,section,anchor,source_type,text}]. Never used for routing or as a fallback.
export function retrieveDocChunks(question, k = 2) {
  try {
    return JSON.parse(kb.retrieve_doc_chunks_json(String(question || ""), k));
  } catch {
    return [];
  }
}

// M2.13B PR2: top-K REPOSITORY-WIDE chunks (real code/docs/guards/license/website/Operador-Zero/report
// excerpts from BOTH repos, generated by banzai-repo-indexer). Used ONLY to ENRICH the grounded context
// with additional real, citable repo sources. Rust (WASM) scores; JS maps. Optional `categories` (array)
// restricts to those source categories. Never used for routing or as a fallback.
export function retrieveRepoChunks(question, k = 3, categories = []) {
  if (typeof kb.retrieve_repo_chunks_json !== "function") return [];
  try {
    return JSON.parse(
      kb.retrieve_repo_chunks_json(String(question || ""), k, (categories || []).join(","))
    );
  } catch {
    return [];
  }
}

// M2.13C-A: the INTENT FAMILY for an ambiguous protocol question (label only; never changes routing).
// Rust classifies; JS is glue. One of: software_license_query, financial_authorization_query,
// operator_certification_query, trademark_usage_query, protocol_rule_query, implementation_query,
// route_state_query, security_action_query, general_query.
export function classifyQueryIntent(question) {
  try {
    return String(kb.classify_query_intent_str(String(question || "")));
  } catch {
    return "general_query";
  }
}

// M2.14I (ADR-036): the primary human-operator interface intent — which workbench capability a
// human/operator request concerns (validate_manifest, explain_protocol, governance_guidance, …). Label
// only; routing/boundaries are unchanged. Used by the guard/tests to assert the orchestration router.
export function primaryInterfaceIntent(question) {
  try {
    return String(kb.primary_interface_intent_str(String(question || "")));
  } catch {
    return "fallback_clarification";
  }
}

// M2.14F: the ANSWER TYPE a question expects (capabilities_and_limits, yes_no_with_boundary, comparison,
// how_it_works, example_safe, implementation_stack, governance_explanation, operator_zero_guidance,
// financial_concept, safe_refusal, definition, follow_up_expansion, fallback_clarification). Rust
// classifies; JS is glue. Telemetry/composition label only — never changes routing or safety.
export function answerType(question) {
  try {
    return String(kb.answer_type_str(String(question || "")));
  } catch {
    return "fallback_clarification";
  }
}

// M2.13C-A: the SOURCE-RANKING matrix for a question's intent — { intent, primary:[cats], penalize:[cats] }.
// Primary categories are the source class this family should cite first; penalize are pushed down.
export function intentSourceRanking(question) {
  try {
    return JSON.parse(kb.intent_source_ranking_json(String(question || "")));
  } catch {
    return { intent: "general_query", primary: [], penalize: [] };
  }
}

// M2.13C-A: repo-wide chunks RANKED by intent — prioritise the family's primary source categories,
// falling back to the unfiltered ranking when the primary categories yield nothing. Additive; used to
// enrich a grounded answer's citations with the RIGHT source class (software licence vs regulatory,
// norm vs implementation, …). Rust scores/filters; JS only picks the category set.
export function rankedRepoChunks(question, k = 3) {
  const { primary } = intentSourceRanking(question);
  if (Array.isArray(primary) && primary.length) {
    const primed = retrieveRepoChunks(question, k, primary);
    if (primed.length) return primed;
  }
  return retrieveRepoChunks(question, k, []);
}

// M2.14E — inference-queue POLICY (Rust source of truth; JS is glue). `queuePriority` scores a
// model-bound request (high|normal|low) so the queue can reorder without bypassing safety/cache/limits;
// `queueShouldDedup` says whether a plain question is safe to de-duplicate against an identical in-flight
// one; `queuePublicMessage` is the single source of truth for the SAFE public message (never leaks
// "um pedido de cada vez", workers, locks or any internal architecture detail).
export function queuePriority(question) {
  try {
    return String(kb.queue_priority_str(String(question || "")));
  } catch {
    return "normal";
  }
}
export function queueShouldDedup(hasContext, hasJourney, hasDocument, hasUploads) {
  try {
    return kb.queue_should_dedup_flag(!!hasContext, !!hasJourney, !!hasDocument, !!hasUploads) === "1";
  } catch {
    return false; // fail safe: when unsure, do NOT dedup
  }
}
export function queuePublicMessage(kind) {
  try {
    return String(kb.queue_public_message_str(String(kind || "")));
  } catch {
    return "O BanzAI está temporariamente indisponível. Tenta novamente dentro de instantes.";
  }
}

// M2.13B PR2: the stable repo-index hash + safety-policy version. Part of the cache key so a changed
// index (new commit/content) or a changed safety policy invalidates every cached model answer.
export const REPO_INDEX_HASH =
  typeof kb.repo_index_hash_str === "function" ? String(kb.repo_index_hash_str() || "") : "";
// M2.13C-A bumped: intent disambiguation + source ranking changed how ambiguous questions are answered.
export const SAFETY_POLICY_VERSION = "m2.13c-a-intent-ranking-v1";

// Stable fingerprint of the source corpus. Cached answers are keyed on it, so any
// change to the knowledge base automatically invalidates every cache entry.
export const CORPUS_HASH = crypto
  .createHash("sha256")
  .update(JSON.stringify({ SOURCES, ENTRIES: ENTRIES.map((e) => ({ ...e, sources: e.sources.map((s) => s.id) })) }))
  .digest("hex");

// Build the bounded LLM context: at most `maxChunks` entries, truncated to
// `maxChars` total. Only approved fixture excerpts ever enter this context —
// never secrets, .env, dumps, logs, certificates or keys.
/**
 * M2.10A — resolve an EXPLICIT documentary reference (ADR/RFC) named in a question.
 *
 * Pure glue: Rust owns detection, the registry, padding-insensitive lookup and the canonical
 * sources. Returns `{detected:false}` when the question names no document, and
 * `{detected:true,found:false,id}` when it names one that does not exist — so the caller can say so
 * instead of degrading into a generic retrieval miss.
 */
export function resolveDocument(question) {
  if (typeof kb.resolve_document_json !== "function") return { detected: false };
  try {
    return JSON.parse(kb.resolve_document_json(String(question || "")));
  } catch {
    return { detected: false };
  }
}

// M2.18B.2 — deterministic candidate generation. For a natural-language question with no exact id, the
// Rust catalogue returns up to `max` REAL candidate documents the resolver selects among (it never
// invents an id). Returns [] when nothing scores above the floor. Thin wrapper — all logic is Rust.
export function generateCandidates(question, max = 4) {
  if (typeof kb.generate_candidates_json !== "function") return [];
  try {
    return JSON.parse(kb.generate_candidates_json(String(question || ""), Number(max) || 4));
  } catch {
    return [];
  }
}

// M2.18B.4 — the exact-vs-explanatory classifier (Rust-owned). Returns the typed verdict
// { class, exact_kind, escalated, reason }: class ∈ exact_fact | comparison | impact | explanation |
// safety_refusal. The single router uses this to decide a typed EXACT Rust terminal vs the explanatory
// trunk; the UI/JS never decides terminal type, escalation or reason. Null when the export is absent.
export function answerClass(question) {
  if (typeof kb.answer_class_json !== "function") return null;
  try {
    return JSON.parse(kb.answer_class_json(String(question || "")));
  } catch {
    return null;
  }
}

// A NORMATIVE DENIAL is served verbatim — the explanatory-cue escalation that turns a definition into a
// real explanation must not turn a denial into a paraphrase of one. Rust owns the list (route.rs); this
// only asks. Absent export → false, i.e. the pre-existing behaviour.
export function isVerbatimEntry(entryId) {
  if (typeof kb.is_verbatim_entry !== "function") return false;
  try {
    return Boolean(kb.is_verbatim_entry(String(entryId || "")));
  } catch {
    return false;
  }
}

// M2.18B.4 — resolve a broad concept question to its canonical source id (Rust-owned). Returns a
// registry ADR/RFC id (federation→ADR-025) OR a public Reference/spec/governance document PATH, or "" when
// the question names no single-canonical concept. The single router uses it to SEED the trunk's resolver
// and to know a concept has grounding before running the model. Never invents a source.
export function resolveConcept(question) {
  if (typeof kb.resolve_concept_source !== "function") return "";
  try {
    return String(kb.resolve_concept_source(String(question || "")) || "");
  } catch {
    return "";
  }
}

// M2.18B.4 — the typed TERMINAL for a question (Rust-owned): the single router's controlled exact exit.
// { kind, exact_kind, value, source, reason_code, trace_label, to_trunk, escalated }. to_trunk=true → the
// pipeline runs the grounded synthesis; otherwise the typed terminal is served directly (exact fact /
// refusal / clarification / insufficient / operational). The UI renders this; it never decides any field.
export function buildTerminal(question) {
  if (typeof kb.build_terminal_json !== "function") return null;
  try {
    return JSON.parse(kb.build_terminal_json(String(question || "")));
  } catch {
    return null;
  }
}

// M2.18B.6 (Rust-First Grounded Synthesis) — the deterministic, model-free understanding of a question.
// Given a question and the router's authoritative seed (empty ⇒ deterministic candidate selection),
// returns a typed ResolvedIntent (primary_intent + resolved_entity_id + depth + clarification + flags +
// boundary status + expected_model_calls). No model is invoked. See engines/banzai-query-core/src/resolve.rs.
export function resolveIntent(question, seededEntityId = "") {
  if (typeof kb.resolve_intent_json !== "function") return null;
  try {
    return JSON.parse(kb.resolve_intent_json(String(question || ""), String(seededEntityId || "")));
  } catch {
    return null;
  }
}

// BZC-1 — the deterministic entity + artifact + scope decision (Rust-owned). Returns
// { entity_id, entity_display, entity_type, protocol_scope, artifact_type, requires_live_tool,
// authority_requirement, resolution_method, live_required_answer }. The pipeline calls this BEFORE the
// documental fast path: when `requires_live_tool` is true the answer is about a specific implementation's
// LIVE artifact (e.g. the Operator Zero implementation manifest), NEVER a generic protocol document, and
// `live_required_answer` is the Rust-authored honest terminal to serve until the live tool (BZC-2) exists.
// All authority is decided in Rust; this wrapper only transports. See engines/banzai-query-core/src/artifact.rs.
export function resolveScope(question) {
  if (typeof kb.resolve_scope_json !== "function") return { requires_live_tool: false };
  try {
    return JSON.parse(kb.resolve_scope_json(String(question || "")));
  } catch {
    return { requires_live_tool: false };
  }
}

// ADR-036 — operational reasoning classification (duration/metric/live-state of the validation journey).
// Rust decides is_operational + subject/metric/aggregation + requires_live_data + the honest fallback text;
// this wrapper only transports. See engines/banzai-query-core/src/operational.rs.
export function resolveOperationalMetric(question) {
  if (typeof kb.resolve_operational_metric_json !== "function") return { is_operational: false };
  try {
    return JSON.parse(kb.resolve_operational_metric_json(String(question || "")));
  } catch {
    return { is_operational: false };
  }
}

// Increment 2 — the RICH typed operational-intent taxonomy (§3). Rust classifies the question into a
// QueryResolution (primary_intent + sub_intents + entities + subject + artifact/metric/aggregation/time/
// comparison/execution descriptors + profile/environment/version + requires_* flags + ambiguities +
// confidence + resolution_state + boundary flag). A boundary question is `boundary_request`, never
// reclassified. This wrapper only transports. See engines/banzai-query-core/src/taxonomy.rs.
export function resolveQuery(question) {
  if (typeof kb.resolve_query_json !== "function") return { primary_intent: "", sub_intents: [] };
  try {
    return JSON.parse(kb.resolve_query_json(String(question || "")));
  } catch {
    return { primary_intent: "", sub_intents: [] };
  }
}

// Increment 2 — the engine-decided CONTEXTUAL FALLBACK (§2/§4) that REPLACES the fixed topic list for an
// understood-but-unmapped, NON-boundary question. `situation` reports what physically happened at the call
// site ("tool_unavailable" | "insufficient_source" | "" = auto). Returns { kind, interpreted_intent,
// sub_intents, message }. Rust authors the request-oriented PT copy — never a generic topic list. The
// boundary/refusal path never calls this. See engines/banzai-query-core/src/taxonomy.rs.
export function contextualFallback(question, situation = "") {
  if (typeof kb.contextual_fallback_json !== "function") {
    return { kind: "insufficient_source", interpreted_intent: "", sub_intents: [], message: "" };
  }
  try {
    return JSON.parse(kb.contextual_fallback_json(String(question || ""), String(situation || "")));
  } catch {
    return { kind: "insufficient_source", interpreted_intent: "", sub_intents: [], message: "" };
  }
}

// Increment 6 — multi-turn conversational CONTEXT (§16-§17). Rust resolves the conversational references in a
// follow-up turn ("essa execução", "a anterior", "esse Manifesto", "e as chaves?", "porquê?", "compare com a
// última", "agora reproduza", "mostre o recibo") against the small, SAFE, technical-only prior context the
// client carried forward from the previous turn's answer meta. Returns the ResolvedContext { resolved_query,
// referent_kind, resolved_intent, execution_id, comparison_targets, artifact, operator_id, implementation_id,
// profile, environment, protocol_version, resolution_state, requires_clarification, clarification,
// boundary_detected, has_anaphora, has_prior_context }. SAFETY: a boundary turn is never resolved; an anaphor
// with no bindable prior context asks to clarify (never a guessed referent). The model never invents the
// referent. This wrapper only transports. See engines/banzai-query-core/src/context.rs.
export function resolveReferences(question, priorContext = {}) {
  const inert = {
    resolved_query: String(question || ""),
    has_anaphora: false,
    has_prior_context: false,
    referent_kind: "none",
    resolved_intent: "",
    execution_id: "",
    comparison_targets: [],
    artifact: "",
    resolution_state: "NO_ANAPHORA",
    requires_clarification: false,
    clarification: "",
    boundary_detected: false,
  };
  if (typeof kb.resolve_references_json !== "function") return inert;
  try {
    return JSON.parse(kb.resolve_references_json(String(question || ""), JSON.stringify(priorContext || {})));
  } catch {
    return inert;
  }
}

// PART 9 — deterministic candidate-only entity SELECTION + coherence over the SAME candidate list: confirm
// a model pick, drop an invented id, backfill the dominant candidate a document-directed question left
// empty, or ask to clarify. Returns { resolved_id, requires_clarification, clarification_candidates, reason }.
export function selectEntity(modelProposedId, modelRequiresClarification, primaryIntent, question, max = 5) {
  if (typeof kb.select_entity_json !== "function") {
    return { resolved_id: "", requires_clarification: false, clarification_candidates: [], reason: "selector unavailable" };
  }
  try {
    return JSON.parse(
      kb.select_entity_json(
        String(modelProposedId || ""),
        Boolean(modelRequiresClarification),
        String(primaryIntent || ""),
        String(question || ""),
        Number(max) || 5,
      ),
    );
  } catch {
    return { resolved_id: "", requires_clarification: false, clarification_candidates: [], reason: "selector threw" };
  }
}

// M2.18B.6 (§11) — build the SINGLE enriched FactualPackage from the Rust plans. Rust resolves the
// intent, plans the answer, plans retrieval/reranking and draws the facts from exactly the plan's
// eligible, public sources (conflict-excluded/historical/ineligible never drawn), embedding the three
// plans plus full provenance (states, conflicts, citation map, per-source + package checksums, claims
// allowed/forbidden, information gaps). This is the ONLY builder the grounded-synthesis trunk uses.
// `seed` is an optional pre-resolved entity id (""); `depthOverride` forces a depth ("" = the plan's).
// Returns the package object, or null when the export is absent / throws (→ caller declines to synthesise).
export function buildFactualPackagePlanned(traceId, question, seed = "", depthOverride = "") {
  if (typeof kb.build_factual_package_planned_json !== "function") return null;
  try {
    return JSON.parse(
      kb.build_factual_package_planned_json(String(traceId || ""), String(question || ""), String(seed || ""), String(depthOverride || "")),
    );
  } catch {
    return null;
  }
}

// Increment 4 (§7/§9) — build the TRANSVERSAL FactualPackage for an operational (telemetry) question from
// the SAME Rust resolution + ToolPlan the documentary trunk uses plus the deterministic tool output. Rust
// copies every number verbatim from the tool (SQL) — no model. `duration`, `claims`, `sources` are the
// telemetry tool's own outputs (durationView / durationClaims / telemetrySources). Returns the package, or
// null if the WASM export is absent.
export function buildOperationalPackage(traceId, question, duration = null, claims = [], sources = []) {
  if (typeof kb.build_operational_package_json !== "function") return null;
  try {
    return JSON.parse(
      kb.build_operational_package_json(
        String(traceId || ""),
        String(question || ""),
        JSON.stringify(duration || {}),
        JSON.stringify(Array.isArray(claims) ? claims : []),
        JSON.stringify(Array.isArray(sources) ? sources : []),
      ),
    );
  } catch {
    return null;
  }
}

// Increment 4 (§8/§9) — the claim taxonomy + claim/citation VERIFIER, on the composed answer BEFORE it is
// returned (documentary trunk AND operational path). Classifies every claim (SUPPORTED | DERIVED | ESTIMATED
// | HYPOTHETICAL | UNSUPPORTED) and enforces the label/exposure/causality/BZO-9 rules + citation resolution.
// `outputObj` is {answer_markdown, claims:[{claim,fact_ids?,category?}], cited_source_ids}. Returns the
// ClaimVerdict; ok:false ⇒ the pipeline must NOT publish (serve the deterministic/contextual fallback).
export function verifyClaims(packageObj, outputObj) {
  if (typeof kb.verify_claims_json !== "function" || !packageObj) {
    return { ok: false, errors: ["claim verifier unavailable"] };
  }
  try {
    return JSON.parse(kb.verify_claims_json(JSON.stringify(packageObj), JSON.stringify(outputObj || {})));
  } catch {
    return { ok: false, errors: ["claim verifier threw"] };
  }
}

// Increment 5 (§10) — resolve + explain the reason code a question NAMES, from the reason-code registry
// (reason.rs). Returns { found, code, explanation, answer_class, is_internal_coverage_failure }; found:false
// when the question names no known code (→ the family serves an honest fallback). Rust decides; TS transports.
export function explainReasonCode(question) {
  if (typeof kb.explain_reason_code_json !== "function") return { found: false };
  try {
    return JSON.parse(kb.explain_reason_code_json(String(question || "")));
  } catch {
    return { found: false };
  }
}

// Increment 5 (§10–§13) — build the TRANSVERSAL FactualPackage for a TOOL-BACKED question family (reason
// code / execution comparison / diagnosis) from the SAME Rust resolution + ToolPlan plus the deterministic
// tool output. `toolResults` is [{tool,source_id,title,path,text,kind,observed_at,sha256}]; every fact's text
// is copied verbatim from a tool result — no model. Returns the FactualPackage, or null if the export absent.
export function buildFamilyPackage(traceId, question, toolResults = []) {
  if (typeof kb.build_family_package_json !== "function") return null;
  try {
    return JSON.parse(
      kb.build_family_package_json(String(traceId || ""), String(question || ""), JSON.stringify(Array.isArray(toolResults) ? toolResults : [])),
    );
  } catch {
    return null;
  }
}

// Increment 5 (§13) — the deterministic diagnosis classifier: separate observed cause / consequence /
// hypothesis / suggestion from a persisted execution's own step receipts + reason codes. Causality only where
// a receipt supports it. `input` is {execution_id, overall_status, steps:[{step_id,status,reason_codes}]} from
// receipts.readExecution. Returns {execution_id, overall_status, has_failure, lines:[{label,text,supported,
// step_id,reason_code}]}. Rust decides; TS transports.
export function classifyDiagnosis(input) {
  const empty = { execution_id: "", overall_status: "", has_failure: false, lines: [] };
  if (typeof kb.classify_diagnosis_json !== "function") return empty;
  try {
    return JSON.parse(kb.classify_diagnosis_json(JSON.stringify(input || {})));
  } catch {
    return empty;
  }
}

// M2.18B.6 (§14) — the Rust-owned contract versions (single source of truth). The service binds these
// into the answer cache key (any contract change invalidates cached answers) and asserts them at startup.
// Returns { factual_package_version, prompt_version, validator_policy_version }; a safe stub if absent.
export function contractVersions() {
  const stub = { factual_package_version: 0, prompt_version: "", validator_policy_version: "" };
  if (typeof kb.contract_versions_json !== "function") return stub;
  try {
    return { ...stub, ...JSON.parse(kb.contract_versions_json()) };
  } catch {
    return stub;
  }
}

// M2.18B.7 — the canonical entity ids that carry declared primary-source coverage (coverage.rs). The
// pipeline seeds the grounded trunk with the router's canonical-entity entry id ONLY when it is one of
// these, so a definition/explanation about a known entity grounds on the entity's primary sources instead
// of degrading to a generic answer. Computed once; empty set if the WASM export is absent.
let _coveredEntitiesCache = null;
export function coveredEntities() {
  if (_coveredEntitiesCache) return _coveredEntitiesCache;
  let list = [];
  if (typeof kb.covered_entities_json === "function") {
    try {
      const parsed = JSON.parse(kb.covered_entities_json());
      if (Array.isArray(parsed)) list = parsed.filter((x) => typeof x === "string");
    } catch {
      list = [];
    }
  }
  _coveredEntitiesCache = new Set(list);
  return _coveredEntitiesCache;
}

// M2.18B.7 — deterministic exact-fact / attribute answer (creation year/date, …). Returns the
// AttributeAnswer { entity_id, attribute_id, status, answer, reason_code, source_id } when the question is
// an attribute question the registry owns, else null (the pipeline continues to normal grounding). 0 model
// calls. The NOT_DECLARED answer is a PRECISE contextual message, never the generic topic list.
export function attributeAnswer(question) {
  if (typeof kb.attribute_answer_json !== "function") return null;
  try {
    const a = JSON.parse(kb.attribute_answer_json(String(question || "")));
    return a && a.matched ? a : null;
  } catch {
    return null;
  }
}

// M2.18B.7 (Semantic Task Fulfilment) — the resolved AnswerObligationSet (task ontology + what a fulfilling
// answer must deliver). Returns the parsed object (never null; a plain question still yields an Explanation
// obligation). The raw JSON is kept on `._raw` so it can be passed straight to the other WASM entry points.
export function answerObligations(question, seed = "") {
  if (typeof kb.answer_obligations_json !== "function") return null;
  try {
    const raw = kb.answer_obligations_json(String(question || ""), String(seed || ""));
    const o = JSON.parse(raw);
    Object.defineProperty(o, "_raw", { value: raw, enumerable: false });
    return o;
  } catch {
    return null;
  }
}

// A deterministic tasked terminal (0-model) for the structural/example/procedure cases, or null when the
// grounded trunk should handle the question.
export function taskedAnswer(question, seed = "") {
  if (typeof kb.tasked_answer_json !== "function") return null;
  try {
    const a = JSON.parse(kb.tasked_answer_json(String(question || ""), String(seed || "")));
    return a && a.matched ? a : null;
  } catch {
    return null;
  }
}

// M2.18B.7 (fallback fix) — a deterministic DOCUMENT-LOOKUP card (0 model calls) for a bare document
// reference ("ADR-001", "RFC-0006"). Returns null when the question is not a lookup (an explain/impact/
// summary request escalates to the grounded trunk) or the document does not resolve. `documentId` is the
// optional structured id from the "Explicar com BanzAI" button; "" means "detect from the question".
export function documentLookup(question, documentId = "") {
  if (typeof kb.document_lookup_card_json !== "function") return null;
  try {
    const c = JSON.parse(kb.document_lookup_card_json(String(question || ""), String(documentId || "")));
    return c && c.matched ? c : null;
  } catch {
    return null;
  }
}

// The obligations-aware output-synthesis prompt ({system,user}) — base grounding PLUS the per-task
// output-shape directive so the model FULFILS the task. `obligationsJson` is the raw string from
// answerObligations(...)._raw. Falls back to null so the caller can use the plain prompt.
export function buildOutputPromptObliged(question, pkg, depth, obligationsJson) {
  if (typeof kb.build_output_prompt_obliged_json !== "function") return null;
  try {
    const p = JSON.parse(
      kb.build_output_prompt_obliged_json(String(question || ""), JSON.stringify(pkg), String(depth || "brief"), String(obligationsJson || "")),
    );
    return p && p.system ? p : null;
  } catch {
    return null;
  }
}

// The deterministic Task-Completion verdict: does the produced answer FULFIL the task's obligations?
// `citedIds` is an array of source ids. `publishable:false` means the pipeline must NOT publish as success.
export function taskCompletion(obligationsJson, answerMarkdown, citedIds, factsAvailable, sourceAppropriate) {
  if (typeof kb.task_completion_json !== "function") return null;
  try {
    const v = JSON.parse(
      kb.task_completion_json(
        String(obligationsJson || ""),
        String(answerMarkdown || ""),
        JSON.stringify(Array.isArray(citedIds) ? citedIds : []),
        Number(factsAvailable) || 0,
        Boolean(sourceAppropriate),
      ),
    );
    return v && v.status ? v : null;
  } catch {
    return null;
  }
}

// M2.18B.7 (TFG-3) — classify HOW conversation context resolved the current turn (typed trace) and the
// question whose TASK governs the answer shape (the current turn always wins). Returns
// { context_used_for, task_question }; on any failure returns { context_used_for: "none", task_question: raw }
// so the caller degrades to the current turn (fecho por omissão — context never silently changes the task).
export function contextUsedFor(rawQuestion, resolvedQuery, hasContext) {
  const fallback = { context_used_for: "none", task_question: String(rawQuestion || "") };
  if (typeof kb.context_used_for_json !== "function") return fallback;
  try {
    const v = JSON.parse(
      kb.context_used_for_json(String(rawQuestion || ""), String(resolvedQuery || ""), Boolean(hasContext)),
    );
    return v && v.context_used_for ? v : fallback;
  } catch {
    return fallback;
  }
}

// M2.18B.6 (§13) — startup self-check (fecho por omissão): the single Grounded-Synthesis contract requires every
// one of these Rust/WASM exports. If any is missing the trunk cannot resolve/plan/build/validate and MUST
// fall back to deterministic grounding (never publish an unvalidated model answer). Returns
// { ready, missing[] } so the server can assert it loudly at boot. Pure; no side effects.
const SINGLE_CONTRACT_EXPORTS = [
  "resolve_intent_json",
  "build_factual_package_planned_json",
  "build_output_prompt_json",
  "output_schema_json",
  "validate_output_json",
  "contract_versions_json",
];
export function singleContractSelfCheck() {
  const missing = SINGLE_CONTRACT_EXPORTS.filter((name) => typeof kb[name] !== "function");
  return { ready: missing.length === 0, missing };
}

// M2.18B.5 — deterministic typo tolerance / intent recovery (Rust). Returns { original, normalized,
// corrected_query, band ("exact"|"high_confidence"|"ambiguous"), corrections[], clarification[],
// requires_clarification, automatic, reason }. The router applies a high-confidence corrected_query to a
// COPY of the question and re-runs the exact resolvers + boundary on it; an ambiguous band drives a Rust
// clarification. Fuzzy never overtakes an exact match. Safe empty result if the export is absent / throws.
export function recoverQuery(question) {
  const empty = { original: String(question || ""), normalized: "", corrected_query: String(question || ""), band: "exact", corrections: [], clarification: [], requires_clarification: false, automatic: false, reason: "recover unavailable" };
  if (typeof kb.recover_query_json !== "function") return empty;
  try {
    const r = JSON.parse(kb.recover_query_json(String(question || "")));
    return r && typeof r === "object" ? r : empty;
  } catch {
    return empty;
  }
}

// M2.18B.5 §25 — the canonical alias TRUTH TABLE + silent collisions (Rust-derived), for the
// alias-integrity guard and the report appendix. { rows:[{id,alias,normalized,source}], collisions:[[alias,[ids]]], count }.
export function aliasTruthTable() {
  if (typeof kb.alias_truth_table_json !== "function") return { rows: [], collisions: [], count: 0 };
  try {
    return JSON.parse(kb.alias_truth_table_json());
  } catch {
    return { rows: [], collisions: [], count: 0 };
  }
}

// M2.18B.4-R2 — the canonical ids of every EXPLICIT documentary reference in a question, first-appearance
// order (["ADR-035","ADR-036"] for "compara a ADR-035 com a ADR-036"). Deterministic registry match; the
// compare path uses it to package all named documents. Returns [] when the export is absent / throws.
export function detectDocRefs(question) {
  if (typeof kb.detect_doc_refs_json !== "function") return [];
  try {
    const r = JSON.parse(kb.detect_doc_refs_json(String(question || "")));
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

// PART 11 — the output-pass prompt built from a FactualPackage at a given `depth` (brief default → a short
// 3-5 point answer, the dominant latency lever). Returns { system, user } or null.
export function buildOutputPrompt(question, packageObj, depth = "brief") {
  if (typeof kb.build_output_prompt_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.build_output_prompt_json(String(question || ""), JSON.stringify(packageObj), String(depth || "brief")));
    return r && !r.error ? r : null;
  } catch {
    return null;
  }
}

// PART 11 — the candidate-constrained OUTPUT schema for a FactualPackage: claims[].fact_ids and
// cited_source_ids are grammar-bound to the package's real ids. Returns the schema object or null.
export function outputSchema(packageObj) {
  if (typeof kb.output_schema_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.output_schema_json(JSON.stringify(packageObj)));
    return r && !r.error ? r : null;
  } catch {
    return null;
  }
}

// SPR-4 §5 — the STRUCTURED-generation output prompt (the model authors only the linguistic core; it is
// NOT asked to fill cited_source_ids). Returns { system, user } or null → caller falls back to the
// baseline buildOutputPrompt (fecho por omissão when the export is absent).
export function buildOutputPromptStructured(question, packageObj, depth = "brief") {
  if (typeof kb.build_output_prompt_structured_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.build_output_prompt_structured_json(String(question || ""), JSON.stringify(packageObj), String(depth || "brief")));
    return r && !r.error ? r : null;
  } catch {
    return null;
  }
}

// SPR-4 §5 — the obligations-aware STRUCTURED output prompt. Returns { system, user } or null.
export function buildOutputPromptObligedStructured(question, pkg, depth, obligationsJson) {
  if (typeof kb.build_output_prompt_obliged_structured_json !== "function") return null;
  try {
    const p = JSON.parse(
      kb.build_output_prompt_obliged_structured_json(String(question || ""), JSON.stringify(pkg), String(depth || "brief"), String(obligationsJson || "")),
    );
    return p && p.system ? p : null;
  } catch {
    return null;
  }
}

// SPR-4 §5 — the STRUCTURED-generation output schema (no cited_source_ids). Returns the schema or null.
export function outputSchemaStructured(packageObj) {
  if (typeof kb.output_schema_structured_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.output_schema_structured_json(JSON.stringify(packageObj)));
    return r && !r.error ? r : null;
  } catch {
    return null;
  }
}

// SPR-4 §5 — derive cited_source_ids deterministically from a grounded-output object's claim map against
// the FactualPackage (⊆ allowed_source_ids by construction). Returns a string array (empty on failure).
export function deriveCitedSourceIds(packageObj, outputObj) {
  if (typeof kb.derive_cited_source_ids_json !== "function" || !packageObj || !outputObj) return [];
  try {
    const r = JSON.parse(kb.derive_cited_source_ids_json(JSON.stringify(packageObj), JSON.stringify(outputObj)));
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

// PART 12 — the last deterministic gate: validate a grounded-output object against the FactualPackage it
// was built from. Returns the FactualVerdict; ok:false ⇒ the answer must NOT be published.
export function validateOutput(packageObj, outputObj) {
  if (typeof kb.validate_output_json !== "function" || !packageObj) {
    return { ok: false, errors: ["output validator unavailable"] };
  }
  try {
    return JSON.parse(kb.validate_output_json(JSON.stringify(packageObj), JSON.stringify(outputObj)));
  } catch {
    return { ok: false, errors: ["output validator threw"] };
  }
}

export function buildContext(question, { maxChunks = 3, maxChars = 6000, docChunks = 0, docChars = 600, repoChunks = 0, repoChars = 700, repoCategories = [], document = null } = {}) {
  const entries = retrieveTopK(question, maxChunks);
  const excerpts = [];
  const sourceById = new Map();
  let used = 0;

  // M2.10A — an EXPLICITLY named document leads the context. Its own sections are packed FIRST,
  // with their own budget, because the user asked about this document: generic similarity must not
  // be able to outrank or displace it. This is also why a resolved document alone is sufficient
  // context — a curated entry is no longer required for the question to be answerable.
  if (document && Array.isArray(document.sources) && document.sources.length) {
    const head = `${document.title} — Status: ${document.status || "n/d"} · Data: ${document.date || "n/d"} · ${document.path}`;
    excerpts.push({ id: document.id, text: head });
    let docBudget = Math.max(1200, Math.floor(maxChars * 0.75));
    for (const c of document.sources) {
      if (docBudget < 160) break;
      const body = String(c.chunk || "");
      const text = body.length > docBudget ? body.slice(0, docBudget) : body;
      if (!text) continue;
      docBudget -= text.length;
      used += text.length;
      excerpts.push({ id: `${document.id}#${c.section || ""}`, text });
    }
    sourceById.set(document.id, { id: document.id, title: document.title, path: document.path });
  }

  if (!entries.length && !excerpts.length) return null;
  for (const e of entries) {
    const text = e.answer.length + used > maxChars ? e.answer.slice(0, Math.max(0, maxChars - used)) : e.answer;
    if (!text) break;
    used += text.length;
    excerpts.push({ id: e.id, text });
    for (const src of e.sources) sourceById.set(src.id, src);
  }
  // M2.9A: optional ADDITIVE documentary enrichment — append up to `docChunks` real protocol-doc
  // excerpts (own `docChars` budget) as extra citations. Purely additive: the curated top entry stays
  // the primary grounding AND the deterministic fallback (below), so enrichment never changes routing
  // or the answer served when the model fails. Only approved doc chunks (indexer excludes secrets).
  if (docChunks > 0) {
    let docUsed = 0;
    for (const d of retrieveDocChunks(question, docChunks)) {
      const remaining = docChars - docUsed;
      if (remaining < 160) break;
      const text = d.text.length > remaining ? d.text.slice(0, remaining) : d.text;
      if (!text) break;
      docUsed += text.length;
      excerpts.push({ id: `DOC:${d.path}${d.anchor ? "#" + d.anchor : ""}`, text });
      const sid = `DOC-${d.path}`;
      if (!sourceById.has(sid)) {
        sourceById.set(sid, { id: (d.source_type || "DOC").toUpperCase(), title: `${d.title}${d.section ? " — " + d.section : ""}`, path: d.path });
      }
    }
  }
  // M2.13B PR2 — ADDITIVE repository-wide enrichment: append up to `repoChunks` real excerpts from the
  // repo-wide index (code/docs/guards/license/website/Operador-Zero/report, BOTH repos), each with its
  // repo + path + category as a citable source. Purely additive (never changes routing/fallback); the
  // index is secret-free (proven by make banzai-repo-knowledge-safety-check). `repoCategories` narrows
  // the search when the intent implies a category.
  if (repoChunks > 0) {
    let repoUsed = 0;
    // M2.13C-A: intent-ranked enrichment prioritises the family's primary source categories; if that
    // narrow set yields nothing, fall back to the unfiltered ranking so enrichment is never worse.
    let repoHits = retrieveRepoChunks(question, repoChunks, repoCategories);
    if (!repoHits.length && repoCategories && repoCategories.length) {
      repoHits = retrieveRepoChunks(question, repoChunks, []);
    }
    for (const r of repoHits) {
      const remaining = repoChars - repoUsed;
      if (remaining < 140) break;
      const text = r.text.length > remaining ? r.text.slice(0, remaining) : r.text;
      if (!text) break;
      repoUsed += text.length;
      const loc = r.line_start ? `:${r.line_start}` : "";
      excerpts.push({ id: `REPO:${r.repo}/${r.path}${loc}`, text });
      const sid = `REPO-${r.repo}-${r.path}`;
      if (!sourceById.has(sid)) {
        const shortRepo = String(r.repo || "").split("/").pop() || r.repo;
        sourceById.set(sid, {
          id: `${shortRepo}:${r.category}`,
          title: `${r.title || r.file_name}${r.heading && r.heading !== "summary" ? " — " + r.heading : ""}`,
          path: r.path,
          repo: r.repo,
          category: r.category,
        });
      }
    }
  }
  // M2.10A: a resolved document can be the ONLY grounding (no curated entry matched), so the
  // entry-derived fields fall back to the document itself rather than dereferencing an empty list.
  const lead = entries[0] || null;
  return {
    grounded: true,
    // M2.10B: the documentary mode Rust chose travels with the context, so build_prompt() can
    // attach the matching answer plan. Absent for non-documentary questions.
    document_mode: document && document.mode ? document.mode : undefined,
    entry_id: lead ? lead.id : document ? document.id : null,
    critical: Boolean(lead && lead.critical),
    answer: lead ? lead.answer : document ? `${document.title} — ${document.path}` : "",
    excerpts,
    // M2.18 (defence-in-depth): drop internal sources (assistant-instruction / secret files, e.g.
    // CLAUDE.md) here at the retrieval half too, via the Rust authority kb.source_is_public — so the
    // presentation-layer normalizeBanzaiAnswer is never the SOLE barrier. Pathless curated sources
    // (known ids) are kept; any source carrying an internal path is removed.
    sources: [...sourceById.values()].filter((s) => {
      const p = String((s && s.path) || "");
      return p === "" || kb.source_is_public(p, String((s && s.category) || ""));
    }),
  };
}

// ADR-036: language-generation control logic is Rust (engines/banzai-api-kb → WASM).
// JS builds NO prompt and validates NO answer of its own — these are thin wrappers.
// The prompt builder wraps sources + question as untrusted data (injection defence);
// the validator blocks completions that claim normative authority or leak internals.

// buildPrompt(question, context, mode) → { system, user } (Rust-built messages).
export function buildPrompt(question, context, mode = "fast") {
  return JSON.parse(
    kb.build_prompt_json(String(question || ""), JSON.stringify(context || {}), String(mode || "fast"))
  );
}

// validateResponse(text) → { ok, reason } (Rust post-response validator).
export function validateResponse(text) {
  return JSON.parse(kb.validate_response_json(String(text || "")));
}

// Increment 3 — the typed ToolPlanner (§5/§6). Rust resolves the question (taxonomy::resolve_query) and
// deterministically maps the resolution to an ordered plan of typed tool kinds — the model NEVER selects a
// tool. Returns { schema_version, primary_intent, steps:[{kind,reason,entity,scope,required,executable}],
// notes }. A boundary/refusal resolution yields exactly [HONEST_FALLBACK] (safety golden rule). This wrapper
// only transports; the toolplan.js adapter resolves an executable ToolKind to the already-existing callable.
// See engines/banzai-query-core/src/toolplan.rs.
export function planTools(question) {
  const empty = { schema_version: 1, primary_intent: "", steps: [], notes: [] };
  if (typeof kb.plan_tools_json !== "function") return empty;
  try {
    return JSON.parse(kb.plan_tools_json(String(question || "")));
  } catch {
    return empty;
  }
}

// Increment 3 — the full static tool-contract registry (all 19 ToolKinds with their complete ToolContract).
// Inspectable/guardable; every fallback chain terminates at HONEST_FALLBACK. Rust owns it; this transports.
export function toolContracts() {
  if (typeof kb.tool_contracts_json !== "function") return [];
  try {
    const parsed = JSON.parse(kb.tool_contracts_json());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Increment 3 — the closed reason-code set (reason.rs wire forms) the REASON_CODE_LOOKUP tool reuses. A thin
// transport over the existing Rust authority (no new logic). Returns [{code, is_internal_coverage_failure}].
export function reasonCodes() {
  if (typeof kb.reason_codes_json !== "function") return [];
  try {
    const parsed = JSON.parse(kb.reason_codes_json());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
