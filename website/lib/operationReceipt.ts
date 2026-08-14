// OperationReceipt — the machine-readable, exportable record every BanzAI validation-mode step produces
// (M2.19EF2). It is UI provenance, not a protocol artifact: the Rust engines decide the
// verdict; this record only binds the engine output to an id, a timestamp and content hashes so a human
// can export and re-check it. There is no network, no model call and no mutation — `qwen_calls` and
// `external_calls` are always 0 by construction.
//
// Timestamps and ids are generated in the browser (this is a UI component, not a workflow script).
// Hashes are SHA-256 over the canonical JSON via SubtleCrypto, with a deterministic non-crypto fallback
// (labelled `fnv1a32:`) for environments without `crypto.subtle` so the type stays usable everywhere.

/** Per-step verdict vocabulary. The Rust engine decides which one; TypeScript only maps and renders.
 *  `NOT_APPLICABLE` is a DISPLAY status derived from a step's `applicability` (ADR-039) — a step out of
 *  scope for the declared profile is sealed on the wire as `result.status = "NOT_EVALUATED"` with
 *  `applicability = "NOT_APPLICABLE"`; the UI renders it as NOT_APPLICABLE, never as a failure. */
export type StepStatus = "NOT_EVALUATED" | "PENDING" | "VERIFIED" | "FAILED" | "BLOCKED" | "NOT_APPLICABLE";

/** ADR-039 profile applicability of a step, orthogonal to its result.status. */
export type Applicability = "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE";

// ─────────────────────────────────────────────────────────────────────────────
// M2.19G.1 (ADR-038) — server-issued receipts. The endpoint-originated official journey no longer
// builds receipts in the browser: the Rust backend fetches each artifact from the implementation's
// public endpoints, runs the decision engine and RETURNS the receipt. These interfaces mirror the
// §30 OperationReceipt / §31 JourneyReceipt contract emitted by services/banzai-api/src/validate.js.
// The browser only renders them; it never authors a verdict. `qwen_calls`/`external_model_calls` are 0
// by construction and protocol fetches are counted as `protocol_fetch_count` (ADR-038 §4.8).
// ─────────────────────────────────────────────────────────────────────────────

/** A single endpoint-originated step receipt (ADR-038 §30) — verdict bound to its exact public origin. */
export interface ServerOperationReceipt {
  receipt_version: string;
  operation_id: string;
  request_id: string;
  workflow: string;
  step: string;
  /** ADR-039: whether this step is in scope for the declared profile. NOT_APPLICABLE steps are sealed
   *  out-of-scope (never fetched/evaluated) and must never render as a failure. */
  applicability?: Applicability;
  operator_id: string;
  implementation_id: string;
  environment: string;
  profile: string;
  protocol_version: string;
  canonical_origin: string;
  endpoint: string | null;
  resolved_host: string | null;
  fetched_at: string | null;
  http_status: number | null;
  content_type: string | null;
  content_length: number | null;
  etag: string | null;
  last_modified: string | null;
  input_hash: string;
  signature_status: string;
  engine: string;
  engine_version: string;
  result: { status: StepStatus; [k: string]: unknown };
  reason_codes: string[];
  evidence_refs: string[];
  output_hash: string;
  duration_ms: number;
  qwen_calls: number;
  external_model_calls: number;
  protocol_fetch_count: number;
  audit_ref: string;
}

/** The aggregate endpoint-originated journey receipt (ADR-038 §31). Certification Readiness (READY |
 *  BLOCKED) is distinct from Certification Status (always NOT_CERTIFIED) — it never issues a record. */
export interface ServerJourneyReceipt {
  receipt_version: string;
  journey_id: string;
  request_id: string;
  workflow: string;
  operator_id: string;
  implementation_id: string;
  environment: string;
  profile: string;
  protocol_version: string;
  canonical_origin: string;
  resolved_host: string | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  step_count: number;
  steps: ServerOperationReceipt[];
  overall_status: StepStatus;
  certification_readiness: "READY" | "BLOCKED";
  certification_status: "NOT_CERTIFIED";
  certified: false;
  /** ADR-039: Rust-decided step→applicability map + which steps are out of scope for this profile. */
  applicability?: Record<string, Applicability>;
  not_applicable_steps?: string[];
  required_steps_evaluated?: number | null;
  reason_codes: string[];
  qwen_calls: number;
  external_model_calls: number;
  protocol_fetch_count: number;
  audit_ref: string;
  disclaimer: string;
}

