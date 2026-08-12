// BZC-2 — live secure-fetch tools. Given the Rust-decided entity+artifact+scope (BZC-1
// `artifact::resolve_scope`), this obtains an operator/implementation's LIVE artifact from its canonical
// origin and returns a typed observation — origin, version, profile, environment, capabilities, sha256,
// observed_at — clearly DISTINCT from the Protocol Manifesto. It reuses the existing, hardened path and
// NEVER adds a second fetcher or accepts a caller URL:
//   - the CLOSED Technical Registry (Rust `banza-target-registry`) resolves the target + endpoints;
//   - the SSRF-hardened Rust artifact fetcher (`banza-artifact-fetcher`, service `banza-fetcher`) is the
//     ONLY component that reaches operator endpoints (HTTPS-only, host pin, private/loopback/metadata
//     blocklist, no redirects, size/time caps, TLS + media-type checks — all decided in Rust);
//   - the answer is rendered from the typed observation; TS only transports + formats.
// Authority here is PUBLICATION + INTEGRITY (the artifact exists at the registry-resolved canonical origin
// and its digest was computed over a TLS-verified, host-pinned fetch). It is NOT a validity/conformance
// verdict — that is the 9-step validation journey. The engine never asserts more than it verified.

import crypto from "node:crypto";
import { createRequire } from "node:module";
import { createFetcherClient, JSON_MEDIA_ALLOWLIST } from "./fetcherClient.js";

const require = createRequire(import.meta.url);
// Same closed Rust registry the validator uses (single resolution source; no caller URLs).
const registry = require("./validatewasm/banza_target_registry/banza_target_registry.js");

// artifact_type (BZC-1 `ScopeDecision.artifact_type`) → the registry endpoint key. Extend here as new
// per-implementation artifacts become resolvable — no per-question code anywhere else.
export const ARTIFACT_ENDPOINT = Object.freeze({
  implementation_manifest: "manifest",
  key_manifest: "key_manifest",
  discovery: "discovery",
  signed_metadata: "signed_metadata",
  revocation_list: "revocation",
  evidence_bundle: "evidence_bundle",
  conformance_profile_declared: "conformance",
});

// PT label per artifact — parity with `ArtifactIntent::label_pt` in artifact.rs (the header wording).
const ARTIFACT_LABEL_PT = Object.freeze({
  implementation_manifest: "Manifesto da implementação",
  key_manifest: "Manifesto de Chaves",
  discovery: "documento de descoberta (discovery)",
  signed_metadata: "metadata assinada",
  revocation_list: "lista de revogação",
  evidence_bundle: "Evidence Bundle",
  conformance_profile_declared: "perfil de conformidade declarado",
});

function labelPt(artifactType) {
  return ARTIFACT_LABEL_PT[artifactType] || "artefacto";
}

// Reason text per typed tool-error code (Rust/registry/fetcher decided the failure; this is presentation).
const LIVE_FAIL_REASON_PT = Object.freeze({
  ARTIFACT_NOT_PUBLISHED: "esta implementação não publica esse artefacto na sua origem canónica",
  FETCH_BLOCKED: "a obtenção segura na origem canónica foi bloqueada ou não devolveu o artefacto",
  FETCH_ERROR: "não foi possível contactar o obtentor seguro",
  TARGET_NOT_ELIGIBLE: "o alvo não está elegível no Registo Técnico",
  ENTITY_NOT_IN_REGISTRY: "a implementação não consta do Registo Técnico",
  NO_ELIGIBLE_IMPLEMENTATION: "a entidade não tem uma implementação elegível publicada",
  AMBIGUOUS_IMPLEMENTATION: "a entidade tem mais do que uma implementação elegível — é preciso indicar qual",
  REGISTRY_UNAVAILABLE: "o Registo Técnico não está disponível de momento",
  REGISTRY_RESOLVE_FAILED: "a resolução no Registo Técnico falhou",
  UNSUPPORTED_ARTIFACT: "ainda não há uma ferramenta live para esse tipo de artefacto",
});

// Honest PT answer when the live tool RAN but could not obtain the artifact. Names the entity + artifact
// and the concrete reason; NEVER substitutes the Protocol Manifesto and NEVER simulates content.
export function honestLiveFailureAnswer(scope, error) {
  const label = labelPt(String((scope && scope.artifact_type) || ""));
  const entity = (scope && scope.entity_display) || "a implementação";
  const code = (error && error.code) || "";
  const reason = LIVE_FAIL_REASON_PT[code] || "a obtenção ao vivo não foi concluída";
  const cands =
    code === "AMBIGUOUS_IMPLEMENTATION" && error && Array.isArray(error.candidates) && error.candidates.length
      ? ` As implementações elegíveis são: ${error.candidates.join(", ")}.`
      : "";
  return (
    `Identifiquei o pedido do **${label} do ${entity}** — um artefacto **da implementação**, distinto do ` +
    `**Manifesto do Protocolo**. Tentei obtê-lo ao vivo na origem canónica, mas ${reason}.${cands}\n\n` +
    `Por isso **não mostro conteúdo** nem o substituo por qualquer documento do protocolo. Pode consultá-lo na ` +
    `**jornada de validação** do BanzAI e no **Registo Técnico** da implementação.`
  );
}

