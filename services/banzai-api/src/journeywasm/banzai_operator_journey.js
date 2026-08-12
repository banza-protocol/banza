/* @ts-self-types="./banzai_operator_journey.d.ts" */

/**
 * `{allowed, warning}` for a forward/backward transition given the session state.
 * @param {string} from
 * @param {string} to
 * @param {string} state
 * @returns {string}
 */
function journey_can_advance_json(from, to, state) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.journey_can_advance_json(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.journey_can_advance_json = journey_can_advance_json;

/**
 * Evaluate the guidance path from the session state (NAVIGATION vocabulary only):
 * `{current_step, steps:[{step,label,status,technical_reference}], visited_steps, navigation_progress,
 * next_recommended_action, warnings, last_error}` (ADR-076 §D-076-02). No verdict, no score.
 * @param {string} state
 * @returns {string}
 */
function journey_evaluate_json(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_evaluate_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_evaluate_json = journey_evaluate_json;

/**
 * ADR-076 — the one-sentence answer to "o que faço agora?", from the same next orientation activity
 * the guidance panel renders. Non-technical: it defers every technical claim to Model B.
 * @param {string} state
 * @returns {string}
 */
function journey_next_action_sentence(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_next_action_sentence(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_next_action_sentence = journey_next_action_sentence;

/**
 * The next / previous step (clamped).
 * @param {string} current
 * @returns {string}
 */
function journey_next_step(current) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(current, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_next_step(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_next_step = journey_next_step;

/**
 * @param {string} current
 * @returns {string}
 */
function journey_prev_step(current) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(current, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_prev_step(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_prev_step = journey_prev_step;

/**
 * The SAFE, normalized session context (object) for the local Qwen — no raw browser state.
 * @param {string} state
 * @returns {string}
 */
function journey_safe_context_json(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_safe_context_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_safe_context_json = journey_safe_context_json;

/**
 * The SAFE session context as a single slug-only line (for the prompt / telemetry).
 * @param {string} state
 * @returns {string}
 */
function journey_safe_context_line(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_safe_context_line(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_safe_context_line = journey_safe_context_line;

/**
 * Scan an uploaded JSON artifact (M2.9C): `{ok, parsed_ok, has_secret, marker, error}`. Rejects empty,
 * oversized, malformed, or secret/credential-bearing uploads — never echoes the file content.
 * @param {string} text
 * @returns {string}
 */
function journey_scan_upload_json(text) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_scan_upload_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_scan_upload_json = journey_scan_upload_json;

/**
 * ADR-076 §D-076-02 — evaluate the guidance NAVIGATION model from the browser's in-memory state.
 *
 * Returns `{model:"operator-guidance", authority:"model-b", overall_state,
 * navigation:{activities_visited,activities_total,current_step},
 * navigation_progress:{activities_visited,activities_total,kind,is_technical_score},
 * steps:[{step,label,status,status_label,technical_reference}], next_recommended_action,
 * next_action_step, journey_complete}`. No verdict, no score; technical state is referenced (typed
 * pointer to Model B), never recomputed.
 * @param {string} state
 * @returns {string}
 */
function journey_session_json(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_session_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_session_json = journey_session_json;

/**
 * ADR-076 — the SAFE one-line session summary for the local model: navigation slugs and counts only,
 * never a file body, a path, a key, free browser text or a score.
 * @param {string} state
 * @returns {string}
 */
function journey_session_summary(state) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.journey_session_summary(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.journey_session_summary = journey_session_summary;

/**
 * Ordered journey steps + labels: `[{step,label},…]`.
 * @returns {string}
 */
function journey_steps_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.journey_steps_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.journey_steps_json = journey_steps_json;

/**
 * ADR-076 — the canonical slug vocabulary this guidance engine can emit: steps, navigation statuses,
 * actions, overall states, the referenced Model B states, and the typed reference fields. Published so
 * the UI's label maps can be PROVEN complete against it instead of kept in sync by hand.
 * @returns {string}
 */
function journey_vocabulary_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.journey_vocabulary_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.journey_vocabulary_json = journey_vocabulary_json;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./banzai_operator_journey_bg.js": import0,
    };
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

const wasmPath = `${__dirname}/banzai_operator_journey_bg.wasm`;
const wasmBytes = require('fs').readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
wasm.__wbindgen_start();
