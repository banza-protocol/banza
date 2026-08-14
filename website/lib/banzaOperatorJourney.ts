// BanzAI operator-guidance adapter (ADR-036; reframed by ADR-036/02). RUST_WRAPPER_ONLY.
//
// REGRA (ADR-036): Modelo A orienta o percurso; Modelo B avalia — existe uma única
// autoridade de estado técnico. This adapter is the guidance layer (Model A). It marshals NAVIGATION
// state and TYPED Model B references across the WASM boundary — never a verdict, never a score.
//
// Thin I/O glue over the Rust guidance engine (engines/banzai-operator-journey), built to web WASM
// (`wasm-pack build --target web -- --features wasm`) and vendored at @/lib/wasm/
// banzai_operator_journey. ALL guidance logic — per-activity navigation status, transitions, navigation
// progress, the next orientation activity, and the SAFE session-context summary sent to /banzai/ask —
// is computed in Rust (rules 15/16). This file holds NO decision logic: it only shuttles JSON in/out.
// The session state itself lives in React memory (in the component), never in localStorage/
// sessionStorage/IndexedDB/cookies, and is cleared on reload.

/** Per-activity NAVIGATION status. `completed` is orientation only — never approval, a verdict or a
 *  score (ADR-036). There is no positive-technical status here by construction. */
export type JourneyStepStatus = "not_started" | "available" | "in_progress" | "completed";

/** The canonical six Model B per-step states this layer may REFERENCE (never recompute). */
export type ModelBState =
  | "NOT_EVALUATED"
  | "RUNNING"
  | "VERIFIED"
  | "PENDING"
  | "FAILED"
  | "BLOCKED";

/** A typed, opaque pointer to a Model B execution/step — the ONLY technical information Model A carries.
 *  `model_b_state` is echoed from Model B (authoritative there); it is never derived here. */
export interface ModelBReference {
  validation_execution_id: string | null;
  step_id: string | null;
  receipt_reference: string | null;
  evidence_reference: string | null;
  model_b_state: ModelBState | null;
  authority: "model-b";
}

export interface JourneyStepView {
  step: string;
  label: string;
  status: JourneyStepStatus;
  technical_reference: ModelBReference | null;
}

export interface NavigationProgress {
  activities_visited: number;
  activities_total: number;
  kind: "navigation_only";
  is_technical_score: false;
}

export interface JourneyEvaluation {
  current_step: string;
  steps: JourneyStepView[];
  visited_steps: string[];
  navigation_progress: NavigationProgress;
  next_recommended_action: string;
  warnings: string[];
  last_error: string;
}

/** One activity's navigation input: whether it was visited, and an optional typed Model B reference. */
export type SessionStepInput = {
  visited?: boolean;
  technical_reference?: Partial<Omit<ModelBReference, "authority">>;
};

/** The (untrusted) in-memory session snapshot the Rust engine reads. Navigation only — never a verdict,
 *  a draft, a key or a secret. */
export interface JourneySessionState {
  current_step?: string;
  steps?: Record<string, SessionStepInput>;
  last_error?: string | null;
}

type WasmModule = typeof import("@/lib/wasm/banzai_operator_journey");
let jPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!jPromise) {
    jPromise = (async () => {
      const mod = await import("@/lib/wasm/banzai_operator_journey");
      await mod.default();
      return mod;
    })();
  }
  return jPromise;
}

/** Evaluate the guidance path (navigation statuses, progress, next orientation activity) — in Rust. */
export async function evaluateJourney(state: JourneySessionState): Promise<JourneyEvaluation> {
  const mod = await engine();
  return JSON.parse(mod.journey_evaluate_json(JSON.stringify(state))) as JourneyEvaluation;
}

/** Whether a navigation transition is allowed + an optional warning slug — computed in Rust. */
export async function canAdvance(
  from: string,
  to: string,
  state: JourneySessionState,
): Promise<{ allowed: boolean; warning: string | null }> {
  const mod = await engine();
  return JSON.parse(mod.journey_can_advance_json(from, to, JSON.stringify(state)));
}

/** The SAFE, normalized session context for /banzai/ask (no raw state) — built in Rust. */
export async function safeJourneyContext(state: JourneySessionState): Promise<Record<string, unknown>> {
  const mod = await engine();
  return JSON.parse(mod.journey_safe_context_json(JSON.stringify(state)));
}

/** The ordered orientation activities + labels (from Rust). */
export async function journeySteps(): Promise<{ step: string; label: string }[]> {
  const mod = await engine();
  return JSON.parse(mod.journey_steps_json());
}

// The verdict for an uploaded JSON artifact (M2.9C) — computed entirely in Rust: JSON parse, size
// backstop and secret/credential detection. The UI only reads the file locally and acts on this verdict.
export interface UploadScan {
  ok: boolean;
  parsed_ok: boolean;
  has_secret: boolean;
  marker: string | null;
  error: string | null; // "empty" | "too_large" | "invalid_json" | "secret_detected" | null
}

/** Scan an uploaded JSON artifact in Rust (secret detection + JSON gate). Never echoes the content. */
export async function scanUpload(text: string): Promise<UploadScan> {
  const mod = await engine();
  return JSON.parse(mod.journey_scan_upload_json(text)) as UploadScan;
}

// Render-only tone for a navigation status. No decision logic — pure presentation mapping. There is no
// "valid"/"invalid" tone here: this layer paints navigation, not verdicts.
export function journeyStatusTone(
  status: JourneyStepStatus,
): "completed" | "in_progress" | "available" | "pending" {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "in_progress";
    case "available":
      return "available";
    default:
      return "pending";
  }
}

