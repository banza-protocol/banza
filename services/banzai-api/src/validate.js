// Endpoint-originated operator validation (M2.19G.1, ADR-034). RUST_DECIDES.
//
// The official nine-step journey (ADR-034 §21) resolves a validation target from the CLOSED Technical
// Registry (Rust), fetches EACH artifact from the implementation's public endpoints via the secure
// Rust fetcher (fetcherClient -> banza-fetcher), runs the matching Rust/WASM decision engine on the
// FETCHED CONTENT, and binds every verdict to its exact public origin in an OperationReceipt. The
// journey aggregates them into a JourneyReceipt whose Certification Readiness is READY/BLOCKED and is
// NEVER a Certification Record and NEVER CERTIFIED (ADR-034 §21 step 9, §4.10).
//
// Invariants enforced here:
//   * Rust decides every verdict (registry + decision engines). TypeScript never decides; it shuttles
//     JSON, assembles engine inputs from FETCHED content, and builds receipts. There is NO model call.
//   * No pasted content, upload, local fixture, bundled artifact or user-supplied URL EVER enters the
//     official path — inputs come only from registry-resolved origin+path fetched by the Rust fetcher.
//   * qwen_calls and external_model_calls are always 0; protocol fetches count as protocol_fetch_count.

import crypto from "node:crypto";
import { createRequire } from "node:module";
import { createFetcherClient, JSON_MEDIA_ALLOWLIST } from "./fetcherClient.js";
import * as receiptStore from "./receipts/index.js";

const require = createRequire(import.meta.url);

// --- Rust/WASM engines (vendored nodejs WASM, one CJS package per crate) -----------------------------
const WASM = "./validatewasm";
const registry = require(`${WASM}/banza_target_registry/banza_target_registry.js`);
const manifestEngine = require(`${WASM}/banza_operator_manifest/banza_operator_manifest.js`);
const trustEngine = require(`${WASM}/banza_trust/banza_trust.js`);
const conformanceEngine = require(`${WASM}/banza_conformance/banza_conformance.js`);
const l2Engine = require(`${WASM}/banza_l2_readiness/banza_l2_readiness.js`);
const l3Engine = require(`${WASM}/banza_l3_readiness/banza_l3_readiness.js`);
const evidenceEngine = require(`${WASM}/banza_evidence_bundle/banza_evidence_bundle.js`);

// 1.1.0 — corrected per-step timing: step 9 (certification) now brackets only its own aggregation work
// (see runCertificationStep). Telemetry pins aggregates to this orchestrator_version so measurements from
// the pre-1.1.0 instrumentation (where step 9's span == the whole journey) are never mixed in (ADR-036).
export const RECEIPT_VERSION = "1.1.0";
export const WORKFLOW = "operator-validation"; // ADR-034 §4.1 "Validar operador"

// Canonical nine-step spine (ADR-034 §21). Each step names its engine and the registry endpoint keys
// it fetches (the FIRST key is the receipt's primary endpoint). The ORDER itself lives in journeySteps.js
// so that reading it does not require this module's dependencies — importing it from here pulled in the
// receipt store and a PostgreSQL driver. Re-exported so existing callers are unaffected.
import { STEP_ORDER } from "./journeySteps.js";
export { STEP_ORDER } from "./journeySteps.js";

const STEP_SPEC = {
  discovery: { engine: "banza-target-registry", endpoints: ["discovery"] },
  manifest: { engine: "banza-operator-manifest", endpoints: ["manifest"] },
  keys: { engine: "banza-trust", endpoints: ["signed_metadata", "key_manifest", "revocation", "manifest", "conformance"] },
  conformance: { engine: "banza-conformance", endpoints: ["conformance"] },
  interoperability: { engine: "banza-l2-readiness", endpoints: ["manifest", "payment_qr", "payment_refund", "ledger", "traces"] },
  trust: { engine: "banza-trust", endpoints: ["signed_metadata", "key_manifest", "manifest", "conformance", "revocation"] },
  federation: { engine: "banza-l3-readiness", endpoints: ["federation_metadata", "federation_manifest", "traces", "manifest"] },
  evidence: { engine: "banza-evidence-bundle", endpoints: ["evidence_bundle"] },
  certification: { engine: "banza-target-registry", endpoints: [] },
};

function sha256(s) {
  return "sha256:" + crypto.createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
}

// Derive the fetch PATH from a resolved absolute URL. The origin prefix is stripped so the fetcher
// only ever receives a registry-resolved origin + path (never a caller URL).
function pathOf(absoluteUrl, canonicalOrigin) {
  const origin = String(canonicalOrigin).replace(/\/+$/, "");
  return String(absoluteUrl).startsWith(origin) ? String(absoluteUrl).slice(origin.length) : String(absoluteUrl);
}

