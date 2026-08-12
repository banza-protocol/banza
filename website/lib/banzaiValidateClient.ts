// M2.19G.1 (ADR-068) — same-origin client for the endpoint-originated official validation journey.
//
// The browser NEVER fetches an operator origin and NEVER accepts a URL. It POSTs only a CLOSED
// operator_id + implementation_id (+ step) to the Rust backend, which resolves the target from the
// CLOSED Technical Registry, fetches every artifact from the implementation's public endpoints via the
// secure Rust fetcher, runs the decision engines and RETURNS the receipt bound to its exact origin.
// This module is I/O glue, not an engine: it validates the ids against the closed registry (defence in
// depth — the backend re-resolves in Rust), sends the request same-origin (like /banzai/ask), and maps
// the JSON response. Rust decides every verdict; TypeScript never decides.

import { isClosedId, mapCatalogueToOperators, type ValidationOperator } from "@/lib/banzaiValidation";
import type { ServerOperationReceipt, ServerJourneyReceipt, StepStatus } from "@/lib/operationReceipt";

const STEP_URL = "/banzai/validate/step";
const JOURNEY_URL = "/banzai/validate/journey";
const REGISTRY_URL = "/banzai/validate/registry";
const OPTIONS_URL = "/banzai/validate/options";
const TIMEOUT_MS = 90_000;
const GET_TIMEOUT_MS = 15_000;

/** The canonical protocol option sets an implementation may declare (from the Rust registry). */
export interface ValidationOptions {
  supported_protocol_versions: string[];
  supported_environments: string[];
  supported_profiles: string[];
}

async function getJson(url: string, signal?: AbortSignal): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/** Fetch the closed Technical Registry (operators + implementations) from the Rust-sourced endpoint.
 *  Returns a display list mapped by the single pure mapper; [] on any failure (the shell shows an
 *  honest empty state, never a fabricated operator). */
export async function fetchRegistry(signal?: AbortSignal): Promise<ValidationOperator[]> {
  const { status, data } = await getJson(REGISTRY_URL, signal);
  if (status !== 200) return [];
  return mapCatalogueToOperators(data);
}

/** Fetch the canonical protocol option sets (supported version/environment/profile) from the Rust
 *  registry. Returns null on failure (callers fall back to read-only display of the resolved values). */
export async function fetchOptions(signal?: AbortSignal): Promise<ValidationOptions | null> {
  const { status, data } = await getJson(OPTIONS_URL, signal);
  if (status !== 200 || !data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : []);
  return {
    supported_protocol_versions: arr(d.supported_protocol_versions),
    supported_environments: arr(d.supported_environments),
    supported_profiles: arr(d.supported_profiles),
  };
}

export type StepResponse =
  | { ok: true; receipt: ServerOperationReceipt }
  | { ok: false; error: string; reason?: string };

/** ADR-076 correction 1 — the HONEST durable-persistence verdict the journey run reports. The engine
 *  result is independent of storage: a run is only "durably concluded" when every write PERSISTED. When
 *  it is not, the client must show `RESULT_AVAILABLE_NOT_PERSISTED` and NEVER present a receipt_reference
 *  as if the receipt were archived. `status` is the aggregate; `detail` (PENDING | FAILED) explains a
 *  non-persisted run; `retryable` marks a run whose persistence can still be re-checked. */
export interface PersistenceInfo {
  status: "PERSISTED" | "RESULT_AVAILABLE_NOT_PERSISTED" | "DISABLED" | string;
  execution_id: string | null;
  durable: boolean;
  consultable: boolean;
  comparable: boolean;
  reproducible: boolean;
  detail?: "PENDING" | "FAILED" | string;
  retryable?: boolean;
}

export type JourneyResponse =
  | { ok: true; journey_receipt: ServerJourneyReceipt; persistence: PersistenceInfo | null }
  | { ok: false; error: string; reason?: string };

