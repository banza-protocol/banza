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
import { profilePurpose } from "./profilePurposeLocale.js";

// Current lifecycle state, DERIVED from contracts/production/protocol-version.json by
// tools/gen-banzai-lifecycle-facts.py. Read here, never written here: version, pre-production and the
// freeze / independent-implementation / trial booleans have one owner, and a copy that can be edited
// separately is a copy that will one day disagree. AG-10 is deliberately absent — no tracked artifact
// records its run state, so there is nothing to derive.
const LIFECYCLE = createRequire(import.meta.url)("./lifecycleFacts.generated.json").facts;
const invariantFacts = createRequire(import.meta.url)("./invariantFacts.generated.json");

// Canonical source references (path + title). These are the citations BanzAI returns.
/// The DOCUMENT CLASS of a source — what kind of document it is, which is a different question from what
/// evidence role it played in an answer. An ADR can be establishing evidence; a specification can be
/// establishing or supporting. The card needs both, and one field cannot carry two dimensions.
///
/// This is declared HERE, at the registry that owns source metadata, and never inferred downstream. The
/// public card used to show `REFERÊNCIA` for every curated source — an ADR, a specification and a glossary
/// alike — because no class existed on this path at all and the frontend defaulted the missing value to
/// "reference". Nothing was dropped in transit; the class was never there.
///
/// The vocabulary reconciles with `SourceAnchor.kind` in engines/banzai-query-core/src/factpack.rs
/// ("adr" | "rfc" | "reference" | "spec" | "contract" | "conformance" | "governance" | "doc") and extends
/// it with "code", because that registry classifies documents and this one also cites engine and service
/// source files, which are not documents.
///
/// `reference` means the canonical descriptive Reference and nothing else. It is deliberately NOT the
/// fallback: a source whose class is unknown returns null and the card says FONTE/SOURCE, because an
/// absent classification is not evidence of canonical authority.
export function sourceKind(source) {
  const path = String((source && source.path) || "");
  if (!path) return null;
  if (path.startsWith("decisions/adr/")) return "adr";
  if (path.startsWith("decisions/rfc/")) return "rfc";
  // Only the canonical descriptive Reference, in either language edition.
  if (/^docs\/reference\/(pt\/BANZA_REFERENCIA|en\/BANZA_REFERENCE)\.md$/.test(path)) return "reference";
  if (path.startsWith("spec/")) return "spec";
  if (path.startsWith("contracts/")) return "contract";
  if (path.startsWith("conformance/")) return "conformance";
  if (
    path.startsWith("docs/governance/") ||
    ["GOVERNANCE.md", "MAINTAINERS.md", "CONTRIBUTING.md", "LICENSE", "NOTICE"].includes(path)
  ) {
    return "governance";
  }
  if (/^(engines|services|website|tools)\//.test(path) || path === "Makefile") return "code";
  if (path.startsWith("docs/") || ["README.md", "CHANGELOG.md"].includes(path)) return "doc";
  return null;
}

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

// The class is stamped onto the registry entries themselves, once, at the owner. Every consumer — the
// evidence layer, the presentation contract, the API, the card — then carries it without any plumbing that
// could quietly drop it, which is exactly how it went missing before: nothing dropped it, nobody set it.
for (const s of Object.values(SOURCES)) {
  const kind = sourceKind(s);
  if (kind) s.kind = kind;
}

// ── DOMAIN_KNOWLEDGE sources (ADR-036) ────────────────────────────────────────────────────────────
//
// Public technical authorities for the finance, security and distributed-systems vocabulary a reader
// needs in order to understand BANZA. They are declared with `class: "domain"` and that class is load-
// bearing: a domain source may support a DOMAIN claim and may NEVER support a BANZA-specific one. What
// a payment scheme is in general is not what BANZA requires, and the two must not be able to borrow
// each other's authority.
//
// No standard is reproduced here. Each concept below carries a CONCISE DERIVED definition written for
// this corpus, with the authority named so a reader can go and check it. That is deliberate: ingesting
// restricted standards wholesale is neither necessary to answer the question nor ours to do.
Object.assign(SOURCES, {
  "NIST-CSRC": { id: "NIST-CSRC", class: "domain", publisher: "NIST", authority: "standards body", title: "NIST Computer Security Resource Center glossary", url: "https://csrc.nist.gov/glossary" },
  "NIST-FIPS-186": { id: "NIST-FIPS-186", class: "domain", publisher: "NIST", authority: "standards body", title: "FIPS 186 — Digital Signature Standard", url: "https://csrc.nist.gov/pubs/fips/186-5/final" },
  "NIST-SP-800-57": { id: "NIST-SP-800-57", class: "domain", publisher: "NIST", authority: "standards body", title: "NIST SP 800-57 — Key management recommendations", url: "https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final" },
  "RFC-9110": { id: "RFC-9110", class: "domain", publisher: "IETF", authority: "standards body", title: "RFC 9110 — HTTP Semantics", url: "https://www.rfc-editor.org/rfc/rfc9110" },
  "RFC-8259": { id: "RFC-8259", class: "domain", publisher: "IETF", authority: "standards body", title: "RFC 8259 — The JavaScript Object Notation (JSON) Data Interchange Format", url: "https://www.rfc-editor.org/rfc/rfc8259" },
  "RFC-8032": { id: "RFC-8032", class: "domain", publisher: "IETF", authority: "standards body", title: "RFC 8032 — Edwards-Curve Digital Signature Algorithm (EdDSA)", url: "https://www.rfc-editor.org/rfc/rfc8032" },
  "RFC-8785": { id: "RFC-8785", class: "domain", publisher: "IETF", authority: "standards body", title: "RFC 8785 — JSON Canonicalization Scheme (JCS)", url: "https://www.rfc-editor.org/rfc/rfc8785" },
  "JSON-SCHEMA": { id: "JSON-SCHEMA", class: "domain", publisher: "JSON Schema", authority: "open specification", title: "JSON Schema — core and validation vocabulary", url: "https://json-schema.org/specification" },
  "BIS-CPMI": { id: "BIS-CPMI", class: "domain", publisher: "BIS / CPMI", authority: "international standard-setter", title: "CPMI glossary of payments and market infrastructure terminology", url: "https://www.bis.org/cpmi/publ/d00b.htm" },
  "BIS-PFMI": { id: "BIS-PFMI", class: "domain", publisher: "BIS / IOSCO", authority: "international standard-setter", title: "Principles for Financial Market Infrastructures", url: "https://www.bis.org/cpmi/publ/d101.htm" },
});

const s = (...keys) => keys.map((k) => SOURCES[k]);

/**
 * The CANONICAL DOMAIN SOURCE REGISTRY — the closed set of external authorities this corpus may cite.
 *
 * Eligibility is MEMBERSHIP, not shape. The first version of the citability rule asked whether a source
 * looked like a domain source — declared class, a publisher, an https URL — and anything carrying those
 * three fields would have been accepted, including a source id that arrived from retrieval and was
 * never declared anywhere. "No repository path" must not become "trusted by default"; it must mean
 * "eligible only if this registry names it".
 *
 * Keyed by source id, so a citation is checked against the identity it claims rather than against its
 * own description of itself. Unknown external ids fail closed.
 */
export const DOMAIN_SOURCE_REGISTRY = Object.freeze(
  Object.fromEntries(
    Object.values(SOURCES)
      .filter((x) => x && x.class === "domain")
      .map((x) => [
        x.id,
        Object.freeze({
          source_id: x.id,
          source_class: "DOMAIN",
          publisher: x.publisher,
          authority: x.authority,
          url: x.url,
          title: x.title,
          eligible: true,
        }),
      ]),
  ),
);

/** Whether a source id names a declared external DOMAIN authority. Fail-closed on anything else. */
export function isDeclaredDomainSource(id) {
  const key = String(id || "").trim();
  return Boolean(key) && Object.prototype.hasOwnProperty.call(DOMAIN_SOURCE_REGISTRY, key);
}

// Knowledge entries. `keywords` drive matching; `answer` is the deterministic body.

/** The profile levels, in registry order, as a compact PT/EN line each. */
function profileLines(locale) {
  return PROFILE_FACTS.profiles
    .map((p) => {
      const builds =
        p.includes && p.includes.length
          ? locale === "pt-PT"
            ? ` Inclui ${p.includes.join(", ")}.`
            : ` Includes ${p.includes.join(", ")}.`
          : "";
      // NOT p.purpose: that is canonical English source prose from the normative registry, and
      // interpolating it here is what put an English sentence inside the Portuguese answer.
      return `- **${p.level} — ${p.name}**: ${requirePurpose(p.level, locale)}${builds}`;
    })
    .join("\n");
}

/**
 * The localized purpose for a level, or a loud failure.
 *
 * Closed-world against the registry: the registry decides which levels exist, this refuses to render one
 * it has no prose for. Falling back to `p.purpose` would restore the exact defect in the exact place.
 */
function requirePurpose(level, locale) {
  const text = profilePurpose(level, locale);
  if (!text) {
    throw new Error(
      `knowledge: conformance profile ${level} has no ${locale} presentation in profilePurposeLocale.js. ` +
        `Add it there — the canonical registry's English purpose must never be used as a fallback.`,
    );
  }
  return text;
}

/** The L4 state, which readers ask about directly and which the registry states plainly. */
function l4Note(locale) {
  const l4 = PROFILE_FACTS.profiles.find((p) => p.external_profile_required);
  if (!l4) return "";
  const none = !(l4.published_external_profiles || []).length;
  if (!none) return "";
  return locale === "pt-PT"
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
    realizations: {
      "pt-PT":
        `Os **perfis de conformidade** do **BANZA** são **${PROFILE_FACTS.profiles.length}**, do **${PROFILE_FACTS.profiles[0].level}** ao **${PROFILE_FACTS.profiles[PROFILE_FACTS.profiles.length - 1].level}**:\n\n${profileLines("pt-PT")}\n\nUm perfil mede **capacidade técnica demonstrada**, e não é um estado de certificação, uma admissão operacional, uma permissão regulatória nem uma aprovação para produção.${l4Note("pt-PT")}`,
      en:
        `BANZA defines **${PROFILE_FACTS.profiles.length}** conformance profiles, **${PROFILE_FACTS.profiles[0].level}** through **${PROFILE_FACTS.profiles[PROFILE_FACTS.profiles.length - 1].level}**:\n\n${profileLines("en")}\n\nA profile measures **demonstrated technical capability**. It is never a certification state, an operational admission, a regulatory permission or a production approval.${l4Note("en")}`,
    },
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
    realizations: {
      "pt-PT":
        `O **${p.level}** é o perfil **${p.name}**. ${requirePurpose(p.level, "pt-PT")}` +
        (p.includes && p.includes.length ? ` Inclui ${p.includes.join(", ")}.` : "") +
        (p.awarded_by_sandbox_runner
          ? ` É demonstrável por um executor de sandbox.`
          : ` **Não** é atribuído por um executor de sandbox — a sua evidência não pode ser produzida por uma única implementação em ambiente simulado.`) +
        ` Um perfil mede **capacidade técnica**, não é certificação, admissão operacional nem autorização regulatória.` +
        (p.external_profile_required ? l4Note("pt-PT") : ""),
      en:
        `**${p.level}** is the **${p.name}** profile. ${requirePurpose(p.level, "en")}` +
        (p.includes && p.includes.length ? ` Includes ${p.includes.join(", ")}.` : "") +
        (p.awarded_by_sandbox_runner
          ? ` It is demonstrable by a sandbox runner.`
          : ` It is **not** awarded by a sandbox runner — its evidence cannot be produced by a single implementation in a simulated environment.`) +
        ` A profile measures **technical capability**; it is not certification, operational admission or regulatory authorization.` +
        (p.external_profile_required ? l4Note("en") : ""),
    },
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
    realizations: {
      "pt-PT":
        "BANZA é um protocolo financeiro aberto e neutro em relação a operadores. Define regras, invariantes, contratos e critérios de conformidade que qualquer operador pode implementar. Não é um operador, uma carteira, um processador de pagamentos nem um produto comercial.",
    // `claudeMd` was in this set and is NOT eligible public establishing evidence. The presentation filter
    // dropped it from the card, so nothing ever looked wrong — but the evidence GRAPH declared an
    // internal repository guide as part of what establishes the protocol's identity, and that is the
    // claim, not the rendering. Replaced by the public README, which is the repository's own entry point
    // for what BANZA is. Corrected BEFORE the deterministic declaration, not after: promoting an entry
    // whose establishing set is partly internal would have shipped the defect with more authority.,
      en:
        "BANZA is an open financial protocol, neutral with respect to operators. It defines rules, invariants, contracts and conformance criteria that any operator may implement. It is not an operator, a wallet, a payment processor or a commercial product.",
    },
    sources: s("readme", "adr018", "specOverview"),
  },
  {
    id: "what-is-banzami",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["o que e o banzami", "o que e banzami", "que e banzami", "banzami e o que", "quem e o banzami", "quem e banzami", "what is banzami", "who is banzami", "banzami"],
    realizations: {
      "pt-PT":
        "Banzami é a entidade/ecossistema que criou e mantém o projecto — o criador original e mantenedor institucional inicial. BANZA é o protocolo financeiro aberto e neutro. BanzAI é o agente IA do protocolo BANZA. São camadas distintas: Banzami (organização) ≠ BANZA (protocolo) ≠ BanzAI (agente). O BanzAI não transforma o Banzami em regra do protocolo nem confunde empresa, protocolo e agente; a governação é aberta e a conformidade demonstra-se por evidência verificável, não por uma autoridade central.",
      en:
        "Banzami is the entity and ecosystem that created and maintains the project — the original creator and initial institutional maintainer. BANZA is the open, neutral financial protocol. BanzAI is the AI agent of the BANZA protocol. They are distinct layers: Banzami (organization) ≠ BANZA (protocol) ≠ BanzAI (agent). BanzAI does not turn Banzami into a protocol rule and does not conflate company, protocol and agent; governance is open, and conformance is demonstrated by verifiable evidence rather than by a central authority.",
    },
    sources: s("governance", "adr025", "claudeMd"),
  },
  {
    id: "is-banza-an-operator",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banza e um operador", "banza is an operator", "banza e operador", "banza opera"],
    realizations: {
      "pt-PT":
        "Não. BANZA é o protocolo, não um operador. Operadores são externos e implementam o protocolo; a infraestrutura BANZA hospeda apenas a superfície pública do protocolo e o BanzAI, nunca lógica de operador (carteira, ledger de operador, KYC/KYB, pagamentos ou contas).",
      en:
        "No. BANZA is the protocol, not an operator. Operators are external and implement the protocol; BANZA infrastructure hosts only the protocol's public surface and BanzAI, never operator logic — no wallet, no operator ledger, no KYC/KYB, no payments and no accounts.",
    },
    sources: s("annex", "adr019"),
  },
  {
    id: "certified-operators",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["operadores certificados", "certified operators", "quem sao os operadores", "que operadores"],
    realizations: {
      "pt-PT":
        "No BANZA a participação demonstra-se por evidência verificável, não é concedida por uma autoridade central — não existem operadores certificados. Neste estado de pré-produção nenhum operador publicou evidência: a rota /operators reflecte o registo ao vivo, que não lista operadores. Operador A/B/C existem apenas em documentação e exemplos, nunca no registo ao vivo. A publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
      en:
        "In BANZA, participation is demonstrated by verifiable evidence; it is not granted by a central authority — there are no certified operators. In this pre-production state no operator has published evidence: the /operators route reflects the live registry, which lists none. Operator A/B/C exist only in documentation and examples, never in the live registry. Production publication depends on the offline root-key ceremony and on the first published production conformance evidence.",
    },
    sources: s("annex", "adr048", "state"),
  },
  {
    id: "pass-is-not-certificate",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["pass da conformance", "pass e certificado", "conformance suite e certificado", "pass conformance certificado", "pass is a certificate"],
    realizations: {
      "pt-PT":
        "Não. Um PASS da conformance suite é evidência técnica verificável, não um certificado. Não confere estatuto a nenhum operador: no BANZA a participação demonstra-se por evidência, não por certificação central. A publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
      en:
        "No. A PASS from the conformance suite is verifiable technical evidence, not a certificate. It confers status on no operator: in BANZA participation is demonstrated by evidence, not by central certification. Production publication depends on the offline root-key ceremony and on the first published production conformance evidence.",
    },
    sources: s("adr048", "state", "annex"),
  },
  {
    id: "banzai-cannot-certify",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banzai pode emitir certificado", "banzai emite certificado", "banzai can certify", "banzai certifica"],
    realizations: {
      "pt-PT":
        "Não. O BanzAI é o agente nativo do protocolo, não normativo: guia, invoca os motores verificáveis, explica regras, documentos e evidência e cita as suas fontes. Não emite certificados, não confere estatuto a nenhum operador e não substitui a conformance suite. BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide — o output de IA nunca é regra do protocolo.",
      en:
        "No. BanzAI is the protocol's native agent and is non-normative: it guides, invokes the verifiable engines, explains rules, documents and evidence, and cites its sources. It issues no certificates, confers status on no operator and does not replace the conformance suite. BanzAI guides; the engines verify; the evidence proves; the competent authority decides — AI output is never a protocol rule.",
    },
    sources: s("adr050", "annex"),
  },
  {
    // M2.14F — capabilities & limits. A "o que o BanzAI pode e não pode fazer?" question wants a
    // STRUCTURED answer (pode / não pode / regra prática), not a yes/no "Não…". Authored clean; the
    // emphasis layer bolds the entities; the section headers are literal markdown bold.
    id: "banzai-capabilities",
    critical: true,
    keywords: ["o que o banzai pode e nao pode fazer", "capacidades do banzai", "limites do banzai", "o que o banzai faz", "o que o banzai pode fazer", "o que o banzai nao pode fazer", "what can banzai do", "banzai capabilities"],
    realizations: {
      "pt-PT":
        "O BanzAI é o agente IA nativo do protocolo BANZA: ajuda a compreender, implementar e verificar o protocolo, mas não cria regras nem substitui os motores verificáveis.\n\n**O que pode fazer:**\n- explicar regras, documentos, ADRs, manifestos, evidência e fluxos do BANZA;\n- orientar operadores a preparar manifestos, evidence bundles e testes de conformidade;\n- invocar ou orientar os motores verificáveis e citar as fontes do protocolo;\n- ajudar a explorar os fluxos demo do Operador Zero (artefactos só de leitura, em KZ_DEMO, sem dinheiro real).\n\n**O que não pode fazer:**\n- certificar, aprovar ou licenciar operadores;\n- substituir a governança, as ADR/RFC ou a conformance suite;\n- criar regra normativa do protocolo;\n- movimentar fundos, executar pagamentos ou operar dinheiro real;\n- transformar KZ_DEMO em dinheiro real.\n\nRegra prática: o BanzAI guia, os motores verificam e a evidência prova — o output de IA nunca é regra do protocolo.",
      en:
        "BanzAI is the native AI agent of the BANZA protocol: it helps you understand, implement and verify the protocol, but it creates no rules and does not replace the verifiable engines.\n\n**What it can do:**\n- explain BANZA rules, documents, ADRs, manifests, evidence and flows;\n- guide operators in preparing manifests, evidence bundles and conformance tests;\n- invoke or guide the verifiable engines and cite the protocol's sources;\n- help explore Operator Zero's demo flows (read-only artifacts, in KZ_DEMO, with no real money).\n\n**What it cannot do:**\n- certify, approve or license operators;\n- replace governance, the ADRs/RFCs or the conformance suite;\n- create a normative rule of the protocol;\n- move funds, execute payments or operate real money;\n- turn KZ_DEMO into real money.\n\nThe working rule: BanzAI guides, the engines verify and the evidence proves — AI output is never a protocol rule.",
    },
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
    realizations: {
      "pt-PT":
        "O **BanzAI** é a interface humana primária e transversal para humanos e operadores interagirem com o protocolo **BANZA**.\n\nInterpreta pedidos, consulta a referência, orienta implementação, encaminha para motores verificáveis, explica resultados e ajuda a preparar evidência técnica. Sabe onde estão as capacidades — Guia, Manifest, Conformidade, Trust, Federação, Evidence Bundle, Traces, Referência, Programadores e Repositório — e encaminha para a etapa, documento, motor ou evidência correcta.\n\nMas o **BanzAI** **não** é fonte normativa, não certifica, não aprova operadores, não licencia, não publica operadores e não movimenta fundos, e **não substitui os motores verificáveis**, a evidência técnica ou a governança aberta.\n\nRegra prática: **BanzAI** guia; os motores verificam; a evidência prova; a autoridade competente decide.",
      en:
        "**BanzAI** is the primary, transversal human interface through which people and operators interact with the **BANZA** protocol.\n\nIt interprets requests, consults the Reference, guides implementation, routes to the verifiable engines, explains results and helps prepare technical evidence. It knows where the capabilities are — Guide, Manifest, Conformance, Trust, Federation, Evidence Bundle, Traces, Reference, Developers and Repository — and routes to the right step, document, engine or piece of evidence.\n\nBut **BanzAI** is **not** a normative source. It does not certify, does not approve operators, does not license, does not publish operators and moves no funds, and it **does not replace** the verifiable engines, the technical evidence or open governance.\n\nThe working rule: **BanzAI** guides; the engines verify; the evidence proves; the competent authority decides.",
    },
    sources: s("adr050", "annex", "claudeMd"),
  },
  {
    // M2.14I (ADR-036) — BanzAI is the primary interactive interface, but NOT mandatory for machine
    // surfaces. "todos os operadores devem usar o BanzAI?", "as APIs dependem do BanzAI?", "o BanzAI é
    // obrigatório para integração máquina-máquina?" → this answer.
    id: "banzai-not-mandatory",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Para a experiência interactiva do workbench, o **BanzAI** é a interface primária recomendada para humanos e operadores.\n\nMas o protocolo **BANZA** continua aberto e verificável por APIs, manifests, schemas, endpoints públicos e motores verificáveis — superfícies técnicas independentes da IA. **Integrações máquina-máquina não dependem obrigatoriamente do BanzAI**; qualquer sistema pode verificar o protocolo directamente pelos motores, schemas, manifests e endpoints.\n\nO **BanzAI** é a interface primária humano-operador, não um gatekeeper central nem um requisito de integração máquina-máquina.",
      en:
        "For the interactive workbench experience, **BanzAI** is the recommended primary interface for humans and operators.\n\nBut the **BANZA** protocol remains open and verifiable through APIs, manifests, schemas, public endpoints and verifiable engines — technical surfaces that are independent of the AI. **Machine-to-machine integrations do not depend on BanzAI**; any system can verify the protocol directly through the engines, schemas, manifests and endpoints.\n\n**BanzAI** is the primary human-operator interface, not a central gatekeeper and not a machine-to-machine integration requirement.",
    },
    sources: s("adr050", "annex", "claudeMd"),
  },
  {
    // M2.14I (ADR-036) — who verifies / BanzAI vs the engines. "quem verifica os resultados?", "qual é a
    // diferença entre BanzAI e os motores Rust/WASM?" → this answer.
    id: "banzai-vs-engines",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Os motores determinísticos **Rust/WASM** (conformidade, trust, verificação de invariantes, geração de evidence bundle) calculam e **verificam** os resultados técnicos. O **BanzAI** orienta, encaminha, invoca quando suportado e **explica** os resultados; a evidência prova.\n\nA diferença: os motores são a autoridade técnica verificável e reproduzível; o **BanzAI** é a interface humana primária que guia até eles — não os substitui nem decide por eles.\n\nRegra prática: **BanzAI** guia; os motores verificam; a evidência prova; a autoridade competente decide.",
      en:
        "The deterministic **Rust/WASM** engines — conformance, trust, invariant checking, evidence-bundle generation — compute and **verify** the technical results. **BanzAI** guides, routes, invokes them where supported and **explains** the results; the evidence proves.\n\nThe difference: the engines are the verifiable, reproducible technical authority; **BanzAI** is the primary human interface that leads you to them — it neither replaces them nor decides for them.\n\nThe working rule: **BanzAI** guides; the engines verify; the evidence proves; the competent authority decides.",
    },
    sources: s("adr050", "annex", "conformanceSuite"),
  },
  {
    id: "who-signs-protocol-metadata",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["quem assina a protocol metadata", "quem assina protocol metadata", "quem assina a metadata", "quem assina os metadados", "quem assina metadados do protocolo", "who signs protocol metadata", "assinatura da protocol metadata", "signed protocol metadata quem assina"],
    realizations: {
      "pt-PT":
        "A **Signed Protocol Metadata** é assinada pela **chave delegada do domínio protocol-metadata**, cuja autoridade rastreia à Raiz de Confiança através do **Manifesto de Chaves** — a raiz assina **apenas** o Manifesto de Chaves, nunca a metadata directamente (INV-ROOT-004; ADR-025). As restantes chaves delegadas assinam os artefactos dos seus domínios: a BRL pela chave do domínio de revogação (INV-ROOT-005) e a evidência de conformidade pelo domínio conformance-evidence. Nenhuma assinatura autoriza operadores, pagamentos ou licenças.",
      en:
        "**Signed Protocol Metadata** is signed by the **delegated key of the protocol-metadata domain**, whose authority traces to the Trust Root through the **Key Manifest** — the root signs **only** the Key Manifest, never the metadata directly (INV-ROOT-004; ADR-025). The other delegated keys sign the artifacts of their own domains: the BRL by the revocation-domain key (INV-ROOT-005), and conformance evidence by the conformance-evidence domain. No signature authorises operators, payments or licences.",
    },
    sources: s("adr079", "adr038", "annex"),
  },
  {
    id: "what-is-m2-milestone",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["o que e m2", "o que e o m2", "o que e m3", "o que sao m2 e m3", "m2 no banza", "m3 no banza", "what is m2", "milestone m2", "marco m2"],
    realizations: {
      "pt-PT":
        "«M2» e «M3» eram códigos internos de milestone do projecto — não são conceitos do protocolo e deixaram de ser usados nas superfícies públicas. As condições técnicas reais que representavam permanecem por extenso: a publicação de produção depende da **cerimónia offline da chave raiz** e da **primeira evidência de conformidade de produção publicada**. Nos contratos máquina sobrevivem apenas identificadores técnicos congelados (por exemplo, o estado `M2_PROTOCOL_IMPLEMENTATION` e o `m2_gate_status` calculado pelo motor Rust do protocol gate) — nomes de estados de contrato, não fases públicas do protocolo.",
      en:
        "\"M2\" and \"M3\" were internal project milestone codes — they are not protocol concepts and are no longer used on public surfaces. The real technical conditions they stood for remain, stated in full: production publication depends on the **offline root-key ceremony** and on the **first published production conformance evidence**. What survives in the machine contracts is only frozen technical identifiers — the `M2_PROTOCOL_IMPLEMENTATION` state, for instance, and the `m2_gate_status` computed by the Rust protocol-gate engine — contract state names, not public phases of the protocol.",
    },
    sources: s("state", "annex"),
  },
  {
    id: "root-keys",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["onde vivem as root keys", "root keys", "chaves raiz", "issuing keys", "onde estao as chaves"],
    realizations: {
      "pt-PT":
        "As root keys são offline e controladas por cerimónia; as chaves de emissão de produção também nunca residem na VM de serviço. A infraestrutura serve apenas artefactos públicos assinados e não guarda chaves privadas nem realiza assinatura.",
      en:
        "Root keys are offline and controlled by ceremony; production issuing keys likewise never reside on the serving VM. The infrastructure serves only public signed artifacts — it holds no private keys and performs no signing.",
    },
    sources: s("adr049", "annex"),
  },
  {
    id: "how-to-query-brl",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["como consultar a brl", "consultar brl", "revocation list", "lista de revogacao", "query brl", "revogar chave", "revogacao de chave", "chave de assinatura delegada", "delegated signing key revocation", "revogacao", "revocation", "banza revocation list", "como funciona a revogacao", "operador revogado", "operador suspenso", "revoked operator"],
    realizations: {
      "pt-PT":
        "A BRL (lista de revogação) é consultada na rota máquina GET /federation/revocation-list.json, servida como JSON pela verification-api. Em pré-produção devolve um envelope honesto (versão, entradas vazias, next_update) sem fingir dados de produção.",
      en:
        "The BRL (revocation list) is read from the machine route GET /federation/revocation-list.json, served as JSON by the verification-api. In pre-production it returns an honest envelope — version, empty entries, next_update — rather than pretending to hold production data.",
    },
    sources: s("adr048", "annex"),
  },
  {
    id: "empty-operators-meaning",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["operators vazio", "operators vazia", "empty operators", "/operators vazio", "significa operators vazio", "operators mean", "significa /operators", "o que e /operators", "what does /operators mean", "/operators list"],
    realizations: {
      "pt-PT":
        "Uma /operators vazia significa que nenhum operador publicou evidência verificável. É o estado correto de pré-produção: no BANZA a participação demonstra-se por evidência, não é concedida por autoridade central; a publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada.",
      en:
        "An empty /operators means no operator has published verifiable evidence. That is the correct pre-production state: in BANZA participation is demonstrated by evidence, not granted by a central authority, and production publication depends on the offline root-key ceremony and on the first published production conformance evidence.",
    },
    sources: s("annex", "adr048"),
  },
  {
    id: "banza-processes-payments",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    critical: true,
    keywords: ["banza processa pagamentos", "banza processes payments", "banza faz pagamentos", "banza executa pagamentos", "banza paga", "processa pagamentos"],
    realizations: {
      "pt-PT":
        "Não. BANZA não processa pagamentos. É o protocolo que define as regras (invariantes, contratos, conformidade); a execução de pagamentos pertence aos operadores, na infraestrutura deles. A infraestrutura BANZA não tem carteira, ledger de operador, KYC/KYB nem contas de utilizador final.",
      en:
        "No. BANZA does not process payments. It is the protocol that defines the rules — invariants, contracts, conformance; executing payments belongs to operators, on their own infrastructure. BANZA infrastructure has no wallet, no operator ledger, no KYC/KYB and no end-user accounts.",
    },
    sources: s("annex", "adr019", "claudeMd"),
  },
  {
    id: "banza-limits",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["limites do banza", "limits of banza", "o que banza nao faz", "banza nao tem", "limites banza", "limites do protocolo", "limite do protocolo", "limite de estado", "protocol limits", "postgresql", "postgres", "saldos financeiros", "operador de referencia deixar de operar", "reference operator ceases", "independencia do protocolo", "protocol independence"],
    realizations: {
      "pt-PT":
        "BANZA não tem carteira, ledger de operador, KYC/KYB, pagamentos, contas de utilizador final nem nomes comerciais de operadores. Qualquer coisa dessa natureza pertence a um operador, noutro lugar. BANZA define apenas as regras do protocolo, conformidade, certificação e federação. O PostgreSQL guarda estado de protocolo (marcador de pré-produção, Registo Técnico), não valor financeiro nem saldos. O protocolo é independente de qualquer operador: se o operador de referência deixar de operar, as especificações, contratos e conformidade do BANZA permanecem disponíveis.",
      en:
        "BANZA has no wallet, no operator ledger, no KYC/KYB, no payments, no end-user accounts and no operator brand names. Anything of that nature belongs to an operator, elsewhere. BANZA defines only the protocol rules, conformance, certification and federation. PostgreSQL holds protocol state — the pre-production marker, the Technical Registry — not financial value and not balances. The protocol is independent of any operator: if the reference operator ceases to operate, BANZA's specifications, contracts and conformance material remain available.",
    },
    sources: s("annex", "claudeMd", "state"),
  },
  {
    id: "financial-invariants",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["invariantes financeiros", "financial invariants", "invariantes do protocolo", "invariantes", "protocol invariants", "inv-ledger", "inv-wallet", "inv-settle", "inv-idem", "inv-recon", "inv-qr", "dupla entrada", "double-entry", "double entry ledger", "ledger de dupla entrada", "razao de dupla entrada", "how does the double-entry ledger work", "codigo qr", "qr code", "pagamento por qr", "resolucao de qr", "resolucao unica", "qr unico", "uso unico", "saldos derivados", "saldo derivado", "derivados do ledger", "ledger-derived", "sem saldo negativo", "saldo da carteira", "saldos das carteiras"],
    realizations: {
      "pt-PT":
        "As invariantes financeiras são as garantias de integridade do protocolo: INV-LEDGER (dupla entrada, imutabilidade, precisão, atomicidade), INV-WALLET (sem saldo negativo, saldos derivados do ledger), INV-SETTLE (identidade do montante de liquidação), INV-IDEM (segurança de replay/idempotência), INV-RECON (ligação de lançamentos, reconciliação externa) e INV-QR (resolução única, uso único dinâmico, expiração). O ledger de dupla entrada (ADR-012) exige que cada débito tenha um crédito correspondente. Estas invariantes são obrigatórias para qualquer operador; o BanzAI cita as fontes e não as redefine.",
      en:
        "The financial invariants are the protocol's integrity guarantees: INV-LEDGER (double entry, immutability, precision, atomicity), INV-WALLET (no negative balance, balances derived from the ledger), INV-SETTLE (settlement amount identity), INV-IDEM (replay safety / idempotency), INV-RECON (posting linkage, external reconciliation) and INV-QR (unique resolution, single-use dynamic, expiry). The double-entry ledger (ADR-012) requires every debit to have a matching credit. These invariants are mandatory for any operator; BanzAI cites the sources and does not redefine them.",
    },
    sources: s("invariants", "adr006", "claudeMd"),
  },
  {
    id: "protocol-decisions-adrs",
    // Eligible for the lexical keyword index consulted by retrieve_topk_ids.
    lexicalCandidate: true,
    keywords: ["adr 0", "que diz a adr", "o que diz a adr", "decisao arquitetural", "decisoes arquiteturais", "architecture decision", "architecture decision record", "onde estao as decisoes", "lista de adrs", "adrs do banza", "registro de decisoes", "list of adrs", "adr list", "list the adrs", "which adrs", "which adrs govern", "adrs govern"],
    realizations: {
      "pt-PT":
        "As decisões de arquitetura do BANZA são registadas como ADRs (Architecture Decision Records) em decisions/adr/ e listadas em /decisoes. Cada ADR documenta o contexto, a decisão e as consequências de uma escolha do protocolo. Para o conteúdo de uma ADR específica (por exemplo o ledger de dupla entrada na ADR-012), consulta o documento correspondente em decisions/adr/ — o BanzAI orienta e cita fontes, não reproduz nem reinterpreta o texto normativo.",
      en:
        "BANZA's architecture decisions are recorded as ADRs (Architecture Decision Records) under decisions/adr/ and listed at /decisoes. Each ADR documents the context, the decision and the consequences of one protocol choice. For the content of a specific ADR — the double-entry ledger in ADR-012, for instance — read the corresponding document under decisions/adr/: BanzAI guides and cites sources, and neither reproduces nor reinterprets normative text.",
    },
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
    realizations: {
      "pt-PT":
        "No BANZA, a participação não é aprovada por uma entidade central; é demonstrada por evidência verificável. Em alto nível, o operador implementa o protocolo, publica o manifest/metadata exigido, disponibiliza os endpoints relevantes, produz evidência de conformidade e permite que outros participantes verifiquem localmente essa evidência antes de interoperar. O BanzAI pode orientar, mas não aprova, não certifica e não decide federação.",
      en:
        "In BANZA, participation is not approved by a central entity; it is demonstrated by verifiable evidence. At a high level the operator implements the protocol, publishes the required manifest and metadata, exposes the relevant endpoints, produces conformance evidence, and lets other participants verify that evidence locally before interoperating. BanzAI can guide, but it does not approve, does not certify and does not decide federation.",
    },
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
    realizations: {
      "pt-PT":
        "Um operador demonstra conformidade através de uma implementação concreta, por evidência verificável — não por aprovação central. A implementação corre a conformance suite (perfil L0 e seguintes), e o operador publica os artefactos e a evidência de conformidade e disponibiliza os endpoints exigidos, para que qualquer participante verifique localmente essa evidência. Um PASS é evidência técnica, não um certificado; o BanzAI orienta e cita fontes, mas não certifica nem confere estatuto.",
      en:
        "An operator demonstrates conformance through a concrete implementation, by verifiable evidence — not by central approval. The implementation runs the conformance suite (profile L0 and onwards), and the operator publishes the artifacts and the conformance evidence and exposes the required endpoints, so that any participant can verify that evidence locally. A PASS is technical evidence, not a certificate; BanzAI guides and cites sources, but it does not certify and confers no status.",
    },
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
    realizations: {
      "pt-PT":
        "No BANZA a confiança é avaliada por evidência verificável, sem autoridade certificadora central. Cada participante avalia localmente a metadata assinada do protocolo, o manifest do operador e a evidência de conformidade publicada, aplicando verificações determinísticas (Open Trust Evaluation) que falham em caso de dúvida (fail-closed). Não há CA nem certificados de operador; a interoperabilidade depende de evidência que qualquer parte pode reverificar.",
      en:
        "In BANZA, trust is evaluated from verifiable evidence, with no central certifying authority. Each participant locally evaluates the signed protocol metadata, the operator's manifest and the published conformance evidence, applying deterministic checks (Open Trust Evaluation) that fail closed on doubt. There is no CA and there are no operator certificates; interoperability rests on evidence any party can re-verify.",
    },
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
    realizations: {
      "pt-PT":
        "No BANZA um operador não é aceite por aprovação central: demonstra conformidade com evidência verificável que qualquer parte pode reverificar. Comece pelo guia de entrada (docs/reference/getting-started.md). Caminho prático:\n" +
      "1) Ler a especificação e os princípios (spec/overview.md e a referência) e conhecer os níveis de conformidade L0–L4.\n" +
      "2) Implementar os contratos/schemas relevantes (contracts/: OpenAPI, QR, eventos) na sua própria infraestrutura, em qualquer tecnologia.\n" +
      "3) Garantir as invariantes financeiras (dupla entrada, valores inteiros sem vírgula flutuante, atomicidade, saldos derivados do ledger, idempotência).\n" +
      "4) Criar o manifesto de DESCOBERTA (JSON servido em /.well-known/banza/operator.json) com operator_id, environment, simulated, production_allowed e capabilities booleanas; validar contra o schema de descoberta publicado (conformance/manifests/schema.json). O manifesto de candidate-submission (com supported_levels e key_manifest_url) pertence ao onboarding (ADR-037) e nunca é servido na rota de descoberta (ADR-029).\n" +
      "5) Correr a conformance suite contra o seu endpoint e gerar o evidence bundle.\n" +
      "6) Publicar o manifest, a metadata assinada do protocolo e a evidência de conformidade num URL estável; os pares correm a Open Trust Evaluation localmente e decidem interoperar.\n" +
      "Neste estado de pré-produção o registo ao vivo /operators não lista operadores e a publicação de produção depende da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada. O BanzAI pode gerar um manifest ilustrativo ou uma checklist, mas não certifica, não aprova, não licencia e não decide federação; a autorização regulatória pertence à autoridade competente do operador.",
      en:
        "In BANZA an operator is not admitted by central approval: it demonstrates conformance with verifiable evidence that any party can re-verify. Start from the getting-started guide (docs/reference/getting-started.md). The practical path:\n1) Read the specification and the principles (spec/overview.md and the Reference) and learn the L0–L4 conformance levels.\n2) Implement the relevant contracts and schemas (contracts/: OpenAPI, QR, events) on your own infrastructure, in any technology.\n3) Hold the financial invariants (double entry, integer values with no floating point, atomicity, balances derived from the ledger, idempotency).\n4) Create the DISCOVERY manifest (JSON served at /.well-known/banza/operator.json) with operator_id, environment, simulated, production_allowed and boolean capabilities; validate it against the published discovery schema (conformance/manifests/schema.json). The candidate-submission manifest — with supported_levels and key_manifest_url — belongs to onboarding (ADR-037) and is never served on the discovery route (ADR-029).\n5) Run the conformance suite against your endpoint and generate the evidence bundle.\n6) Publish the manifest, the signed protocol metadata and the conformance evidence at a stable URL; peers run the Open Trust Evaluation locally and decide whether to interoperate.\nIn this pre-production state the live /operators registry lists no operators, and production publication depends on the offline root-key ceremony and on the first published production conformance evidence. BanzAI can generate an illustrative manifest or a checklist, but it does not certify, approve, license or decide federation; regulatory authorisation belongs to the operator's competent authority.",
    },
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
    realizations: {
      "pt-PT":
        "Para satisfazer o protocolo, o operador implementa na SUA infraestrutura as invariantes financeiras obrigatórias: INV-LEDGER (dupla entrada — cada débito tem crédito; ledger imutável append-only; valores em unidades menores inteiras, sem vírgula flutuante; lançamento atómico), INV-WALLET (saldos sempre derivados do ledger, sem saldo negativo), INV-SETTLE (identidade bruto = líquido + taxa), INV-IDEM (idempotência/segurança de replay), INV-RECON (ligação e reconciliação de lançamentos) e INV-QR (resolução única, uso único, expiração). O ledger de dupla entrada está na ADR-012; os ciclos de vida de pagamento e de QR estão nas specs. A BANZA não move nem custodia fundos — a camada de implementação e a conformidade pertencem ao operador. O BanzAI explica e cita fontes; não redefine invariantes.",
      en:
        "To satisfy the protocol, the operator implements the mandatory financial invariants on ITS OWN infrastructure: INV-LEDGER (double entry — every debit has a credit; an append-only immutable ledger; values in integer minor units, no floating point; atomic posting), INV-WALLET (balances always derived from the ledger, never negative), INV-SETTLE (the gross = net + fee identity), INV-IDEM (idempotency and replay safety), INV-RECON (posting linkage and reconciliation) and INV-QR (unique resolution, single use, expiry). The double-entry ledger is ADR-012; the payment and QR lifecycles are in the specs. BANZA neither moves nor holds funds — the implementation layer and its conformance belong to the operator. BanzAI explains and cites sources; it does not redefine invariants.",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um manifesto de operador BANZA. Serve apenas de orientação — a forma exacta segue o schema publicado (operator-manifest). Um manifesto não certifica nem activa um operador: em pré-produção `simulated` é true e `production_allowed` não move fundos; a autorização regulatória é validada pela autoridade do operador, nunca pelo BANZA.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"candidate\",\n  \"simulated\": true,\n  \"production_allowed\": false,\n  \"protocol_version\": \"1.0\",\n  \"base_url\": \"https://operator.example\",\n  \"capabilities\": [\"payments\", \"wallet\"],\n  \"supported_levels\": [\"L0\", \"L1\"],\n  \"key_manifest_url\": \"https://operator.example/.well-known/banza/key-manifest.json\",\n  \"operator_regulatory_declaration\": { \"authority\": \"<autoridade-do-operador>\", \"authorised\": false },\n  \"created_at\": null\n}\n```\n\nO domínio `operator.example` é fictício. Um manifesto válido é evidência técnica, não um certificado.",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of a BANZA operator manifest. It is guidance only — the exact form follows the published schema (operator-manifest). A manifest neither certifies nor activates an operator: in pre-production `simulated` is true and `production_allowed` moves no funds, and regulatory authorisation is validated by the operator's own authority, never by BANZA.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"candidate\",\n  \"simulated\": true,\n  \"production_allowed\": false,\n  \"protocol_version\": \"1.0\",\n  \"base_url\": \"https://operator.example\",\n  \"capabilities\": [\"payments\", \"wallet\"],\n  \"supported_levels\": [\"L0\", \"L1\"],\n  \"key_manifest_url\": \"https://operator.example/.well-known/banza/key-manifest.json\",\n  \"operator_regulatory_declaration\": { \"authority\": \"<operator-authority>\", \"authorised\": false },\n  \"created_at\": null\n}\n```\n\nThe domain `operator.example` is fictitious. A valid manifest is technical evidence, not a certificate.",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO da extensão de federação de um manifesto de operador (serve-se em /.well-known/banza/operator.json, a validar contra o schema publicado). Não confere estatuto nem substitui a evidência de conformidade.\n\n```json\n{\n  \"federation_version\": \"1\",\n  \"protocol_metadata_url\": \"https://operator.example/.well-known/banza/signed-protocol-metadata.json\",\n  \"interop_endpoint\": \"https://operator.example/banza/interop\",\n  \"supports_federation\": true,\n  \"cross_operator_routing\": true,\n  \"cross_operator_settlement\": false,\n  \"federation_capabilities\": [\"routing\"]\n}\n```\n\nDomínio `operator.example` fictício. A interoperabilidade depende de evidência verificável, não desta declaração.",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of the federation extension of an operator manifest (served at /.well-known/banza/operator.json, to be validated against the published schema). It confers no status and does not replace conformance evidence.\n\n```json\n{\n  \"federation_version\": \"1\",\n  \"protocol_metadata_url\": \"https://operator.example/.well-known/banza/signed-protocol-metadata.json\",\n  \"interop_endpoint\": \"https://operator.example/banza/interop\",\n  \"supports_federation\": true,\n  \"cross_operator_routing\": true,\n  \"cross_operator_settlement\": false,\n  \"federation_capabilities\": [\"routing\"]\n}\n```\n\nThe domain `operator.example` is fictitious. Interoperability rests on verifiable evidence, not on this declaration.",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de uma BANZA Revocation List (BRL). A BRL real é assinada por uma chave delegada de revogação e publicada em https://banza.network/federation/revocation-list.json; em pré-produção vem vazia. É evidência verificável, não uma decisão de autoridade central.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"issuer\": \"banza-revocation\",\n  \"issuer_key_id\": \"<key-id-de-revogacao>\",\n  \"issued_at\": \"2026-01-01T00:00:00Z\",\n  \"expires_at\": \"2026-01-01T06:00:00Z\",\n  \"revoked\": [],\n  \"signature\": \"<assinatura-base64url>\"\n}\n```\n\nOs operadores devem obter uma BRL fresca (≤6h) e não interoperar com operadores nela listados.",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of a BANZA Revocation List (BRL). The real BRL is signed by a delegated revocation key and published at https://banza.network/federation/revocation-list.json; in pre-production it comes back empty. It is verifiable evidence, not a decision by a central authority.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"issuer\": \"banza-revocation\",\n  \"issuer_key_id\": \"<revocation-key-id>\",\n  \"issued_at\": \"2026-01-01T00:00:00Z\",\n  \"expires_at\": \"2026-01-01T06:00:00Z\",\n  \"revoked\": [],\n  \"signature\": \"<base64url-signature>\"\n}\n```\n\nOperators must fetch a fresh BRL (≤6h) and must not interoperate with operators listed in it.",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um BANZA Key Manifest — o mecanismo de distribuição do trust anchor, assinado pela Root Key e publicado em https://banza.network/.well-known/banza/key-manifest.json. Uma issuing key que não apareça num Key Manifest válido assinado pela root não é uma chave BANZA. As chaves privadas nunca residem na infraestrutura de serviço.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"published_at\": \"2026-01-01T00:00:00Z\",\n  \"root_key_id\": \"<root-key-id>\",\n  \"root_public_key\": \"<chave-publica-root-base64url>\",\n  \"expires_at\": \"2027-01-01T00:00:00Z\",\n  \"keys\": [ { \"key_id\": \"<issuing-key-id>\", \"domain\": \"protocol-metadata\", \"public_key\": \"<...>\" } ],\n  \"manifest_signature\": \"<assinatura-root-base64url>\"\n}\n```",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of a BANZA Key Manifest — the trust-anchor distribution mechanism, signed by the Root Key and published at https://banza.network/.well-known/banza/key-manifest.json. An issuing key that does not appear in a valid root-signed Key Manifest is not a BANZA key. Private keys never reside on the serving infrastructure.\n\n```json\n{\n  \"schema_version\": \"1\",\n  \"published_at\": \"2026-01-01T00:00:00Z\",\n  \"root_key_id\": \"<root-key-id>\",\n  \"root_public_key\": \"<root-public-key-base64url>\",\n  \"expires_at\": \"2027-01-01T00:00:00Z\",\n  \"keys\": [ { \"key_id\": \"<issuing-key-id>\", \"domain\": \"protocol-metadata\", \"public_key\": \"<...>\" } ],\n  \"manifest_signature\": \"<root-signature-base64url>\"\n}\n```",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO da forma de um pacote de evidência de conformidade que um operador publica para reverificação. Um PASS é evidência técnica verificável, não um certificado, e não é suficiente para produção nem substitui a conformance suite.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"level\": \"L1\",\n  \"suite_version\": \"1.0\",\n  \"result\": \"PASS\",\n  \"generated_at\": \"2026-01-01T00:00:00Z\",\n  \"artifacts\": [ { \"name\": \"conformance-report\", \"url\": \"https://operator.example/banza/evidence/report.json\" } ],\n  \"signature\": \"<assinatura-base64url>\"\n}\n```\n\nA forma exacta segue o modelo de evidência de federação e os schemas publicados; `operator.example` é fictício.",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of the shape of a conformance evidence bundle an operator publishes for re-verification. A PASS is verifiable technical evidence, not a certificate; it is not sufficient for production and does not replace the conformance suite.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"level\": \"L1\",\n  \"suite_version\": \"1.0\",\n  \"result\": \"PASS\",\n  \"generated_at\": \"2026-01-01T00:00:00Z\",\n  \"artifacts\": [ { \"name\": \"conformance-report\", \"url\": \"https://operator.example/banza/evidence/report.json\" } ],\n  \"signature\": \"<base64url-signature>\"\n}\n```\n\nThe exact form follows the federation evidence model and the published schemas; `operator.example` is fictitious.",
    },
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
    realizations: {
      "pt-PT":
        "Exemplo ILUSTRATIVO e NÃO-NORMATIVO de um manifesto INVÁLIDO e porquê. Serve para aprendizagem; não é normativo.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"production\",\n  \"simulated\": false,\n  \"production_allowed\": true\n}\n```\n\nPorque é inválido: (1) faltam campos obrigatórios (protocol_version, base_url, capabilities, supported_levels, key_manifest_url, operator_regulatory_declaration); (2) em pré-produção `simulated` tem de ser true; (3) `production_allowed=true` não move fundos nem é validado pelo BANZA — a autorização pertence à autoridade do operador. Um manifesto nunca certifica nem activa um operador.",
      en:
        "An ILLUSTRATIVE, NON-NORMATIVE example of an INVALID manifest, and why. It is for learning; it is not normative.\n\n```json\n{\n  \"operator_id\": \"op_exemplo\",\n  \"environment\": \"production\",\n  \"simulated\": false,\n  \"production_allowed\": true\n}\n```\n\nWhy it is invalid: (1) required fields are missing (protocol_version, base_url, capabilities, supported_levels, key_manifest_url, operator_regulatory_declaration); (2) in pre-production `simulated` must be true; (3) `production_allowed=true` moves no funds and is not validated by BANZA — authorisation belongs to the operator's own authority. A manifest never certifies or activates an operator.",
    },
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
    realizations: {
      "pt-PT":
        "O Operador Zero é a **implementação de referência só de leitura** do protocolo BANZA (demo). Demonstra o protocolo de ponta a ponta — contas, saldos, pagamentos QR, reembolsos, reconciliação, confiança, federação e evidence bundle — na unidade de demonstração KZ_DEMO (sem valor real); é só de leitura, não tem ledger interactivo nem mutável e não se auto-valida. Não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não movimenta dinheiro real; não presta serviços financeiros e não representa autorização, certificação ou licença. Cada artefacto que publica declara demo_only: true, monetary_value: false e production_allowed: false, e nunca aparece em /operators como operador real. Serve para demonstrar e verificar o protocolo de ponta a ponta; a evidência que produz é evidência técnica local, não certificação. Tem superfície própria e dedicada, só de leitura, em zero.banza.network (a antiga rota do apex /operador-zero foi descontinuada e responde 410).",
      en:
        "Operator Zero is the **read-only reference implementation** of the BANZA protocol (a demo). It demonstrates the protocol end to end — accounts, balances, QR payments, refunds, reconciliation, trust, federation and evidence bundle — in the KZ_DEMO demonstration unit, which has no real value; it is read-only, has no interactive or mutable ledger, and does not validate itself. It is not a bank, not a PSP, not a wallet, not a licensed financial operator and it moves no real money; it provides no financial services and represents no authorization, certification or licence. Every artifact it publishes declares demo_only: true, monetary_value: false and production_allowed: false, and it never appears in /operators as a real operator. Its purpose is to demonstrate and verify the protocol end to end; the evidence it produces is local technical evidence, not certification. It has its own dedicated read-only surface at zero.banza.network (the former apex route /operador-zero is retired and answers 410).",
    },
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
    realizations: {
      "pt-PT":
        "Não. A Demo Operator Root do Operador Zero é uma raiz demonstrativa (demo_only): existe apenas para assinar e verificar os artefactos do Operador Zero, a implementação de referência só de leitura — key manifest, revogação, manifest, evidence bundle e traces — na unidade de demonstração KZ_DEMO. NÃO é a Trust Root do protocolo BANZA, não autoriza produção, não certifica nem licencia operadores, e nunca aparece em /operators. A raiz demo declara explicitamente not_protocol_trust_root: true e production_allowed: false. A Trust Root do protocolo BANZA é estabelecida pela cerimónia offline de raiz, sob custódia repartida por limiar (nenhuma entidade isolada a controla; o N-de-M concreto é configuração operacional), descrita no modelo de confiança do protocolo e é independente de qualquer operador. Qualquer verificação que a raiz demo produz é evidência técnica local, não certificação.",
      en:
        "No. Operator Zero's Demo Operator Root is a demonstration root (demo_only): it exists only to sign and verify Operator Zero's artifacts — key manifest, revocation, manifest, evidence bundle and traces — in the KZ_DEMO demonstration unit, for the read-only reference implementation. It is NOT the BANZA protocol's Trust Root, it authorises no production, it certifies and licenses no operator, and it never appears in /operators. The demo root explicitly declares not_protocol_trust_root: true and production_allowed: false. The BANZA protocol's Trust Root is established by the offline root ceremony, under threshold-split custody (no single entity controls it; the concrete N-of-M is operational configuration), described in the protocol's trust model, and it is independent of any operator. Anything the demo root verifies is local technical evidence, not certification.",
    },
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
    realizations: {
      "pt-PT":
        "A reconciliação do Operador Zero não confia nos saldos: percorre os movimentos desde a posição de abertura e re-deriva o total, em unidades inteiras sem floats (double-entry — cada débito tem o crédito correspondente). No fluxo demo, um pagamento QR de 1500 KZ_DEMO e um reembolso parcial de 500 KZ_DEMO ajustam as contas, e o total fictício de 100 000 KZ_DEMO é conservado na abertura e no fecho. Tudo é KZ_DEMO fictício — monetary_value: false, sem dinheiro real. Uma transacção inválida é recusada antes do movimento, por isso não deixa entradas no ledger. A prova está no motor Rust e no trace, não na resposta do BanzAI: é evidência técnica local, não certificação.",
      en:
        "Operator Zero's reconciliation does not trust balances: it walks the movements from the opening position and re-derives the total, in integer units with no floats (double entry — every debit has its matching credit). In the demo flow, a QR payment of 1500 KZ_DEMO and a partial refund of 500 KZ_DEMO adjust the accounts, and the fictitious total of 100,000 KZ_DEMO is conserved between opening and close. All of it is fictitious KZ_DEMO — monetary_value: false, no real money. An invalid transaction is refused before the movement, so it leaves no ledger entries. The proof is in the Rust engine and the trace, not in BanzAI's answer: it is local technical evidence, not certification.",
    },
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
    realizations: {
      "pt-PT":
        "Se uma chave for revogada, o trust é bloqueado — fecho por omissão (fail-closed). No protocolo BANZA a revogação é publicada na BANZA Revocation List (BRL); no Operador Zero, a Demo Operator Root avalia a lista de revogação demo e, se a chave de assinatura estiver revogada, a avaliação de trust devolve blocked e a jornada não progride (nenhuma evidência falsa é produzida). A chave activa não revogada permanece válida apenas como demo; a raiz demo não certifica nem autoriza produção. Isto é verificado pelo motor Rust (assinatura Ed25519 + verificação da lista de revogação), com a chave privada nunca committada — evidência técnica local, não certificação.",
      en:
        "If a key is revoked, trust is blocked — closing by default (fail-closed). In the BANZA protocol, revocation is published in the BANZA Revocation List (BRL); in Operator Zero, the Demo Operator Root evaluates the demo revocation list, and if the signing key is revoked the trust evaluation returns blocked and the journey does not progress (no false evidence is produced). The active, non-revoked key stays valid as a demo only; the demo root neither certifies nor authorises production. This is verified by the Rust engine (Ed25519 signature plus revocation-list check), with the private key never committed — local technical evidence, not certification.",
    },
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
    realizations: {
      "pt-PT":
        "No BANZA **não se usa \"aprovado\" nem \"aprovação\"** como estado — e nada aqui é certificação. O Operador Zero está **avaliado como implementação de referência só de leitura**: a jornada de validação no BanzAI pode ser concluída e isso produz **evidência técnica local**, não aprovação, certificação, licença nem autorização financeira. O Operador Zero é a **implementação de referência (demo, só de leitura)** do protocolo — não é banco, não é PSP, não é carteira, não é operador financeiro licenciado, não movimenta dinheiro real (usa KZ_DEMO) e **nunca aparece em /operators como operador real**. Podes ver o estado técnico em zero.banza.network. O termo correcto é **validação com evidência técnica local** — não aprovação.",
      en:
        "BANZA **does not use \"approved\" or \"approval\"** as a state — and nothing here is certification. Operator Zero is **evaluated as a read-only reference implementation**: the validation journey in BanzAI can be completed, and that produces **local technical evidence**, not approval, certification, a licence or financial authorisation. Operator Zero is the protocol's **reference implementation (demo, read-only)** — not a bank, not a PSP, not a wallet, not a licensed financial operator; it moves no real money (it uses KZ_DEMO) and **never appears in /operators as a real operator**. You can see its technical state at zero.banza.network. The correct term is **validation with local technical evidence** — not approval.",
    },
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
    realizations: {
      "pt-PT":
        "**Não.** A rota **/operators** é o registo ao vivo de operadores **reais**; neste estado de pré-produção não lista operadores (a baseline honesta do protocolo é `production_certificates: false`). O Operador Zero é a **implementação de referência só de leitura** (demo_only, KZ_DEMO, sem dinheiro real) e **nunca aparece em /operators como operador real** — vive na sua superfície dedicada, só de leitura, **zero.banza.network**, numa zona separada das implementações de referência (demo). As implementações de referência (demo) nunca são misturadas com operadores reais. O seu estado — avaliado como implementação de referência só de leitura — é evidência técnica local, não certificação.",
      en:
        "**No.** The **/operators** route is the live registry of **real** operators; in this pre-production state it lists none (the protocol's honest baseline is `production_certificates: false`). Operator Zero is the **read-only reference implementation** (demo_only, KZ_DEMO, no real money) and **never appears in /operators as a real operator** — it lives on its own dedicated read-only surface, **zero.banza.network**, in a zone kept separate from real operators. Reference implementations (demo) are never mixed with real operators. Its state — evaluated as a read-only reference implementation — is local technical evidence, not certification.",
    },
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
    realizations: {
      "pt-PT":
        "O estado do Operador Zero vê-se em **zero.banza.network** — a sua superfície dedicada, só de leitura, publica o estado técnico ao vivo a partir dos artefactos publicados: **avaliado como implementação de referência só de leitura**, com o estado de cada uma das nove etapas da jornada de validação (Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidence Bundle → Prontidão de certificação), na moeda de demonstração KZ_DEMO, sem dinheiro real (real_money: false), sem produção (production_allowed: false) e não certificação (certification: false). Não há pontuação agregada — o estado é categórico por etapa. É **evidência técnica local** — não certificação, não aprovação nem licença financeira — e o Operador Zero **não aparece em /operators** como operador real.",
      en:
        "Operator Zero's state is at **zero.banza.network** — its dedicated read-only surface publishes the live technical state from the published artifacts: **evaluated as a read-only reference implementation**, with the state of each of the nine journey steps (Discovery → Manifest → Keys → Conformance → Interoperability → Trust → Federation → Evidence Bundle → Certification readiness), in the KZ_DEMO demonstration unit, with no real money (real_money: false), no production (production_allowed: false) and no certification (certification: false). There is no aggregate score — the state is categorical per step. It is **local technical evidence** — not certification, not approval, not a financial licence — and Operator Zero **does not appear in /operators** as a real operator.",
    },
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
    realizations: {
      "pt-PT":
        "No BanzAI, o Operador Zero é a implementação de referência que **validas etapa por etapa** — não se carrega tudo de uma só vez. Inicias uma **sessão de validação** (só a identidade: operator-zero, KZ_DEMO, demo_only) e depois percorres a jornada de 9 etapas: **Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidence Bundle → Prontidão de certificação**. Cada etapa expõe apenas os seus ficheiros e só **avança para a seguinte depois de passar** (evidência técnica local), tal como qualquer operador que implementa o protocolo. Não carrega tudo de uma vez porque a evidência tem de ser produzida etapa a etapa. Depois do **Manifesto** seguem-se as **Chaves** e a **Conformidade**. É evidência técnica local, não certificação; o Operador Zero não é operador real e não aparece em /operators. Corre em `/banzai?mode=validation&target=operator-zero&workflow=full` — o Rust decide, o Qwen explica.",
      en:
        "In BanzAI, Operator Zero is the reference implementation you **validate step by step** — nothing is loaded all at once. You open a **validation session** (identity only: operator-zero, KZ_DEMO, demo_only) and then walk the 9-step journey: **Discovery → Manifest → Keys → Conformance → Interoperability → Trust → Federation → Evidence Bundle → Certification readiness**. Each step exposes only its own files and **advances only after passing** (local technical evidence), exactly as any operator implementing the protocol would. It does not load everything at once because the evidence has to be produced step by step. After the **Manifest** come the **Keys** and then **Conformance**. It is local technical evidence, not certification; Operator Zero is not a real operator and does not appear in /operators. It runs at `/banzai?mode=validation&target=operator-zero&workflow=full` — Rust decides, Qwen explains.",
    },
    sources: s("adr052", "annex"),
  },

  // ── M2.13B — basic-question answers (deterministic; served via route.rs critical_entry) ─────────
  {
    id: "protocol-license",
    critical: true,
    keywords: ["qual e a licenca", "licenca do protocolo", "que licenca", "licenca banza", "protocol license", "which license", "licenciamento", "licenca do repo", "licenca do codigo", "e open source", "codigo aberto"],
    realizations: {
      "pt-PT":
        "O **código** do protocolo BANZA é open source sob a **Apache License 2.0** (ficheiro LICENSE na raiz do repositório, com um NOTICE de atribuição): uma licença permissiva que qualquer operador pode usar para implementar o protocolo. **Distinção de domínios importante:** esta é uma licença de *software* — **não** é uma licença/autorização *financeira*. Não autoriza operar pagamentos nem prestar serviços financeiros; essa autorização pertence às entidades competentes e fica fora do protocolo. As **marcas** (trademarks) também não são concedidas pela licença de código (regidas por NOTICE/TRADEMARKS). O BANZA não licencia, aprova nem certifica operadores.",
      en:
        "The BANZA protocol's **code** is open source under the **Apache License 2.0** (the LICENSE file at the repository root, with an attribution NOTICE): a permissive licence any operator may use to implement the protocol. **An important separation of domains:** this is a *software* licence — it is **not** a *financial* licence or authorisation. It does not authorise operating payments or providing financial services; that authorisation belongs to the competent authorities and sits outside the protocol. **Trademarks** are likewise not granted by the code licence (they are governed by NOTICE/TRADEMARKS). BANZA does not license, approve or certify operators.",
    },
    sources: s("license", "notice"),
  },
  {
    // M2.13C-A — the FINANCIAL/regulatory authorisation domain, kept apart from the software licence.
    id: "financial-authorization",
    critical: true,
    keywords: ["licenca financeira", "autorizacao financeira", "autorizacao regulatoria", "licenca de operador", "operador precisa de licenca", "quem licencia um operador", "o banza licencia operadores", "regulador", "entidade competente", "apache autoriza pagamentos", "financial license", "financial authorization", "does an operator need a license"],
    realizations: {
      "pt-PT":
        "**Não** — e é importante separar dois domínios. (1) A licença do **código** do protocolo é a **Apache-2.0** (open source): permite implementar o protocolo, mas **não substitui** uma licença ou autorização *financeira*. (2) A **autorização financeira/regulatória** (por exemplo perante o banco central ou a entidade competente, para operar pagamentos ou prestar serviços financeiros) é responsabilidade do **próprio operador**, perante as autoridades competentes, e fica **fora do protocolo BANZA**. O BANZA **não emite licenças financeiras, não licencia, não aprova e não certifica operadores**; no protocolo, a participação técnica demonstra-se por **evidência de conformidade verificável**, não por uma licença concedida por uma autoridade central.",
      en:
        "**No** — and two domains need separating. (1) The protocol's **code** licence is **Apache-2.0** (open source): it permits implementing the protocol, but it **does not replace** a *financial* licence or authorisation. (2) **Financial and regulatory authorisation** — before the central bank or the competent authority, to operate payments or provide financial services — is the **operator's own** responsibility, before those authorities, and sits **outside the BANZA protocol**. BANZA **issues no financial licences, licenses nobody, approves nobody and certifies no operator**; within the protocol, technical participation is demonstrated by **verifiable conformance evidence**, not by a licence granted by a central authority.",
    },
    sources: s("gettingStarted", "adr018", "adr019"),
  },
  {
    // M2.13C-B — institutional ORIGIN of the protocol: original creator, historical creation date,
    // initial maintainer, open governance. A historical/attribution fact — never operational authority.
    id: "protocol-origin",
    critical: true,
    keywords: ["quem criou o banza", "quem fundou o banza", "quem e o criador", "criador original", "quem desenvolveu o banza", "quem disponibilizou o banza", "origem do banza", "origem institucional", "quando foi criado o banza", "data de criacao do banza", "em que dia o banza foi criado", "quem criou o banza e quando", "quem mantem o banza", "mantenedor institucional inicial", "quem e dono do banza", "relacao entre banzami e banza", "a banzami criou o banza", "who created banza", "who founded banza", "who originally created", "original creator of banza", "when was banza created", "banza creation date", "who owns banza", "initial maintainer", "institutional origin"],
    realizations: {
      "pt-PT":
        "O **BANZA** foi originalmente criado em **01/08/2025 (1 de agosto de 2025)** pela **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, indicada como criadora original e mantenedora institucional inicial. Essa é a **origem institucional/histórica** do protocolo — a data de criação/disponibilização inicial, **não** uma data de produção, certificação, autorização financeira nem de operador activo. Hoje o BANZA é disponibilizado como **protocolo financeiro aberto (open source)** e a sua evolução decorre **publicamente no repositório**, através de governança, issues, pull requests, revisões, ADRs, RFCs, specs e releases. Essa origem **não** significa que a entidade criadora aprove, certifique, licencie ou controle operadores, nem que seja operador ou PSP: os operadores são independentes e as autorizações financeiras ficam fora do protocolo.",
      en:
        "**BANZA** was originally created on **2025-08-01 (1 August 2025)** by **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, named as the original creator and initial institutional maintainer. That is the protocol's **institutional and historical origin** — the date of creation and initial availability, **not** a date of production, certification, financial authorisation or active operation. Today BANZA is made available as an **open financial protocol (open source)** and it evolves **publicly in the repository**, through governance, issues, pull requests, reviews, ADRs, RFCs, specs and releases. That origin does **not** mean the creating entity approves, certifies, licenses or controls operators, nor that it is an operator or a PSP: operators are independent, and financial authorisations sit outside the protocol.",
    },
    sources: s("notice", "maintainers", "readme"),
  },
  {
    id: "banza-stack-language",
    critical: true,
    keywords: ["em que linguagem foi criado", "que linguagem de programacao", "linguagem de programacao", "programming language", "que stack", "qual a stack", "tecnologia usada", "que tecnologias"],
    realizations: {
      "pt-PT":
        "A stack do BANZA é **Rust-first para os motores oficiais** (ADR-038): conformidade, trust/crypto, invariantes, a implementação de referência Operador Zero e o motor de conhecimento do BanzAI são em **Rust** (compilado para WASM quando corre no browser/Node). O **website** (incluindo a superfície de referência só de leitura do Operador Zero e o routing) é **TypeScript/React/Next.js**; os artefactos são **JSON**; os guards são shell + o binário Rust banza-repo-guards; a orquestração usa Bash. O TypeScript/JS é só UI/glue.",
      en:
        "BANZA's stack is **Rust-first for the official engines** (ADR-038): conformance, trust/crypto, invariants, the Operator Zero reference implementation and BanzAI's knowledge engine are **Rust** (compiled to WASM when they run in the browser or Node). The **website** — including Operator Zero's read-only reference surface and the routing — is **TypeScript/React/Next.js**; the artifacts are **JSON**; the guards are shell plus the Rust `banza-repo-guards` binary; orchestration uses Bash. TypeScript/JS is UI and glue only.",
    },
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
    realizations: {
      "pt-PT":
        "Rust é a linguagem principal dos motores oficiais do BANZA — a regra do projecto é Rust-first (ADR-038): conformidade, trust/crypto, invariantes, validação, a implementação de referência Operador Zero e o motor de conhecimento do BanzAI. Quando precisam de correr no browser ou no Node.js, esses motores compilam para WASM. TypeScript/React/Next.js ficam sobretudo em website, UI e glue — não como motor crítico.",
      en:
        "Rust is the primary language of BANZA's official engines — the project rule is Rust-first (ADR-038): conformance, trust/crypto, invariants, validation, the Operator Zero reference implementation and BanzAI's knowledge engine. When they need to run in the browser or in Node.js, those engines compile to WASM. TypeScript/React/Next.js stay mostly in the website, the UI and the glue — never as a critical engine.",
    },
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-wasm", critical: true,
    deterministic: true,
    keywords: ["wasm", "webassembly", "web assembly", "compilado para wasm"],
    realizations: {
      "pt-PT":
        "WASM (WebAssembly) é o alvo de compilação dos motores Rust do BANZA para correrem no browser e no Node.js. O mesmo código Rust-first (ADR-038) — por exemplo o motor de conhecimento do BanzAI e a implementação de referência Operador Zero — serve o servidor e o cliente sem reescrever a lógica crítica.",
      en:
        "WASM (WebAssembly) is the compilation target for BANZA's Rust engines so they can run in the browser and in Node.js. The same Rust-first code (ADR-038) — BanzAI's knowledge engine and the Operator Zero reference implementation, for instance — serves both server and client without rewriting the critical logic.",
    },
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-typescript", critical: true,
    deterministic: true,
    keywords: ["typescript", "javascript", "ts", "js"],
    realizations: {
      "pt-PT":
        "TypeScript (e JavaScript) é usado sobretudo na camada de website, UI e glue do BANZA (React/Next.js). A regra do projecto é Rust-first (ADR-038): a lógica crítica fica em Rust; TypeScript/JS é UI/glue, nunca motor crítico.",
      en:
        "TypeScript (and JavaScript) is used mostly in BANZA's website, UI and glue layer (React/Next.js). The project rule is Rust-first (ADR-038): critical logic stays in Rust, and TypeScript/JS is UI and glue, never a critical engine.",
    },
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-web-frontend", critical: true,
    deterministic: true,
    keywords: ["react", "next.js", "nextjs", "next js", "frontend", "framework do website"],
    realizations: {
      "pt-PT":
        "React e Next.js formam a framework do website do BANZA (em TypeScript) — a camada de UI/glue, incluindo o laboratório do Operador Zero e o routing. Não são motores críticos: esses são Rust-first (ADR-038).",
      en:
        "React and Next.js are the framework of BANZA's website (in TypeScript) — the UI and glue layer, including the Operator Zero lab and the routing. They are not critical engines: those are Rust-first (ADR-038).",
    },
    sources: s("rustPolicy", "readme"),
  },
  {
    id: "def-json-format", critical: true,
    deterministic: true,
    keywords: ["json", "formato json", "artefactos json"],
    realizations: {
      "pt-PT":
        "JSON é o formato dos artefactos do BANZA: manifests de operador, evidence bundles, fixtures do Operador Zero e payloads de contrato. É dados, não lógica — a lógica crítica é Rust-first (ADR-038).",
      en:
        "JSON is the format of BANZA's artifacts: operator manifests, evidence bundles, Operator Zero fixtures and contract payloads. It is data, not logic — the critical logic is Rust-first (ADR-038).",
    },
    sources: s("readme", "rustPolicy"),
  },
  {
    id: "def-bash-shell", critical: true,
    deterministic: true,
    keywords: ["bash", "shell", "shell script", "scripts"],
    realizations: {
      "pt-PT":
        "Bash orquestra os scripts e os guards do BANZA (por `make` e no CI). A lógica dos gates de higiene do repositório vive em Rust (o binário `banza-repo-guards`); o shell é apenas o invólucro fino (ADR-038).",
      en:
        "Bash orchestrates BANZA's scripts and guards (through `make` and in CI). The logic of the repository hygiene gates lives in Rust (the `banza-repo-guards` binary); the shell is only the thin wrapper (ADR-038).",
    },
    sources: s("rustPolicy", "guardsDir"),
  },
  {
    id: "def-node", critical: true,
    deterministic: true,
    keywords: ["node", "node.js", "nodejs"],
    realizations: {
      "pt-PT":
        "Node.js corre o serviço `banzai-api` e carrega os motores Rust compilados para WASM. A lógica crítica continua Rust-first (ADR-038); Node/TypeScript é runtime e glue, não motor.",
      en:
        "Node.js runs the `banzai-api` service and loads the Rust engines compiled to WASM. The critical logic remains Rust-first (ADR-038); Node and TypeScript are runtime and glue, not the engine.",
    },
    sources: s("rustPolicy", "readme"),
  },
  // M2.19C — the three-layer institutional architecture, served deterministically (Rust decides;
  // route.rs::critical_entry → def-three-layer-architecture). Canonical wording tracks ADR-004.
  {
    id: "def-three-layer-architecture", critical: true,
    deterministic: true,
    keywords: ["tres camadas", "arquitectura institucional", "arquitetura institucional", "three-layer", "camadas do banza"],
    realizations: {
      "pt-PT":
        "A arquitectura institucional do BANZA tem três camadas, separadas por responsabilidade, infraestrutura e chaves:\n\n1. **Camada 1 — Protocolo BANZA**: o protocolo financeiro aberto e neutro (regras, contratos, invariantes, perfis, identidade técnica, metadados assinados, trust, revogação, registo técnico, federação e verificação pública). Não é banco, PSP, carteira, EMI nem operador; não detém nem move fundos.\n2. **Camada 2 — Certificação de Conformidade e Interoperabilidade**: certifica, por implementação, que uma implementação demonstrou conformidade e interoperabilidade com um perfil público e versionado — baseada em evidência, decidida por Rust, com âmbito e validade limitados e sujeita a revogação. Não é licença, não é admissão a scheme e não é autorização regulatória.\n3. **Camada 3 — Esquemas operacionais independentes**: esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações. O primeiro é o Esquema Operacional Banzami, com a Banzami como operadora designada do esquema, condicionado ao enquadramento regulatório aplicável; os fundos reais permanecem desactivados até existir evidência formal.\n\nO BanzAI é a interface humana transversal às três camadas — não uma quarta autoridade. O Rust compreende, encaminha, executa, valida e decide; o Qwen local explica.",
      en:
        "BANZA's institutional architecture has three layers, separated by responsibility, infrastructure and keys:\n\n1. **Layer 1 — the BANZA protocol**: the open, neutral financial protocol (rules, contracts, invariants, profiles, technical identity, signed metadata, trust, revocation, technical registry, federation and public verification). It is not a bank, a PSP, a wallet, an EMI or an operator; it neither holds nor moves funds.\n2. **Layer 2 — Conformance and Interoperability Certification**: certifies, per implementation, that an implementation has demonstrated conformance and interoperability against a public, versioned profile — evidence-based, decided by Rust, with limited scope and validity, and subject to revocation. It is not a licence, not admission to a scheme and not regulatory authorisation.\n3. **Layer 3 — independent operational schemes**: schemes built on the protocol under their own rules and authorisations. The first is the Banzami Operational Scheme, with Banzami as the scheme's designated operator, conditional on the applicable regulatory framework; real funds stay deactivated until formal evidence exists.\n\nBanzAI is the human interface transversal to all three layers — not a fourth authority. Rust understands, routes, executes, validates and decides; the local Qwen explains.",
    },
    sources: s("adr059"),
  },
  // M2.19C — the L3 Operational Scheme (ADR-006), deterministic; distinct from the entity Banzami.
  {
    id: "def-operational-scheme", critical: true,
    deterministic: true,
    keywords: ["banzami operational scheme", "operational scheme", "scheme operacional", "operador designado"],
    realizations: {
      "pt-PT":
        "O Banzami Operational Scheme é a primeira concretização da Camada 3 (esquemas operacionais independentes) da arquitectura do BANZA: um scheme operacional construído sobre o protocolo, com a Banzami — Tecnologia e Serviços, Lda. como operadora designada. Está condicionado à obtenção do enquadramento regulatório aplicável — o estado é `REGULATORY_AUTHORIZATION_IN_PROGRESS` e os fundos reais, carteiras, liquidação e participantes reais permanecem desactivados (fail-closed) até existir evidência formal. É distinto do protocolo: BANZA ≠ Banzami. A certificação BANZA não é exclusiva deste scheme, e a continuidade do protocolo não depende da continuidade comercial do scheme.",
      en:
        "The Banzami Operational Scheme is the first instance of Layer 3 (independent operational schemes) in BANZA's architecture: an operational scheme built on the protocol, with Banzami — Tecnologia e Serviços, Lda. as its designated operator. It is conditional on obtaining the applicable regulatory framework — the state is `REGULATORY_AUTHORIZATION_IN_PROGRESS`, and real funds, wallets, settlement and real participants stay deactivated (fail-closed) until formal evidence exists. It is distinct from the protocol: BANZA ≠ Banzami. BANZA certification is not exclusive to this scheme, and the protocol's continuity does not depend on the scheme's commercial continuity.",
    },
    sources: s("adr060", "adr062"),
  },
  // M2.19D — the L2 conformance & interoperability certification concept (ADR-032/065/066), deterministic.
  {
    id: "def-l2-certification", critical: true,
    deterministic: true,
    keywords: ["certificacao de conformidade e interoperabilidade", "certificacao tecnica", "certification record", "certified implementation", "certification profile", "technical registry"],
    realizations: {
      "pt-PT":
        "A **Certificação de Conformidade e Interoperabilidade** é a Camada 2 do BANZA: certifica **tecnicamente** que uma *implementação* (identificada pelo hash do artefacto) demonstrou conformidade e interoperabilidade contra um perfil público e versionado. O resultado é um registo decidido por Rust, vinculado a evidência e hash, com âmbito e validade limitados, e sujeito a expiração, suspensão, revogação e supersession (a renovação é sempre um registo novo). Certifica uma **implementação**, nunca uma entidade. **Não** é licença, **não** é autorização regulatória e **não** é admissão a scheme — a certificação nunca implica admissão e a admissão nunca implica autorização. Os registos são publicados no **Registo Técnico** do BANZA, verificável por qualquer terceiro sem conta e independente do directório de participantes de um scheme.",
      en:
        "**Conformance and Interoperability Certification** is BANZA's Layer 2: it certifies **technically** that an *implementation* — identified by its artifact hash — has demonstrated conformance and interoperability against a public, versioned profile. The result is a Rust-decided record, bound to evidence and hash, with limited scope and validity, and subject to expiry, suspension, revocation and supersession (a renewal is always a new record). It certifies an **implementation**, never an entity. It is **not** a licence, **not** a regulatory authorisation and **not** admission to a scheme — certification never implies admission, and admission never implies authorisation. Records are published in BANZA's **Technical Registry**, verifiable by any third party without an account and independent of any scheme's participant directory.",
    },
    sources: s("adr064", "adr065", "adr066"),
  },
  {
    id: "def-qwen", critical: true,
    deterministic: true,
    keywords: ["qwen", "modelo local", "inferencia local", "local model"],
    realizations: {
      "pt-PT":
        "Qwen é o modelo de linguagem local do BanzAI (ADR-036): corre on-host, sem chamadas externas — external_model_called permanece false. As respostas determinísticas nem sequer usam o modelo; o Qwen só é invocado para perguntas fundamentadas que precisam de geração.",
      en:
        "Qwen is BanzAI's local language model (ADR-036): it runs on-host, with no external calls — external_model_called stays false. Deterministic answers do not use the model at all; Qwen is invoked only for grounded questions that need generation.",
    },
    sources: s("adrLocalInference", "readme"),
  },
  {
    id: "def-postgresql", critical: true,
    deterministic: true,
    keywords: ["postgresql", "postgres", "base de dados"],
    realizations: {
      "pt-PT":
        "PostgreSQL é o armazenamento de estado do protocolo no BANZA (ADR-013), não uma base de dados financeira: não guarda saldos reais nem movimenta fundos. É um detalhe de infraestrutura interno, não exposto publicamente.",
      en:
        "PostgreSQL is BANZA's protocol-state store (ADR-013), not a financial database: it holds no real balances and moves no funds. It is an internal infrastructure detail, not publicly exposed.",
    },
    sources: s("adrPostgres"),
  },
  {
    id: "def-pgvector", critical: true,
    deterministic: true,
    keywords: ["pgvector", "indice vectorial", "vector index"],
    realizations: {
      "pt-PT":
        "pgvector é a extensão de índice vectorial usada pelo indexador do BANZA para pesquisa semântica sobre a documentação do protocolo. É um detalhe de infraestrutura interno (ADR-013).",
      en:
        "pgvector is the vector-index extension used by BANZA's indexer for semantic search over the protocol documentation. It is an internal infrastructure detail (ADR-013).",
    },
    sources: s("adrPostgres"),
  },
  {
    id: "def-nginx", critical: true,
    deterministic: true,
    keywords: ["nginx", "reverse proxy", "proxy"],
    realizations: {
      "pt-PT":
        "nginx é o reverse-proxy que serve o BANZA na mesma origem (website mais `banzai-api`). É um detalhe de infraestrutura; não altera nenhuma regra do protocolo.",
      en:
        "nginx is the reverse proxy that serves BANZA from a single origin (the website plus `banzai-api`). It is an infrastructure detail; it changes no protocol rule.",
    },
    sources: s("infraRunbook", "rustPolicy"),
  },
  {
    id: "def-docker", critical: true,
    deterministic: true,
    keywords: ["docker", "compose", "containers", "implantacao"],
    realizations: {
      "pt-PT":
        "O BANZA é implantado com Docker (compose) a partir de um bundle reprodutível com tags de imagem fixas. É um detalhe de infraestrutura de implantação, não uma regra do protocolo.",
      en:
        "BANZA is deployed with Docker (compose) from a reproducible bundle with pinned image tags. It is a deployment infrastructure detail, not a protocol rule.",
    },
    sources: s("infraRunbook", "rustPolicy"),
  },
  {
    id: "def-banzai-agent", critical: true,
    deterministic: true,
    keywords: ["banzai", "o que e banzai", "what is banzai", "agente banzai"],
    realizations: {
      "pt-PT":
        "BanzAI é a interface humana primária e transversal entre humanos/operadores e o protocolo BANZA (ADR-036): interpreta pedidos, consulta a referência, orienta a implementação, encaminha para os motores verificáveis e explica os resultados. Guia, invoca os motores e cita fontes; não decide, não certifica, não aprova operadores, não licencia, não publica operadores e não movimenta fundos. Corre um modelo local (Qwen) on-host, sem chamadas externas. É distinto do BANZA (o protocolo) e do Banzami (a organização). BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.",
      en:
        "BanzAI is the primary, transversal human interface between people or operators and the BANZA protocol (ADR-036): it interprets requests, consults the Reference, guides implementation, routes to the verifiable engines and explains the results. It guides, invokes the engines and cites sources; it does not decide, does not certify, does not approve operators, does not license, does not publish operators and does not move funds. It runs a local model (Qwen) on-host, with no external calls. It is distinct from BANZA (the protocol) and from Banzami (the organization). BanzAI guides; the engines verify; the evidence proves; the competent authority decides.",
    },
    sources: s("readme", "rustPolicy"),
  },
  {
    id: "operador-zero-language",
    critical: true,
    keywords: ["em que linguagem foi criado o operador zero", "linguagem do operador zero", "operador zero linguagem", "operator zero language", "que linguagem operador zero"],
    realizations: {
      "pt-PT":
        "O Operador Zero tem o **motor/core em Rust** (`engines/operator-zero-core` — ledger fictício KZ_DEMO, trust demo, federação demo, evidence, traces; e `engines/operator-zero-e2e-root` para a raiz de assinatura Ed25519 demo). A **interface** (o laboratório interactivo) é **TypeScript/React/Next.js** em `website/`, com routing no middleware. Os **artefactos** são **JSON**. Não foi \"criado em português\" — o português é apenas a língua da UI e da documentação.",
      en:
        "Operator Zero's **engine/core is Rust** (`engines/operator-zero-core` — the fictitious KZ_DEMO ledger, demo trust, demo federation, evidence, traces; and `engines/operator-zero-e2e-root` for the demo Ed25519 signing root). The **interface** — the interactive lab — is **TypeScript/React/Next.js** under `website/`, with routing in the middleware. The **artifacts** are **JSON**. It was not \"created in Portuguese\": Portuguese is only the language of the UI and the documentation.",
    },
    sources: s("ozEngine", "ozLab", "adr052"),
  },
  {
    id: "operador-zero-files",
    critical: true,
    keywords: ["que ficheiros implementam o operador zero", "ficheiros do operador zero", "onde esta implementado o operador zero", "files implement operator zero", "codigo do operador zero", "que ficheiros fazem o operador zero"],
    realizations: {
      "pt-PT":
        "O Operador Zero é implementado por: **motor Rust** `engines/operator-zero-core` (ledger/trust/federação/evidence/traces) e `engines/operator-zero-e2e-root` (raiz de assinatura Ed25519 demo); **artefactos** em `examples/operators/zero/` (manifest, key-manifest, revocation-list, evidence-bundle, traces, ledger, payments) e `examples/operators/zero/e2e-root/`; **website** `website/components/operador-zero/OperadorZeroReference.tsx` (superfície só de leitura) + `website/app/(pt)/oz/` (rota interna) + `website/lib/operadorZero*.ts`; a validação corre no **modo de validação do BanzAI** (`/banzai?mode=validation`), integrado em `website/components/banzai/BanzaiValidationMode.tsx`, executada pelos motores Rust; **routing** `website/middleware.ts` + `website/lib/zeroSubdomain.ts` (zero.banza.network); **guards** `tools/check-operator-zero*.sh` + `tools/check-zero-subdomain*.sh`; **decisões** ADR-035 e ADR-035; **relatórios** em `docs/quality/M2_12*`, `M2_13A*` e `M2_19EF*`.",
      en:
        "Operator Zero is implemented by: the **Rust engine** `engines/operator-zero-core` (ledger/trust/federation/evidence/traces) and `engines/operator-zero-e2e-root` (the demo Ed25519 signing root); **artifacts** under `examples/operators/zero/` (manifest, key-manifest, revocation-list, evidence-bundle, traces, ledger, payments) and `examples/operators/zero/e2e-root/`; the **website** `website/components/operador-zero/OperadorZeroReference.tsx` (the read-only surface) plus `website/app/(pt)/oz/` (the internal route) and `website/lib/operadorZero*.ts`; validation runs in **BanzAI's validation mode** (`/banzai?mode=validation`), wired in `website/components/banzai/BanzaiValidationMode.tsx` and executed by the Rust engines; **routing** `website/middleware.ts` plus `website/lib/zeroSubdomain.ts` (zero.banza.network); **guards** `tools/check-operator-zero*.sh` and `tools/check-zero-subdomain*.sh`; **decisions** ADR-035; **reports** under `docs/quality/M2_12*`, `M2_13A*` and `M2_19EF*`.",
    },
    sources: s("ozEngine", "ozLab", "ozMiddleware", "adr052"),
  },
  {
    // M2.13B — WHERE Operador Zero lives. Deterministic so cache/stale answers can never say it lives
    // at the retired apex /operador-zero. Canonical surface = zero.banza.network.
    id: "operador-zero-location",
    critical: true,
    keywords: ["onde vive o operador zero", "onde esta o operador zero", "onde fica o operador zero", "where does operator zero live", "url do operador zero", "endereco do operador zero"],
    realizations: {
      "pt-PT":
        "O Operador Zero vive na sua superfície própria e dedicada **zero.banza.network** — um subdomínio standalone, com shell próprio (sem o cabeçalho/nav/rodapé globais do BANZA). Os endpoints demonstrativos vivem na raiz desse subdomínio. A antiga rota do apex **/operador-zero foi descontinuada e responde 410 Gone** (não redirecciona, não renderiza). Não uses /operador-zero como fonte nem fallback.",
      en:
        "Operator Zero lives on its own dedicated surface, **zero.banza.network** — a standalone subdomain with its own shell (without BANZA's global header, nav and footer). The demonstration endpoints live at that subdomain's root. The former apex route **/operador-zero is retired and answers 410 Gone** — it does not redirect and does not render. Do not use /operador-zero as a source or a fallback.",
    },
    sources: s("ozMiddleware", "adr052"),
  },
  {
    // M2.13B — does /operador-zero still exist? Deterministic, unambiguous: no, 410 Gone.
    id: "operador-zero-apex-status",
    critical: true,
    keywords: ["o operador-zero ainda existe", "operador-zero ainda existe", "a rota operador zero ainda existe", "operador zero foi descontinuado", "operador-zero 410", "does /operador-zero still exist"],
    realizations: {
      "pt-PT":
        "Não. A rota do apex **/operador-zero foi descontinuada** e responde **410 Gone** — não redirecciona e não renderiza o laboratório. A superfície canónica do Operador Zero é agora **zero.banza.network** (subdomínio standalone). O BanzAI nunca usa /operador-zero como rota, fonte ou fallback.",
      en:
        "No. The apex route **/operador-zero is retired** and answers **410 Gone** — it does not redirect and does not render the lab. Operator Zero's canonical surface is now **zero.banza.network** (a standalone subdomain). BanzAI never uses /operador-zero as a route, a source or a fallback.",
    },
    sources: s("ozMiddleware", "adr052"),
  },

  // ── M2.13B PR2 — repository-wide technical answers (deterministic; cite real repo paths). Backed by
  // the Rust repo-wide index; served via route.rs critical_entry so they never fall into no_source. ──
  {
    id: "banzai-language",
    critical: true,
    keywords: ["em que linguagem foi criado o banzai", "linguagem do banzai", "que linguagem banzai", "banzai language", "banzai foi criado em", "que stack o banzai"],
    realizations: {
      "pt-PT":
        "O BanzAI é **Rust-first** (ADR-038): os motores oficiais são em **Rust** compilado para **WASM**. O runtime canónico vive **neste repositório** (`banza-protocol/banza`): `engines/banzai-query-core` (routing, resolução, recuperação, fundamentação e validação) e `engines/banzai-api-kb` (que o re-exporta e o compila para WASM), mais `engines/banzai-doc-indexer` e `engines/banzai-repo-indexer` (indexação) — todos Rust. A **camada de serviço/glue** (`services/banzai-api`) é **TypeScript/Node** — apenas I/O e transporte, sem lógica de motor. O desenvolvimento activo do BanzAI reside inteiramente neste monorepo (ADR-036); não existe um repositório BanzAI separado.",
      en:
        "BanzAI is **Rust-first** (ADR-038): the official engines are **Rust** compiled to **WASM**. The canonical runtime lives **in this repository** (`banza-protocol/banza`): `engines/banzai-query-core` (routing, resolution, retrieval, grounding and validation) and `engines/banzai-api-kb` (which re-exports it and compiles it to WASM), plus `engines/banzai-doc-indexer` and `engines/banzai-repo-indexer` (indexing) — all Rust. The **service and glue layer** (`services/banzai-api`) is **TypeScript/Node** — I/O and transport only, with no engine logic. BanzAI's active development lives entirely in this monorepo (ADR-036); there is no separate BanzAI repository.",
    },
    sources: s("rustPolicy", "banzaiApiKb", "banzaiCore"),
  },
  {
    id: "banzai-retrieval",
    repo_truth: true,
    critical: true,
    keywords: ["como funciona o retrieval do banzai", "retrieval do banzai", "como o banzai recupera", "banzai retrieval", "como o banzai encontra fontes", "como o banzai procura"],
    realizations: {
      "pt-PT":
        "O retrieval do BanzAI é **determinístico e em Rust** (`engines/banzai-api-kb`, WASM). Fluxo por pergunta: (1) `route()` decide a via — fronteira de acção → recusa determinística, intenção crítica → resposta vetada, pergunta com fontes → modelo local, sem fonte → \"evidência insuficiente\"; (2) para perguntas com fundamento, pontua as entradas curadas (`retrieveTopK`) e enriquece com excertos reais do **índice documental** e do **índice repo-wide** (`banzai-repo-indexer`: BANZA + BanzAI, com categoria e caminho); (3) o `pipeline.js` (glue) monta o contexto e chama o modelo **local** (local_qwen). A pontuação/ordenação é toda Rust; o JS é só I/O.",
      en:
        "BanzAI's retrieval is **deterministic and in Rust** (`engines/banzai-api-kb`, WASM). Per question: (1) `route()` decides the path — an action boundary gives a deterministic refusal, a critical intent gives a settled answer, a question with sources goes to the local model, and no source gives \"insufficient evidence\"; (2) for grounded questions it scores the curated entries (`retrieveTopK`) and enriches them with real excerpts from the **documentary index** and the **repo-wide index** (`banzai-repo-indexer`: BANZA plus BanzAI, with category and path); (3) `pipeline.js` (glue) assembles the context and calls the **local** model (local_qwen). All scoring and ranking is Rust; the JS is only I/O.",
    },
    sources: s("banzaiApiKb", "repoIndexer", "pipelineJs"),
  },
  {
    id: "how-banzai-answers",
    repo_truth: true,
    critical: true,
    keywords: ["como o banzai sabe responder", "como o banzai responde", "de onde vem a resposta do banzai", "como o banzai gera a resposta", "how does banzai know"],
    realizations: {
      "pt-PT":
        "O BanzAI responde a partir de conhecimento **curado + indexado do repositório**, nunca de opinião. Primeiro, a fronteira de acção e a fronteira crítica (Rust, `route.rs`) decidem se a pergunta é recusada ou tem resposta vetada determinística. Se for uma pergunta legítima com fundamento, o motor Rust recupera as fontes (entradas curadas + índice repo-wide de ambos os repositórios) e o modelo **local** (local_qwen) redige a resposta ancorada nessas fontes citáveis. Não há chamadas externas (`external_model_called=false`) e o modelo nunca decide a via.",
      en:
        "BanzAI answers from **curated and repository-indexed** knowledge, never from opinion. First the action boundary and the critical boundary (Rust, `route.rs`) decide whether the question is refused or has a settled deterministic answer. If it is a legitimate grounded question, the Rust engine retrieves the sources (curated entries plus the repo-wide index) and the **local** model (local_qwen) writes the answer anchored in those citable sources. There are no external calls (`external_model_called=false`), and the model never decides the path.",
    },
    sources: s("banzaiApiKb", "repoIndexer", "pipelineJs"),
  },
  {
    id: "banzai-external-calls",
    critical: true,
    keywords: ["o banzai usa chamadas externas", "banzai chamadas externas", "o banzai chama api externa", "banzai external calls", "o banzai envia dados para fora", "banzai usa openai", "o banzai usa a nuvem"],
    realizations: {
      "pt-PT":
        "**Não.** O BanzAI corre inteiramente na infraestrutura do protocolo com um modelo **local** (local_qwen via llama.cpp interno) e **não faz chamadas a modelos externos** — `external_model_called` é sempre `false`. O núcleo Rust (`engines/banzai-query-core`, compilado para WASM em `engines/banzai-api-kb`) é determinístico, sem LLM, sem rede e sem GPU. Nenhum dado da pergunta sai do host para um provedor externo.",
      en:
        "**No.** BanzAI runs entirely on the protocol's own infrastructure with a **local** model (local_qwen via an internal llama.cpp) and makes **no calls to external models** — `external_model_called` is always `false`. The Rust core (`engines/banzai-query-core`, compiled to WASM in `engines/banzai-api-kb`) is deterministic: no LLM, no network, no GPU. No data from the question leaves the host for an external provider.",
    },
    sources: s("providerJs", "banzaiCore", "rustPolicy"),
  },
  {
    id: "action-boundary-location",
    repo_truth: true,
    critical: true,
    keywords: ["onde esta definido o action boundary", "onde esta a fronteira de acao", "onde vive o action boundary", "action boundary definido", "onde esta a fronteira de accao", "where is the action boundary"],
    realizations: {
      "pt-PT":
        "A fronteira de acção (Action Boundary) está definida em **Rust**, em `engines/banzai-query-core/src/route.rs`, na função `action_boundary` (Tier 0.5 de `route()`), que devolve uma recusa determinística com `intent=action_boundary` para pedidos perigosos — nunca chamando o modelo. É verificada pelo guard `tools/check-banzai-action-boundary.sh` (`make banzai-action-boundary-check`) e servida pelo `pipeline.js`.",
      en:
        "The Action Boundary is defined in **Rust**, in `engines/banzai-query-core/src/route.rs`, in the `action_boundary` function (Tier 0.5 of `route()`), which returns a deterministic refusal with `intent=action_boundary` for dangerous requests — never calling the model. It is verified by the guard `tools/check-banzai-action-boundary.sh` (`make banzai-action-boundary-check`) and served by `pipeline.js`.",
    },
    sources: s("routeRs", "actionGuard"),
  },
  {
    id: "guards-banzai",
    repo_truth: true,
    critical: true,
    keywords: ["que guards protegem o banzai", "guards do banzai", "quais guards do banzai", "banzai guards", "que checks protegem o banzai"],
    realizations: {
      "pt-PT":
        "O BanzAI é protegido por vários guards (`make`, verificados em CI): `banzai-action-boundary-check` (recusas determinísticas), `banzai-repo-knowledge-safety-check` (índice/KB sem segredos), `banzai-repository-wide-knowledge-check` (cobertura repo-wide), `banzai-qwen-routing-check` (routing Qwen-first), `banzai-agent-quality-check`, `banzai-knowledge-quality-check`, `banzai-document-aware-agent-check`, `banzai-document-explanation-quality-check`, `banzai-local-inference-check`, `banzai-public-interface-check` e `banzai-release-qa-check`, mais os guards partilhados `identity-check`, `purity-check`, `rust-rule-check` e `private-key-leak-check`. Os scripts estão em `tools/check-banzai-*.sh`.",
      en:
        "BanzAI is protected by several guards (`make`, verified in CI): `banzai-action-boundary-check` (deterministic refusals), `banzai-repo-knowledge-safety-check` (index/KB free of secrets), `banzai-repository-wide-knowledge-check` (repo-wide coverage), `banzai-qwen-routing-check` (Qwen-first routing), `banzai-agent-quality-check`, `banzai-knowledge-quality-check`, `banzai-document-aware-agent-check`, `banzai-document-explanation-quality-check`, `banzai-local-inference-check`, `banzai-public-interface-check` and `banzai-release-qa-check`, plus the shared guards `identity-check`, `purity-check`, `rust-rule-check` and `private-key-leak-check`. The scripts are under `tools/check-banzai-*.sh`.",
    },
    sources: s("actionGuard", "repoSafetyGuard", "repoKnowledgeGuard"),
  },
  {
    id: "guards-operador-zero",
    critical: true,
    keywords: ["que guards protegem o operador zero", "guards do operador zero", "quais guards do operador zero", "operador zero guards", "que checks protegem o operador zero"],
    realizations: {
      "pt-PT":
        "O Operador Zero é protegido por sete guards (`make`, em CI): `operator-zero-check` (invariantes do motor), `operator-zero-vocabulary-contract-check`, `operator-zero-public-hardening-check`, `operator-zero-standalone-surface-check`, `operator-zero-full-e2e-check` (validação E2E Ed25519), `zero-subdomain-routing-check` e `zero-subdomain-design-check`. Todos garantem que o OZ permanece `demo_only`/`KZ_DEMO`, nunca em `/operators`, nunca certifica, e que `zero.banza.network` é a superfície canónica. Scripts em `tools/check-operator-zero*.sh` e `tools/check-zero-subdomain*.sh`.",
      en:
        "Operator Zero is protected by seven guards (`make`, in CI): `operator-zero-check` (engine invariants), `operator-zero-vocabulary-contract-check`, `operator-zero-public-hardening-check`, `operator-zero-standalone-surface-check`, `operator-zero-full-e2e-check` (Ed25519 E2E validation), `zero-subdomain-routing-check` and `zero-subdomain-design-check`. Together they hold OZ to `demo_only`/`KZ_DEMO`, never in `/operators`, never certifying, and keep `zero.banza.network` as the canonical surface. Scripts under `tools/check-operator-zero*.sh` and `tools/check-zero-subdomain*.sh`.",
    },
    sources: s("adr052", "repoKnowledgeGuard"),
  },
  {
    id: "norm-vs-implementation",
    critical: true,
    keywords: ["diferenca entre norma e implementacao", "norma vs implementacao", "diferenca norma implementacao", "normativo vs implementacao", "o que e norma e o que e implementacao", "difference between norm and implementation"],
    realizations: {
      "pt-PT":
        "No BANZA, a **norma** (normativo) define *o que é correcto* — as regras do protocolo: referência, especificações, contratos, schemas, invariantes e RFCs normativos (em `docs/reference`, `spec/`, `contracts/`). A **implementação** é *como* um operador ou o próprio ecossistema cumpre a norma — o código: motores Rust (`engines/`), o website (`website/`), guards e CI. A norma é operator-neutral e vem primeiro (ADR-001: protocolo antes do produto); a implementação consome a norma. O BanzAI classifica as fontes por categoria (`normative` vs `implementation`) precisamente para não confundir regra com código.",
      en:
        "In BANZA the **norm** (the normative material) defines *what is correct* — the protocol's rules: the Reference, specifications, contracts, schemas, invariants and normative RFCs (under `docs/reference`, `spec/`, `contracts/`). The **implementation** is *how* an operator, or the ecosystem itself, meets the norm — the code: the Rust engines (`engines/`), the website (`website/`), the guards and CI. The norm is operator-neutral and comes first (ADR-001: protocol before product); the implementation consumes the norm. BanzAI classifies sources by category (`normative` versus `implementation`) precisely so that a rule is never mistaken for code.",
    },
    sources: s("specOverview", "rustPolicy", "gettingStarted"),
  },
  {
    id: "operator-zero-crate",
    critical: true,
    keywords: ["que crate rust valida o operador zero", "crate que valida o operador zero", "que crate valida o operador zero", "qual crate rust do operador zero", "rust crate operator zero"],
    realizations: {
      "pt-PT":
        "O Operador Zero é validado pelo crate Rust **`engines/operator-zero-core`** (ledger fictício KZ_DEMO com conservação e reconciliação re-derivada, trust demo, federação demo, evidence, traces e fronteira fail-closed), complementado por **`engines/operator-zero-e2e-root`** (raiz de assinatura Ed25519 demo para a validação E2E — chave privada nunca committada). A verificação corre em `make operator-zero-check` e `make operator-zero-full-e2e-check`.",
      en:
        "Operator Zero is validated by the Rust crate **`engines/operator-zero-core`** (the fictitious KZ_DEMO ledger with conservation and re-derived reconciliation, demo trust, demo federation, evidence, traces and a fail-closed boundary), complemented by **`engines/operator-zero-e2e-root`** (the demo Ed25519 signing root for E2E validation — the private key is never committed). Verification runs through `make operator-zero-check` and `make operator-zero-full-e2e-check`.",
    },
    sources: s("ozEngine", "ozE2eRoot", "adr052"),
  },
  {
    id: "banzai-index-crate",
    repo_truth: true,
    critical: true,
    keywords: ["que crate rust indexa o conhecimento do banzai", "crate que indexa o banzai", "qual crate indexa o conhecimento", "que crate faz o indice do banzai", "rust crate indexes banzai knowledge"],
    realizations: {
      "pt-PT":
        "O conhecimento repo-wide do BanzAI é indexado pelo crate Rust **`engines/banzai-repo-indexer`**: percorre o monorepo BANZA (que desde a ADR-036 inclui o runtime e os motores BanzAI), aplica exclusões de segurança, classifica cada ficheiro em 12 categorias, faz chunking por tipo e emite `banzai-repo-index.json` + manifesto/cobertura/exclusões/segurança. A documentação do protocolo é indexada por **`engines/banzai-doc-indexer`**, e o motor de **retrieval/scoring** que consome os índices é **`engines/banzai-api-kb`** (WASM).",
      en:
        "BanzAI's repo-wide knowledge is indexed by the Rust crate **`engines/banzai-repo-indexer`**: it walks the BANZA monorepo (which since ADR-036 includes the BanzAI runtime and engines), applies security exclusions, classifies every file into 12 categories, chunks by type and emits `banzai-repo-index.json` plus manifest, coverage, exclusions and security reports. The protocol documentation is indexed by **`engines/banzai-doc-indexer`**, and the **retrieval/scoring** engine that consumes the indexes is **`engines/banzai-api-kb`** (WASM).",
    },
    sources: s("repoIndexer", "docIndexer", "banzaiApiKb"),
  },
  {
    id: "zero-endpoints",
    critical: true,
    keywords: ["que endpoints existem no zero.banza.network", "endpoints do zero.banza.network", "endpoints do operador zero", "quais endpoints zero banza network", "que endpoints tem o operador zero", "zero.banza.network endpoints"],
    realizations: {
      "pt-PT":
        "O `zero.banza.network` serve dez endpoints JSON demonstrativos na raiz do subdomínio: `manifest`, `key-manifest`, `revocation-list`, `conformance/evidence`, `federation/metadata`, `evidence-bundle`, `traces/full-e2e`, `ledger/demo`, `payments/demo-qr` e `payments/demo-refund` (cada um servido como `/<nome>.json`; POST devolve 405, desconhecido 404). São artefactos `demo_only` em KZ_DEMO fictício — o OZ nunca aparece em `/operators`. O routing host-aware está em `website/lib/zeroSubdomain.ts` + `website/middleware.ts`.",
      en:
        "`zero.banza.network` serves ten demonstration JSON endpoints at the subdomain root: `manifest`, `key-manifest`, `revocation-list`, `conformance/evidence`, `federation/metadata`, `evidence-bundle`, `traces/full-e2e`, `ledger/demo`, `payments/demo-qr` and `payments/demo-refund` (each served as `/<name>.json`; POST returns 405, unknown returns 404). They are `demo_only` artifacts in fictitious KZ_DEMO — OZ never appears in `/operators`. The host-aware routing is in `website/lib/zeroSubdomain.ts` plus `website/middleware.ts`.",
    },
    sources: s("zeroSub", "adr052"),
  },
  {
    id: "zero-middleware-files",
    repo_truth: true,
    critical: true,
    keywords: ["que ficheiros implementam o middleware do zero.banza.network", "ficheiros do middleware zero", "middleware do zero banza network", "que ficheiros fazem o routing do zero", "middleware files zero banza network"],
    realizations: {
      "pt-PT":
        "O routing/middleware do `zero.banza.network` é implementado por: **`website/middleware.ts`** (intercepta por `Host`, reescreve `/`→`/oz` e `/<art>.json`→`/oz/<art>.json`, e redirecciona `/banzai*` para o apex); **`website/lib/zeroSubdomain.ts`** (a lógica pura `resolveZeroRoute`, incluindo os tipos `gone` para o apex `/operador-zero` a 410 e `notfound`); e a superfície própria em **`website/app/(pt)/oz/`** (`page.tsx` + `[...artifact]/route.ts`). É verificado por `make zero-subdomain-routing-check`.",
      en:
        "The `zero.banza.network` routing and middleware is implemented by: **`website/middleware.ts`** (intercepts on `Host`, rewrites `/`→`/oz` and `/<art>.json`→`/oz/<art>.json`, and redirects `/banzai*` to the apex); **`website/lib/zeroSubdomain.ts`** (the pure `resolveZeroRoute` logic, including the `gone` type for the apex `/operador-zero` at 410, and `notfound`); and its own surface under **`website/app/(pt)/oz/`** (`page.tsx` plus `[...artifact]/route.ts`). It is verified by `make zero-subdomain-routing-check`.",
    },
    sources: s("ozMiddleware", "zeroSub", "ozApp"),
  },

  // ── M2.13C — answer-quality gap fixes (deterministic; served via route.rs critical_entry) ────────
  {
    id: "notice-content",
    critical: true,
    keywords: ["o que diz o notice", "que diz o notice", "conteudo do notice", "ficheiro notice", "what does the notice say", "notice do protocolo"],
    realizations: {
      "pt-PT":
        "O ficheiro **NOTICE** (junto à licença Apache-2.0) contém a **atribuição** do projecto: identifica o criador original e mantenedor institucional inicial e as notas de direitos de autor, como exige a Apache-2.0. **Não concede marcas** — o uso de marcas (trademarks) é regido separadamente por NOTICE/TRADEMARKS, não pela licença de código. A licença de código é permissiva (qualquer operador pode implementar o protocolo); a marca não.",
      en:
        "The **NOTICE** file (alongside the Apache-2.0 licence) carries the project's **attribution**: it identifies the original creator and initial institutional maintainer, and the copyright notices Apache-2.0 requires. It **grants no trademarks** — trademark use is governed separately by NOTICE/TRADEMARKS, not by the code licence. The code licence is permissive (any operator may implement the protocol); the mark is not.",
    },
    sources: s("notice", "governanceProc"),
  },
  {
    id: "rust-crates",
    critical: true,
    keywords: ["que crates rust existem", "quais crates rust", "crates rust do repo", "que crates rust no repo", "rust crates in the repo", "lista de crates rust", "que motores rust existem"],
    realizations: {
      "pt-PT":
        "Os motores oficiais são Rust (ADR-038), em `engines/`. Entre os crates: **`banzai-api-kb`** (retrieval + routing + fronteira de acção, WASM), **`banzai-repo-indexer`** (indexador repo-wide), **`banzai-doc-indexer`** (indexador da documentação), **`operator-zero-core`** e **`operator-zero-e2e-root`** (motor + raiz Ed25519 demo do Operador Zero), **`banza-repo-guards`** (gates de pureza/contaminação), **`banza-trust`**/**`banza-conformance`** e afins. TypeScript/React é só UI/glue.",
      en:
        "The official engines are Rust (ADR-038), under `engines/`. Among the crates: **`banzai-api-kb`** (retrieval, routing and the action boundary, WASM), **`banzai-repo-indexer`** (the repo-wide indexer), **`banzai-doc-indexer`** (the documentation indexer), **`operator-zero-core`** and **`operator-zero-e2e-root`** (Operator Zero's engine and demo Ed25519 root), **`banza-repo-guards`** (purity and contamination gates), **`banza-trust`** / **`banza-conformance`** and related crates. TypeScript/React is UI and glue only.",
    },
    sources: s("enginesDir", "rustPolicy"),
  },
  {
    id: "how-banzai-refuses",
    critical: true,
    keywords: ["como o banzai decide quando recusar", "como o banzai decide recusar", "como o banzai recusa", "quando o banzai recusa", "como decide recusar um pedido", "how does banzai decide to refuse"],
    realizations: {
      "pt-PT":
        "O BanzAI decide recusar de forma **determinística, em Rust**, antes de qualquer geração: em `engines/banzai-query-core/src/route.rs`, o `route()` avalia primeiro a fronteira de segurança e depois a **fronteira de acção** (`action_boundary`, Tier 0.5). Se o pedido é uma acção destrutiva ou de autoridade (apagar docs, remover guards/bypass CI, alterar Trust Root, publicar/certificar operador, expor/gerar segredos, dinheiro real, reintroduzir a rota descontinuada do apex /operador-zero — que responde 410, superfície canónica é zero.banza.network —, infra destrutiva), devolve `intent=action_boundary` com uma recusa vetada e uma alternativa segura — **nunca chama o modelo (Qwen)**. É verificado por `make banzai-action-boundary-check`.",
      en:
        "BanzAI decides to refuse **deterministically, in Rust**, before any generation: in `engines/banzai-query-core/src/route.rs`, `route()` evaluates the safety boundary first and then the **action boundary** (`action_boundary`, Tier 0.5). If the request is a destructive or authority action — deleting docs, removing guards or bypassing CI, altering the Trust Root, publishing or certifying an operator, exposing or generating secrets, real money, reintroducing the retired apex route /operador-zero (which answers 410; the canonical surface is zero.banza.network), destructive infrastructure — it returns `intent=action_boundary` with a settled refusal and a safe alternative, and **never calls the model (Qwen)**. It is verified by `make banzai-action-boundary-check`.",
    },
    sources: s("routeRs", "actionGuard"),
  },
  {
    id: "who-implements-protocol",
    critical: true,
    keywords: ["quem implementa o protocolo", "quem implementa o banza", "quem constroi o protocolo", "who implements the protocol", "quem faz a implementacao do protocolo", "tem de ser em rust", "obrigatoriamente rust", "implementacoes em rust", "precisa de rust", "banza exige rust", "implementacoes banza rust", "linguagem obrigatoria"],
    realizations: {
      "pt-PT":
        "O protocolo BANZA é a **norma** (operator-neutral); quem o **implementa** são os **operadores** — qualquer operador pode implementá-lo em qualquer linguagem/stack que satisfaça os invariantes. O BANZA define as regras (contracts, spec, invariantes, conformidade); não é ele próprio um operador nem um PSP. O desenvolvimento é protocol-first (a norma vem antes do produto do operador — ADR-001). O Operador Zero é apenas a **implementação de referência** (demo, só de leitura), não um operador real.",
      en:
        "The BANZA protocol is the **norm** (operator-neutral); the ones who **implement** it are the **operators** — any operator may implement it in any language or stack that satisfies the invariants. BANZA defines the rules (contracts, spec, invariants, conformance); it is not itself an operator or a PSP. Development is protocol-first (the norm comes before the operator's product — ADR-001). Operator Zero is only the **reference implementation** (demo, read-only), not a real operator.",
    },
    sources: s("specOverview", "adr018", "adr005"),
  },
  {
    id: "guards-secret-leak",
    repo_truth: true,
    critical: true,
    keywords: ["que guards impedem fuga de private key", "que guard impede fuga de chave", "guard de private key", "que impede vazamento de chave", "private key leak guard", "que guard protege segredos"],
    realizations: {
      "pt-PT":
        "A fuga de material secreto é impedida por **`make private-key-leak-check`** (`tools/check-private-key-leak.sh`): bloqueia blocos PEM de chave privada, ficheiros de chave/segredo committados, passphrases em texto e tokens de segredo. Complementa-o o **indexador repo-wide**, que faz um scan de conteúdo fail-closed (só salta chaves PEM armored reais) e o **`banzai-repo-knowledge-safety-check`**, que prova que a KB e o índice não têm segredos. Além disso, o `action_boundary` recusa pedidos para expor/gerar segredos.",
      en:
        "Leakage of secret material is prevented by **`make private-key-leak-check`** (`tools/check-private-key-leak.sh`): it blocks private-key PEM blocks, committed key and secret files, plaintext passphrases and secret tokens. It is complemented by the **repo-wide indexer**, which runs a fail-closed content scan (skipping only real armored PEM keys), and by **`banzai-repo-knowledge-safety-check`**, which proves the KB and the index carry no secrets. On top of that, `action_boundary` refuses requests to expose or generate secrets.",
    },
    sources: s("leakGuard", "repoIndexer", "repoSafetyGuard"),
  },
  {
    id: "guard-brand-contamination",
    repo_truth: true,
    critical: true,
    keywords: ["que guard impede contaminacao de marca", "guard de contaminacao de marca", "que impede marca de operador", "guard de neutralidade", "operator brand guard", "que guard bloqueia marca comercial"],
    realizations: {
      "pt-PT":
        "A contaminação por marca comercial de operador é impedida por **`make identity-check`** (`tools/check-operator-contamination.sh`, motor `engines/banza-repo-guards`): nenhuma marca comercial de operador pode aparecer no repositório; o índice repo-wide também limpa por chunk quaisquer marcas. Só a atribuição do criador/mantenedor é permitida em superfícies legais/governança (allowlist).",
      en:
        "Contamination by an operator's commercial brand is prevented by **`make identity-check`** (`tools/check-operator-contamination.sh`, engine `engines/banza-repo-guards`): no operator's commercial brand may appear in the repository, and the repo-wide index also scrubs brands per chunk. Only the creator/maintainer attribution is permitted, on legal and governance surfaces (an allowlist).",
    },
    sources: s("identityGuard", "enginesDir"),
  },
  {
    id: "banzai-ci",
    repo_truth: true,
    critical: true,
    keywords: ["que ci valida o banzai", "qual ci valida o banzai", "que workflow valida o banzai", "banzai ci", "que pipeline valida o banzai", "que ci corre para o banzai"],
    realizations: {
      "pt-PT":
        "O BanzAI é validado em CI por jobs em **`.github/workflows/identity-guard.yml`** (fronteira de acção, repo-wide knowledge, repo-knowledge-safety, qwen-routing, agent/knowledge/document-aware quality, release-qa, public-interface, local-inference, …) e por **`.github/workflows/rust-engines.yml`** (fmt/clippy/test dos crates Rust, incluindo `banzai-api-kb` e `banzai-repo-indexer`). Guards partilhados (identity/purity/rust-rule/private-key-leak) também correm.",
      en:
        "BanzAI is validated in CI by jobs in **`.github/workflows/identity-guard.yml`** (action boundary, repo-wide knowledge, repo-knowledge-safety, qwen-routing, agent/knowledge/document-aware quality, release-qa, public-interface, local-inference, and more) and by **`.github/workflows/rust-engines.yml`** (fmt/clippy/test of the Rust crates, including `banzai-api-kb` and `banzai-repo-indexer`). The shared guards — identity, purity, rust-rule, private-key-leak — run as well.",
    },
    sources: s("ciWorkflows", "repoKnowledgeGuard"),
  },
  {
    id: "banzai-index-state",
    repo_truth: true,
    critical: true,
    keywords: ["qual e o estado actual do banzai", "estado actual do banzai", "o banzai conhece o repo banzai", "banzai conhece o repositorio banzai", "quantos ficheiros foram indexados", "quantos chunks foram indexados", "quantos ficheiros chunks", "que testes foram adicionados na m2.13b", "current state of banzai", "does banzai know the banzai repo"],
    realizations: {
      "pt-PT":
        "Estado actual do BanzAI: é um agente **read-only** com conhecimento **repo-wide** do monorepo `banza-protocol/banza`. Com a ADR-036 o BanzAI foi consolidado neste monorepo — o runtime (`services/banzai-api`) e os motores (`engines/banzai-*`) vivem aqui e são indexados como parte do repo (`banzai_in_monorepo: true`); não existe um repositório BanzAI separado — o antigo `banza-protocol/banzai` foi eliminado definitivamente (ADR-036). O índice cobre documentação, decisões, código, website, guards, relatórios, licenças e artefactos do Operador Zero — as contagens exactas estão no manifesto `banzai-repo-index-manifest.json`. Retrieval e routing são Rust (WASM); o modelo é local (`external_model_called=false`) e a fronteira de acção recusa pedidos perigosos.",
      en:
        "BanzAI's current state: it is a **read-only** agent with **repo-wide** knowledge of the `banza-protocol/banza` monorepo. With ADR-036, BanzAI was consolidated into this monorepo — the runtime (`services/banzai-api`) and the engines (`engines/banzai-*`) live here and are indexed as part of the repo (`banzai_in_monorepo: true`); there is no separate BanzAI repository, and the former `banza-protocol/banzai` was permanently removed (ADR-036). The index covers documentation, decisions, code, website, guards, reports, licences and Operator Zero artifacts — the exact counts are in the `banzai-repo-index-manifest.json` manifest. Retrieval and routing are Rust (WASM); the model is local (`external_model_called=false`) and the action boundary refuses dangerous requests.",
    },
    sources: s("indexManifest", "repoIndexer"),
  },

  // ── M2.13B — Action Boundary refusals (served via route.rs action_boundary; NEVER the model) ────
  {
    id: "refuse-delete-document",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso apagar ou remover documentos do protocolo (ADRs, RFCs, specs, referência, relatórios). O BanzAI é read-only e apagar decisões/normas comprometeria a integridade e a auditabilidade do protocolo. Alternativa segura: proponha a mudança via um novo ADR/RFC que **supersede** o anterior (nunca apagar o histórico), abra um PR com revisão e CI, e mantenha o documento original como registo. Posso ajudar a redigir esse ADR/RFC, a explicar o impacto e a montar a checklist de revisão.",
      en:
        "I cannot delete or remove protocol documents (ADRs, RFCs, specs, the Reference, reports). BanzAI is read-only, and deleting decisions or norms would compromise the protocol's integrity and auditability. A safe alternative: propose the change through a new ADR/RFC that **supersedes** the previous one (never deleting the history), open a PR with review and CI, and keep the original document as the record. I can help draft that ADR/RFC, explain the impact and put together the review checklist.",
    },
    sources: s("governanceProc"),
  },
  {
    id: "refuse-remove-guard-or-bypass-ci",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso remover guards (identity-check, private-key-leak-check, purity-check, rust-rule, etc.) nem contornar o CI ou fazer merge com checks vermelhos / `--admin`. Estes controlos protegem o protocolo e a segurança; desactivá-los é uma alteração de risco elevado. Alternativa segura: se um guard precisa de ajuste, proponha uma alteração **estreita e justificada** via PR, com um teste que prove o novo comportamento, revisão e CI verde. Posso ajudar a explicar o risco, a desenhar o teste e a redigir o PR.",
      en:
        "I cannot remove guards (identity-check, private-key-leak-check, purity-check, rust-rule and the rest), bypass CI, or merge with red checks or `--admin`. These controls protect the protocol and its security; disabling them is a high-risk change. A safe alternative: if a guard needs adjusting, propose a **narrow, justified** change through a PR, with a test that proves the new behaviour, plus review and green CI. I can help explain the risk, design the test and draft the PR.",
    },
    sources: s("governanceProc"),
  },
  {
    id: "refuse-modify-trust-root",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso alterar a Trust Root do protocolo BANZA nem substituir a root key. A Trust Root é estabelecida por uma cerimónia offline de raiz sob governança, com custódia repartida por limiar e não é modificável por um pedido a um agente. Alternativa segura: qualquer mudança de raiz segue o processo de governança documentado, com custódia, revisão e evidência. Posso explicar o modelo de confiança e o processo, mas não executo nem oriento a substituição da raiz.",
      en:
        "I cannot alter the BANZA protocol's Trust Root or replace the root key. The Trust Root is established by an offline root ceremony under governance, with threshold-split custody, and it is not modifiable by a request to an agent. A safe alternative: any root change follows the documented governance process, with custody, review and evidence. I can explain the trust model and the process, but I neither execute nor guide a replacement of the root.",
    },
    sources: s("governanceProc"),
  },
  {
    id: "refuse-publish-or-certify-operator",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso publicar, certificar, aprovar nem licenciar operadores, nem colocar o Operador Zero em `/operators`. O BanzAI guia e explica; **não certifica nem decide produção**, e o Operador Zero é a implementação de referência só de leitura (demo-only) que nunca é um operador real. A participação no protocolo demonstra-se por **evidência de conformidade verificável**, avaliada pelos motores e sob governança — não por uma decisão do agente. Posso explicar como um operador demonstra conformidade através de uma implementação concreta e como submeter essa evidência.",
      en:
        "I cannot publish, certify, approve or license operators, and I cannot place Operator Zero in `/operators`. BanzAI guides and explains; it **does not certify and does not decide production**, and Operator Zero is the read-only reference implementation (demo-only) that is never a real operator. Participation in the protocol is demonstrated by **verifiable conformance evidence**, evaluated by the engines and under governance — not by a decision of the agent. I can explain how an operator demonstrates conformance through a concrete implementation and how to submit that evidence.",
    },
    sources: s("adr052", "governanceProc"),
  },
  {
    // M2.14G — the operator publication / registry-admission / production-activation / certification /
    // licensing / federation action boundary. A firm, deterministic refusal (never claims execution)
    // with a safe preparation alternative. Plain canonical entities so the emphasis layer bolds them.
    id: "refuse-operator-publication",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso publicar, admitir, aprovar, certificar, licenciar, activar nem federar operadores, nem adicioná-los a `/operators` ou a qualquer registry/lista pública. O BANZA é um protocolo financeiro aberto: operadores independentes preparam manifestos, evidência e testes, mas a participação é **demonstrada por evidência verificável** — não é concedida por uma acção do BanzAI nem por uma autoridade central do protocolo. No BANZA a baseline honesta do protocolo é `production_certificates: false` e um PASS é resultado de verificação técnica, não certificado, licença nem aprovação; o Operador Zero é apenas a implementação de referência só de leitura (demo, usa KZ_DEMO, sem dinheiro real) e nunca é um operador real. Posso ajudar a preparar o manifesto, o key manifest, a revocation list e o evidence bundle, rever a checklist de conformidade e explicar como outros participantes verificam localmente a compatibilidade técnica.",
      en:
        "I cannot publish, admit, approve, certify, license, activate or federate operators, and I cannot add them to `/operators` or to any registry or public list. BANZA is an open financial protocol: independent operators prepare manifests, evidence and tests, but participation is **demonstrated by verifiable evidence** — it is not granted by an action of BanzAI or by a central authority of the protocol. In BANZA the protocol's honest baseline is `production_certificates: false`, and a PASS is the result of technical verification, not a certificate, a licence or an approval; Operator Zero is only the read-only reference implementation (demo, using KZ_DEMO, with no real money) and is never a real operator. I can help prepare the manifest, the key manifest, the revocation list and the evidence bundle, review the conformance checklist, and explain how other participants verify technical compatibility locally.",
    },
    sources: s("adr052", "governanceProc"),
  },
  {
    // M2.14H — technical tool routing. A "valida esse manifesto: {…}" request gets an ARTEFACT ANALYSIS
    // + next steps, not a generic Operador Zero description. Honest about the engine boundary (the full
    // Rust/WASM validator runs in the Manifest step); never certifies/approves/publishes.
    id: "tool-validate-manifest",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido para **validar um manifesto de operador**.\n\n**Análise da estrutura** — um manifesto de operador deve declarar, entre outros: `manifest_version`, `operator_id`, `name`, `environment` (sandbox/produção), `base_url`, `key_manifest_url`, `conformance_url`, `supported_levels`, e as flags de demonstração (`simulated`, `production_allowed`). Se for o perfil demo do **Operador Zero**, terá `operator_id: operator-zero`, `environment: sandbox`, `simulated: true` e `production_allowed: false` — compatível com a implementação de referência só de leitura (usa **KZ_DEMO**), não com um operador real, certificação, licença ou publicação em `/operators`.\n\n**Nesta superfície** identifico e analiso a estrutura do manifesto e indico campos ausentes ou inconsistentes, mas o **motor de validação completo** (Rust/WASM) corre na etapa **Manifest** da jornada — posso encaminhar-te para lá.\n\n**Próximos pontos a validar:** key manifest, revocation list, conformance evidence e evidence bundle. Nota: validação técnica não é certificação nem aprovação; a participação demonstra-se por evidência verificável.",
      en:
        "I detected a request to **validate an operator manifest**.\n\n**Structural analysis** — an operator manifest should declare, among others: `manifest_version`, `operator_id`, `name`, `environment` (sandbox/production), `base_url`, `key_manifest_url`, `conformance_url`, `supported_levels`, and the demonstration flags (`simulated`, `production_allowed`). If this is **Operator Zero's** demo profile it will carry `operator_id: operator-zero`, `environment: sandbox`, `simulated: true` and `production_allowed: false` — consistent with the read-only reference implementation (which uses **KZ_DEMO**), not with a real operator, a certification, a licence or publication in `/operators`.\n\n**On this surface** I identify and analyse the manifest's structure and point out missing or inconsistent fields, but the **full validation engine** (Rust/WASM) runs at the **Manifest** step of the journey — I can route you there.\n\n**Next things to validate:** key manifest, revocation list, conformance evidence and evidence bundle. Note: technical validation is neither certification nor approval; participation is demonstrated by verifiable evidence.",
    },
    sources: s("opManifestSchema", "gettingStarted"),
  },
  {
    id: "tool-validate-conformance",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido de **verificação de conformidade**.\n\nA conformidade demonstra-se por **evidência verificável**: os motores avaliam a evidência e produzem um resultado técnico (PASS/WARN/FAIL). Um **PASS** é resultado de verificação técnica local, **não** um certificado, licença nem aprovação — e a baseline honesta do protocolo é `production_certificates: false`.\n\n**Nesta superfície** oriento a preparação e a leitura da evidência de conformidade e indico os artefactos em falta; a execução completa dos testes de conformidade corre na etapa **Conformidade** da jornada. Posso explicar os níveis (L0–L4), os campos obrigatórios e como interpretar o resultado.",
      en:
        "I detected a **conformance verification** request.\n\nConformance is demonstrated by **verifiable evidence**: the engines evaluate the evidence and produce a technical result (PASS/WARN/FAIL). A **PASS** is the result of local technical verification, **not** a certificate, a licence or an approval — and the protocol's honest baseline is `production_certificates: false`.\n\n**On this surface** I guide the preparation and reading of conformance evidence and point out missing artifacts; the full conformance test execution runs at the **Conformance** step of the journey. I can explain the levels (L0–L4), the required fields and how to read the result.",
    },
    sources: s("conformanceSuite", "evidenceModel"),
  },
  {
    id: "tool-evaluate-trust",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido de **avaliação de trust**.\n\nO trust do protocolo é avaliado a partir de metadata assinada, chaves delegadas, o Registo Técnico e a revocation list (fecho por omissão): o resultado é um **estado técnico**, não uma licença, certificação nem aprovação. Um operador revogado bloqueia o routing (INV-FEDEVAL-002).\n\n**Nesta superfície** explico o modelo de trust e os artefactos a preparar (key manifest, revocation list); a avaliação completa corre na etapa **Trust** da jornada. Posso indicar os campos a validar e como os pares verificam localmente.",
      en:
        "I detected a **trust evaluation** request.\n\nProtocol trust is evaluated from signed metadata, delegated keys, the Technical Registry and the revocation list, closing by default: the result is a **technical state**, not a licence, a certification or an approval. A revoked operator blocks routing (INV-FEDEVAL-002).\n\n**On this surface** I explain the trust model and the artifacts to prepare (key manifest, revocation list); the full evaluation runs at the **Trust** step of the journey. I can point out the fields to validate and how peers verify them locally.",
    },
    sources: s("fedTrustModel", "keyManifestSchema"),
  },
  {
    id: "tool-prepare-federation",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido de **federação técnica**.\n\nPosso ajudar a preparar e a rever os artefactos de federação — manifesto, key manifest, revocation list e evidence bundle — para que outros participantes possam **verificar localmente** a compatibilidade técnica. Não publico o operador, não activo produção e não o adiciono a `/operators`: no BANZA a federação é demonstrada por evidência verificável, não concedida por uma acção do agente.\n\n**Nesta superfície** oriento a preparação técnica/conceptual; a verificação completa corre na etapa **Federação** da jornada.",
      en:
        "I detected a **technical federation** request.\n\nI can help prepare and review the federation artifacts — manifest, key manifest, revocation list and evidence bundle — so that other participants can **verify technical compatibility locally**. I do not publish the operator, do not activate production and do not add it to `/operators`: in BANZA, federation is demonstrated by verifiable evidence, not granted by an action of the agent.\n\n**On this surface** I guide the technical and conceptual preparation; the full verification runs at the **Federation** step of the journey.",
    },
    sources: s("fedQuickstart", "fedManifestSchema"),
  },
  {
    id: "tool-validate-evidence-bundle",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido para **validar um evidence bundle**.\n\nUm evidence bundle agrega os artefactos técnicos (manifesto, resultados de conformidade, referências de trust, traces) como **evidência verificável** — não é uma certificação nem uma publicação. **Nesta superfície** analiso a estrutura e indico artefactos em falta; a geração/validação completa corre na etapa **Evidence Bundle** da jornada. Posso indicar os campos obrigatórios e orientar a preparação. Validação técnica não é aprovação.",
      en:
        "I detected a request to **validate an evidence bundle**.\n\nAn evidence bundle gathers the technical artifacts (manifest, conformance results, trust references, traces) as **verifiable evidence** — it is neither a certification nor a publication. **On this surface** I analyse the structure and point out missing artifacts; the full generation and validation runs at the **Evidence Bundle** step of the journey. I can list the required fields and guide the preparation. Technical validation is not approval.",
    },
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "tool-analyze-trace",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Detectei um pedido para **analisar um trace / preparar um relatório**.\n\nPosso resumir a evidência do trace, apontar inconsistências e preparar um **relatório técnico** dos artefactos e resultados observados. O relatório é evidência técnica — **não** declara aprovação nem certificação. **Nesta superfície** oriento a leitura e a estrutura do relatório; os traces completos ligam-se à etapa **Traces / Relatório** da jornada.",
      en:
        "I detected a request to **analyse a trace or prepare a report**.\n\nI can summarise the trace's evidence, point out inconsistencies and prepare a **technical report** of the artifacts and results observed. The report is technical evidence — it declares **no** approval and **no** certification. **On this surface** I guide the reading and the structure of the report; full traces connect to the **Traces / Report** step of the journey.",
    },
    sources: s("evidenceModel", "gettingStarted"),
  },
  {
    id: "refuse-expose-or-generate-secret",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso mostrar, gerar nem guardar chaves privadas, seeds, mnemonics, tokens, passwords ou o conteúdo de `.env` no repositório. Chaves privadas nunca residem na infraestrutura de serviço nem no Git, e expô-las comprometeria a segurança. Alternativa segura: chaves demo (como a Demo Operator Root E2E do Operador Zero) são geradas de forma efémera e só o material público é committado; para produção, a custódia segue a governança. Posso explicar o modelo de custódia de chaves e como verificar assinaturas apenas com a chave pública.", // blocklist pattern: this refusal ENUMERATES secret types to reject — no key material here,
      en:
        "I cannot show, generate or store private keys, seeds, mnemonics, tokens, passwords or the contents of `.env` in the repository. Private keys never reside on the serving infrastructure or in Git, and exposing them would compromise security. A safe alternative: demo keys — such as Operator Zero's E2E Demo Operator Root — are generated ephemerally and only the public material is committed; for production, custody follows governance. I can explain the key custody model and how to verify signatures using the public key alone.",
    },
    sources: s("ozE2eRoot", "governanceProc"),
  },
  {
    id: "refuse-real-money",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso executar pagamentos reais nem transformar KZ_DEMO em dinheiro real. O Operador Zero é demo-only: `monetary_value: false`, moeda `KZ_DEMO` fictícia, `production_allowed: false`, e não movimenta fundos. Transformá-lo em dinheiro real sairia da fronteira demo e não é uma operação que o agente possa ou deva fazer. Posso explicar como funciona o ledger fictício e a fronteira demo-only.",
      en:
        "I cannot execute real payments or turn KZ_DEMO into real money. Operator Zero is demo-only: `monetary_value: false`, the fictitious `KZ_DEMO` unit, `production_allowed: false`, and it moves no funds. Turning it into real money would leave the demo boundary, and it is not an operation the agent can or should perform. I can explain how the fictitious ledger and the demo-only boundary work.",
    },
    sources: s("adr052"),
  },
  {
    // M2.14D — a request to EXECUTE a real financial/patrimonial operation. Deterministic action-boundary
    // refusal (never the model); offers the safe Operador Zero / KZ_DEMO simulation path. Never claims to
    // have executed anything.
    id: "refuse-financial-action",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso executar pagamentos, transferências, reembolsos, liquidações, créditos, débitos, bloqueios de saldo, cash-in/cash-out, criação de carteiras/contas nem qualquer movimento de dinheiro. O **BANZA** é um protocolo e o **BanzAI** apenas explica, orienta e valida evidência técnica — não movimenta fundos nem actua como operador financeiro. Só operadores independentes implementam serviços financeiros, sujeitos ao seu enquadramento legal e regulatório. Caminho seguro: posso explicar como esse fluxo é representado no protocolo, ou simulá-lo com o **Operador Zero** usando **KZ_DEMO**, sem dinheiro real — o resultado é apenas evidência técnica local.",
      en:
        "I cannot execute payments, transfers, refunds, settlements, credits, debits, balance holds, cash-in/cash-out, wallet or account creation, or any movement of money. **BANZA** is a protocol and **BanzAI** only explains, guides and validates technical evidence — it moves no funds and does not act as a financial operator. Only independent operators implement financial services, subject to their own legal and regulatory framework. The safe path: I can explain how that flow is represented in the protocol, or simulate it with **Operator Zero** using **KZ_DEMO**, with no real money — the result is local technical evidence only.",
    },
    sources: s("adr052", "adr019"),
  },
  {
    id: "refuse-reintroduce-operador-zero",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso reintroduzir a rota antiga `/operador-zero` no apex nem usá-la como fonte/fallback. Ela foi descontinuada intencionalmente (responde 410); a superfície canónica do Operador Zero é **zero.banza.network**, e os endpoints canónicos vivem na raiz desse subdomínio. Reactivar a rota antiga criaria duplicação e confusão de identidade. Alternativa segura: se houver uma razão para mudar o routing, proponha via ADR/PR com revisão e os guards de routing verdes.",
      en:
        "I cannot reintroduce the old `/operador-zero` route at the apex or use it as a source or fallback. It was retired deliberately (it answers 410); Operator Zero's canonical surface is **zero.banza.network**, and the canonical endpoints live at that subdomain's root. Reactivating the old route would create duplication and confusion of identity. A safe alternative: if there is a reason to change the routing, propose it through an ADR/PR with review and the routing guards green.",
    },
    sources: s("adr052", "governanceProc"),
  },
  {
    id: "refuse-infra-destructive",
    critical: true,
    keywords: [],
    realizations: {
      "pt-PT":
        "Não posso apagar ou desactivar infraestrutura (PostgreSQL, nginx, backups, DNS, TLS, Cloudflare). São acções destrutivas e fora do âmbito read-only do agente, e podem comprometer o serviço e a integridade dos dados. Alternativa segura: mudanças de infraestrutura seguem um runbook com validação, janela controlada e rollback; posso ajudar a explicar o impacto, os passos de validação e o plano de rollback, mas não executo nem oriento a destruição.",
      en:
        "I cannot delete or disable infrastructure (PostgreSQL, nginx, backups, DNS, TLS, Cloudflare). These are destructive actions, outside the agent's read-only scope, and they can compromise the service and the integrity of the data. A safe alternative: infrastructure changes follow a runbook with validation, a controlled window and a rollback; I can help explain the impact, the validation steps and the rollback plan, but I neither execute nor guide destruction.",
    },
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
    realizations: {
      "pt-PT":
        "O **único exemplo demo oficial** do BANZA é o **Operador Zero** (ADR-035, Operator Zero Only). Não existem exemplos, demos, samples ou operadores fictícios paralelos — todo exemplo público deriva do Operador Zero (`operator-zero`, KZ_DEMO, `demo_only`). O antigo exemplo genérico de manifesto e as identidades fictícias (operadores de amostra com domínios `.example` de teste) foram convertidos para Operador Zero. Placeholders abstractos (`<operator_id>`, `<base_url>`) podem existir em specs/OpenAPI, mas **não são exemplos demo**. O Operador Zero **não é operador real**, **não aparece em /operators**, e a evidência que produz é **evidência técnica local**, **não certificação**.",
      en:
        "The **only official demo example** in BANZA is **Operator Zero** (ADR-035, Operator Zero Only). There are no parallel examples, demos, samples or fictitious operators — every public example derives from Operator Zero (`operator-zero`, KZ_DEMO, `demo_only`). The former generic manifest example and the fictitious identities (sample operators with test `.example` domains) were converted to Operator Zero. Abstract placeholders (`<operator_id>`, `<base_url>`) may exist in specs and OpenAPI, but they **are not demo examples**. Operator Zero **is not a real operator**, **does not appear in /operators**, and the evidence it produces is **local technical evidence**, **not certification**.",
    },
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
    realizations: {
      "pt-PT":
        "Não. O **upload manual de JSON** no BanzAI é um **modo avançado / ferramenta**, **não** um exemplo oficial: valida um payload que trazes, mas **não entra na jornada demo**, **não desbloqueia artefactos demo**, **não é guardado como operador** e **não aparece** em /operators nem em zero.banza.network. O **único exemplo demo oficial** é o Operador Zero (ADR-035). As **fixtures internas de teste** também **não são exemplos públicos** — são estritamente internas (não aparecem na UI, nas docs públicas nem no índice) e não usam identidades de exemplo públicas.",
      en:
        "No. **Manual JSON upload** in BanzAI is an **advanced mode / tool**, **not** an official example: it validates a payload you bring, but it **does not enter the demo journey**, **does not unlock demo artifacts**, **is not stored as an operator** and **does not appear** in /operators or on zero.banza.network. The **only official demo example** is Operator Zero (ADR-035). The **internal test fixtures** are likewise **not public examples** — they are strictly internal (absent from the UI, the public docs and the index) and use no public example identities.",
    },
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
    realizations: {
      "pt-PT":
        "No **BANZA**, a **federação** é a avaliação técnica, **local e por interacção**, das condições para o encaminhamento de pagamentos entre operadores independentes — sobre metadados de federação, manifest, trust/key manifest, revogação e **evidência verificável** publicada. Publicar evidência demonstra elegibilidade; cada encaminhamento continua sujeito à avaliação completa. Federar **não** é aprovação central, certificação, licença financeira nem entrada automática em produção.",
      en:
        "In **BANZA**, **federation** is the technical evaluation — **local, and per interaction** — of the conditions for routing payments between independent operators, over federation metadata, manifest, trust/key manifest, revocation and published **verifiable evidence**. Publishing evidence demonstrates eligibility; every routing decision remains subject to the full evaluation. Federating is **not** central approval, certification, a financial licence, or automatic entry into production.",
    },
    sources: s("fedQuickstart", "fedFlow", "specOverview", "adr040"),
  },
  {
    id: "def-interoperability",
    deterministic: true,
    critical: true, keywords: ["interoperabilidade", "o que e interoperabilidade", "interoperability", "what is interoperability", "interoperar"],
    realizations: {
      "pt-PT":
        "**Interoperabilidade** é a capacidade de operadores independentes trabalharem em conjunto sob as mesmas regras do protocolo. No **BANZA**, é demonstrada por federação e evidência verificável — não implica aprovação central nem produção automática.",
      en:
        "**Interoperability** is the ability of independent operators to work together under the same protocol rules. In **BANZA** it is demonstrated by federation and verifiable evidence — it implies no central approval and no automatic production.",
    },
    sources: s("specOverview", "fedFlow", "adr018"),
  },
  {
    id: "def-manifest",
    deterministic: true,
    critical: true, keywords: ["manifest", "o que e manifest", "operator manifest", "manifesto do operador", "what is a manifest", "what is manifest"],
    realizations: {
      "pt-PT":
        "**Manifest** (operator manifest) é o documento de metadados que descreve um operador candidato — identidade, ambiente, capacidades e os endpoints que o protocolo espera. No **BANZA**, validar um manifest gera **evidência técnica local**; **não cria operador real nem certifica**.",
      en:
        "A **manifest** (operator manifest) is the metadata document describing a candidate operator — identity, environment, capabilities and the endpoints the protocol expects. In **BANZA**, validating a manifest produces **local technical evidence**; it **creates no real operator and certifies nothing**.",
    },
    sources: s("opManifestSchema", "gettingStarted"),
  },
  {
    id: "def-key-manifest",
    deterministic: true,
    critical: true, keywords: ["key manifest", "o que e key manifest", "keymanifest", "what is a key manifest"],
    realizations: {
      "pt-PT":
        "**Key manifest** é o documento que declara as chaves de assinatura de um operador, usado na avaliação de trust. Só a **chave pública** é necessária para verificar; chaves privadas nunca residem na infraestrutura de serviço.",
      en:
        "A **key manifest** is the document declaring an operator's signing keys, used in trust evaluation. Only the **public key** is needed to verify; private keys never reside on the serving infrastructure.",
    },
    sources: s("keyManifestSchema", "fedTrustModel"),
  },
  {
    id: "def-trust",
    deterministic: true,
    critical: true, keywords: ["trust", "o que e trust", "confianca", "o que e confianca", "what is trust"],
    realizations: {
      "pt-PT":
        "**Trust**, no **BANZA**, é a **avaliação verificável por máquina** sobre metadados assinados, key manifest e revogação, com **fecho por omissão (fail-closed)** — material inválido ou revogado bloqueia. Não é aprovação central nem certificação.",
      en:
        "**Trust**, in **BANZA**, is the **machine-verifiable evaluation** over signed metadata, key manifest and revocation, closing by default (fail-closed) — invalid or revoked material blocks. It is not central approval and it is not certification.",
    },
    sources: s("fedTrustModel", "adr038", "keyManifestSchema"),
  },
  {
    id: "def-trust-root",
    deterministic: true,
    critical: true, keywords: ["trust root", "o que e trust root", "raiz de confianca", "o que e a trust root", "what is the trust root", "root do protocolo"],
    realizations: {
      "pt-PT":
        "A **Trust Root** é a raiz de confiança do **próprio protocolo** (estabelecida pela cerimónia de raiz), **independente de qualquer operador**. É distinta da **Demo Operator Root** do Operador Zero, que é apenas uma raiz demonstrativa e **não** é a Trust Root do protocolo.",
      en:
        "The **Trust Root** is the root of trust of the **protocol itself**, established by the root ceremony and **independent of any operator**. It is distinct from Operator Zero's **Demo Operator Root**, which is only a demonstration root and is **not** the protocol's Trust Root.",
    },
    sources: s("fedTrustModel", "adr038"),
  },
  {
    id: "def-revocation",
    deterministic: true,
    critical: true, keywords: ["revogacao", "o que e revogacao", "revogar", "revocation", "revocation list", "o que e revocation list", "brl", "what is revocation"],
    realizations: {
      "pt-PT":
        "**Revogação** marca uma chave como já não confiável. No **BANZA** publica-se na **BANZA Revocation List (BRL)**; uma chave revogada **bloqueia o trust (fail-closed)** e a jornada não progride. É verificação técnica, não uma decisão de aprovação.",
      en:
        "**Revocation** marks a key as no longer trusted. In **BANZA** it is published in the **BANZA Revocation List (BRL)**; a revoked key **blocks trust (fail-closed)** and the journey does not progress. It is technical verification, not an approval decision.",
    },
    sources: s("brlSchema", "fedTrustModel"),
  },
  {
    id: "def-conformance",
    deterministic: true,
    critical: true, keywords: ["conformidade", "o que e conformidade", "conformance", "o que e conformance", "what is conformance"],
    realizations: {
      "pt-PT":
        "**Conformidade** é demonstrar compatibilidade com o protocolo por **evidência verificável** — verificações determinísticas que produzem PASS/WARN/FAIL. Um resultado é **evidência técnica**, não aprovação humana, licença ou certificação.",
      en:
        "**Conformance** is demonstrating compatibility with the protocol through **verifiable evidence** — deterministic checks that produce PASS/WARN/FAIL. A result is **technical evidence**, not human approval, a licence or a certification.",
    },
    sources: s("conformanceSuite", "evidenceModel", "adr039"),
  },
  {
    id: "def-pass",
    deterministic: true,
    critical: true, keywords: ["pass", "o que e pass", "o que e o pass", "what is pass", "passou"],
    realizations: {
      "pt-PT":
        "**PASS** é um resultado de validação de conformidade que passou: **evidência técnica local verificável**. **Não** é um certificado, aprovação ou licença, e não confere estatuto a nenhum operador.",
      en:
        "**PASS** is a conformance validation result that passed: **verifiable local technical evidence**. It is **not** a certificate, an approval or a licence, and it confers status on no operator.",
    },
    sources: s("conformanceSuite", "evidenceModel"),
  },
  {
    id: "def-evidence-bundle",
    deterministic: true,
    critical: true, keywords: ["evidence bundle", "o que e evidence bundle", "bundle", "pacote de evidencia", "what is an evidence bundle"],
    realizations: {
      "pt-PT":
        "**Evidence bundle** é o pacote de artefactos verificáveis montado a partir dos resultados realmente produzidos (conformidade, trust, federação, traces). Documenta o que aconteceu — é **evidência**, não certificação.",
      en:
        "An **evidence bundle** is the package of verifiable artifacts assembled from the results actually produced (conformance, trust, federation, traces). It documents what happened — it is **evidence**, not certification.",
    },
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "def-evidence",
    deterministic: true,
    critical: true, keywords: ["evidencia tecnica", "o que e evidencia tecnica", "evidencia", "o que e evidencia", "trace", "o que e trace", "session summary", "o que e session summary", "sumario da sessao", "what is a trace", "evidencia e certificacao"],
    realizations: {
      "pt-PT":
        "**Evidência técnica** no **BANZA** são artefactos verificáveis — resultados de conformidade, um **trace** de ponta a ponta, um **session summary** — que documentam o que ocorreu localmente. Evidência **não é certificação**: prova o comportamento, não confere estatuto.",
      en:
        "**Technical evidence** in **BANZA** means verifiable artifacts — conformance results, an end-to-end **trace**, a **session summary** — documenting what occurred locally. Evidence **is not certification**: it proves behaviour, it confers no status.",
    },
    sources: s("evidenceModel", "conformanceSuite"),
  },
  {
    id: "def-operator",
    deterministic: true,
    critical: true, keywords: ["operador", "o que e um operador", "o que e operador", "operator", "what is an operator", "what is a payment operator", "o que e um operador de pagamentos"],
    realizations: {
      "pt-PT":
        "Um **operador** é uma parte independente que **implementa** o protocolo. Os operadores são **separados** do protocolo — o BANZA define as regras; o operador implementa o produto. Validar artefactos gera evidência; não cria operador real nem o certifica.",
      en:
        "An **operator** is an independent party that **implements** the protocol. Operators are **separate** from the protocol — BANZA defines the rules; the operator implements the product. Validating artifacts produces evidence; it creates no real operator and certifies none.",
    },
    sources: s("adr019", "adr018", "specOverview"),
  },
  {
    id: "def-invariant",
    deterministic: true,
    critical: true, keywords: ["invariante", "o que e um invariante", "o que e invariante", "invariant", "what is an invariant"],
    realizations: {
      "pt-PT":
        "Um **invariante** é uma regra de integridade não-negociável que o protocolo garante — famílias INV-LEDGER, INV-WALLET, INV-SETTLE, INV-IDEM, INV-RECON e INV-QR (dupla-entrada, sem saldo negativo, precisão inteira, idempotência, reconciliabilidade, unicidade de QR).",
      en:
        "An **invariant** is a non-negotiable integrity rule the protocol guarantees — the INV-LEDGER, INV-WALLET, INV-SETTLE, INV-IDEM, INV-RECON and INV-QR families (double entry, no negative balance, integer precision, idempotency, reconcilability, QR uniqueness).",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-api-schema",
    deterministic: true,
    critical: true, keywords: ["schema", "o que e schema", "openapi", "o que e openapi", "contract", "o que e um contrato", "api", "o que e a api", "what is a schema", "what is openapi"],
    realizations: {
      "pt-PT":
        "No **BANZA**, os **contratos** (OpenAPI, schemas JSON) definem a forma canónica de manifests, federação, key manifest e revogação. Um **schema** valida a estrutura de um artefacto; os contratos são a fonte de verdade que operadores implementam.",
      en:
        "In **BANZA**, the **contracts** (OpenAPI, JSON schemas) define the canonical form of manifests, federation, key manifest and revocation. A **schema** validates an artifact's structure; the contracts are the source of truth that operators implement.",
    },
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
    realizations: {
      "pt-PT":
        "Uma **ADR** é um **Architecture Decision Record**: um documento que regista uma decisão arquitectural importante. No **BANZA**, uma ADR documenta contexto, decisão, consequências e fronteiras de uma escolha de arquitectura ou governança (ficam em `decisions/adr/`, listadas em `/decisoes`). Uma ADR **não é código**, **não certifica** operadores e **não substitui** CI, revisão nem evidência técnica.",
      en:
        "An **ADR** is an **Architecture Decision Record**: a document recording one significant architectural decision. In **BANZA**, an ADR documents the context, the decision, the consequences and the boundaries of an architecture or governance choice (they live under `decisions/adr/`, listed at `/decisoes`). An ADR **is not code**, **certifies** no operator and **does not replace** CI, review or technical evidence.",
    },
    sources: s("adrIndex", "governanceProc", "govGlossary"),
  },
  {
    id: "def-rfc",
    deterministic: true,
    critical: true, keywords: ["rfc", "o que e rfc", "o que e uma rfc", "o que e um rfc", "request for comments", "what is an rfc", "what is rfc", "o que sao rfcs"],
    realizations: {
      "pt-PT":
        "Uma **RFC** (**Request for Comments**) é uma proposta/discussão estruturada para evoluir o protocolo. No **BANZA**, uma RFC serve para discutir uma mudança **antes** de entrar como especificação, contrato, schema ou decisão (ADR), e vive em `decisions/rfc/`. Uma RFC **não é** norma final nem aprovação — é o passo de discussão do processo aberto.",
      en:
        "An **RFC** (**Request for Comments**) is a structured proposal and discussion for evolving the protocol. In **BANZA**, an RFC exists to discuss a change **before** it becomes a specification, contract, schema or decision (ADR), and it lives under `decisions/rfc/`. An RFC **is not** final norm and not approval — it is the discussion step of the open process.",
    },
    sources: s("rfcIndex", "governanceProc", "govGlossary"),
  },
  {
    id: "def-bcj",
    deterministic: true,
    critical: true, keywords: ["bcj", "bcj 1", "bcj/1", "o que e bcj", "o que e o bcj", "banza canonical json", "canonical json", "what is bcj", "json canonico", "canonicalizacao"],
    realizations: {
      "pt-PT":
        "O **BCJ/1** (*BANZA Canonical JSON*) é a **forma canónica de bytes** do protocolo: um perfil restrito do RFC 8785 (JCS). Fixa como um documento JSON se converte numa sequência de bytes única e determinística — UTF-8, membros duplicados rejeitados antes de qualquer interpretação semântica, inteiros no domínio ±(2^53−1), e **sem normalização Unicode do lado do verificador**. Assinatura, digest e identidade de pedido comparam bytes produzidos por esta regra, pelo que duas implementações que discordem aqui discordam em tudo o resto. É a primeira coisa a ler e a primeira a testar. Especificação: `spec/canonicalization.md`.",
      en:
        "**BCJ/1** (*BANZA Canonical JSON*) is the protocol's **canonical byte form**: a restricted profile of RFC 8785 (JCS). It fixes how a JSON document becomes a single deterministic byte sequence — UTF-8, duplicate members rejected before any semantic interpretation, integers within ±(2^53−1), and **no Unicode normalization on the verifier side**. Signature, digest and request identity all compare bytes produced by this rule, so two implementations that disagree here disagree about everything else. It is the first thing to read and the first thing to test. Specification: `spec/canonicalization.md`.",
    },
    sources: s("specDir", "specOverview"),
  },
  {
    id: "def-root-authorization",
    deterministic: true,
    critical: true, keywords: ["quantas autoridades", "how many authorities", "threshold da raiz", "threshold da trust root", "root threshold", "trust root threshold", "quorum da raiz", "root quorum", "autoridades da raiz", "root authorities", "2 de 3", "2-de-3", "2 of 3", "2-of-3"],
    realizations: {
      "pt-PT":
        "A **Trust Root** do **BANZA** é controlada por **três autoridades de assinatura independentes**. Uma acção autorizada pela raiz requer assinaturas de **quaisquer duas das três** (**2-de-3**); **nenhuma chave de raiz autoriza sozinha**. Perdida, comprometida ou obstrutiva **uma** autoridade, as **duas sobreviventes** substituem-na sem a sua participação; perdidas **duas**, a continuidade canónica fica **bloqueada** — uma só sobrevivente **não** restaura a raiz e **não existe chave-mestra de emergência nem via de uma só parte** (ADR-039). O limiar conta **autoridades distintas**, não entradas de assinatura: duas assinaturas da mesma autoridade valem uma aprovação. A autorização é **criptográfica e lógica** — quantos módulos seguros existem e onde vivem os dispositivos são **controlos de custódia**, e o número de dispositivos nunca determina o limiar. **Nenhuma cerimónia de produção foi realizada, não existe chave de raiz de produção e não há raiz de produção publicada.** Modelo: `docs/security/ROOT_KEY_CUSTODY_MODEL.md`; validador: `engines/banza-root-ceremony`; sucessão: `spec/root-authority-set.md`.",
      en:
        "**BANZA**'s **Trust Root** is controlled by **three independent signing authorities**. A root-authorized action requires signatures from **any two of the three** (**2-of-3**); **no single root key authorizes alone**. If **one** authority is lost, compromised or obstructive, the **two survivors** replace it without its participation; if **two** are lost, canonical continuity is **blocked** — a single survivor does **not** restore the root, and there is **no emergency master key and no single-party path** (ADR-039). The threshold counts **distinct authorities**, not signature entries: two signatures from the same authority count as one approval. Authorization is **cryptographic and logical** — how many secure modules exist and where the devices live are **custody controls**, and the number of devices never determines the threshold. **No production ceremony has been held, no production root key exists, and no production root is published.** Model: `docs/security/ROOT_KEY_CUSTODY_MODEL.md`; validator: `engines/banza-root-ceremony`; succession: `spec/root-authority-set.md`.",
    },
    sources: s("fedTrustModel", "specDir"),
  },
  {
    id: "def-r2s2",
    deterministic: true,
    critical: true, keywords: ["r2s2", "r²s²", "principios fundamentais", "princípios fundamentais", "fundamental principles", "quais sao os principios", "quatro principios", "four principles", "robusto", "resiliente", "seguro", "simples", "robust", "resilient", "secure", "simple", "principios do banza", "design principles"],
    realizations: {
      "pt-PT":
        "Os **Princípios Fundamentais** do **BANZA** são **quatro**, e apenas quatro — em conjunto chamam-se **BANZA R²S²** (ASCII `R2S2`): **Robusto** — comportamento correcto e determinístico perante implementações independentes, entrada adversarial e condições-limite; **Resiliente** — contém falhas, preserva operação segura onde é possível e recupera de forma determinística **sem enfraquecer as garantias do protocolo**; **Seguro** — as propriedades críticas são impostas **por construção** e **fecham por omissão** quando não podem ser estabelecidas; **Simples** — usa o **menor mecanismo suficiente** para fornecer a propriedade exigida. A ordem é canónica. **A resiliência não se sobrepõe à segurança**: nunca permite contornar confiança, autorização ou integridade apenas para continuar disponível, e **não significa ausência de indisponibilidade** — significa que uma falha é contida, explícita e recuperável, e não se transforma numa violação do protocolo. Os princípios são o **critério de decisão**, distintos das **propriedades estruturais** que o protocolo tem de possuir (Referência §3, oito) e dos **invariantes arquitecturais** que a arquitectura não pode violar (Whitepaper, cinco). **`Fecho por omissão` é uma propriedade estrutural** associada a Seguro e Resiliente — **não** é um quinto princípio. Decisão: **ADR-040**; evidência: `assurance/`.",
      en:
        "**BANZA**'s **Fundamental Principles** are **four**, and only four — together they are called **BANZA R²S²** (ASCII `R2S2`): **Robust** — correct, deterministic behaviour across independent implementations, adversarial input and boundary conditions; **Resilient** — contains failures, preserves safe operation where possible and recovers deterministically **without weakening the protocol's guarantees**; **Secure** — critical properties are enforced **by construction** and **close by default** when they cannot be established; **Simple** — uses the **smallest sufficient mechanism** to provide the required property. The order is canonical. **Resilience does not override security**: it never permits bypassing trust, authorization or integrity merely to stay available, and it **does not mean the absence of downtime** — it means a failure is contained, explicit and recoverable, and does not turn into a protocol violation. The principles are the **decision criterion**, distinct from the **structural properties** the protocol must possess (Reference §3, eight of them) and from the **architectural invariants** the architecture may not violate (Whitepaper, five). **`Closing by default` is a structural property** associated with Secure and Resilient — it is **not** a fifth principle. Decision: **ADR-040**; evidence: `assurance/`.",
    },
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
    realizations: {
      "pt-PT":
        "**Não.** A **resiliência nunca se sobrepõe à segurança**, nem a qualquer garantia de correcção do protocolo. O **BANZA** segue **segurança antes de disponibilidade**: onde a **confiança**, a **autorização**, a **integridade** ou a **correcção** não podem ser estabelecidas, o protocolo **falha ou degrada em segurança** em vez de continuar por um caminho alternativo inseguro. Em concreto, ser resiliente **não** autoriza contornar a confiança, aceitar um artefacto **não assinado** ou de origem não verificada, **estender** uma validade expirada, baixar o limiar de assinaturas nem prosseguir com verificações mais fracas para permanecer disponível — **recusar é um resultado correcto**. Resiliência também **não significa ausência de indisponibilidade**: significa que uma falha é **contida, explícita e recuperável de forma determinística**, e que **nunca se transforma numa violação do protocolo**. **Resiliente** e **Seguro** são dois dos quatro Princípios Fundamentais (**BANZA R²S²**); decisão: **ADR-040**.",
      en:
        "**No.** **Resilience never overrides security**, nor any guarantee of the protocol's correctness. **BANZA** follows **security before availability**: where **trust**, **authorization**, **integrity** or **correctness** cannot be established, the protocol **fails or degrades safely** rather than continuing down an unsafe alternative path. Concretely, being resilient does **not** authorise bypassing trust, accepting an **unsigned** artifact or one of unverified origin, **extending** an expired validity, lowering the signature threshold, or proceeding with weaker checks in order to stay available — **refusing is a correct outcome**. Resilience also **does not mean the absence of downtime**: it means a failure is **contained, explicit and deterministically recoverable**, and **never turns into a protocol violation**. **Resilient** and **Secure** are two of the four Fundamental Principles (**BANZA R²S²**); decision: **ADR-040**.",
    },
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
    realizations: {
      "pt-PT":
        "**O BANZA não estabelece uma autoridade central que controle os operadores.** Um **operador** é uma entidade organizacional independente, responsável por correr uma implementação; uma **implementação** é o sistema técnico que segue as regras (ADR-002). São coisas distintas, e uma pergunta organizacional não se responde como se um operador fosse apenas software.\n\nSe por **controlo** se entende **requisitos técnicos**: o protocolo define, em contratos e especificações públicas, os requisitos que uma implementação tem de satisfazer para ser conforme. Isso é **constrangimento técnico, não controlo organizacional** — um contrato define interfaces, representações e comportamento exigido; não se torna o controlador institucional de uma entidade.\n\nAs decisões estão separadas e nenhuma implica a outra (ADR-004, ADR-005):\n\n- **Protocolo** — especifica as regras técnicas.\n- **Implementação** — implementa essas regras.\n- **Conformidade ou certificação** — avalia uma implementação num âmbito determinado (versão do protocolo, perfil, ambiente, evidência). Avalia implementações, **não** confere admissão nem licença.\n- **Admissão e governação operacional** — pertencem, separadamente, ao esquema operacional aplicável, segundo as suas próprias regras (ADR-006).\n- **Autorização ou supervisão regulatória** — pertence, separadamente, ao enquadramento jurídico e às autoridades competentes da jurisdição aplicável (ADR-007).\n\n**Nenhuma dessas decisões é automaticamente conferida pelo BANZA.** Não há um controlador central de operadores, nem uma admissão do BANZA, nem uma autoridade regulatória do BANZA. Os mantenedores governam a evolução do protocolo no processo público, não os operadores; as autoridades de raiz desempenham o seu papel criptográfico de confiança, que não é governação operacional; e o registo técnico público indexa manifestos, versões e evidência auto-publicada — **não é uma lista de admitidos nem uma porta de entrada**.",
      en:
        "**BANZA establishes no central authority that controls operators.** An **operator** is an independent organizational entity, responsible for running an implementation; an **implementation** is the technical system that follows the rules (ADR-002). They are distinct things, and an organizational question is not answered as though an operator were merely software.\n\nIf by **control** one means **technical requirements**: the protocol defines, in public contracts and specifications, the requirements an implementation must satisfy to be conformant. That is **technical constraint, not organizational control** — a contract defines interfaces, representations and required behaviour; it does not become the institutional controller of an entity.\n\nThe decisions are separate, and none implies another (ADR-004, ADR-005):\n\n- **Protocol** — specifies the technical rules.\n- **Implementation** — implements those rules.\n- **Conformance or certification** — evaluates an implementation within a defined scope (protocol version, profile, environment, evidence). It evaluates implementations; it confers neither admission nor licence.\n- **Admission and operational governance** — belong, separately, to the applicable operational scheme, under its own rules (ADR-006).\n- **Regulatory authorisation or supervision** — belongs, separately, to the legal framework and the competent authorities of the applicable jurisdiction (ADR-007).\n\n**None of those decisions is automatically conferred by BANZA.** There is no central controller of operators, no BANZA admission and no BANZA regulatory authority. The maintainers govern the protocol's evolution in the public process, not the operators; the root authorities perform their cryptographic trust role, which is not operational governance; and the public technical registry indexes manifests, versions and self-published evidence — **it is not a list of admitted parties and not a gate**.",
    },
    sources: s("adr002", "adr059", "adr005sep", "adr060", "adr062", "govGlossary"),
  },
  {
    id: "def-l0-regulatory-boundary",
    deterministic: true,
    critical: true, keywords: ["l0 sandbox regulatorio", "l0 sandbox regulatório", "l0 regulatory sandbox", "l0 sandbox do bna", "l0 bna sandbox", "l0 lispa", "l0 e lispa", "l0 dinheiro real", "l0 movimentar dinheiro real", "l0 real money", "l0 move real funds", "l0 fundos reais", "implementar l0 sem ser operador", "testar l0 sem ser operador", "implement l0 without being an operator", "test l0 without being a financial operator", "conformidade da licenca", "certificacao da licenca", "conformidade banza da licenca para operar", "does banza conformance authorize", "does certification authorize me to operate", "passar l0 significa producao", "passar l0 producao", "passing l0 production", "l0 significa que posso entrar em producao", "l0 autoriza", "l0 confere autorizacao"],
    realizations: {
      "pt-PT":
        "**Não.** O **L0 — Sandbox de Protocolo** permite **implementar, testar e demonstrar a interoperabilidade técnica** do **BANZA** num ambiente **controlado e não produtivo**, com material, credenciais, dados e valores **de teste** — e **não confere, substitui nem implica autorização regulatória, admissão operacional, participação num arranjo de pagamentos ou permissão para movimentar fundos reais**. Em concreto: **conformidade técnica não é autorização regulatória**, **certificação BANZA não é admissão operacional**, e **passar em L0 não é aprovação para produção** — não há progressão automática de L0 para produção, porque perfis medem **capacidade técnica** e não são níveis de licença (ADR-005). O **L0 é um sandbox de protocolo, não um sandbox regulatório**: os laboratórios e programas de autorização operados por um regulador são **institucionalmente distintos** — o **BANZA L0 não é** uma autorização, aprovação, supervisão ou programa do **Banco Nacional de Angola**, e é **distinto do LISPA**, o Laboratório de Inovação do Sistema de Pagamentos que o BNA opera; participar no L0 não é participar no LISPA. Isto **não** significa que o L0 esteja fora da lei: significa apenas que **o teste técnico não pressupõe a autorização exigida para a operação financeira real**. A lei geralmente aplicável continua a aplicar-se, e a passagem para operação real depende, **separadamente**, do enquadramento jurídico, regulatório, operacional e de governação aplicável ao operador, ao esquema e à jurisdição. O que é de teste é o **material e os valores**, não o comportamento do protocolo — e **material de teste nunca se torna válido em produção** por mudar de ambiente (ADR-023). O **BANZA** descreve esta fronteira; **não determina** se uma entidade concreta precisa de uma licença específica nem se um modelo de negócio é lícito — isso pertence ao quadro legal e à autoridade competente. Fronteira completa: `docs/governance/certification-boundary.md`.",
      en:
        "**No.** **L0 — Protocol Sandbox** lets you **implement, test and demonstrate BANZA's technical interoperability** in a **controlled, non-production** environment, with **test** material, credentials, data and values — and it **neither confers, replaces nor implies regulatory authorisation, operational admission, participation in a payment arrangement, or permission to move real funds**. Concretely: **technical conformance is not regulatory authorisation**, **BANZA certification is not operational admission**, and **passing L0 is not approval for production** — there is no automatic progression from L0 to production, because profiles measure **technical capability** and are not licence levels (ADR-005). **L0 is a protocol sandbox, not a regulatory sandbox**: laboratories and authorisation programmes operated by a regulator are **institutionally distinct** — **BANZA L0 is not** an authorisation, approval, supervision or programme of the **Banco Nacional de Angola**, and it is **distinct from LISPA**, the payment-system innovation laboratory the BNA operates; taking part in L0 is not taking part in LISPA. This does **not** mean L0 sits outside the law: it means only that **a technical test does not presuppose the authorisation required for real financial operation**. Generally applicable law continues to apply, and moving to real operation depends, **separately**, on the legal, regulatory, operational and governance framework applicable to the operator, the scheme and the jurisdiction. What is test is the **material and the values**, not the protocol's behaviour — and **test material never becomes production-valid** by changing environment (ADR-023). **BANZA** describes this boundary; it **does not determine** whether a given entity needs a specific licence or whether a business model is lawful — that belongs to the legal framework and the competent authority. Full boundary: `docs/governance/certification-boundary.md`.",
    },
    sources: s("govGlossary", "specDir"),
  },
  {
    id: "def-local-execution",
    deterministic: true,
    critical: true, keywords: ["execucao local", "execução local", "servidor central", "central server", "processador central", "central processor", "central transaction processor", "consenso global", "global consensus", "execucao federada", "federated execution", "infraestrutura central", "ponto central", "banza e uma blockchain", "is banza a blockchain"],
    realizations: {
      "pt-PT":
        "**Não.** O **BANZA** **não** exige um **processador central de transacções**, **não** usa **consenso global** e **não** reside num **servidor central** — não é uma blockchain nem uma infraestrutura partilhada de execução. A execução é **local a cada operador**: cada implementação corre na infraestrutura do próprio operador, e dois operadores interoperam por **respeitarem as mesmas regras públicas**, não por se ligarem a um ponto central comum. A execução **não é** um plano do protocolo — processar pagamentos, guardar saldos e cumprir obrigações legais pertence aos operadores, **sob** as regras do protocolo mas **fora** dele; o protocolo **não detém nem movimenta fundos** e não mantém um livro-razão global sobre o qual houvesse que chegar a acordo. As únicas superfícies comuns são de **descoberta e ancoragem de confiança** — o **Registo Técnico**, a **metadata de protocolo assinada**, a **Lista de Revogação** e o **Manifesto de Chaves** —, e **nenhuma delas movimenta fundos nem executa pagamentos**. Referência **§4 Arquitectura do Protocolo** (execução local, sem servidor central).",
    // `claudeMd` removed for the same reason as what-is-banza: an internal repository guide is not public
    // establishing evidence, and a presentation filter hiding it does not make the declaration true. Found
    // by auditing every deterministic entry rather than only the one that prompted the audit.,
      en:
        "**No.** **BANZA** does **not** require a **central transaction processor**, does **not** use **global consensus** and does **not** live on a **central server** — it is neither a blockchain nor a shared execution infrastructure. Execution is **local to each operator**: every implementation runs on that operator's own infrastructure, and two operators interoperate by **following the same public rules**, not by connecting to a common central point. Execution **is not** a plane of the protocol — processing payments, holding balances and meeting legal obligations belong to operators, **under** the protocol's rules but **outside** it; the protocol **neither holds nor moves funds** and keeps no global ledger that would have to be agreed upon. The only shared surfaces are for **discovery and trust anchoring** — the **Technical Registry**, **signed protocol metadata**, the **Revocation List** and the **Key Manifest** — and **none of them moves funds or executes payments**. Reference **§4 Protocol Architecture** (local execution, no central server).",
    },
    sources: s("specOverview", "readme", "adr018"),
  },
  {
    id: "def-root-authority-set",
    deterministic: true,
    critical: true, keywords: ["conjunto de autoridades", "conjunto de autoridades da raiz", "root authority set", "sucessao da raiz", "sucessao de autoridades", "root succession", "substituir uma autoridade", "replace an authority", "continuidade da raiz", "root continuity", "autoridade perdida", "lost authority", "autoridade comprometida", "conjunto genese", "genesis set", "predecessor"],
    realizations: {
      "pt-PT":
        "O **Conjunto de Autoridades da Raiz** é o artefacto que responde a **quem pode exercer a autoridade da raiz** — distinto do **Manifesto de Chaves**, que responde a **o que a raiz delega neste momento**. A raiz avança como uma **linhagem**: o **conjunto génese** (sequência 0) é aceite apenas quando o seu digest é igual a um que o verificador recebeu **explicitamente** — confiança no primeiro uso é recusada; cada conjunto seguinte nomeia o predecessor por digest, avança a sequência exactamente uma unidade e transporta assinaturas de **duas autoridades distintas do conjunto predecessor**. Um conjunto assinado pelas suas próprias chaves **não autoriza nada**. Daqui decorre a continuidade: se uma autoridade for perdida, comprometida ou obstrutiva, as **duas sobreviventes** autorizam um sucessor que a substitui, **sem a sua participação** — exigi-la tornaria o caminho 3-de-3 e dar-lhe-ia um veto. Se restar menos do que o limiar, a continuidade canónica fica **bloqueada**: não existe chave-mestra de emergência, chave de recuperação oculta nem via de uma só parte. Especificação: `spec/root-authority-set.md`; decisão: **ADR-039**; invariantes `INV-ROOT-011` a `INV-ROOT-014`.",
      en:
        "The **Root Authority Set** is the artifact that answers **who may exercise root authority** — distinct from the **Key Manifest**, which answers **what the root delegates right now**. The root advances as a **lineage**: the **genesis set** (sequence 0) is accepted only when its digest equals one the verifier received **explicitly** — trust on first use is refused; each subsequent set names its predecessor by digest, advances the sequence by exactly one, and carries signatures from **two distinct authorities of the predecessor set**. A set signed by its own keys **authorises nothing**. Continuity follows from that: if an authority is lost, compromised or obstructive, the **two survivors** authorise a successor that replaces it, **without its participation** — requiring it would make the path 3-of-3 and hand it a veto. If fewer than the threshold remain, canonical continuity is **blocked**: there is no emergency master key, no hidden recovery key and no single-party path. Specification: `spec/root-authority-set.md`; decision: **ADR-039**; invariants `INV-ROOT-011` through `INV-ROOT-014`.",
    },
    sources: s("specDir", "fedTrustModel"),
  },
  {
    id: "def-trust-guarantees",
    deterministic: true,
    critical: true, keywords: ["transparencia global", "global transparency", "split-view", "split view", "consistencia de conjunto", "set consistency", "mix-and-match", "mix and match", "consistencia entre observadores", "cross-observer", "garantias de confianca", "trust guarantees", "o banza fornece transparencia global"],
    realizations: {
      "pt-PT":
        "**Não.** O **BANZA** **não** fornece transparência global nem detecção de *split-view*. Quatro garantias distintas precisam de ser separadas: **fornece — frescura do artefacto**: um artefacto expirado não é aceite (`expires_at`); **fornece — monotonicidade local**: dentro do âmbito observado, um marcador de ordem inferior é rejeitado (`trust_version_rollback`) e o mesmo marcador com conteúdo diferente falha fechado (`trust_version_equivocation`); **não fornece — consistência de conjunto**: vários artefactos individualmente válidos e frescos não são garantidamente do mesmo estado de publicação — a expiração limita a idade de cada artefacto, **não a coerência entre eles**; **não fornece — consistência entre observadores**: dois verificadores podem observar estados diferentes sem que o protocolo o detecte. Especificação: `spec/trust-freshness.md`.",
      en:
        "**No.** **BANZA** does **not** provide global transparency or split-view detection. Four distinct guarantees need separating: **provided — artifact freshness**: an expired artifact is not accepted (`expires_at`); **provided — local monotonicity**: within the observed scope, a lower-ordered marker is rejected (`trust_version_rollback`) and the same marker with different content fails closed (`trust_version_equivocation`); **not provided — set consistency**: several individually valid and fresh artifacts are not guaranteed to come from the same publication state — expiry bounds the age of each artifact, **not the coherence between them**; **not provided — cross-observer consistency**: two verifiers may observe different states without the protocol detecting it. Specification: `spec/trust-freshness.md`.",
    },
    sources: s("specDir", "fedTrustModel"),
  },
  {
    id: "def-spec",
    deterministic: true,
    critical: true, keywords: ["spec", "o que e spec", "o que e uma spec", "specification", "especificacao", "o que e especificacao", "what is a spec", "what is a specification"],
    realizations: {
      "pt-PT":
        "Uma **spec** (especificação) descreve as **regras, formatos, comportamento esperado e interfaces** do protocolo. No **BANZA** vive em `spec/` e deve ser distinguida da **implementação**: a spec diz o que é correcto; um operador implementa-a. Uma spec **não é** código nem certificação.",
      en:
        "A **spec** (specification) describes the protocol's **rules, formats, expected behaviour and interfaces**. In **BANZA** it lives under `spec/` and must be distinguished from the **implementation**: the spec says what is correct; an operator implements it. A spec **is not** code and not certification.",
    },
    sources: s("specDir", "specOverview", "govGlossary"),
  },
  {
    id: "def-guard",
    deterministic: true,
    critical: true, keywords: ["guard", "o que e guard", "o que e um guard", "guards", "o que sao guards", "what is a guard", "what are guards", "verificacao automatizada"],
    realizations: {
      "pt-PT":
        "Um **guard** é uma **verificação automatizada** que impede regressões, violações de fronteira, contaminação de marca, fuga de segredos ou quebra de regras do projecto. No **BANZA** correm por `make <nome>-check` (em `tools/`) e no CI. Um guard **não é** uma decisão normativa nem deve ser contornado — remover ou ignorar um guard é uma acção recusada.",
      en:
        "A **guard** is an **automated check** that prevents regressions, boundary violations, brand contamination, secret leakage or breaches of project rules. In **BANZA** they run through `make <name>-check` (under `tools/`) and in CI. A guard **is not** a normative decision and must not be bypassed — removing or ignoring a guard is a refused action.",
    },
    sources: s("guardsDir", "makefile", "govGlossary"),
  },
  {
    id: "def-ci",
    deterministic: true,
    critical: true, keywords: ["ci", "o que e ci", "o que e o ci", "continuous integration", "integracao continua", "what is ci", "what is continuous integration"],
    realizations: {
      "pt-PT":
        "**CI** significa **Continuous Integration**: o conjunto de **checks automatizados** que corre em cada PR para validar testes, guards, build e regras do projecto. No **BANZA** vive em `.github/workflows/`. CI **não** deve ser passado à força: fazer merge com checks vermelhos é uma acção recusada.",
      en:
        "**CI** stands for **Continuous Integration**: the set of **automated checks** that runs on every PR to validate tests, guards, build and project rules. In **BANZA** it lives under `.github/workflows/`. CI must **not** be forced through: merging with red checks is a refused action.",
    },
    sources: s("ciWorkflows", "governanceProc", "govGlossary"),
  },
  {
    id: "def-pr",
    deterministic: true,
    critical: true, keywords: ["pr", "o que e pr", "o que e um pr", "pull request", "o que e um pull request", "what is a pr", "what is a pull request"],
    realizations: {
      "pt-PT":
        "Um **PR** (**Pull Request**) é uma **proposta de alteração** ao repositório, revista e validada por **CI** antes do merge. No **BANZA**, um PR não deve ser fundido com checks vermelhos nem com `--admin` a contornar CI falhado — isso é uma acção recusada.",
      en:
        "A **PR** (**Pull Request**) is a **proposed change** to the repository, reviewed and validated by **CI** before merge. In **BANZA**, a PR must not be merged with red checks or with `--admin` bypassing failed CI — that is a refused action.",
    },
    sources: s("governanceProc", "contributing", "govGlossary"),
  },
  {
    id: "def-issue",
    deterministic: true,
    critical: true, keywords: ["issue", "o que e issue", "o que e uma issue", "o que e um issue", "what is an issue", "what is a github issue"],
    realizations: {
      "pt-PT":
        "Uma **issue** é um registo de **problema, proposta ou tarefa** no repositório. No **BANZA** faz parte do processo aberto (issues → discussão/RFC → PR → CI → merge). Uma issue **não é** decisão nem aprovação — é o ponto de partida da discussão.",
      en:
        "An **issue** is a record of a **problem, proposal or task** in the repository. In **BANZA** it is part of the open process (issues → discussion/RFC → PR → CI → merge). An issue **is not** a decision or an approval — it is where the discussion starts.",
    },
    sources: s("governanceProc", "contributing", "govGlossary"),
  },
  {
    id: "def-release",
    deterministic: true,
    critical: true, keywords: ["release", "o que e release", "o que e uma release", "o que e um release", "version", "versao", "o que e uma versao", "tag", "o que e uma tag", "what is a release"],
    realizations: {
      "pt-PT":
        "Uma **release** é uma **versão publicada** do projecto, normalmente ligada a uma **tag** e ao **changelog**. No **BANZA** identifica um estado reproduzível do repositório. Uma release **não** confere estatuto a operadores nem é certificação.",
      en:
        "A **release** is a **published version** of the project, normally tied to a **tag** and to the **changelog**. In **BANZA** it identifies a reproducible state of the repository. A release **confers** no status on operators and is not certification.",
    },
    sources: s("changelog", "governanceProc", "govGlossary"),
  },
  {
    id: "def-changelog",
    deterministic: true,
    critical: true, keywords: ["changelog", "o que e changelog", "o que e o changelog", "what is a changelog", "historico de alteracoes"],
    realizations: {
      "pt-PT":
        "O **changelog** é o **histórico de alterações relevantes** entre versões do projecto. No **BANZA** vive em `CHANGELOG.md`. É um registo — **não** é norma nem certificação.",
      en:
        "The **changelog** is the **history of relevant changes** between versions of the project. In **BANZA** it lives in `CHANGELOG.md`. It is a record — **not** norm and not certification.",
    },
    sources: s("changelog", "govGlossary"),
  },
  {
    id: "def-runbook",
    deterministic: true,
    critical: true, keywords: ["runbook", "o que e runbook", "o que e um runbook", "what is a runbook"],
    realizations: {
      "pt-PT":
        "Um **runbook** é um **guia operacional** para executar, diagnosticar, recuperar ou manter um sistema (passos, smoke tests, rollback). No **BANZA** vivem em `docs/guides/`. Um runbook orienta a operação — **não** altera as regras do protocolo.",
      en:
        "A **runbook** is an **operational guide** for running, diagnosing, recovering or maintaining a system (steps, smoke tests, rollback). In **BANZA** they live under `docs/guides/`. A runbook guides operation — it **does not** change the protocol's rules.",
    },
    sources: s("runbookDoc", "govGlossary"),
  },
  {
    id: "def-rollback",
    deterministic: true,
    critical: true, keywords: ["rollback", "o que e rollback", "o que e um rollback", "what is a rollback", "reverter para estado anterior"],
    realizations: {
      "pt-PT":
        "**Rollback** é o processo de **voltar a um estado anterior seguro** após uma falha ou regressão (por exemplo, repor uma configuração ou uma versão anterior). No **BANZA** os runbooks documentam o rollback de cada mudança operacional. Não afecta invariantes do protocolo.",
      en:
        "**Rollback** is the process of **returning to a previous safe state** after a failure or regression — restoring an earlier configuration or version, for instance. In **BANZA**, the runbooks document the rollback for each operational change. It does not affect protocol invariants.",
    },
    sources: s("runbookDoc", "govGlossary"),
  },
  {
    id: "def-maintainer",
    deterministic: true,
    critical: true, keywords: ["maintainer", "o que e maintainer", "o que e um maintainer", "who is a maintainer", "what is a maintainer", "mantenedor", "o que e um mantenedor", "contributor", "o que e um contributor", "contribuidor"],
    realizations: {
      "pt-PT":
        "Um **maintainer** é uma pessoa ou entidade responsável por **manter o projecto**, rever mudanças e preservar a integridade do repositório. No **BANZA** a governança é **aberta** (qualquer um contribui via issue/RFC/PR); o **Banzami** é o criador original e mantenedor institucional inicial. Ser maintainer **não** dá autoridade para certificar, aprovar ou licenciar operadores.",
      en:
        "A **maintainer** is a person or entity responsible for **maintaining the project**, reviewing changes and preserving the repository's integrity. In **BANZA** governance is **open** (anyone contributes through issue/RFC/PR); **Banzami** is the original creator and initial institutional maintainer. Being a maintainer gives **no** authority to certify, approve or license operators.",
    },
    sources: s("maintainers", "governance", "govGlossary"),
  },
  {
    id: "def-governance",
    deterministic: true,
    critical: true, keywords: ["governance", "o que e governance", "o que e governanca", "governanca", "o que e a governanca", "what is governance", "modelo de governanca", "governanca aberta"],
    realizations: {
      "pt-PT":
        "**Governança** é o **processo aberto** pelo qual o BANZA evolui: issues, RFCs, ADRs, pull requests, revisão e CI. No **BANZA** a governança é **aberta** e a conformidade demonstra-se por **evidência verificável**, não por uma autoridade central. A governança **não** certifica, aprova nem licencia operadores.",
      en:
        "**Governance** is the **open process** by which BANZA evolves: issues, RFCs, ADRs, pull requests, review and CI. In **BANZA** governance is **open**, and conformance is demonstrated by **verifiable evidence** rather than by a central authority. Governance **does not** certify, approve or license operators.",
    },
    sources: s("governanceProc", "adrIndex", "govGlossary"),
  },
  {
    id: "def-audit-report",
    deterministic: true,
    critical: true, keywords: ["audit", "o que e audit", "audit report", "o que e um audit report", "relatorio de auditoria", "o que e auditoria", "evidence report", "what is an audit report", "what is an audit"],
    realizations: {
      "pt-PT":
        "Um **audit report** (relatório de auditoria) documenta uma **revisão** do repositório ou de um marco — o que foi verificado, achados e conclusões. No **BANZA** vivem em `docs/quality/`. É **evidência/registo** de revisão — **não** é certificação nem aprovação de operador.",
      en:
        "An **audit report** documents a **review** of the repository or of a milestone — what was verified, the findings and the conclusions. In **BANZA** they live under `docs/quality/`. It is **evidence and record** of a review — **not** certification and not approval of an operator.",
    },
    sources: s("reportsDir", "govGlossary"),
  },
  {
    id: "def-kz-demo",
    deterministic: true,
    critical: true, keywords: ["kz_demo", "o que e kz_demo", "kz demo", "kz_demo e dinheiro real", "kz demo dinheiro real"],
    realizations: {
      "pt-PT":
        "**KZ_DEMO** é a unidade de demonstração (moeda fictícia) do Operador Zero, a implementação de referência só de leitura — `monetary_value: false`, `demo_only: true`. **Não é dinheiro real**, não tem valor monetário e não move fundos. Serve apenas para demonstrar e validar o protocolo de ponta a ponta.",
      en:
        "**KZ_DEMO** is the demonstration unit (a fictitious currency) of Operator Zero, the read-only reference implementation — `monetary_value: false`, `demo_only: true`. It **is not real money**, has no monetary value and moves no funds. It exists only to demonstrate and validate the protocol end to end.",
    },
    sources: s("adr052", "ozEngine"),
  },

  // Layer B — fintech/payment domain (general explanation ≠ BANZA rule)
  {
    id: "def-ledger",
    deterministic: true,
    critical: true, keywords: ["ledger", "o que e ledger", "o que e o ledger", "livro razao", "what is a ledger"],
    realizations: {
      "pt-PT":
        "**Ledger** é o registo de movimentos financeiros. No **BANZA**, o protocolo define **invariantes** de ledger de **dupla-entrada** (cada débito tem o crédito correspondente, aritmética inteira, sem floats); o BANZA **não mantém contas reais** — os saldos são sempre derivados do ledger.",
      en:
        "A **ledger** is the record of financial movements. In **BANZA** the protocol defines **double-entry** ledger **invariants** — every debit has its matching credit, integer arithmetic, no floats — and **BANZA holds no real accounts**: balances are always derived from the ledger.",
    },
    sources: s("adr006", "invariants"),
  },
  {
    id: "def-double-entry",
    deterministic: true,
    critical: true, keywords: ["double entry", "double-entry", "o que e double entry", "partida dobrada", "dupla entrada", "what is double entry"],
    realizations: {
      "pt-PT":
        "**Dupla-entrada (double-entry)** significa que cada débito tem um crédito correspondente e o valor é conservado. No **BANZA** é um **invariante** obrigatório do ledger — nenhum valor é criado ou destruído.",
      en:
        "**Double entry** means every debit has a matching credit and value is conserved. In **BANZA** it is a mandatory ledger **invariant** — no value is created or destroyed.",
    },
    sources: s("adr006", "invariants"),
  },
  {
    id: "def-balance",
    deterministic: true,
    critical: true, keywords: ["saldo", "o que e saldo", "balance", "what is balance", "what is a balance"],
    realizations: {
      "pt-PT":
        "**Saldo (balance)** é o valor de uma conta. No **BANZA**, os saldos são sempre **derivados do ledger** (nunca actualizados directamente) e nunca podem ficar negativos — é um invariante de comportamento. O protocolo não mantém contas reais.",
      en:
        "A **balance** is the value of an account. In **BANZA**, balances are always **derived from the ledger** — never updated directly — and can never go negative; that is a behavioural invariant. The protocol holds no real accounts.",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-available-balance",
    deterministic: true,
    critical: true, keywords: ["saldo disponivel", "o que e saldo disponivel", "available balance", "what is available balance"],
    realizations: {
      "pt-PT":
        "**Saldo disponível** é a parte do saldo que pode ser usada numa operação. No **BANZA** aparece como invariante de comportamento (derivado do ledger); o protocolo não mantém contas reais nem move fundos.",
      en:
        "**Available balance** is the portion of a balance that can be used in an operation. In **BANZA** it appears as a behavioural invariant (derived from the ledger); the protocol holds no real accounts and moves no funds.",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-reserved-balance",
    deterministic: true,
    critical: true, keywords: ["saldo reservado", "o que e saldo reservado", "reserved balance", "what is reserved balance"],
    realizations: {
      "pt-PT":
        "**Saldo reservado** é a parte do saldo temporariamente bloqueada para uma operação pendente. No **BANZA** é um invariante de comportamento derivado do ledger; não corresponde a fundos reais retidos pelo protocolo.",
      en:
        "**Reserved balance** is the portion of a balance temporarily held for a pending operation. In **BANZA** it is a behavioural invariant derived from the ledger; it does not correspond to real funds held by the protocol.",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-wallet",
    deterministic: true,
    critical: true, keywords: ["wallet", "o que e wallet", "carteira", "carteira digital", "o que e carteira digital", "o que e uma carteira", "what is a wallet"],
    realizations: {
      "pt-PT":
        "**Carteira (wallet)** é uma conta digital que detém um saldo. É um conceito que um **operador** implementa; o **BANZA não é uma carteira** — define invariantes (saldos derivados do ledger, sem saldo negativo), não guarda fundos reais.",
      en:
        "A **wallet** is a digital account holding a balance. It is a concept an **operator** implements; **BANZA is not a wallet** — it defines invariants (balances derived from the ledger, never negative) and holds no real funds.",
    },
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-payment",
    deterministic: true,
    critical: true, keywords: ["pagamento", "o que e pagamento", "payment", "what is a payment", "pagamento instantaneo"],
    realizations: {
      "pt-PT":
        "**Pagamento** é a transferência de valor de um ordenante (payer) para um beneficiário (payee), tipicamente via um comerciante. No **BANZA** os fluxos de pagamento são modelados por contratos e invariantes (ledger, idempotência, QR); o protocolo **não move dinheiro real**.",
      en:
        "A **payment** is the transfer of value from a payer to a payee, typically through a merchant. In **BANZA**, payment flows are modelled by contracts and invariants (ledger, idempotency, QR); the protocol **moves no real money**.",
    },
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-qr",
    deterministic: true,
    critical: true, keywords: ["qr", "pagamento qr", "o que e pagamento qr", "payment request", "o que e qr", "what is a qr payment"],
    realizations: {
      "pt-PT":
        "Um **pagamento QR** é um pedido de pagamento representado num código QR que o pagador confirma. No **BANZA** o QR tem invariantes (resolução única, uso único de QR dinâmico, expiração — INV-QR); é uma simulação/contrato, não movimento de dinheiro real.",
      en:
        "A **QR payment** is a payment request represented in a QR code that the payer confirms. In **BANZA** the QR carries invariants (unique resolution, single use for a dynamic QR, expiry — INV-QR); it is a contract and a simulation, not movement of real money.",
    },
    sources: s("invariants", "specOverview"),
  },
  {
    id: "def-payment-link",
    deterministic: true,
    critical: true, keywords: ["payment link", "o que e payment link", "link de pagamento", "o que e link de pagamento", "what is a payment link"],
    realizations: {
      "pt-PT":
        "Um **payment link** (link de pagamento) é uma ligação partilhável que inicia um pedido de pagamento. É um conceito de produto que um operador implementa; o **BANZA** define contratos/invariantes, não processa pagamentos reais.",
      en:
        "A **payment link** is a shareable link that initiates a payment request. It is a product concept an operator implements; **BANZA** defines contracts and invariants and does not process real payments.",
    },
    sources: s("specOverview", "glossary"),
  },
  {
    id: "def-idempotency",
    deterministic: true,
    critical: true, keywords: ["idempotencia", "o que e idempotencia", "idempotency", "idempotent", "what is idempotency", "chave de idempotencia"],
    realizations: {
      "pt-PT":
        "**Idempotência** significa que repetir o mesmo pedido (com a mesma **chave de idempotência**) produz o mesmo resultado, sem duplicar efeitos. No **BANZA** é um **invariante** (INV-IDEM) — toda operação financeira é replay-safe.",
      en:
        "**Idempotency** means that repeating the same request — with the same **idempotency key** — produces the same result without duplicating effects. In **BANZA** it is an **invariant** (INV-IDEM): every financial operation is replay-safe.",
    },
    sources: s("invariants", "gettingStarted"),
  },
  {
    id: "def-webhook",
    deterministic: true,
    critical: true, keywords: ["webhook", "o que e webhook", "what is a webhook"],
    realizations: {
      "pt-PT":
        "Um **webhook** é uma entrega de eventos de um sistema para outro (com reentrega/assinatura, quando aplicável). É um mecanismo de integração que um operador implementa; explicação geral, não uma regra normativa específica do BANZA.",
      en:
        "A **webhook** is the delivery of events from one system to another (with redelivery and signing where applicable). It is an integration mechanism an operator implements; this is a general explanation, not a BANZA-specific normative rule.",
    },
    sources: s("glossary", "specOverview"),
  },
  {
    id: "def-refund",
    deterministic: true,
    critical: true, keywords: ["reembolso", "o que e reembolso", "refund", "estorno", "o que e estorno", "reversal", "reversao", "what is a refund"],
    realizations: {
      "pt-PT":
        "**Reembolso/estorno (refund/reversal)** é a devolução de valor ligada a uma transacção original. No **BANZA** ajusta o ledger fictício sem criar nem destruir valor (dupla-entrada); um estorno é uma reversão referenciada à operação de origem. O protocolo não move fundos reais.",
      en:
        "A **refund or reversal** is the return of value tied to an original transaction. In **BANZA** it adjusts the fictitious ledger without creating or destroying value (double entry); a reversal is referenced to the operation it reverses. The protocol moves no real funds.",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-reconciliation",
    deterministic: true,
    critical: true, keywords: ["reconciliacao", "o que e reconciliacao", "reconciliation", "what is reconciliation"],
    realizations: {
      "pt-PT":
        "**Reconciliação** é re-derivar os saldos a partir dos movimentos (não confiar nos saldos) para confirmar que não há discrepâncias e que o total é conservado. No **BANZA** é um **invariante** (INV-RECON), externamente reconciliável.",
      en:
        "**Reconciliation** is re-deriving balances from the movements — not trusting the balances — to confirm there are no discrepancies and that the total is conserved. In **BANZA** it is an **invariant** (INV-RECON), externally reconcilable.",
    },
    sources: s("invariants", "adr006"),
  },
  {
    id: "def-settlement",
    deterministic: true,
    critical: true, keywords: ["liquidacao", "o que e liquidacao", "settlement", "what is settlement"],
    realizations: {
      "pt-PT":
        "Em finanças, **liquidação (settlement)** é o processo pelo qual uma obrigação de pagamento é **finalizada** entre as partes. No **BANZA**, o protocolo pode definir evidência, invariantes e interoperabilidade, mas **não liquida dinheiro real nem movimenta fundos** — a liquidação real pertence aos operadores/infra-estruturas financeiras aplicáveis.",
      en:
        "In finance, **settlement** is the process by which a payment obligation is **finalised** between the parties. In **BANZA** the protocol may define evidence, invariants and interoperability, but it **does not settle real money and moves no funds** — actual settlement belongs to the applicable operators and financial infrastructures.",
    },
    sources: s("invariants", "specOverview", "glossary"),
  },
  {
    id: "def-clearing",
    deterministic: true,
    critical: true, keywords: ["compensacao", "o que e compensacao", "clearing", "what is clearing"],
    realizations: {
      "pt-PT":
        "**Compensação (clearing)** é a fase de apuramento e troca de instruções de pagamento antes da liquidação. É um conceito do domínio de pagamentos; o **BANZA não compensa nem liquida fundos reais** — é uma camada de protocolo/interoperabilidade.",
      en:
        "**Clearing** is the phase in which payment instructions are reconciled and exchanged before settlement. It is a payments-domain concept; **BANZA neither clears nor settles real funds** — it is a protocol and interoperability layer.",
    },
    sources: s("glossary", "specOverview"),
  },
  {
    id: "def-fee",
    deterministic: true,
    critical: true, keywords: ["comissao", "o que e comissao", "fee", "taxa", "o que e taxa", "what is a fee"],
    realizations: {
      "pt-PT":
        "**Comissão/taxa (fee)** é um encargo sobre uma operação. No **BANZA** os montantes seguem a aritmética do ledger (bruto/líquido, sem criação de dinheiro); a cobrança real pertence ao operador — explicação geral, não uma regra específica do protocolo.",
      en:
        "A **fee** is a charge on an operation. In **BANZA** the amounts follow the ledger's arithmetic (gross/net, with no money created); the actual charging belongs to the operator — a general explanation, not a protocol-specific rule.",
    },
    sources: s("invariants", "glossary"),
  },

  // Layer C — risk / regulatory boundary (explained with caution; never a legal opinion)
  {
    id: "def-psp",
    deterministic: true,
    critical: true, keywords: ["psp", "o que e psp", "o que e um psp", "prestador de servicos de pagamento", "payment service provider", "what is a psp", "banza e psp", "banza e um psp", "is banza a psp"],
    realizations: {
      "pt-PT":
        "**PSP** significa **prestador de serviços de pagamento** — um operador (licenciado) que presta serviços de pagamento. O **BANZA não é um PSP**; é um **protocolo**. Qualquer prestação de serviço financeiro pertence a operadores independentes e ao seu enquadramento legal/regulatório.",
      en:
        "**PSP** stands for **payment service provider** — a (licensed) operator that provides payment services. **BANZA is not a PSP**; it is a **protocol**. Any provision of a financial service belongs to independent operators and to their legal and regulatory framework.",
    },
    sources: s("adr018", "adr019", "glossary"),
  },
  {
    id: "def-bank",
    deterministic: true,
    critical: true, keywords: ["banco", "o que e um banco", "bank", "banza e banco", "banza e um banco", "is banza a bank", "instituicao financeira"],
    realizations: {
      "pt-PT":
        "Um **banco** é uma instituição financeira licenciada. O **BANZA não é um banco** nem uma instituição financeira — é um protocolo aberto e neutro em relação a operadores; não detém fundos nem presta serviços financeiros.",
      en:
        "A **bank** is a licensed financial institution. **BANZA is not a bank** and not a financial institution — it is an open protocol, neutral with respect to operators; it holds no funds and provides no financial services.",
    },
    sources: s("adr018", "glossary"),
  },
  {
    id: "def-fintech",
    deterministic: true,
    critical: true, keywords: ["fintech", "o que e fintech", "o que e uma fintech", "what is fintech"],
    realizations: {
      "pt-PT":
        "**Fintech** é uma empresa/solução tecnológica no domínio financeiro. O **BANZA é um protocolo**, não uma empresa fintech operacional; operadores (que podem ser fintechs) implementam o protocolo, cada um no seu enquadramento.",
      en:
        "**Fintech** describes a technology company or solution in the financial domain. **BANZA is a protocol**, not an operating fintech company; operators — which may be fintechs — implement the protocol, each within its own framework.",
    },
    sources: s("glossary", "adr018"),
  },
  {
    id: "def-kyc",
    deterministic: true,
    critical: true, keywords: ["kyc", "o que e kyc", "know your customer", "what is kyc"],
    realizations: {
      "pt-PT":
        "**KYC** (Know Your Customer) é a identificação e verificação do cliente. É um requisito **regulatório/de compliance** que pertence aos operadores e às autoridades competentes; o **BANZA não define uma regra normativa de KYC** e o BanzAI não dá parecer legal.",
      en:
        "**KYC** (Know Your Customer) is the identification and verification of a customer. It is a **regulatory and compliance** requirement belonging to operators and to the competent authorities; **BANZA defines no normative KYC rule**, and BanzAI gives no legal advice.",
    },
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-kyb",
    deterministic: true,
    critical: true, keywords: ["kyb", "o que e kyb", "know your business", "what is kyb"],
    realizations: {
      "pt-PT":
        "**KYB** (Know Your Business) é a identificação e verificação de uma empresa/comerciante. Tal como o KYC, é um requisito regulatório dos operadores e das autoridades competentes; o **BANZA não o define** e o BanzAI não dá parecer legal.",
      en:
        "**KYB** (Know Your Business) is the identification and verification of a company or merchant. Like KYC, it is a regulatory requirement of operators and the competent authorities; **BANZA does not define it**, and BanzAI gives no legal advice.",
    },
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-aml-cft",
    deterministic: true,
    critical: true, keywords: ["aml", "cft", "o que e aml", "aml/cft", "o que e aml/cft", "branqueamento de capitais", "lavagem de dinheiro", "what is aml", "what is aml/cft"],
    realizations: {
      "pt-PT":
        "**AML/CFT** é a prevenção de **branqueamento de capitais** e de **financiamento do terrorismo**. É um domínio **regulatório** fora do protocolo — pertence aos operadores e às autoridades competentes. O **BANZA não define regras de AML/CFT** e o BanzAI não dá parecer legal.",
      en:
        "**AML/CFT** is the prevention of **money laundering** and **terrorist financing**. It is a **regulatory** domain outside the protocol — it belongs to operators and to the competent authorities. **BANZA defines no AML/CFT rules**, and BanzAI gives no legal advice.",
    },
    sources: s("glossary", "adr019"),
  },
  {
    id: "def-bna",
    deterministic: true,
    critical: true, keywords: ["bna", "o que e o bna", "o que e bna", "banco nacional de angola", "what is the bna", "banza substitui o bna", "banza substitui bna"],
    realizations: {
      "pt-PT":
        "**BNA** é o **Banco Nacional de Angola** — o banco central / supervisor financeiro (um regulador). O **BANZA não substitui o regulador** nem qualquer sistema nacional de pagamentos; é uma camada de protocolo/interoperabilidade e não afirma integração nem decisões em nome de terceiros sem fonte.",
      en:
        "**BNA** is the **Banco Nacional de Angola** — the central bank and financial supervisor (a regulator). **BANZA does not replace the regulator** or any national payment system; it is a protocol and interoperability layer, and it claims no integration and no decisions on anyone else's behalf without a source.",
    },
    sources: s("glossary", "adr018"),
  },
  {
    id: "def-sandbox",
    deterministic: true,
    critical: true, keywords: ["sandbox", "o que e sandbox", "sandbox regulatoria", "o que e sandbox regulatoria", "what is a sandbox"],
    realizations: {
      "pt-PT":
        "**Sandbox** é um ambiente de **teste/piloto**, não de produção. Uma sandbox regulatória é um regime supervisionado para testar soluções; no **BANZA**, ambientes demo/sandbox produzem evidência técnica e **não** representam produção nem autorização.",
      en:
        "A **sandbox** is a **test or pilot** environment, not production. A regulatory sandbox is a supervised regime for testing solutions; in **BANZA**, demo and sandbox environments produce technical evidence and **do not** represent production or authorisation.",
    },
    sources: s("glossary", "gettingStarted"),
  },
  {
    id: "def-payment-systems",
    deterministic: true,
    critical: true, keywords: ["rail de pagamento", "o que e um rail de pagamento", "sistema de pagamentos", "o que e sistema de pagamentos", "national payment system", "payment rail", "banza substitui emis", "banza substitui os bancos", "banza substitui o sistema nacional"],
    realizations: {
      "pt-PT":
        "**Sistemas/rails de pagamento** são a infra-estrutura partilhada que move pagamentos entre instituições (comutadores interbancários, sistemas nacionais, sistemas em tempo real). O **BANZA é uma camada de protocolo/interoperabilidade** — **não substitui nem integra** sistemas nacionais, reguladores ou bancos, e não nomeia sistemas comerciais específicos.",
      en:
        "**Payment systems and rails** are the shared infrastructure that moves payments between institutions (interbank switches, national systems, real-time systems). **BANZA is a protocol and interoperability layer** — it **neither replaces nor integrates** national systems, regulators or banks, and it names no specific commercial systems.",
    },
    sources: s("specOverview", "adr018", "glossary"),
  },
  // ── DOMAIN_KNOWLEDGE (ADR-036) ─────────────────────────────────────────────────────────────────
  //
  // The finance, security and distributed-systems vocabulary a reader needs in order to understand
  // BANZA — declared, sourced, and marked `domain: true` so the class travels with the answer.
  //
  // The class is load-bearing. A domain source may support a DOMAIN claim and may never support a
  // BANZA-specific one: what a payment scheme is in general is not what BANZA requires, and the two
  // must not be able to borrow each other's authority.
  //
  // Each definition is CONCISE and DERIVED, with its authority named so a reader can go and check.
  // No standard is reproduced. Where a concept also has a BANZA consequence, the entry states the
  // general meaning first and the BANZA relationship second, so the boundary is visible in the answer
  // rather than implied by it.
  {
    id: "def-dom-account",
    deterministic: true,
    domain: true,
    keywords: ["conta", "o que e uma conta", "account", "what is an account", "o que e conta"],
    realizations: {
      "pt-PT":
        "Uma **conta** é o registo a que se imputam movimentos e cujo saldo resulta desses movimentos. É um conceito do domínio financeiro. No **BANZA**, contas e saldos pertencem ao operador: o protocolo define as regras que os governam e **não mantém contas reais**.",
      en:
        "An **account** is the record that movements are posted to, and whose balance results from those movements. It is a finance-domain concept. In **BANZA**, accounts and balances belong to the operator: the protocol defines the rules that govern them and **holds no real accounts**.",
    },
    sources: s("BIS-CPMI"),
  },
  {
    id: "def-dom-transfer",
    deterministic: true,
    domain: true,
    keywords: ["transferencia", "o que e uma transferencia", "transfer", "what is a transfer"],
    realizations: {
      "pt-PT":
        "Uma **transferência** é o movimento de valor de uma conta para outra. No domínio financeiro é a operação elementar sobre a qual assentam pagamentos e liquidação.",
      en:
        "A **transfer** is the movement of value from one account to another. In the finance domain it is the elementary operation that payments and settlement are built on.",
    },
    sources: s("BIS-CPMI"),
  },
  {
    id: "def-dom-merchant",
    deterministic: true,
    domain: true,
    keywords: ["comerciante", "o que e um comerciante", "merchant", "what is a merchant", "aceitante"],
    realizations: {
      "pt-PT":
        "Um **comerciante (merchant)** é a parte que aceita um pagamento em troca de bens ou serviços. É um papel do domínio de pagamentos, não um papel definido pelo protocolo **BANZA**.",
      en:
        "A **merchant** is the party that accepts a payment in exchange for goods or services. It is a payments-domain role, not a role the **BANZA** protocol defines.",
    },
    sources: s("BIS-CPMI"),
  },
  {
    id: "def-dom-issuer",
    deterministic: true,
    domain: true,
    keywords: ["emissor", "o que e um emissor", "issuer", "what is an issuer"],
    realizations: {
      "pt-PT":
        "Um **emissor (issuer)** é a instituição que emite o instrumento de pagamento ao pagador e detém a relação com ele. É um papel do domínio de pagamentos.",
      en:
        "An **issuer** is the institution that issues the payment instrument to the payer and holds the relationship with them. It is a payments-domain role.",
    },
    sources: s("BIS-CPMI"),
  },
  {
    id: "def-dom-acquirer",
    deterministic: true,
    domain: true,
    keywords: ["adquirente", "o que e um adquirente", "acquirer", "what is an acquirer"],
    realizations: {
      "pt-PT":
        "Um **adquirente (acquirer)** é a instituição que contrata o comerciante e recebe as operações que este aceita. É a contraparte do emissor no domínio de pagamentos.",
      en:
        "An **acquirer** is the institution that contracts with the merchant and receives the transactions it accepts. It is the issuer's counterpart in the payments domain.",
    },
    sources: s("BIS-CPMI"),
  },
  {
    id: "def-dom-payment-rail",
    deterministic: true,
    domain: true,
    keywords: ["rail de pagamento", "o que e um rail de pagamento", "payment rail", "what is a payment rail", "trilho de pagamento"],
    realizations: {
      "pt-PT":
        "Um **rail de pagamento** é a infra-estrutura por onde as ordens de pagamento circulam e se liquidam entre instituições. É infra-estrutura do domínio financeiro; o **BANZA** não é um rail — é uma camada aberta de protocolo e interoperabilidade, e **não movimenta fundos**.",
      en:
        "A **payment rail** is the infrastructure over which payment orders travel and settle between institutions. It is finance-domain infrastructure; **BANZA** is not a rail — it is an open protocol and interoperability layer, and it **moves no funds**.",
    },
    sources: s("BIS-PFMI", "BIS-CPMI"),
  },
  {
    id: "def-dom-payment-scheme",
    deterministic: true,
    domain: true,
    keywords: ["scheme de pagamento", "esquema de pagamento", "payment scheme", "what is a payment scheme"],
    realizations: {
      "pt-PT":
        "Um **scheme de pagamento** é o conjunto de regras, papéis e obrigações contratuais que governam quem pode participar num sistema de pagamentos e em que condições. É um conceito do domínio; distingue-se de um **protocolo**, que fixa regras técnicas sem conferir estatuto.",
      en:
        "A **payment scheme** is the set of rules, roles and contractual obligations governing who may participate in a payment system and on what terms. It is a domain concept, and it is distinct from a **protocol**, which fixes technical rules without conferring status.",
    },
    sources: s("BIS-PFMI", "BIS-CPMI"),
  },
  {
    id: "def-dom-hash",
    deterministic: true,
    domain: true,
    keywords: ["hash", "o que e um hash", "what is a hash", "funcao de hash", "hash function", "digest"],
    realizations: {
      "pt-PT":
        "Um **hash** é o resultado de uma função que reduz dados de qualquer dimensão a um valor de tamanho fixo, de modo que a mesma entrada dá sempre o mesmo valor e encontrar duas entradas com o mesmo valor é computacionalmente inviável. Prova **integridade**, não autoria.",
      en:
        "A **hash** is the output of a function that reduces data of any size to a fixed-length value, such that the same input always yields the same value and finding two inputs with the same value is computationally infeasible. It proves **integrity**, not authorship.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-digital-signature",
    deterministic: true,
    domain: true,
    keywords: ["assinatura digital", "o que e uma assinatura digital", "digital signature", "what is a digital signature", "assinaturas digitais"],
    realizations: {
      "pt-PT":
        "Uma **assinatura digital** liga um documento a uma chave privada de tal modo que qualquer pessoa com a chave pública correspondente pode verificar que o documento não mudou e que foi assinado por quem detém essa chave. Prova **integridade e autoria** — mais do que um hash, que só prova integridade.",
      en:
        "A **digital signature** binds a document to a private key such that anyone holding the matching public key can verify the document has not changed and was signed by the holder of that key. It proves **integrity and authorship** — more than a hash, which proves integrity alone.",
    },
    sources: s("NIST-FIPS-186", "RFC-8032"),
  },
  {
    id: "def-dom-keypair",
    deterministic: true,
    domain: true,
    keywords: ["chave publica", "chave privada", "par de chaves", "public key", "private key", "key pair", "what is a public key", "criptografia assimetrica", "asymmetric"],
    realizations: {
      "pt-PT":
        "Um **par de chaves** é uma chave privada, mantida em segredo, e a chave pública correspondente, que pode ser distribuída. O que é assinado com a privada verifica-se com a pública; conhecer a pública não permite deduzir a privada.",
      en:
        "A **key pair** is a private key, kept secret, and its matching public key, which may be distributed. What is signed with the private key verifies with the public one, and knowing the public key does not let anyone derive the private one.",
    },
    sources: s("NIST-SP-800-57"),
  },
  {
    id: "def-dom-ed25519",
    deterministic: true,
    domain: true,
    keywords: ["ed25519", "o que e ed25519", "what is ed25519", "eddsa", "curve25519"],
    realizations: {
      "pt-PT":
        "O **Ed25519** é um esquema de assinatura digital sobre curvas de Edwards (EdDSA), especificado no **RFC** 8032. É determinístico — a mesma mensagem e a mesma chave produzem sempre a mesma assinatura — e é o esquema que o **BANZA** adopta para a metadata assinada do protocolo.",
      en:
        "**Ed25519** is a digital signature scheme over Edwards curves (EdDSA), specified in **RFC** 8032. It is deterministic — the same message and key always produce the same signature — and it is the scheme **BANZA** adopts for the protocol's signed metadata.",
    },
    sources: s("RFC-8032"),
  },
  {
    id: "def-dom-key-rotation",
    deterministic: true,
    domain: true,
    keywords: ["rotacao de chaves", "o que e rotacao de chaves", "key rotation", "what is key rotation", "rodar chaves"],
    realizations: {
      "pt-PT":
        "A **rotação de chaves** é a substituição planeada de uma chave por outra, de modo que o material antigo deixa de autorizar e o novo passa a autorizar, sem invalidar o que foi validamente assinado antes. Limita a janela de exposição de qualquer chave.",
      en:
        "**Key rotation** is the planned replacement of one key by another, so that the old material stops authorising and the new material starts, without invalidating what was validly signed before. It bounds how long any single key is exposed.",
    },
    sources: s("NIST-SP-800-57"),
  },
  {
    id: "def-dom-replay",
    deterministic: true,
    domain: true,
    keywords: ["replay", "o que e replay", "what is replay", "ataque de replay", "replay attack", "reenvio"],
    realizations: {
      "pt-PT":
        "Um **replay** é a reapresentação de uma mensagem legítima já usada, na esperança de que produza efeito outra vez. Defende-se com material que só serve uma vez — um **nonce**, um prazo de validade, ou uma **chave de idempotência** que reconhece o pedido repetido.",
      en:
        "A **replay** is the re-submission of a legitimate message that has already been used, in the hope that it takes effect again. It is defended against with material that is good only once — a **nonce**, an expiry, or an **idempotency key** that recognises the repeated request.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-nonce",
    deterministic: true,
    domain: true,
    keywords: ["nonce", "o que e um nonce", "what is a nonce", "numero usado uma vez"],
    realizations: {
      "pt-PT":
        "Um **nonce** é um valor usado uma só vez num dado contexto, para que uma mensagem repetida deixe de ser aceite. É a defesa elementar contra **replay**.",
      en:
        "A **nonce** is a value used only once in a given context, so that a repeated message stops being accepted. It is the elementary defence against **replay**.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-authentication",
    deterministic: true,
    domain: true,
    keywords: ["autenticacao", "o que e autenticacao", "authentication", "what is authentication", "autenticar"],
    realizations: {
      "pt-PT":
        "A **autenticação** estabelece **quem** é a parte que se apresenta. Responde a uma pergunta diferente da **autorização**, que estabelece **o que** essa parte pode fazer: autenticar não autoriza.",
      en:
        "**Authentication** establishes **who** the presenting party is. It answers a different question from **authorization**, which establishes **what** that party may do: authenticating does not authorise.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-integrity",
    deterministic: true,
    domain: true,
    keywords: ["integridade", "o que e integridade", "integrity", "what is integrity", "integridade dos dados"],
    realizations: {
      "pt-PT":
        "A **integridade** é a propriedade de os dados não terem sido alterados de forma não detectada. Prova-se comparando bytes contra um valor derivado deles — um **hash** ou uma **assinatura digital**.",
      en:
        "**Integrity** is the property that data has not been altered undetectably. It is proven by comparing bytes against a value derived from them — a **hash** or a **digital signature**.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-retry",
    deterministic: true,
    domain: true,
    keywords: ["retry", "o que e retry", "what is retry", "reenviar pedido", "retentativa", "retentar"],
    realizations: {
      "pt-PT":
        "Um **retry** é a repetição de um pedido cujo resultado não se conheceu — por timeout, falha de rede ou erro transitório. Um retry só é seguro se a operação for **idempotente**: sem isso, repetir o pedido pode repetir o efeito.",
      en:
        "A **retry** is the repetition of a request whose outcome was not observed — through a timeout, a network failure or a transient error. A retry is only safe when the operation is **idempotent**: without that, repeating the request can repeat the effect.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-timeout",
    deterministic: true,
    domain: true,
    keywords: ["timeout", "o que e timeout", "what is a timeout", "tempo limite", "prazo de espera"],
    realizations: {
      "pt-PT":
        "Um **timeout** é o limite de tempo após o qual quem espera desiste de uma resposta. Um timeout não diz que a operação falhou — diz apenas que o resultado não foi observado, e é por isso que a repetição segura exige idempotência.",
      en:
        "A **timeout** is the time limit after which the waiting side stops expecting a response. A timeout does not say the operation failed — only that its outcome was not observed, which is why safe repetition requires idempotency.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-state-machine",
    deterministic: true,
    domain: true,
    keywords: ["maquina de estados", "o que e uma maquina de estados", "state machine", "what is a state machine", "maquina de estado", "estados e transicoes"],
    realizations: {
      "pt-PT":
        "Uma **máquina de estados** é um modelo em que algo está sempre exactamente num estado de um conjunto fechado, e só muda por transições declaradas. O valor está no que exclui: um estado que não está no conjunto é inalcançável, e uma transição que não está declarada não acontece.",
      en:
        "A **state machine** is a model in which something is always in exactly one state from a closed set, and changes only through declared transitions. Its value is in what it excludes: a state not in the set is unreachable, and a transition not declared does not happen.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-determinism",
    deterministic: true,
    domain: true,
    keywords: ["determinismo", "o que e determinismo", "determinism", "what is determinism", "deterministico"],
    realizations: {
      "pt-PT":
        "O **determinismo** é a propriedade de a mesma entrada produzir sempre exactamente a mesma saída. É o que torna um resultado reproduzível por terceiros — e é por isso que a verificação de bytes assinados o exige.",
      en:
        "**Determinism** is the property that the same input always produces exactly the same output. It is what makes a result reproducible by a third party — and it is why verification over signed bytes requires it.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-consistency",
    deterministic: true,
    domain: true,
    keywords: ["consistencia", "o que e consistencia", "consistency", "what is consistency", "consistente"],
    realizations: {
      "pt-PT":
        "A **consistência** é a propriedade de observadores diferentes não verem estados que se contradizem. Em sistemas distribuídos é uma garantia que se declara com precisão, porque o seu alcance é sempre limitado.",
      en:
        "**Consistency** is the property that different observers do not see states that contradict one another. In distributed systems it is a guarantee that has to be stated precisely, because its scope is always bounded.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-safe-degradation",
    deterministic: true,
    domain: true,
    keywords: ["degradacao segura", "o que e degradacao segura", "safe degradation", "what is safe degradation", "degradar em seguranca"],
    realizations: {
      "pt-PT":
        "A **degradação segura** é reduzir função sem reduzir garantias: quando um componente falha, o sistema faz menos, e o que continua a fazer continua correcto. Distingue-se de **fail-closed** por manter serviço, em vez de o interromper.",
      en:
        "**Safe degradation** is reducing function without reducing guarantees: when a component fails, the system does less, and what it still does stays correct. It differs from **fail-closed** in keeping service rather than stopping it.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-availability",
    deterministic: true,
    domain: true,
    keywords: ["disponibilidade", "o que e disponibilidade", "availability", "what is availability", "uptime"],
    realizations: {
      "pt-PT":
        "A **disponibilidade** é a fracção do tempo em que um sistema responde ao que lhe é pedido. É uma propriedade separada da **segurança**, e quando as duas colidem o **BANZA** resolve a colisão a favor da segurança.",
      en:
        "**Availability** is the fraction of time a system responds to what is asked of it. It is a property separate from **security**, and where the two collide **BANZA** resolves the collision in favour of security.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-http",
    deterministic: true,
    domain: true,
    keywords: ["http", "o que e http", "what is http", "protocolo http", "https"],
    realizations: {
      "pt-PT":
        "O **HTTP** é o protocolo de pedido e resposta da Web, definido pelo **RFC** 9110. Fixa métodos, códigos de estado e semântica de cabeçalhos — incluindo quais os métodos que são seguros e quais são idempotentes.",
      en:
        "**HTTP** is the Web's request/response protocol, defined by **RFC** 9110. It fixes methods, status codes and header semantics — including which methods are safe and which are idempotent.",
    },
    sources: s("RFC-9110"),
  },
  {
    id: "def-dom-endpoint",
    deterministic: true,
    domain: true,
    keywords: ["endpoint", "o que e um endpoint", "what is an endpoint", "ponto final", "url de api"],
    realizations: {
      "pt-PT":
        "Um **endpoint** é o endereço concreto onde uma operação de uma API é invocada. O **contrato** diz o que essa operação aceita e devolve; o endpoint diz apenas onde a alcançar.",
      en:
        "An **endpoint** is the concrete address at which an API operation is invoked. The **contract** says what that operation accepts and returns; the endpoint only says where to reach it.",
    },
    sources: s("RFC-9110"),
  },
  {
    id: "def-dom-versioning",
    deterministic: true,
    domain: true,
    keywords: ["versionamento", "o que e versionamento", "versioning", "what is versioning", "versao de api"],
    realizations: {
      "pt-PT":
        "O **versionamento** é a identificação explícita de qual variante de um contrato está em vigor, para que uma mudança possa ser introduzida sem que quem depende da anterior descubra a diferença em produção.",
      en:
        "**Versioning** is the explicit identification of which variant of a contract is in force, so that a change can be introduced without whoever depends on the previous one discovering the difference in production.",
    },
    sources: s("JSON-SCHEMA"),
  },
  {
    id: "def-dom-backward-compatibility",
    deterministic: true,
    domain: true,
    keywords: ["retrocompatibilidade", "compatibilidade retroativa", "backward compatibility", "what is backward compatibility", "compativel com versoes anteriores"],
    realizations: {
      "pt-PT":
        "A **retrocompatibilidade** é a propriedade de uma versão nova continuar a aceitar o que a anterior aceitava e a significar o mesmo. Acrescentar campos opcionais preserva-a; tornar um campo obrigatório ou mudar o sentido de um valor quebra-a.",
      en:
        "**Backward compatibility** is the property that a new version keeps accepting what the previous one accepted, and means the same by it. Adding optional fields preserves it; making a field required, or changing what a value means, breaks it.",
    },
    sources: s("JSON-SCHEMA"),
  },
  {
    id: "def-dom-serialization",
    deterministic: true,
    domain: true,
    keywords: ["serializacao", "o que e serializacao", "serialization", "what is serialization", "serializar"],
    realizations: {
      "pt-PT":
        "A **serialização** é a conversão de uma estrutura em bytes para transmissão ou armazenamento. Quando esses bytes vão ser assinados, a conversão tem de ser **canónica** — uma só forma possível — ou duas implementações correctas produzem assinaturas diferentes para o mesmo documento.",
      en:
        "**Serialization** is the conversion of a structure into bytes for transmission or storage. When those bytes are going to be signed, the conversion has to be **canonical** — exactly one possible form — or two correct implementations produce different signatures for the same document.",
    },
    sources: s("RFC-8259", "RFC-8785"),
  },
  {
    id: "def-dom-resilience-general",
    deterministic: true,
    domain: true,
    keywords: ["resiliencia", "o que e resiliencia", "resilience", "what is resilience", "resiliente"],
    realizations: {
      "pt-PT":
        "A **resiliência** é a capacidade de um sistema continuar a cumprir a sua função perante falhas, e de recuperar delas. Não é ausência de indisponibilidade, e no **BANZA** nunca se sobrepõe à segurança.",
      en:
        "**Resilience** is a system's capacity to keep meeting its purpose in the face of failures, and to recover from them. It is not the absence of downtime, and in **BANZA** it never overrides security.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-database",
    deterministic: true,
    domain: true,
    keywords: ["base de dados", "o que e uma base de dados", "database", "what is a database", "banco de dados"],
    realizations: {
      "pt-PT":
        "Uma **base de dados** é um sistema de armazenamento que mantém o **estado actual** e permite lê-lo e alterá-lo. Difere de um **ledger** no que conserva: uma base de dados guarda o valor de agora e pode sobrepô-lo; um ledger guarda os **movimentos** e deriva o valor deles, de forma append-only.",
      en:
        "A **database** is a storage system that holds **current state** and lets it be read and changed. It differs from a **ledger** in what it keeps: a database stores the value as of now and may overwrite it, while a ledger stores the **movements** and derives the value from them, append-only.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-authorization",
    deterministic: true,
    domain: true,
    keywords: ["autorizacao", "o que e autorizacao", "authorization", "authorisation", "what is authorization", "autorizar"],
    realizations: {
      "pt-PT":
        "A **autorização** estabelece **o que** uma parte já identificada pode fazer. É distinta da **autenticação**, que estabelece **quem** essa parte é: autenticar não autoriza, e as duas decisões são tomadas separadamente.",
      en:
        "**Authorization** establishes **what** an already-identified party may do. It is distinct from **authentication**, which establishes **who** that party is: authenticating does not authorise, and the two decisions are taken separately.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-validation",
    deterministic: true,
    domain: true,
    keywords: ["validacao", "o que e validacao", "validation", "what is validation", "validar"],
    realizations: {
      "pt-PT":
        "A **validação** verifica que algo está conforme a uma especificação declarada — que o documento tem a forma que o schema exige, por exemplo. Responde a \"está bem construído?\", e é distinta da **verificação**, que responde a \"é verdade?\".",
      en:
        "**Validation** checks that something conforms to a declared specification — that a document has the shape the schema requires, for instance. It answers \"is it well formed?\", and is distinct from **verification**, which answers \"is it true?\".",
    },
    sources: s("JSON-SCHEMA"),
  },
  {
    id: "def-dom-verification",
    deterministic: true,
    domain: true,
    keywords: ["verificacao", "o que e verificacao", "verification", "what is verification", "verificar"],
    realizations: {
      "pt-PT":
        "A **verificação** estabelece que uma afirmação é verdadeira perante evidência — que uma assinatura corresponde a uma chave e a bytes, por exemplo. Responde a \"é verdade?\", e é distinta da **validação**, que responde a \"está bem construído?\". Um documento pode ser válido e a sua assinatura não verificar.",
      en:
        "**Verification** establishes that a claim is true against evidence — that a signature matches a key and a set of bytes, for instance. It answers \"is it true?\", and is distinct from **validation**, which answers \"is it well formed?\". A document can be valid and its signature still fail to verify.",
    },
    sources: s("NIST-CSRC"),
  },
  {
    id: "def-dom-accreditation",
    deterministic: true,
    domain: true,
    keywords: ["acreditacao", "o que e acreditacao", "accreditation", "what is accreditation", "acreditar"],
    realizations: {
      "pt-PT":
        "A **acreditação** é o reconhecimento formal, por uma autoridade, de que um organismo é competente para avaliar ou certificar terceiros. É um nível acima da **certificação**: certifica-se um objecto ou uma implementação; acredita-se quem certifica. O **BANZA** não acredita nem é acreditado — a participação demonstra-se por evidência verificável.",
      en:
        "**Accreditation** is the formal recognition, by an authority, that a body is competent to assess or certify third parties. It sits one level above **certification**: an object or an implementation is certified, and the certifier is accredited. **BANZA** neither accredits nor is accredited — participation is demonstrated by verifiable evidence.",
    },
    sources: s("BIS-PFMI"),
  },
  {
    id: "def-protocol",
    deterministic: true,
    keywords: ["protocolo", "o que e um protocolo", "protocol", "what is a protocol", "o que e o protocolo"],
    realizations: {
      "pt-PT":
        "Um **protocolo** é o conjunto de regras técnicas públicas que partes independentes seguem para interoperar. O **BANZA** é um protocolo: define regras, contratos, invariantes e critérios de conformidade, e **não confere estatuto** a quem os segue. Distingue-se de um **esquema operacional**, que acrescenta regras contratuais, admissão e responsabilidades sobre o protocolo.",
      en:
        "A **protocol** is the set of public technical rules independent parties follow in order to interoperate. **BANZA** is a protocol: it defines rules, contracts, invariants and conformance criteria, and it **confers no status** on those who follow them. It is distinct from an **operational scheme**, which adds contractual rules, admission and responsibilities on top of the protocol.",
    },
    sources: s("specOverview", "adr002"),
  },
  {
    id: "def-reference",
    deterministic: true,
    keywords: ["referencia", "a referencia", "reference", "the reference", "o que e a referencia", "documento de referencia"],
    realizations: {
      "pt-PT":
        "A **Referência** do **BANZA** é o documento **descritivo** que explica o protocolo a um leitor. É deliberadamente **não normativa**: a autoridade normativa é o Manifesto Normativo e os artefactos que ele indexa — especificações, contratos, schemas e invariantes. Quando a Referência e um artefacto normativo divergem, o artefacto normativo prevalece. A edição PT é canónica; a EN é a sua tradução oficial.",
      en:
        "**BANZA**'s **Reference** is the **descriptive** document that explains the protocol to a reader. It is deliberately **non-normative**: normative authority belongs to the Normative Manifest and the artifacts it indexes — specifications, contracts, schemas and invariants. Where the Reference and a normative artifact diverge, the normative artifact prevails. The Portuguese edition is canonical; the English one is its official translation.",
    },
    sources: s("specOverview"),
  },
  {
    id: "def-admission",
    deterministic: true,
    keywords: ["admissao", "o que e admissao", "admission", "what is admission", "admissao operacional", "operational admission"],
    realizations: {
      "pt-PT":
        "A **admissão** é a decisão de um **esquema operacional** de aceitar um participante segundo as suas próprias regras. Não é conferida pelo **BANZA**: a certificação avalia uma **implementação** e não confere admissão, e a admissão não confere **autorização regulatória** (ADR-005). As três decisões pertencem a autoridades diferentes e nenhuma implica a outra.",
      en:
        "**Admission** is an **operational scheme**'s decision to accept a participant under its own rules. It is not conferred by **BANZA**: certification evaluates an **implementation** and confers no admission, and admission confers no **regulatory authorisation** (ADR-005). The three decisions belong to different authorities and none implies another.",
    },
    sources: s("adr005sep", "adr060"),
  },
];

// ── RESPONSE LOCALE ───────────────────────────────────────────────────────────────────────────────
//
// A knowledge entry is ONE semantic target with one evidence decision, and the reader's language is a
// property of the REALIZATION, not of the target. That separation did not exist: every entry carried a
// single `answer`, so 163 entries answered English questions in Portuguese, and 15 more had been made
// "bilingual" by concatenating a Portuguese answer, a separator and an English one — which is what a
// reader saw when they asked "o que é L0?" and got both editions at once.
//
// After normalization below NO entry has an `answer` property. Every entry has `realizations`, keyed by
// locale. Reading `entry.answer` now yields undefined rather than silently serving the wrong language:
// the legacy path is structurally gone, not merely discouraged.

export const LOCALES = Object.freeze(["pt-PT", "en"]);
export const DEFAULT_LOCALE = "pt-PT";

/** The separator the pre-migration entries used to glue two locales into one string. */
const LEGACY_BILINGUAL_SEPARATOR = "\n\n---\n\n";

/**
 * Entries whose single `answer` was an AUDITED PT+EN concatenation, and may therefore be split.
 *
 * This list makes splitting an adjudication rather than a mechanism. Any other entry arriving with the
 * separator is a new defect and normalization throws instead of guessing which half belongs to which
 * reader — the profile entries proved a "Portuguese half" can itself contain raw English, so halves are
 * not automatically trustworthy.
 */
const AUDITED_BILINGUAL = new Set([
  "def-profiles",
  "def-implementation",
  "def-operator-vs-implementation",
  "def-certification-actor",
  "def-lifecycle-version",
  "def-lifecycle-status",
  "def-lifecycle-protocol-freeze",
  "def-lifecycle-l0-freeze",
  "def-lifecycle-independent-implementation",
  "def-lifecycle-trial",
]);

/** Give every entry `realizations` and remove `answer`. */
function normalizeRealizations(entry) {
  if (!entry.realizations) {
    const text = typeof entry.answer === "string" ? entry.answer : "";
    if (text.includes(LEGACY_BILINGUAL_SEPARATOR)) {
      if (!AUDITED_BILINGUAL.has(entry.id)) {
        throw new Error(
          `knowledge: entry "${entry.id}" concatenates two locales into one answer. Split it into ` +
            `realizations; do not add it to AUDITED_BILINGUAL without reading both halves.`,
        );
      }
      const [pt, en] = text.split(LEGACY_BILINGUAL_SEPARATOR);
      entry.realizations = { "pt-PT": pt, en };
    } else if (text) {
      entry.realizations = { "pt-PT": text };
    } else {
      entry.realizations = {};
    }
  }
  // ── DEPRECATED COMPATIBILITY PROJECTION ─────────────────────────────────────────────────────────
  //
  // `entry.answer` survives, but only as a fixed view of ONE locale. Its semantics are exactly
  // `realizations["pt-PT"]` and nothing else: it never returns English, never returns the unavailable
  // state, never picks "the best available" realization and never concatenates. That is the whole
  // difference between a projection and a fallback — a fallback chooses a language, and this one cannot.
  //
  // It exists because measurement showed 70 readers of this field and only FOUR of them are serving
  // code; the other 66 are tests and guards whose property genuinely is "the Portuguese answer says X".
  // Deleting the field would have rewritten 66 assertions to prove what they already proved. Serving
  // paths must use answerFor(); a guard enforces that, and this projection is unreachable from them.
  //
  // Non-enumerable so canonical schema inspection — Object.keys, spreads, snapshots, serializers —
  // sees `realizations` and not a second answer field competing with it.
  //
  // SUNSET: remove once the PT-specific verification suite has migrated naturally. Until then no NEW
  // consumer may appear; the closed-world consumer guard fails on one.
  Object.defineProperty(entry, "answer", {
    get() {
      return this.realizations ? this.realizations["pt-PT"] : undefined;
    },
    // Writable through to the SAME locale it reads. Tests that simulate answer drift assign to this
    // field (`live.answer = "..."` then restore it in a finally), and under ESM strict mode a
    // getter-only property makes that a TypeError rather than a no-op. The setter keeps the projection
    // honest — it can only ever write the Portuguese realization, so a writer cannot use it to reach
    // another locale any more than a reader can.
    set(v) {
      if (!this.realizations) this.realizations = {};
      this.realizations["pt-PT"] = v;
    },
    enumerable: false,
    configurable: true,
  });
  return entry;
}

for (const e of ENTRIES) normalizeRealizations(e);

/** Wording for "this exists, but not yet in your language". Deterministic, never another locale. */
const UNAVAILABLE = Object.freeze({
  "pt-PT":
    "Ainda não existe uma resposta determinística disponível em português para esta questão. As fontes que a sustentam continuam listadas abaixo.",
  en: "A deterministic answer is not yet available in English for this question. The sources that support it are still listed below.",
});

export function unavailableRealization(locale) {
  return UNAVAILABLE[locale] || UNAVAILABLE[DEFAULT_LOCALE];
}

/**
 * The reader-facing answer for an entry in a locale.
 *
 * FAILS CLOSED. When the requested locale has no realization the caller gets `available: false` and the
 * unavailable wording IN THE REQUESTED LOCALE — never another locale's prose, never both, never the
 * evidence text, and never a model call. The semantic target and the sources are unaffected: the answer
 * is missing, not the knowledge.
 */
export function answerFor(entry, locale) {
  if (!entry) return { text: "", available: false, locale };
  const wanted = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const text = entry.realizations ? entry.realizations[wanted] : undefined;
  if (typeof text === "string" && text.length) return { text, available: true, locale: wanted };
  return { text: unavailableRealization(wanted), available: false, locale: wanted };
}

/** Which locales an entry can actually answer in. The coverage report and the guards read this. */
export function realizedLocales(entry) {
  if (!entry || !entry.realizations) return [];
  return LOCALES.filter((l) => typeof entry.realizations[l] === "string" && entry.realizations[l].length);
}


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

// The invariant registry, served as entries WITHOUT being copied into the catalogue.
//
// `contracts/invariants.json` holds 74 records and the Rust router now reaches each one by its
// identifier. Pasting 74 hand-written entries into ENTRIES would mean two lists that must agree, and
// the one that goes stale is always the one the reader hits — the same reason the domain aliases are
// generated rather than duplicated.
//
// So the record is composed from the generated registry at lookup time. The normative STATEMENT is
// quoted verbatim in both locales and labelled as the normative text: rendering a normative statement
// into Portuguese would create a second wording competing with the registry for authority, which is a
// governance decision and not one to take by writing a paraphrase into a serving path. The frame
// around it is localized; the binding text is not.
const INVARIANT_FACTS = new Map((invariantFacts.facts || []).map((f) => [f.id.toLowerCase(), f]));
const INVARIANT_SEVERITY = { critical: ["crítica", "critical"], high: ["alta", "high"], medium: ["média", "medium"] };

function invariantEntry(id) {
  const f = INVARIANT_FACTS.get(String(id).toLowerCase());
  if (!f) return null;
  const [sevPt, sevEn] = INVARIANT_SEVERITY[f.severity] || [f.severity, f.severity];
  return {
    id: String(id).toLowerCase(),
    critical: f.severity === "critical",
    deterministic: true,
    keywords: [],
    invariant: true,
    realizations: {
      "pt-PT": [
        `**${f.id}** — *${f.title}* (família ${f.family}, severidade ${sevPt}).`,
        `O registo normativo do **BANZA** exige, no texto que vincula qualquer implementação:`,
        `> ${f.statement}`,
        "Fonte normativa: `contracts/invariants.json`.",
      ].join("\n\n"),
      en: [
        `**${f.id}** — *${f.title}* (family ${f.family}, severity ${sevEn}).`,
        `The **BANZA** normative registry requires, in the text that binds any implementation:`,
        `> ${f.statement}`,
        "Normative source: `contracts/invariants.json`.",
      ].join("\n\n"),
    },
    sources: [SOURCES.invariants],
  };
}

// Every invariant id the runtime can serve. The closure guard uses it to prove the runtime and the
// Rust engine carry the SAME registry, rather than each carrying a subset the other does not.
export function invariantIds() {
  return [...INVARIANT_FACTS.values()].map((f) => f.id);
}

// An invariant FAMILY, composed from the same registry as its members.
//
// The family question is a different unit from any member — "quais são as invariantes do ledger?" is
// what a reader asks, and it had no answer: seven of the twelve critical families were being served
// the protocol summary. Composing it here keeps the two granularities on one source, so a registry
// change cannot leave the family answer describing a set that no longer exists.
const INVARIANT_FAMILIES = new Map(
  (invariantFacts.families || []).map((f) => [f.family.toLowerCase(), f]),
);

function invariantFamilyEntry(id) {
  const fam = INVARIANT_FAMILIES.get(String(id).replace(/^inv-family-/, "").toLowerCase());
  if (!fam) return null;
  const members = fam.members.map((m) => INVARIANT_FACTS.get(m.toLowerCase())).filter(Boolean);
  if (!members.length) return null;
  const line = (f) => `- **${f.id}** — *${f.title}*: ${f.statement}`;
  const body = members.map(line).join("\n");
  const n = members.length;
  return {
    id: String(id).toLowerCase(),
    critical: members.some((m) => m.severity === "critical"),
    deterministic: true,
    keywords: [],
    invariant: true,
    realizations: {
      "pt-PT":
        `A família **${fam.family}** do registo normativo do **BANZA** tem ${n} invariante${n === 1 ? "" : "s"}. ` +
        `O texto que vincula qualquer implementação é o seguinte:\n\n${body}\n\n` +
        "Fonte normativa: `contracts/invariants.json`.",
      en:
        `The **${fam.family}** family of the **BANZA** normative registry has ${n} invariant${n === 1 ? "" : "s"}. ` +
        `The text that binds any implementation is:\n\n${body}\n\n` +
        "Normative source: `contracts/invariants.json`.",
    },
    sources: [SOURCES.invariants],
  };
}

export function getEntry(id) {
  return ENTRIES_BY_ID.get(id) || invariantEntry(id) || invariantFamilyEntry(id);
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
/**
 * The COMPARISON PLAN for a question — two independently resolved targets and the authority class.
 *
 * Rust owns the extraction and both resolutions; this only transports. Returns null when the engine
 * predates the export, so an older vendored WASM degrades to the previous behaviour instead of throwing.
 */
export function comparisonPlan(question) {
  if (typeof kb.comparison_plan_json !== "function") return null;
  try {
    return JSON.parse(kb.comparison_plan_json(String(question || "")));
  } catch {
    return null;
  }
}

/**
 * The HYBRID RELATION PLAN — one subject and the BANZA relation asked about it.
 *
 * Rust owns the extraction and the resolution; this only transports. Null when the vendored engine
 * predates the export, so an older WASM degrades to the previous behaviour rather than throwing.
 */
export function hybridPlan(question) {
  if (typeof kb.hybrid_plan_json !== "function") return null;
  try {
    return JSON.parse(kb.hybrid_plan_json(String(question || "")));
  } catch {
    return null;
  }
}

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
export function attributeAnswer(question, locale = DEFAULT_LOCALE) {
  if (typeof kb.attribute_answer_json !== "function") return null;
  try {
    const a = JSON.parse(kb.attribute_answer_json(String(question || ""), String(locale || DEFAULT_LOCALE)));
    return a && a.matched ? a : null;
  } catch {
    return null;
  }
}

// M2.18B.7 (Semantic Task Fulfilment) — the resolved AnswerObligationSet (task ontology + what a fulfilling
// answer must deliver). Returns the parsed object (never null; a plain question still yields an Explanation
// obligation). The raw JSON is kept on `._raw` so it can be passed straight to the other WASM entry points.
/// The RUNTIME verdict over a candidate answer: which obligatory propositions it establishes, which it
/// inverts, and which lack the evidence that could support them.
///
/// Deliberately NOT the benchmark oracle. The V2 scorer is Python regexes over `unit-probes.json`;
/// these are Rust predicates written independently. They agree about the proposition and share no code,
/// so a bug in one cannot certify itself green through the other.
export function validateClaims(entryId, question, text, sourceIds = []) {
  if (typeof kb.validate_claims_json !== "function") return { required: [], missing: [], violated: [], unsupported: [], ok: true };
  try {
    return JSON.parse(
      kb.validate_claims_json(
        String(entryId || ""),
        String(question || ""),
        String(text || ""),
        (Array.isArray(sourceIds) ? sourceIds : []).map(String).join(","),
      ),
    );
  } catch {
    // Unavailable is not a licence to publish: the caller treats a missing verdict as "no obligation
    // known", which is the pre-contract behaviour, never as "obligations satisfied".
    return { required: [], missing: [], violated: [], unsupported: [], ok: true };
  }
}

/// The obligation statements for a set of claim ids, for a repair prompt.
export function claimStatements(entryId, question, locale = DEFAULT_LOCALE, only = null) {
  const o = answerObligations(question, entryId, locale);
  const all = (o && o.required_claims) || [];
  return only ? all.filter((c) => only.includes(c.id)) : all;
}

export function answerObligations(question, seed = "", locale = DEFAULT_LOCALE) {
  if (typeof kb.answer_obligations_json !== "function") return null;
  try {
    // Locale-aware where the engine offers it: the SEMANTIC CLAIMS carried in the obligation set are
    // stated to the model in the reader's language, while the claim IDS stay locale-independent —
    // a proposition is not a language.
    const raw =
      typeof kb.answer_obligations_locale_json === "function"
        ? kb.answer_obligations_locale_json(String(question || ""), String(seed || ""), String(locale || DEFAULT_LOCALE))
        : kb.answer_obligations_json(String(question || ""), String(seed || ""));
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
export function documentLookup(question, documentId = "", locale = DEFAULT_LOCALE) {
  if (typeof kb.document_lookup_card_json !== "function") return null;
  try {
    const c = JSON.parse(
      kb.document_lookup_card_json(String(question || ""), String(documentId || ""), String(locale)),
    );
    return c && c.matched ? c : null;
  } catch {
    return null;
  }
}

// The obligations-aware output-synthesis prompt ({system,user}) — base grounding PLUS the per-task
// output-shape directive so the model FULFILS the task. `obligationsJson` is the raw string from
// answerObligations(...)._raw. Falls back to null so the caller can use the plain prompt.
export function buildOutputPromptObliged(question, pkg, depth, obligationsJson, locale) {
  if (typeof kb.build_output_prompt_obliged_json !== "function") return null;
  try {
    const p = JSON.parse(
      kb.build_output_prompt_obliged_json(String(question || ""), JSON.stringify(pkg), String(depth || "brief"), String(obligationsJson || ""), String(locale)),
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
export function buildOutputPrompt(question, packageObj, depth = "brief", locale) {
  if (typeof kb.build_output_prompt_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.build_output_prompt_json(String(question || ""), JSON.stringify(packageObj), String(depth || "brief"), String(locale)));
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
export function buildOutputPromptStructured(question, packageObj, depth = "brief", locale) {
  if (typeof kb.build_output_prompt_structured_json !== "function" || !packageObj) return null;
  try {
    const r = JSON.parse(kb.build_output_prompt_structured_json(String(question || ""), JSON.stringify(packageObj), String(depth || "brief"), String(locale)));
    return r && !r.error ? r : null;
  } catch {
    return null;
  }
}

// SPR-4 §5 — the obligations-aware STRUCTURED output prompt. Returns { system, user } or null.
export function buildOutputPromptObligedStructured(question, pkg, depth, obligationsJson, locale) {
  if (typeof kb.build_output_prompt_obliged_structured_json !== "function") return null;
  try {
    const p = JSON.parse(
      kb.build_output_prompt_obliged_structured_json(String(question || ""), JSON.stringify(pkg), String(depth || "brief"), String(obligationsJson || ""), String(locale)),
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
    // Context packing for retrieval, not reader prose: the model is grounded in the canonical
    // Portuguese realization regardless of the reader's locale, and the READER's language is decided
    // later by answerFor at the serving boundary. Pinned explicitly rather than read off `.answer`.
    const body = answerFor(e, DEFAULT_LOCALE).text;
    const text = body.length + used > maxChars ? body.slice(0, Math.max(0, maxChars - used)) : body;
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
    // Same boundary: this is the grounding body handed to the composer, pinned to the canonical
    // locale. The reader-facing realization is selected by answerFor() in the pipeline.
    answer: lead ? answerFor(lead, DEFAULT_LOCALE).text : document ? `${document.title} — ${document.path}` : "",
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