// ----------------------------------------------------------------------------------------------------
// Engine input assembly — inputs are built ONLY from fetched artifact content. Single-artifact engines
// receive the fetched body verbatim; composite engines (trust/L2/L3) are assembled from the relevant
// fetched artifacts. No fixture contributes any verdict-bearing content. The engine decides the verdict.
// ----------------------------------------------------------------------------------------------------
// Assemble the banza-trust Open Trust Evaluation input from the fetched artifacts (ADR-025 OTE schema).
// The key material — trust-root metadata (with its threshold root signatures), the delegated signing key,
// the registry entry and the pinned root anchor — is published in the fetched KEY MANIFEST
// (`banza-ote-key-material/1`); the signed protocol metadata, operator manifest, conformance evidence and
// revocation status are their own fetched artifacts. banza-trust decides the verdict from these — TS only
// marshals the fetched content into the engine's input shape (nothing is synthesised or fabricated).
function assembleTrustInput(target, fetched) {
  const sm = fetched.signed_metadata || null;
  const km = fetched.key_manifest || {};
  return {
    // Evaluation context (not verdict-bearing):
    evaluated_at: new Date().toISOString(),
    evaluator_protocol_version: target.protocol_version,
    // Trust anchor + chain published in the key manifest (root threshold sigs anchor the delegated key):
    trusted_root_public_keys: km.trusted_root_public_keys || [],
    trust_root_metadata: km.trust_root_metadata || null,
    delegated_signing_key: km.delegated_signing_key || null,
    public_registry_entry:
      km.public_registry_entry ||
      (fetched.manifest && fetched.manifest.operator_id ? { operator_id: fetched.manifest.operator_id } : null),
    // Content-bearing artifacts, each fetched from its own endpoint:
    signed_protocol_metadata: sm,
    operator_manifest: fetched.manifest || null,
    conformance_evidence: fetched.conformance || null,
    revocation_status: fetched.revocation || null,
  };
}

// Step 3 (Chaves/Keys, ADR-036) foregrounds the KEY MATERIAL specifically — the key manifest,
// its revocation, the signed-metadata signature and the delegated/root key material — whereas step 6
// (Confiança/Trust) runs the full Open Trust Evaluation. banza-trust exposes a SINGLE evaluation
// entrypoint (`trust_evaluate_signed_metadata_json`) and NO key-only mode, so by design steps 3 and 6
// SHARE the banza-trust engine and its Rust decision (recorded here). The differentiation is faithful,
// not invented: (1) Keys receives a distinct, key-material-foregrounded input (key fields up front, a
// non-verdict-bearing `evaluation_focus` marker) and (2) the Keys receipt surfaces the engine's
// KEY-SPECIFIC decided checks as its reason codes (see keyMaterialReasonCodes). The binding artefacts
// (operator_manifest, conformance_evidence) are RETAINED so the shared engine still reaches its complete,
// real verdict — Keys never fabricates or degrades a verdict; Rust decides both steps.
function assembleKeysInput(target, fetched) {
  const sm = fetched.signed_metadata || null;
  const km = fetched.key_manifest || {};
  return {
    // Key material — the focus of step 3, foregrounded first (trust root + threshold sigs, delegated key,
    // revocation, the signed-metadata signature):
    trusted_root_public_keys: km.trusted_root_public_keys || [],
    trust_root_metadata: km.trust_root_metadata || null,
    delegated_signing_key: km.delegated_signing_key || null,
    revocation_status: fetched.revocation || null,
    signed_protocol_metadata: sm,
    public_registry_entry:
      km.public_registry_entry ||
      (fetched.manifest && fetched.manifest.operator_id ? { operator_id: fetched.manifest.operator_id } : null),
    // Binding artefacts retained so the SHARED banza-trust engine reaches its complete verdict (step 6
    // evaluates these as the full Open Trust Evaluation):
    operator_manifest: fetched.manifest || null,
    conformance_evidence: fetched.conformance || null,
    // Non-verdict-bearing context marking this step's key-material focus + evaluation context:
    evaluation_focus: "key_material",
    evaluated_at: new Date().toISOString(),
    evaluator_protocol_version: target.protocol_version,
  };
}

// Surface the engine's KEY-SPECIFIC decided checks (Rust decided each `*_status`) as reason codes for
// step 3, so the Keys receipt reflects key-material checks distinctly from the Trust aggregate. This is
// PRESENTATION only — no verdict is computed here; each value is read verbatim from the engine's
// `checks` object (same pattern as signatureStatus). The overall step status still comes from Rust.
function keyMaterialReasonCodes(engineOutput) {
  const c = (engineOutput && engineOutput.checks) || {};
  const KEY_CHECKS = ["root_metadata_status", "signed_metadata_status", "delegated_key_status", "signature_status", "revocation_status"];
  return KEY_CHECKS.filter((k) => c[k] != null).map((k) => `KEY_${k.replace(/_status$/, "").toUpperCase()}:${c[k]}`);
}