async function postJson(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ status: number; data: unknown } | { status: 0; data: null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/** Run ONE endpoint-originated step. `step` must be a canonical step id; ids are re-checked here. */
export async function validateStepRequest(
  operatorId: string,
  implementationId: string,
  step: string,
  signal?: AbortSignal,
): Promise<StepResponse> {
  if (!isClosedId(operatorId) || !isClosedId(implementationId)) {
    return { ok: false, error: "invalid_target" };
  }
  const { status, data } = await postJson(
    STEP_URL,
    { operator_id: operatorId, implementation_id: implementationId, step },
    signal,
  );
  const d = data as { ok?: boolean; receipt?: ServerOperationReceipt; error?: string; reason?: string } | null;
  if (status === 0) return { ok: false, error: "unavailable" };
  if (d && d.ok && d.receipt) return { ok: true, receipt: d.receipt };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

/** Run the WHOLE journey in one backend call. Returns a §31 JourneyReceipt (steps[] + readiness). */
export async function validateJourneyRequest(
  operatorId: string,
  implementationId: string,
  signal?: AbortSignal,
): Promise<JourneyResponse> {
  if (!isClosedId(operatorId) || !isClosedId(implementationId)) {
    return { ok: false, error: "invalid_target" };
  }
  const { status, data } = await postJson(
    JOURNEY_URL,
    { operator_id: operatorId, implementation_id: implementationId },
    signal,
  );
  const d = data as {
    ok?: boolean;
    journey_receipt?: ServerJourneyReceipt;
    persistence?: PersistenceInfo | null;
    error?: string;
    reason?: string;
  } | null;
  if (status === 0) return { ok: false, error: "unavailable" };
  if (d && d.ok && d.journey_receipt) return { ok: true, journey_receipt: d.journey_receipt, persistence: d.persistence ?? null };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADR-076 D-076-08 / D-076-09 — durable-store client (query · compare · reproduce · cancel).
//
// These call the SAME-ORIGIN durable-store routes (nginx maps /banzai/validate/* → banzai-api), which
// read/append the append-only, immutable, verifiable receipt archive in PostgreSQL (within the ADR-042
// boundary). Like the rest of this module they are I/O glue only: each sends exactly a server-issued,
// shape-checked id — NEVER a URL or path, so SSRF / path-traversal / injection are impossible by
// construction — and maps the JSON. The database preserves; it never recomputes, edits or replaces a
// verdict. Rust decides; PostgreSQL preserves; TypeScript decides nothing and mutates no receipt.
//
// No UI is wired to these yet (a later slice builds the Resultados results view); this is the typed
// client surface it will consume.
// ─────────────────────────────────────────────────────────────────────────────

const EXECUTIONS_URL = "/banzai/validate/executions";
const EXECUTION_URL = "/banzai/validate/execution";
const COMPARE_URL = "/banzai/validate/compare";
const REPRODUCE_URL = "/banzai/validate/reproduce";
const CANCEL_URL = "/banzai/validate/cancel";

// A server-issued OPAQUE id (execution/journey/receipt) — distinct from the closed registry slug
// (isClosedId, operator/implementation). Bounded safe-char shape only: a leading alphanumeric then
// [A-Za-z0-9_-] (the `prefix_uuid` form of operationReceipt.newId), max 128 chars. It can carry no
// scheme, dot, slash, colon or space, so it cannot express a URL or traversal; the backend re-validates.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
function isSafeId(v: string | null | undefined): boolean {
  return typeof v === "string" && SAFE_ID.test(v);
}

/** A durable execution summary (one row of an implementation's append-only archive, ADR-076 §4). */
export interface ExecutionSummary {
  execution_id: string;
  operator_id: string;
  implementation_id: string;
  workflow: string;
  profile: string;
  version: string;
  environment: string;
  overall_status: StepStatus;
  certification_readiness: "READY" | "BLOCKED" | null;
  certification_status: "NOT_CERTIFIED";
  step_count: number;
  started_at: string | null;
  completed_at: string | null;
  receipt_sha256: string | null;
}

/** A single durable execution opened in full: its journey receipt + step receipts + evidence-bundle ref. */
export interface ExecutionDetail {
  execution: ExecutionSummary;
  journey_receipt: ServerJourneyReceipt | null;
  step_receipts: ServerOperationReceipt[];
  evidence_bundle_reference: string | null;
}

/** The delta between two executions for one step (inputs/engine-version/state/reason-codes; D-076-08). */
export interface ExecutionStepDelta {
  step: string;
  status_a: StepStatus | null;
  status_b: StepStatus | null;
  engine_version_a: string | null;
  engine_version_b: string | null;
  input_hash_a: string | null;
  input_hash_b: string | null;
  reason_codes_a: string[];
  reason_codes_b: string[];
  changed: boolean;
}

/** The comparison of two durable executions (read-only; the store never mutates a receipt). */
export interface ExecutionComparison {
  a: string;
  b: string;
  equivalent: boolean;
  step_deltas: ExecutionStepDelta[];
}

/** The outcome of a reproduction run (ADR-076 D-076-08). A reproduction creates a NEW execution from the
 *  original references + hashes and never overwrites the original. */
export type ReproductionOutcome =
  | "SEMANTICALLY_EQUIVALENT"
  | "NOT_EQUIVALENT"
  | "INPUTS_UNAVAILABLE"
  | "ENGINE_VERSION_UNAVAILABLE"
  | "BLOCKED";

export interface ReproductionResult {
  outcome: ReproductionOutcome;
  new_execution_id: string;
  original_execution_id: string;
}

export type ExecutionsResponse =
  | { ok: true; executions: ExecutionSummary[] }
  | { ok: false; error: string; reason?: string };

export type ExecutionResponse =
  | { ok: true; execution: ExecutionDetail }
  | { ok: false; error: string; reason?: string };

export type CompareResponse =
  | { ok: true; comparison: ExecutionComparison }
  | { ok: false; error: string; reason?: string };

export type ReproduceResponse =
  | { ok: true; reproduction: ReproductionResult }
  | { ok: false; error: string; reason?: string };

export type CancelResponse =
  | { ok: true; execution_id: string; status: string }
  | { ok: false; error: string; reason?: string };

/** List an implementation's durable executions (newest first) from the append-only archive.
 *  GET /banzai/validate/executions?implementation_id=… */
export async function listExecutions(
  implementationId: string,
  signal?: AbortSignal,
): Promise<ExecutionsResponse> {
  if (!isClosedId(implementationId)) return { ok: false, error: "invalid_target" };
  const qs = new URLSearchParams({ implementation_id: implementationId }).toString();
  const { status, data } = await getJson(`${EXECUTIONS_URL}?${qs}`, signal);
  if (status === 0) return { ok: false, error: "unavailable" };
  const d = data as { ok?: boolean; executions?: ExecutionSummary[]; error?: string; reason?: string } | null;
  if (status === 200 && d && Array.isArray(d.executions)) return { ok: true, executions: d.executions };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

/** Open one durable execution in full (journey receipt + step receipts + evidence-bundle reference).
 *  GET /banzai/validate/execution?execution_id=… */
export async function getExecution(
  executionId: string,
  signal?: AbortSignal,
): Promise<ExecutionResponse> {
  if (!isSafeId(executionId)) return { ok: false, error: "invalid_execution" };
  const qs = new URLSearchParams({ execution_id: executionId }).toString();
  const { status, data } = await getJson(`${EXECUTION_URL}?${qs}`, signal);
  if (status === 0) return { ok: false, error: "unavailable" };
  const d = data as { ok?: boolean; execution?: ExecutionDetail; error?: string; reason?: string } | null;
  if (status === 200 && d && d.ok && d.execution) return { ok: true, execution: d.execution };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

/** Compare two durable executions (inputs/engines/states/reason-codes delta). Read-only.
 *  GET /banzai/validate/compare?a=&b= */
export async function compareExecutions(
  a: string,
  b: string,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  if (!isSafeId(a) || !isSafeId(b)) return { ok: false, error: "invalid_execution" };
  const qs = new URLSearchParams({ a, b }).toString();
  const { status, data } = await getJson(`${COMPARE_URL}?${qs}`, signal);
  if (status === 0) return { ok: false, error: "unavailable" };
  const d = data as { ok?: boolean; comparison?: ExecutionComparison; error?: string; reason?: string } | null;
  if (status === 200 && d && d.comparison) return { ok: true, comparison: d.comparison };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

/** Start a reproduction of a prior execution from its pinned artifact references + hashes. Creates a NEW
 *  execution (never overwrites the original) and returns the equivalence outcome.
 *  POST /banzai/validate/reproduce */
export async function reproduce(
  operatorId: string,
  implementationId: string,
  originalExecutionId: string,
  signal?: AbortSignal,
): Promise<ReproduceResponse> {
  if (!isClosedId(operatorId) || !isClosedId(implementationId)) return { ok: false, error: "invalid_target" };
  if (!isSafeId(originalExecutionId)) return { ok: false, error: "invalid_execution" };
  const { status, data } = await postJson(
    REPRODUCE_URL,
    { operator_id: operatorId, implementation_id: implementationId, original_execution_id: originalExecutionId },
    signal,
  );
  if (status === 0) return { ok: false, error: "unavailable" };
  const d = data as { ok?: boolean; reproduction?: ReproductionResult; error?: string; reason?: string } | null;
  if (d && d.ok && d.reproduction) return { ok: true, reproduction: d.reproduction };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}

/** Cancel a running execution (safe cancel — a partially-completed execution is never presented as final).
 *  POST /banzai/validate/cancel */
export async function cancelExecution(
  executionId: string,
  signal?: AbortSignal,
): Promise<CancelResponse> {
  if (!isSafeId(executionId)) return { ok: false, error: "invalid_execution" };
  const { status, data } = await postJson(CANCEL_URL, { execution_id: executionId }, signal);
  if (status === 0) return { ok: false, error: "unavailable" };
  const d = data as { ok?: boolean; execution_id?: string; status?: string; error?: string; reason?: string } | null;
  if (d && d.ok) return { ok: true, execution_id: d.execution_id ?? executionId, status: d.status ?? "PENDING" };
  return { ok: false, error: (d && d.error) || `http_${status}`, reason: d?.reason };
}
