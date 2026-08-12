/* tslint:disable */
/* eslint-disable */

export function simb_demo_scenarios_json(): string;

export function simb_federation_demo_json(_input: string): string;

/**
 * input = `{ "operator_id": "<id>" }`
 */
export function simb_operator_manifest_json(input: string): string;

/**
 * input = `{ "scenario": "<key>" }`
 */
export function simb_run_scenario_json(input: string): string;

export function simb_tool_version_json(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly simb_demo_scenarios_json: () => [number, number];
    readonly simb_run_scenario_json: (a: number, b: number) => [number, number];
    readonly simb_operator_manifest_json: (a: number, b: number) => [number, number];
    readonly simb_federation_demo_json: (a: number, b: number) => [number, number];
    readonly simb_tool_version_json: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
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