function assembleL2Input(target, fetched) {
  const qr = fetched.payment_qr || null;
  return {
    operator_manifest: fetched.manifest || null,
    payment_intent: qr,
    idempotency_result: (qr && (qr.idempotency || qr.idempotency_result)) || null,
    ledger_postings: fetched.ledger || null,
    trace_linkage: fetched.traces || null,
    settlement_obligation: fetched.payment_refund || null,
    evidence_reference: (fetched.manifest && fetched.manifest.evidence_bundle_url) || null,
  };
}

function assembleL3Input(target, fetched) {
  return {
    federation_pair: fetched.federation_metadata || null,
    federation_intent: fetched.federation_manifest || null,
    cross_operator_trace: fetched.traces || null,
    operator_manifest: fetched.manifest || null,
  };
}

// Run the matching decision engine on fetched content. Returns { engineInputString, engineOutput }.
function runEngine(step, target, fetched, rawBodies) {
  switch (step) {
    case "discovery": {
      const input = JSON.stringify(fetched.discovery || {});
      const out = JSON.parse(registry.registry_validate_discovery_json(JSON.stringify(target), input));
      return { engineInputString: input, engineOutput: out };
    }
    case "manifest": {
      const s = rawBodies.manifest;
      return { engineInputString: s, engineOutput: JSON.parse(manifestEngine.operator_manifest_validate_json(s)) };
    }
    case "conformance": {
      const s = rawBodies.conformance;
      return { engineInputString: s, engineOutput: JSON.parse(conformanceEngine.conformance_validate_report_json(s)) };
    }
    case "evidence": {
      const s = rawBodies.evidence_bundle;
      return { engineInputString: s, engineOutput: JSON.parse(evidenceEngine.evidence_bundle_validate_json(s)) };
    }
    case "keys": {
      // Step 3 — distinct key-material-foregrounded input; shares banza-trust by design (see above).
      const input = assembleKeysInput(target, fetched);
      const s = JSON.stringify(input);
      return { engineInputString: s, engineOutput: JSON.parse(trustEngine.trust_evaluate_signed_metadata_json(s)) };
    }
    case "trust": {
      // Step 6 — full Open Trust Evaluation assembly.
      const input = assembleTrustInput(target, fetched);
      const s = JSON.stringify(input);
      return { engineInputString: s, engineOutput: JSON.parse(trustEngine.trust_evaluate_signed_metadata_json(s)) };
    }
    case "interoperability": {
      const input = assembleL2Input(target, fetched);
      const s = JSON.stringify(input);
      return { engineInputString: s, engineOutput: JSON.parse(l2Engine.l2_readiness_validate_json(s)) };
    }
    case "federation": {
      const input = assembleL3Input(target, fetched);
      const s = JSON.stringify(input);
      return { engineInputString: s, engineOutput: JSON.parse(l3Engine.l3_readiness_validate_json(s)) };
    }
    default:
      return { engineInputString: "{}", engineOutput: { status: "UNKNOWN_STEP" } };
  }
}

// Signature status is only meaningful for the key/trust steps; derived from the trust engine's checks.
function signatureStatus(step, engineOutput) {
  if (step !== "keys" && step !== "trust") return "not_applicable";
  const c = engineOutput && engineOutput.checks;
  return (c && (c.signature_status || c.signed_metadata_status)) || "unknown";
}

// Build a §30 OperationReceipt with EVERY origin field populated.
function buildOperationReceipt(fields) {
  const {
    step, target, requestId, primaryResp, engine, engineVersion, result, reasonCodes,
    evidenceRefs, inputHash, outputHash, signature_status, durationMs, durationUs, protocolFetchCount,
    startedAt, completedAt, retryable, blockedBy, inputArtifactDigests, applicability,
  } = fields;
  const p = primaryResp || {};
  return {
    receipt_version: RECEIPT_VERSION,
    operation_id: `op-${crypto.randomUUID()}`,
    request_id: requestId,
    workflow: WORKFLOW,
    step,
    // ADR-030 applicability is ORTHOGONAL to result.status: a NOT_APPLICABLE step is out of scope for
    // the declared profile (never fetched/evaluated), not a technical failure. Rust decides the map.
    applicability: applicability || "REQUIRED",
    operator_id: target.operator_id,
    implementation_id: target.implementation_id,
    environment: target.environment,
    profile: target.profile,
    protocol_version: target.protocol_version,
    canonical_origin: target.canonical_origin,
    endpoint: p.url || null,
    resolved_host: p.resolved_host ?? target.expected_host,
    fetched_at: p.fetched_at || new Date().toISOString(),
    http_status: p.http_status ?? null,
    content_type: p.content_type ?? null,
    content_length: p.content_length ?? null,
    etag: p.etag ?? null,
    last_modified: p.last_modified ?? null,
    input_hash: inputHash,
    signature_status,
    engine,
    engine_version: engineVersion,
    result,
    reason_codes: reasonCodes,
    evidence_refs: evidenceRefs,
    output_hash: outputHash,
    duration_ms: durationMs,
    // BZO-9: monotonic microsecond duration for this step's own work (process.hrtime-derived). Always emitted
    // (0 when the step performs no timed work, e.g. NOT_APPLICABLE); it is the authoritative duration source,
    // with duration_ms/wall-clock kept only as an audit + historical fallback.
    duration_us: durationUs ?? 0,
    // ADR-036 §4 execution-contract fields (terminal seal — RUNNING is never sealed):
    started_at: startedAt || null,
    completed_at: completedAt || new Date().toISOString(),
    retryable: retryable ?? null,
    blocked_by: blockedBy || [],
    input_artifact_digests: inputArtifactDigests || {},
    qwen_calls: 0,
    external_model_calls: 0,
    protocol_fetch_count: protocolFetchCount,
    audit_ref: `${requestId}:${p.request_id || "no-fetch"}`,
  };
}

