// Increment 3 — the ToolPlanner ADAPTER (glue only; the planner LOGIC is Rust in
// engines/banzai-query-core/src/toolplan.rs). Rust decides the ordered plan of typed ToolKinds; this
// module resolves an EXECUTABLE ToolKind to the ALREADY-EXISTING callable a later increment (Inc.4/5)
// invokes. It NEVER reimplements a tool: every entry names a real function/endpoint that lives elsewhere
// (telemetry / durable receipt store / secure fetcher / Technical Registry / runtime SSOT / doc + reason
// registries). Planned/deferred kinds (no implementation yet) are marked { executable:false } and carry no
// callable. There is NO tool business logic here — no SQL, no fetch, no aggregation, no hashing.
//
// The Rust ToolContract's `executable` flag is the single source of truth; this table mirrors it and the
// check-banzai-toolplanner guard cross-verifies the two agree for all 19 kinds.

import { createRequire } from "node:module";
import { createTelemetryTool } from "./telemetry.js";
import { createLiveArtifactTool } from "./liveArtifact.js";
import { createValidator } from "./validate.js";
import * as receipts from "./receipts/index.js";
import {
  retrieveDocChunks,
  resolveDocument,
  contextualFallback,
  reasonCodes,
  planTools,
  toolContracts,
} from "./knowledge.js";

// The BANZA Technical Registry — the SAME Rust WASM tool validate.js / liveArtifact.js already use.
const require = createRequire(import.meta.url);
const registry = require("./validatewasm/banza_target_registry/banza_target_registry.js");

// ToolKind (wire form) → the already-existing callable. Reuse only: `symbol` names the real export and
// `callable` is a REFERENCE to it (never a wrapper that re-does the work). `module`/`endpoint` document
// where the real implementation lives so the guard can prove reuse. Planned kinds have callable:null.
export const TOOL_ADAPTERS = Object.freeze({
  // ── documentary + governance lookups (canonical corpus + document registry) ──
  DOCUMENT_SEARCH: { module: "./knowledge.js", symbol: "retrieveDocChunks", callable: retrieveDocChunks, executable: true },
  CONTRACT_LOOKUP: { module: "./knowledge.js", symbol: "resolveDocument", callable: resolveDocument, executable: true },
  SPEC_LOOKUP: { module: "./knowledge.js", symbol: "resolveDocument", callable: resolveDocument, executable: true },
  ADR_LOOKUP: { module: "./knowledge.js", symbol: "resolveDocument", callable: resolveDocument, executable: true },
  RFC_LOOKUP: { module: "./knowledge.js", symbol: "resolveDocument", callable: resolveDocument, executable: true },
  // ── live / registry / runtime ──
  LIVE_ARTIFACT_FETCH: { module: "./liveArtifact.js", symbol: "createLiveArtifactTool", callable: createLiveArtifactTool, executable: true },
  REGISTRY_LOOKUP: { module: "./validatewasm/banza_target_registry", symbol: "registry_resolve_json", callable: registry.registry_resolve_json, executable: true },
  RUNTIME_LOOKUP: { module: "./server.js", symbol: "runtime", endpoint: "GET /banzai/runtime", callable: null, executable: true },
  // ── durable receipt store (ADR-036/078) ──
  EXECUTION_LOOKUP: { module: "./receipts/index.js", symbol: "readExecution", callable: receipts.readExecution, executable: true },
  RECEIPT_LOOKUP: { module: "./receipts/index.js", symbol: "readExecutions", callable: receipts.readExecutions, executable: true },
  EVIDENCE_LOOKUP: { module: "./receipts/index.js", symbol: "pinnedArtifacts", callable: receipts.pinnedArtifacts, executable: true },
  METRICS_QUERY: { module: "./telemetry.js", symbol: "createTelemetryTool", callable: createTelemetryTool, executable: true },
  COMPARE_EXECUTIONS: { module: "./receipts/index.js", symbol: "diffExecutions", callable: receipts.diffExecutions, executable: true },
  REPRODUCE_EXECUTION: { module: "./validate.js", symbol: "createValidator", callable: createValidator, executable: true },
  // ── reason-code registry (reason.rs) ──
  REASON_CODE_LOOKUP: { module: "./knowledge.js", symbol: "reasonCodes", callable: reasonCodes, executable: true },
  // ── planned / deferred — wired by a later increment (Inc.4/5); named so the plan is complete ──
  VERSION_DIFF: { module: null, symbol: null, callable: null, executable: false },
  DETERMINISTIC_CALCULATION: { module: null, symbol: null, callable: null, executable: false },
  // ── engine meta-tools (the taxonomy resolver authors the copy) ──
  CLARIFICATION: { module: "./knowledge.js", symbol: "contextualFallback", callable: contextualFallback, executable: true },
  HONEST_FALLBACK: { module: "./knowledge.js", symbol: "contextualFallback", callable: contextualFallback, executable: true },
});

// Resolve a ToolKind to its adapter descriptor. An unknown kind is treated as planned (never a silent
// fabricated callable). `planned` is the negation of `executable` for convenience at the call site.
export function resolveTool(kind) {
  const a = TOOL_ADAPTERS[String(kind || "")];
  if (!a) return { kind, module: null, symbol: null, callable: null, executable: false, planned: true };
  return { kind, ...a, planned: !a.executable };
}

// Plan a question (Rust decides the ordered kinds) and annotate each step with its resolved adapter — so a
// later increment can walk the plan and invoke the named callables in order. Adds no logic to the plan
// itself: the steps/order/executable flags are exactly what Rust produced.
export function planWithAdapters(question) {
  const plan = planTools(question);
  const steps = (Array.isArray(plan.steps) ? plan.steps : []).map((s) => {
    const t = resolveTool(s.kind);
    return {
      ...s,
      adapter: { module: t.module, symbol: t.symbol, endpoint: t.endpoint || null, executable: t.executable },
    };
  });
  return { ...plan, steps };
}

// Re-export the Rust-owned plan + contract transports so a caller has one import surface.
export { planTools, toolContracts };
