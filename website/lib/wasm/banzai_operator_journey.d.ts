/* tslint:disable */
/* eslint-disable */

/**
 * `{allowed, warning}` for a forward/backward transition given the session state.
 */
export function journey_can_advance_json(from: string, to: string, state: string): string;

/**
 * Evaluate the guidance path from the session state (NAVIGATION vocabulary only):
 * `{current_step, steps:[{step,label,status,technical_reference}], visited_steps, navigation_progress,
 * next_recommended_action, warnings, last_error}` (ADR-036). No verdict, no score.
 */
export function journey_evaluate_json(state: string): string;

/**
 * ADR-036 — the one-sentence answer to "o que faço agora?", from the same next orientation activity
 * the guidance panel renders. Non-technical: it defers every technical claim to Model B.
 */
export function journey_next_action_sentence(state: string): string;

/**
 * The next / previous step (clamped).
 */
export function journey_next_step(current: string): string;

export function journey_prev_step(current: string): string;

/**
 * The SAFE, normalized session context (object) for the local Qwen — no raw browser state.
 */
export function journey_safe_context_json(state: string): string;

/**
 * The SAFE session context as a single slug-only line (for the prompt / telemetry).
 */
export function journey_safe_context_line(state: string): string;

/**
 * Scan an uploaded JSON artifact (M2.9C): `{ok, parsed_ok, has_secret, marker, error}`. Rejects empty,
 * oversized, malformed, or secret/credential-bearing uploads — never echoes the file content.
 */
export function journey_scan_upload_json(text: string): string;

/**
 * ADR-036 — evaluate the guidance NAVIGATION model from the browser's in-memory state.
 *
 * Returns `{model:"operator-guidance", authority:"model-b", overall_state,
 * navigation:{activities_visited,activities_total,current_step},
 * navigation_progress:{activities_visited,activities_total,kind,is_technical_score},
 * steps:[{step,label,status,status_label,technical_reference}], next_recommended_action,
 * next_action_step, journey_complete}`. No verdict, no score; technical state is referenced (typed
 * pointer to Model B), never recomputed.
 */
export function journey_session_json(state: string): string;

/**
 * ADR-036 — the SAFE one-line session summary for the local model: navigation slugs and counts only,
 * never a file body, a path, a key, free browser text or a score.
 */
export function journey_session_summary(state: string): string;

/**
 * Ordered journey steps + labels: `[{step,label},…]`.
 */
export function journey_steps_json(): string;

/**
 * ADR-036 — the canonical slug vocabulary this guidance engine can emit: steps, navigation statuses,
 * actions, overall states, the referenced Model B states, and the typed reference fields. Published so
 * the UI's label maps can be PROVEN complete against it instead of kept in sync by hand.
 */
export function journey_vocabulary_json(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly journey_steps_json: () => [number, number];
    readonly journey_evaluate_json: (a: number, b: number) => [number, number];
    readonly journey_can_advance_json: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly journey_next_step: (a: number, b: number) => [number, number];
    readonly journey_prev_step: (a: number, b: number) => [number, number];
    readonly journey_safe_context_json: (a: number, b: number) => [number, number];
    readonly journey_safe_context_line: (a: number, b: number) => [number, number];
    readonly journey_scan_upload_json: (a: number, b: number) => [number, number];
    readonly journey_session_json: (a: number, b: number) => [number, number];
    readonly journey_session_summary: (a: number, b: number) => [number, number];
    readonly journey_next_action_sentence: (a: number, b: number) => [number, number];
    readonly journey_vocabulary_json: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