function pathOf(absoluteUrl, canonicalOrigin) {
  const origin = String(canonicalOrigin).replace(/\/+$/, "");
  return String(absoluteUrl).startsWith(origin) ? String(absoluteUrl).slice(origin.length) : String(absoluteUrl);
}

// Map a resolved ecosystem entity id (from artifact.rs, e.g. "operator-zero") to the registry's
// (operator_id, implementation_id). Data-driven from the Rust catalogue — no hard-coded ids. An entity id
// may match an operator (then its single ELIGIBLE published implementation is used; >1 eligible ⇒
// AMBIGUOUS, never a silent pick) or a specific implementation id directly.
function resolveRegistryTarget(entityId) {
  const id = String(entityId || "");
  if (!id) return { error: "ENTITY_NOT_RESOLVED" };
  let cat;
  try {
    cat = JSON.parse(registry.registry_catalogue_json());
  } catch {
    return { error: "REGISTRY_UNAVAILABLE" };
  }
  const operators = Array.isArray(cat.operators) ? cat.operators : [];
  // (a) exact implementation id
  for (const op of operators) {
    for (const impl of op.implementations || []) {
      if (impl.implementation_id === id) {
        return { operator_id: op.operator_id, implementation_id: impl.implementation_id };
      }
    }
  }
  // (b) operator id → its eligible published implementations
  const op = operators.find((o) => o.operator_id === id);
  if (op) {
    const eligible = (op.implementations || []).filter((i) => i.eligible && i.publication_status === "published");
    if (eligible.length === 1) {
      return { operator_id: op.operator_id, implementation_id: eligible[0].implementation_id };
    }
    if (eligible.length > 1) {
      return { error: "AMBIGUOUS_IMPLEMENTATION", candidates: eligible.map((i) => i.implementation_id) };
    }
    return { error: "NO_ELIGIBLE_IMPLEMENTATION" };
  }
  return { error: "ENTITY_NOT_IN_REGISTRY" };
}

function toolError(code, message, extra = {}) {
  return { ok: false, error: { code, message, ...extra } };
}

// A capped, fenced pretty-print of the fetched artifact. The body is untrusted operator content shown as a
// fenced code block (rendered as text, never executed). Capped so a large artifact never floods the answer.
function fencedPreview(body, maxChars = 1600) {
  let pretty = String(body);
  try {
    pretty = JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    /* not JSON — show raw, still capped */
  }
  let truncated = false;
  if (pretty.length > maxChars) {
    pretty = pretty.slice(0, maxChars);
    truncated = true;
  }
  return { block: "```json\n" + pretty + "\n```", truncated };
}

function renderObservation(obs, authority, body) {
  const label = labelPt(obs.artifact_type);
  const caps = (obs.capabilities || []).join(", ") || "—";
  const { block, truncated } = fencedPreview(body);
  const lines = [
    `Obtive **ao vivo** o **${label} do ${obs.entity_display}** — o artefacto **da implementação**, ` +
      `publicado na sua origem canónica. É distinto do **Manifesto do Protocolo** (o documento do próprio protocolo BANZA).`,
    "",
    "| Campo | Valor |",
    "| --- | --- |",
    `| Entidade | ${obs.entity_display} (implementação \`${obs.implementation_id}\`) |`,
    `| Operador | \`${obs.operator_id}\` |`,
    `| Origem canónica | ${obs.canonical_origin} |`,
    `| Artefacto | ${obs.url} |`,
    `| Versão | ${obs.version || "—"} · protocolo ${obs.protocol_version || "—"} |`,
    `| Perfil / Ambiente | ${obs.profile || "—"} · ${obs.environment || "—"} |`,
    `| Capacidades | ${caps} |`,
    `| sha256 | \`${obs.sha256 || "—"}\` |`,
    `| Observado em | ${obs.fetched_at || "—"} |`,
    `| TLS verificado | ${authority.tls_verified ? "sim" : "não"} · host \`${authority.host_pinned}\` |`,
    "",
    `Conteúdo obtido (${truncated ? "excerto" : "íntegro"}):`,
    block,
    "",
    "_Autoridade: **publicação + integridade** — o artefacto existe na origem canónica resolvida pelo Registo " +
      "Técnico e o seu resumo (sha256) foi calculado sobre uma obtenção com TLS verificado e host fixado. " +
      "Isto não é um veredicto de validade/conformidade — essa é a jornada de validação de 9 passos._",
  ];
  return lines.join("\n");
}