// Short pt label for a navigation status chip (presentation only). Matches the Rust `status_label`.
export function journeyStatusLabel(status: JourneyStepStatus): string {
  switch (status) {
    case "completed":
      return "concluído (orientação)";
    case "in_progress":
      return "em curso";
    case "available":
      return "disponível";
    default:
      return "não iniciado";
  }
}

// Map a next-action slug to a short pt call-to-action (presentation only). The guidance layer's action
// vocabulary is "open the next orientation activity".
export function nextActionLabel(action: string): string {
  const M: Record<string, string> = {
    abrir_guia: "Abrir o Guia",
    abrir_manifest: "Abrir o Manifest",
    abrir_conformidade: "Abrir a Conformidade",
    abrir_trust: "Abrir o Trust",
    abrir_federacao: "Abrir a Federação",
    abrir_evidence_bundle: "Abrir o Evidence Bundle",
    abrir_traces: "Abrir Traces / Relatório",
    percurso_concluido: "Percurso de orientação concluído",
  };
  return M[action] ?? "Continuar";
}

/** Every navigation action the engine can recommend. Exported so the test can prove none of them falls
 *  through to the generic label — a silent fallback is how a button loses its name. */
export const RECOMMENDED_ACTIONS = [
  "abrir_guia",
  "abrir_manifest",
  "abrir_conformidade",
  "abrir_trust",
  "abrir_federacao",
  "abrir_evidence_bundle",
  "abrir_traces",
  "percurso_concluido",
] as const;

/** The overall-state headline, in Portuguese (navigation only). */
export function overallStateLabel(s: string): string {
  const M: Record<string, string> = {
    percurso_por_iniciar: "percurso por iniciar",
    percurso_em_curso: "percurso em curso",
    percurso_concluido: "percurso concluído",
  };
  return M[s] ?? "percurso por iniciar";
}

// ── Navigation state builder ─────────────────────────────────────────────────
// RUST_WRAPPER_ONLY. The SINGLE builder used by both the guidance UI and the end-to-end test, so the
// test can never pass against a shape that has drifted from what the browser actually sends. The
// non-inflatable rule lives here: visiting an activity sets `visited` and NOTHING else; the only
// technical field is a typed reference to Model B.

/** What the UI knows about one activity: whether it was opened, and an optional typed Model B pointer. */
export type StepNavigation = {
  visited?: boolean;
  reference?: Partial<Omit<ModelBReference, "authority">>;
};

export type SessionState = {
  current_step?: string;
  steps?: Record<string, SessionStepInput>;
};

/** A session state whose per-activity inputs are always present — what the builder guarantees. */
export type BuiltNavigationState = SessionState & { steps: Record<string, SessionStepInput> };

export function buildNavigationState(
  currentStep: string,
  steps: Record<string, StepNavigation>,
): BuiltNavigationState {
  const one = (e: StepNavigation | undefined): SessionStepInput => {
    const ev = e ?? {};
    const out: SessionStepInput = { visited: Boolean(ev.visited) };
    // The ONLY technical channel: a typed reference to Model B (ids + echoed state), never a verdict.
    if (ev.reference) {
      const tr: Partial<Omit<ModelBReference, "authority">> = {};
      if (ev.reference.validation_execution_id) tr.validation_execution_id = ev.reference.validation_execution_id;
      if (ev.reference.step_id) tr.step_id = ev.reference.step_id;
      if (ev.reference.receipt_reference) tr.receipt_reference = ev.reference.receipt_reference;
      if (ev.reference.evidence_reference) tr.evidence_reference = ev.reference.evidence_reference;
      if (ev.reference.model_b_state) tr.model_b_state = ev.reference.model_b_state;
      if (Object.keys(tr).length) out.technical_reference = tr;
    }
    return out;
  };
  return {
    current_step: currentStep,
    steps: {
      guia: one(steps.guia),
      manifest: one(steps.manifest),
      conformidade: one(steps.conformidade),
      trust: one(steps.trust),
      federacao: one(steps.federacao),
      evidence_bundle: one(steps.evidence_bundle),
      traces: one(steps.traces),
    },
  };
}

export type SessionStepView = {
  step: string;
  label: string;
  status: JourneyStepStatus;
  status_label: string;
  technical_reference: ModelBReference | null;
};

export type SessionEvaluation = {
  model: "operator-guidance";
  authority: "model-b";
  authority_note: string;
  overall_state: string;
  navigation: { activities_visited: number; activities_total: number; current_step: string };
  navigation_progress: NavigationProgress;
  steps: SessionStepView[];
  next_recommended_action: string;
  /** The activity that action points at — Rust names it so the UI never re-parses the action slug. */
  next_action_step: string;
  /** The ENGINE decides completion (all activities visited). A boolean has no spelling to get wrong. */
  journey_complete: boolean;
  can_continue: boolean;
  session_scope: string;
};

export async function evaluateSession(state: SessionState): Promise<SessionEvaluation> {
  const mod = await engine();
  return JSON.parse(mod.journey_session_json(JSON.stringify(state))) as SessionEvaluation;
}

/** Whether a REFERENCED Model B state is the authority's positive outcome. Reads Model B's own state;
 *  never lets this layer recompute one. A FAILED/BLOCKED reference is never positive. */
export function modelBReferenceIsPositive(state: ModelBState | null | undefined): boolean {
  return state === "VERIFIED";
}