/** A single validation step's receipt. Fields are stable and machine-readable. */
export interface OperationReceipt {
  operation_id: string;
  request_id: string;
  workflow: string;
  step: string;
  actor: "banzai-web";
  target: "operator-zero";
  timestamp: string;
  engine: string;
  engine_version: string;
  duration_ms: number;
  inputs: Record<string, unknown>;
  input_hashes: Record<string, string>;
  result: unknown;
  status: StepStatus;
  reason_codes: string[];
  outputs: Record<string, unknown>;
  output_hashes: Record<string, string>;
  evidence_references: string[];
  qwen_calls: 0;
  external_calls: 0;
}

/** The aggregate receipt binding all step receipts of a single journey run. */
export interface JourneyReceipt {
  journey_id: string;
  request_id: string;
  workflow: string;
  actor: "banzai-web";
  target: "operator-zero";
  started_at: string;
  completed_at: string;
  overall_status: StepStatus;
  certification_status: "NOT_CERTIFIED";
  certification_readiness: "PRE_PRODUCTION";
  demo_only: true;
  step_count: number;
  steps: OperationReceipt[];
  qwen_calls: 0;
  external_calls: 0;
}

/** A prefixed id. Uses `crypto.randomUUID` when available; otherwise a time+random fallback. */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** SHA-256 of the canonical JSON (read-only, no network). Labelled by algorithm. */
export async function contentHash(value: unknown): Promise<string> {
  const json = typeof value === "string" ? value : JSON.stringify(value ?? null);
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `sha256:${hex}`;
    }
  } catch {
    // fall through to the deterministic non-crypto fallback
  }
  return `fnv1a32:${fnv1a32(json)}`;
}

/** Hash each value of a record. Keys are preserved; values become `sha256:`/`fnv1a32:` strings. */
export async function hashMap(rec: Record<string, unknown>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) out[k] = await contentHash(v);
  return out;
}

/** The verdict + evidence a step runner produces, before it is wrapped into a receipt. */
export interface StepOutcome {
  status: StepStatus;
  reason_codes: string[];
  evidence_references: string[];
  engine: string;
  engine_version: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  result: unknown;
  duration_ms: number;
}

/** Build a fully-hashed OperationReceipt from a step outcome. */
export async function buildReceipt(args: {
  workflow: string;
  step: string;
  request_id: string;
  outcome: StepOutcome;
}): Promise<OperationReceipt> {
  const { outcome } = args;
  return {
    operation_id: newId("op"),
    request_id: args.request_id,
    workflow: args.workflow,
    step: args.step,
    actor: "banzai-web",
    target: "operator-zero",
    timestamp: new Date().toISOString(),
    engine: outcome.engine,
    engine_version: outcome.engine_version,
    duration_ms: outcome.duration_ms,
    inputs: outcome.inputs,
    input_hashes: await hashMap(outcome.inputs),
    result: outcome.result,
    status: outcome.status,
    reason_codes: outcome.reason_codes,
    outputs: outcome.outputs,
    output_hashes: await hashMap(outcome.outputs),
    evidence_references: outcome.evidence_references,
    qwen_calls: 0,
    external_calls: 0,
  };
}

/** Aggregate step statuses into one journey verdict (worst-first: FAILED > BLOCKED > PENDING > …).
 *  ADR-039: NOT_APPLICABLE steps are out of scope and excluded — they never contribute a verdict and
 *  never block "all VERIFIED". */
export function aggregateStatus(statuses: StepStatus[]): StepStatus {
  const inScope = statuses.filter((s) => s !== "NOT_APPLICABLE");
  if (inScope.some((s) => s === "FAILED")) return "FAILED";
  if (inScope.some((s) => s === "BLOCKED")) return "BLOCKED";
  if (inScope.some((s) => s === "PENDING")) return "PENDING";
  if (inScope.length > 0 && inScope.every((s) => s === "VERIFIED")) return "VERIFIED";
  return "NOT_EVALUATED";
}

/** Trigger a browser download of a receipt as pretty JSON. Read-only; no network. Accepts any receipt
 *  shape (browser-built or server-issued) — it only serialises the object. */
export function downloadReceipt(
  receipt: OperationReceipt | JourneyReceipt | ServerOperationReceipt | ServerJourneyReceipt,
  filename: string,
): void {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