// Factory. `fetchImpl` is injected exactly like validate.js/provider.js so tests are hermetic (the test
// supplies a fetcher stub returning the Operator-Zero example artifacts; nothing leaves the host).
export function createLiveArtifactTool(env = process.env, { fetchImpl = globalThis.fetch } = {}) {
  const fetcher = createFetcherClient(env, { fetchImpl });

  // ToolRequest: a Rust-decided ScopeDecision (entity_id + artifact_type + requires_live_tool).
  // ToolResult: { ok:true, observation, authority, answer_markdown, sources } | { ok:false, error }.
  async function fetchArtifact(scope) {
    const artifactType = String((scope && scope.artifact_type) || "");
    const endpointKey = ARTIFACT_ENDPOINT[artifactType];
    if (!endpointKey) {
      return toolError("UNSUPPORTED_ARTIFACT", `Não há ferramenta live para o artefacto '${artifactType}'.`);
    }

    const rt = resolveRegistryTarget(scope && scope.entity_id);
    if (rt.error) return toolError(rt.error, `Não consegui localizar a implementação no Registo Técnico.`, { candidates: rt.candidates });

    let res;
    try {
      res = JSON.parse(registry.registry_resolve_json(rt.operator_id, rt.implementation_id));
    } catch {
      return toolError("REGISTRY_RESOLVE_FAILED", "Falha a resolver o alvo no Registo Técnico.");
    }
    if (!res || !res.ok || !res.eligible || !res.target) {
      return toolError("TARGET_NOT_ELIGIBLE", "O alvo não está elegível no Registo Técnico.");
    }
    const target = res.target;
    const url = target.endpoints && target.endpoints[endpointKey];
    if (!url) {
      return toolError("ARTIFACT_NOT_PUBLISHED", `A implementação não publica o artefacto '${artifactType}' na sua origem.`);
    }

    const path = pathOf(url, target.canonical_origin);
    let resp;
    try {
      resp = await fetcher.fetchArtifact({
        canonical_origin: target.canonical_origin,
        expected_host: target.expected_host,
        path,
        media_type_allowlist: JSON_MEDIA_ALLOWLIST,
      });
    } catch (e) {
      return toolError("FETCH_ERROR", "Erro ao contactar o obtentor seguro.", { url, detail: String((e && e.message) || e) });
    }
    if (!resp || !resp.ok || typeof resp.body !== "string") {
      return toolError("FETCH_BLOCKED", "Não foi possível obter o artefacto na origem canónica.", {
        url,
        reason_codes: (resp && resp.reason_codes) || [],
        http_status: resp && resp.http_status,
      });
    }

    // Independent digest over the fetched body (defence in depth; must match the fetcher's sha256).
    const localSha = crypto.createHash("sha256").update(resp.body, "utf8").digest("hex");
    const digestMatches = !resp.sha256 || resp.sha256 === localSha;

    const observation = {
      artifact_type: artifactType,
      entity_id: scope.entity_id,
      entity_display: scope.entity_display || target.display_name || scope.entity_id,
      operator_id: rt.operator_id,
      implementation_id: rt.implementation_id,
      canonical_origin: target.canonical_origin,
      url,
      environment: target.environment,
      profile: target.profile,
      version: target.version,
      protocol_version: target.protocol_version,
      capabilities: target.capabilities || [],
      publication_status: target.publication_status,
      http_status: resp.http_status,
      content_type: resp.content_type,
      resolved_host: resp.resolved_host,
      sha256: resp.sha256 || localSha,
      digest_matches: digestMatches,
      fetched_at: resp.fetched_at,
      request_id: resp.request_id,
    };
    const authority = {
      kind: "origin_bound_live_fetch",
      scope: "publication_and_integrity",
      decided_by: "banza-target-registry (Rust) + banza-artifact-fetcher (Rust)",
      tls_verified: Boolean(resp.tls_ok),
      host_pinned: target.expected_host,
      redirect_count: resp.redirect_count || 0,
      digest_matches: digestMatches,
    };

    return {
      ok: true,
      observation,
      authority,
      answer_markdown: renderObservation(observation, authority, resp.body),
      sources: [
        {
          id: `${rt.implementation_id}:${artifactType}`,
          title: `${labelPt(artifactType)} — ${observation.entity_display}`,
          path: url,
        },
      ],
    };
  }

  return { fetchArtifact, resolveRegistryTarget };
}
