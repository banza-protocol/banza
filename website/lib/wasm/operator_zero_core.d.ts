/* tslint:disable */
/* eslint-disable */

/**
 * Check a set of artifacts against the demo boundary. `artifacts_json` is
 * `[{"name":"…","artifact":{…}}]`.
 */
export function operator_zero_boundary_json(artifacts_json: string): string;

/**
 * Run the end-to-end simulation. `happy = false` runs the negative scenario.
 */
export function operator_zero_e2e_json(happy: boolean): string;

/**
 * The simulator's public identity and boundary.
 */
export function operator_zero_identity_json(): string;

/**
 * The Portuguese label for a slug. Empty for an unknown slug — deliberately, so an unmapped
 * value is visible rather than dressed as a real one.
 */
export function operator_zero_label(slug: string): string;

/**
 * The opening fictional ledger.
 */
export function operator_zero_ledger_json(): string;

/**
 * The SAFE one-line summary for BanzAI.
 */
export function operator_zero_safe_summary(trace_json: string): string;

/**
 * The canonical slug vocabulary. Read by `make operator-zero-vocabulary-contract-check`, which
 * EXECUTES this rather than grepping the source.
 */
export function operator_zero_vocabulary_json(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly operator_zero_vocabulary_json: () => [number, number];
    readonly operator_zero_label: (a: number, b: number) => [number, number];
    readonly operator_zero_identity_json: () => [number, number];
    readonly operator_zero_e2e_json: (a: number) => [number, number];
    readonly operator_zero_ledger_json: () => [number, number];
    readonly operator_zero_boundary_json: (a: number, b: number) => [number, number];
    readonly operator_zero_safe_summary: (a: number, b: number) => [number, number];
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