// ----------------------------------------------------------------------------------------------------
// Factory. `fetchImpl` is injected (like provider.js) so tests are hermetic: a stub fetcher returns the
// OZ example artifacts and nothing leaves the host.
// ----------------------------------------------------------------------------------------------------
export function createValidator(env = process.env, { fetchImpl = globalThis.fetch } = {}) {
  const fetcher = createFetcherClient(env, { fetchImpl });

  // Resolve a validation target in Rust (resolution + eligibility). Never trusts a caller URL.
  function resolveTarget(operatorId, implementationId) {
    return JSON.parse(registry.registry_resolve_json(String(operatorId || ""), String(implementationId || "")));
  }

  // ADR-030: the Rust-decided step→applicability map for a declared profile ({ step: REQUIRED |
  // OPTIONAL | NOT_APPLICABLE }). NOT_APPLICABLE steps are out of scope for the profile (e.g. L2
  // interoperability / L3 federation for an L0 implementation) and are never fetched or evaluated.
  function profileApplicability(profile) {
    return JSON.parse(registry.registry_profile_applicability_json(String(profile || ""))).applicability || {};
  }

  // Seal a NOT_APPLICABLE step (ADR-030): the step is out of scope for the declared profile, so it is
  // NEVER fetched or evaluated (no L2/L3 endpoints hit for an L0 implementation). The receipt carries
  // applicability=NOT_APPLICABLE + state NOT_EVALUATED — this is not a technical failure and never
  // contributes FAILED/BLOCKED to readiness. Rust already decided the applicability; TS only seals it.
  function buildNotApplicableReceipt(step, target, requestId) {
    const now = new Date().toISOString();
    const result = { status: "NOT_EVALUATED", applicability: "NOT_APPLICABLE" };
    return buildOperationReceipt({
      step, target, requestId, primaryResp: {}, engine: STEP_SPEC[step].engine, engineVersion: "n/a",
      result, reasonCodes: [`STEP_NOT_APPLICABLE_FOR_PROFILE:${target.profile}`],
      evidenceRefs: [], inputHash: sha256(""), outputHash: sha256(result),
      signature_status: "not_applicable", durationMs: 0, durationUs: 0, protocolFetchCount: 0,
      startedAt: now, completedAt: now, retryable: false, blockedBy: [], inputArtifactDigests: {},
      applicability: "NOT_APPLICABLE",
    });
  }

  // Execute one technical step end-to-end (resolve is done by the caller). Returns an OperationReceipt.
  // `applicability` (REQUIRED|OPTIONAL) is stamped on the receipt; NOT_APPLICABLE steps never reach here.
  async function runTechnicalStep(step, target, requestId, applicability = "REQUIRED") {
    const spec = STEP_SPEC[step];
    const t0 = Date.now();
    const hr0 = process.hrtime.bigint(); // BZO-9: monotonic clock — immune to wall-clock adjustments/skew
    const startedAtIso = new Date().toISOString();
    const fetched = {};
    const rawBodies = {};
    const fetchResponses = [];
    let firstFailure = null;

    for (const key of spec.endpoints) {
      const url = target.endpoints[key];
      const path = pathOf(url, target.canonical_origin);
      // Only registry-resolved origin+host+path reach the fetcher — never a caller URL.
      const resp = await fetcher.fetchArtifact({
        canonical_origin: target.canonical_origin,
        expected_host: target.expected_host,
        path,
        media_type_allowlist: JSON_MEDIA_ALLOWLIST,
      });
      fetchResponses.push({ key, url, resp });
      if (resp && resp.ok && typeof resp.body === "string") {
        rawBodies[key] = resp.body;
        try {
          fetched[key] = JSON.parse(resp.body);
        } catch {
          fetched[key] = resp.body;
        }
      } else if (!firstFailure) {
        firstFailure = { key, url, resp };
      }
    }

    const successfulFetches = fetchResponses.filter((f) => f.resp && f.resp.ok).length;
    const evidenceRefs = fetchResponses.map((f) => `${f.url}#${(f.resp && f.resp.sha256) || "no-hash"}`);
    const primary = (firstFailure && firstFailure.resp) || (fetchResponses[0] && fetchResponses[0].resp) || {};
    // ADR-036 §4 structured per-artefact digest map (endpoint → observed content hash).
    const inputArtifactDigests = {};
    for (const f of fetchResponses) {
      if (f.resp && f.resp.ok && f.resp.sha256) inputArtifactDigests[f.key] = { endpoint: f.url, sha256: f.resp.sha256 };
    }

    // Any required fetch failed -> step BLOCKED; surface the fetcher's reason_code in the receipt.
    if (firstFailure) {
      const reasonCodes = [
        ...(firstFailure.resp && Array.isArray(firstFailure.resp.reason_codes) ? firstFailure.resp.reason_codes : []),
        "FETCH_BLOCKED",
      ];
      const result = {
        status: "BLOCKED",
        fetch_failure: { endpoint: firstFailure.url, reason_codes: firstFailure.resp ? firstFailure.resp.reason_codes : [] },
      };
      return buildOperationReceipt({
        step, target, requestId, primaryResp: firstFailure.resp, engine: spec.engine,
        engineVersion: "n/a", result, reasonCodes, evidenceRefs,
        inputHash: sha256(""), outputHash: sha256(result), signature_status: "not_applicable",
        durationMs: Date.now() - t0, durationUs: Number((process.hrtime.bigint() - hr0) / 1000n),
        protocolFetchCount: successfulFetches,
        startedAt: startedAtIso, completedAt: new Date().toISOString(),
        retryable: true, blockedBy: [], inputArtifactDigests, applicability, // a fetch/transient failure is retryable
      });
    }

    // All artifacts fetched -> run the Rust engine on the fetched content; Rust decides the verdict.
    const { engineInputString, engineOutput } = runEngine(step, target, fetched, rawBodies);
    const verdict = JSON.parse(registry.registry_step_status_json(step, JSON.stringify(engineOutput)));
    const engineVersion = engineOutput.tool_version || "unknown";
    // Step 3 (Keys) foregrounds the key material: surface the engine's key-specific decided checks so the
    // Keys receipt is distinct from the Trust aggregate (both share banza-trust; Rust decides — see above).
    const reasonCodes =
      step === "keys" ? [...verdict.reason_codes, ...keyMaterialReasonCodes(engineOutput)] : verdict.reason_codes;

    return buildOperationReceipt({
      step, target, requestId, primaryResp: primary, engine: spec.engine, engineVersion,
      result: { status: verdict.status, engine_status: verdict.engine_status, engine_result: engineOutput },
      reasonCodes, evidenceRefs,
      inputHash: sha256(engineInputString), outputHash: sha256(engineOutput),
      signature_status: signatureStatus(step, engineOutput),
      durationMs: Date.now() - t0, durationUs: Number((process.hrtime.bigint() - hr0) / 1000n),
      protocolFetchCount: successfulFetches,
      startedAt: startedAtIso, completedAt: new Date().toISOString(),
      // A decided FAILED verdict is not retryable; BLOCKED/PENDING (correctable/transient) are.
      retryable: verdict.status === "BLOCKED" || verdict.status === "PENDING",
      blockedBy: [], inputArtifactDigests, applicability,
    });
  }

  // Step 9 — Certification Readiness. Aggregates the eight technical receipts in Rust. Never issues a
  // Certification Record; never returns CERTIFIED (ADR-034 §21 step 9).
  function runCertificationStep(target, requestId, technicalReceipts) {
    // Step 9 times ONLY its own aggregation work (protocol_fetch_count=0) — it must NEVER be back-dated to
    // the journey t0. The pre-1.1.0 bug passed the whole-journey elapsed as this step's duration and set
    // startedAt = journey start, so the step's own [startedAt, completedAt] spanned the ENTIRE journey and
    // its per-step telemetry read ≈ the journey median (a false "slowest step"). Fixed: the step brackets
    // only the readiness computation below (ADR-036 §telemetry-correctness).
    const stepStartedAt = new Date().toISOString();
    const stepT0 = Date.now();
    const stepHr0 = process.hrtime.bigint(); // BZO-9: monotonic — brackets ONLY the aggregation below
    const stepVerdicts = technicalReceipts.map((r) => ({ step: r.step, status: (r.result && r.result.status) || "NOT_EVALUATED" }));
    // ADR-030: readiness aggregates ONLY the steps REQUIRED for the declared profile. Rust decides which
    // steps are NOT_APPLICABLE and excludes them — they never contribute FAILED/BLOCKED to readiness.
    const readiness = JSON.parse(registry.registry_certification_readiness_json(JSON.stringify(stepVerdicts), target.profile));
    // Real dependency graph: blocked by any non-VERIFIED step that APPLIES to the profile (a NOT_APPLICABLE
    // step is out of scope, never a blocker — ADR-036 + ADR-030).
    const blockedBy = technicalReceipts
      .filter((r) => r.applicability !== "NOT_APPLICABLE" && (r.result && r.result.status) !== "VERIFIED")
      .map((r) => r.step);
    return buildOperationReceipt({
      step: "certification", target, requestId, primaryResp: {}, engine: "banza-target-registry",
      engineVersion: readiness.tool_version || "unknown", applicability: "REQUIRED",
      result: { status: readiness.readiness === "READY" ? "VERIFIED" : "BLOCKED", certification: readiness },
      reasonCodes: readiness.reason_codes, evidenceRefs: technicalReceipts.map((r) => `receipt:${r.operation_id}`),
      inputHash: sha256(stepVerdicts), outputHash: sha256(readiness), signature_status: "not_applicable",
      durationMs: Date.now() - stepT0, durationUs: Number((process.hrtime.bigint() - stepHr0) / 1000n),
      protocolFetchCount: 0,
      startedAt: stepStartedAt, completedAt: new Date().toISOString(),
      retryable: false, blockedBy, // aggregation of already-decided verdicts; re-run by re-aggregating
    });
  }

  // POST /validate/step — run a single step (resolves the target first). For `certification`, the eight
  // technical steps run first so readiness is derived from real endpoint evidence, not a client claim.
  async function validateStep(operatorId, implementationId, step) {
    if (!STEP_SPEC[step]) return { error: "unknown_step", step, allowed: STEP_ORDER };
    const requestId = crypto.randomUUID();
    const res = resolveTarget(operatorId, implementationId);
    if (!res.ok) return { error: "target_not_resolved", eligible: false, reason: res.reason, operator_id: operatorId, implementation_id: implementationId };
    const target = res.target;
    const applic = profileApplicability(target.profile);
    if (step === "certification") {
      const technical = [];
      for (const s of STEP_ORDER.filter((x) => x !== "certification")) {
        technical.push(applic[s] === "NOT_APPLICABLE"
          ? buildNotApplicableReceipt(s, target, requestId)
          : await runTechnicalStep(s, target, requestId, applic[s]));
      }
      return { ok: true, receipt: runCertificationStep(target, requestId, technical) };
    }
    const receipt = applic[step] === "NOT_APPLICABLE"
      ? buildNotApplicableReceipt(step, target, requestId)
      : await runTechnicalStep(step, target, requestId, applic[step]);
    return { ok: true, receipt };
  }

  // Aggregate the per-write persistence statuses into ONE honest verdict (ADR-036 correction 1). The
  // engine result is independent of storage; a run is only "durably concluded" when every write PERSISTED.
  function aggregatePersistence(statuses, executionId) {
    const S = receiptStore.PersistenceStatus;
    const real = statuses.filter((s) => s !== S.DISABLED);
    if (real.length === 0) return { status: S.DISABLED, execution_id: null, durable: false, consultable: false, comparable: false, reproducible: false };
    if (real.every((s) => s === S.PERSISTED)) {
      return { status: S.PERSISTED, execution_id: executionId, durable: true, consultable: true, comparable: true, reproducible: true };
    }
    // Result stands but persistence is NOT confirmed → never claim durable/consultable/comparable/reproducible.
    const detail = real.some((s) => s === S.FAILED) ? S.FAILED : S.PENDING;
    return { status: S.NOT_PERSISTED, detail, execution_id: executionId, durable: false, consultable: false, comparable: false, reproducible: false, retryable: true };
  }

  // POST /validate/journey — run all nine steps and return a §31 JourneyReceipt + honest persistence status.
  // opts: { workspace, startedBy, idempotencyKey, previousExecutionId, reproductionOf, reproductionResult,
  //         executionKind, triggerSource, measurementCampaignId, initiatedBy } (BZO-9 classification;
  //         executionKind defaults to USER_REQUESTED — a genuine journey).
  async function validateJourney(operatorId, implementationId, opts = {}) {
    const requestId = crypto.randomUUID();
    const res = resolveTarget(operatorId, implementationId);
    if (!res.ok) return { error: "target_not_resolved", eligible: false, reason: res.reason, operator_id: operatorId, implementation_id: implementationId };
    const target = res.target;
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const hr0 = process.hrtime.bigint(); // BZO-9: monotonic journey clock (authoritative duration_us)

    // Open the durable execution (operational RUNNING state). Persistence failure never blocks the run.
    // BZO-9: a genuine journey is USER_REQUESTED by default; SYSTEM_E2E / BENCHMARK callers opt out via opts.
    const begin = await receiptStore.beginExecution({
      operator_id: target.operator_id, implementation_id: target.implementation_id,
      protocol_version: target.protocol_version, profile: target.profile, environment: target.environment,
      snapshot_observed_at: startedAt, orchestrator_version: RECEIPT_VERSION,
      started_by: opts.startedBy || "public", workspace: opts.workspace || "public",
      idempotency_key: opts.idempotencyKey || null, previous_execution_id: opts.previousExecutionId || null,
      reproduction_of: opts.reproductionOf || null,
      execution_kind: opts.executionKind || "USER_REQUESTED", trigger_source: opts.triggerSource || null,
      measurement_campaign_id: opts.measurementCampaignId || null, initiated_by: opts.initiatedBy || null,
    });
    const executionId = begin.execution_id;
    const persistStatuses = [begin.status];

    // ADR-030: NOT_APPLICABLE steps (e.g. L2/L3 for an L0 implementation) are sealed as out-of-scope
    // receipts — never fetched, never evaluated, never a technical failure. Rust decides the map.
    const applic = profileApplicability(target.profile);
    const technical = [];
    for (const s of STEP_ORDER.filter((x) => x !== "certification")) {
      const r = applic[s] === "NOT_APPLICABLE"
        ? buildNotApplicableReceipt(s, target, requestId)
        : await runTechnicalStep(s, target, requestId, applic[s]);
      technical.push(r);
      persistStatuses.push((await receiptStore.saveStep(executionId, r)).status);
    }
    const certReceipt = runCertificationStep(target, requestId, technical);
    persistStatuses.push((await receiptStore.saveStep(executionId, certReceipt)).status);
    const stepReceipts = [...technical, certReceipt];

    const readiness = certReceipt.result.certification;
    const protocolFetchCount = stepReceipts.reduce((n, r) => n + (r.protocol_fetch_count || 0), 0);
    // ADR-030: overall status aggregates only the steps that APPLY to the profile — a NOT_APPLICABLE
    // step (out of scope) is never a FAILED/BLOCKED/PENDING contributor.
    const statuses = technical
      .filter((r) => r.applicability !== "NOT_APPLICABLE")
      .map((r) => (r.result && r.result.status) || "NOT_EVALUATED");
    const overallStatus = statuses.includes("FAILED")
      ? "FAILED"
      : statuses.includes("BLOCKED")
        ? "BLOCKED"
        : statuses.includes("PENDING") || statuses.includes("NOT_EVALUATED")
          ? "PENDING"
          : "VERIFIED";

    // ADR-036 §7 correction 3: when this run reproduces an earlier execution, the typed reproduction
    // verdict is computed HERE (before finalize) so it is persisted immutably in the terminal UPDATE —
    // never re-derived after the row is frozen. Compares the newly OBSERVED artefact digests against the
    // original's PINNED digests (a stored URL is never re-fetched).
    let reproductionResult = opts.reproductionResult || null;
    if (opts.reproductionOf && !reproductionResult) {
      const verdict = await computeReproductionVerdict(
        opts.reproductionOf, opts.workspace || "public", stepReceipts, overallStatus,
      );
      reproductionResult = verdict.result;
    }

    const journeyReceipt = {
      receipt_version: RECEIPT_VERSION,
      journey_id: `journey-${crypto.randomUUID()}`,
      execution_id: executionId,
      request_id: requestId,
      workflow: WORKFLOW,
      operator_id: target.operator_id,
      implementation_id: target.implementation_id,
      environment: target.environment,
      profile: target.profile,
      protocol_version: target.protocol_version,
      canonical_origin: target.canonical_origin,
      resolved_host: target.expected_host,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      // BZO-9: monotonic microsecond journey duration (authoritative; duration_ms kept for audit/fallback).
      duration_us: Number((process.hrtime.bigint() - hr0) / 1000n),
      step_count: stepReceipts.length,
      steps: stepReceipts,
      overall_status: overallStatus,
      certification_readiness: readiness.readiness, // READY | BLOCKED
      certification_status: "NOT_CERTIFIED",
      certified: false,
      // ADR-030 applicability summary (Rust-decided): which steps are in scope for this profile, and
      // which are NOT_APPLICABLE (out of scope, never a failure). Orthogonal to per-step result.status.
      applicability: applic,
      not_applicable_steps: readiness.not_applicable_steps || [],
      required_steps_evaluated: readiness.required_steps_evaluated ?? null,
      reason_codes: readiness.reason_codes,
      qwen_calls: 0,
      external_model_calls: 0,
      protocol_fetch_count: protocolFetchCount,
      audit_ref: requestId,
      previous_journey_id: opts.previousJourneyId || null,
      reproduction_of: opts.reproductionOf || null,
      reproduction_result: reproductionResult,
      disclaimer:
        "Validação com origem nos endpoints públicos da implementação. Rust decide; a IA nunca decide. A Prontidão de Certificação agrega verdictos — não é um Registo de Certificação e nunca devolve CERTIFIED.",
    };
    persistStatuses.push((await receiptStore.saveJourney(executionId, journeyReceipt)).status);

    return { ok: true, journey_receipt: journeyReceipt, persistence: aggregatePersistence(persistStatuses, executionId) };
  }

  // M2.19G.3B — read-only canonical registry catalogue: the CLOSED Rust Technical Registry
  // (operators + implementations, each with version/protocol_version/profile/environment/capabilities/
  // canonical_origin/publication_status/eligible). This is the single dynamic selection source for the
  // "Validar operador" tab — it REPLACES the hardcoded TS registry. Rust decides; 0 model calls.
  function catalogue() {
    return JSON.parse(registry.registry_catalogue_json());
  }
  // M2.19G.3B — read-only canonical option sets (supported protocol versions / environments / profiles)
  // from the Rust registry. This is the canonical source for the onboarding version/profile/environment
  // dropdowns — it REPLACES any hardcoded TS option arrays. Rust decides; 0 model calls.
  function options() {
    return JSON.parse(registry.registry_tool_version_json());
  }

  // ADR-036 §7 correction 3: the typed reproduction verdict, computed from a reproduction run's OBSERVED
  // artefact digests vs the original's PINNED digests + the two overall verdicts. Pure comparison; the
  // secure re-fetch already happened during the run. Returns {result, changed_artifacts}. A stored URL is
  // never re-fetched here.
  async function computeReproductionVerdict(originalExecutionId, workspace, stepReceipts, overallStatus) {
    const pinned = await receiptStore.pinnedArtifacts(originalExecutionId, workspace);
    if (pinned === null) return { result: "ORIGINAL_INPUTS_UNAVAILABLE", changed_artifacts: [] };
    const observed = {};
    for (const s of stepReceipts) {
      for (const [role, d] of Object.entries(s.input_artifact_digests || {})) observed[`${s.step}:${role}`] = d.sha256;
    }
    const changed = pinned
      .filter((p) => observed[`${p.step_id}:${p.artifact_role}`] && observed[`${p.step_id}:${p.artifact_role}`] !== p.content_sha256)
      .map((p) => `${p.step_id}:${p.artifact_role}`);
    if (changed.length > 0) return { result: "OBSERVED_INPUTS_CHANGED", changed_artifacts: changed };
    if (stepReceipts.some((s) => s.result && s.result.status === "BLOCKED")) return { result: "REPRODUCTION_BLOCKED", changed_artifacts: [] };
    const original = await receiptStore.readExecution(originalExecutionId, workspace);
    const origOverall = original && original.execution && original.execution.overall_status;
    return { result: origOverall && origOverall !== overallStatus ? "NOT_EQUIVALENT" : "SEMANTICALLY_EQUIVALENT", changed_artifacts: [] };
  }

  // Reproduce an original execution: re-run the FULL secure pipeline (registry resolve → secure fetch →
  // engines) as a NEW execution linked via reproduction_of. validateJourney computes the typed verdict
  // BEFORE finalize (so it is PERSISTED immutably on the reproduction row); this wrapper returns it to the
  // caller. NEVER fetches a URL stored in a receipt (ADR-036 correction 3).
  async function reproduceJourney(operatorId, implementationId, originalExecutionId, opts = {}) {
    const workspace = opts.workspace || "public";
    if ((await receiptStore.pinnedArtifacts(originalExecutionId, workspace)) === null) {
      return { ok: false, reproduction: { result: "ORIGINAL_INPUTS_UNAVAILABLE", original_execution_id: originalExecutionId } };
    }
    const run = await validateJourney(operatorId, implementationId, { ...opts, workspace, reproductionOf: originalExecutionId });
    if (run.error) return { ok: false, reproduction: { result: "REPRODUCTION_BLOCKED", original_execution_id: originalExecutionId }, ...run };
    // The persisted verdict is the source of truth (response == what the store holds).
    const result = run.journey_receipt.reproduction_result || "SEMANTICALLY_EQUIVALENT";
    return {
      ok: true, journey_receipt: run.journey_receipt, persistence: run.persistence,
      reproduction: { result, original_execution_id: originalExecutionId },
    };
  }

  // Workspace-scoped read/compare/cancel over the durable store (require it enabled; caller enforces authz).
  async function getExecution(executionId, workspace) { return receiptStore.readExecution(executionId, workspace); }
  async function listExecutions(implementationId, workspace) { return receiptStore.readExecutions(implementationId, workspace); }
  async function compareExecutions(aId, bId, workspace) { return receiptStore.diffExecutions(aId, bId, workspace); }
  async function cancelExecution(executionId, workspace) { return receiptStore.cancel(executionId, workspace); }

  return {
    resolveTarget, validateStep, validateJourney, reproduceJourney,
    getExecution, listExecutions, compareExecutions, cancelExecution,
    catalogue, options, fetcherEndpoint: fetcher.endpoint,
  };
}
