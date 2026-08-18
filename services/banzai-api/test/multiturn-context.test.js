// Increment 6 (§16–§17) — multi-turn conversational CONTEXT, resolved DETERMINISTICALLY in Rust.
//
// A follow-up turn ("essa execução", "a anterior", "esse Manifesto", "e as chaves?", "porquê?", "compare com
// a última", "agora reproduza", "mostre o recibo") is only meaningful in the context of the prior turn. This
// suite proves, over the REAL committed Rust/WASM engine (no model, no network, no pg):
//   • a machine-checked dataset of ≥100 verifiable multi-turn conversations — each turn's expected RESOLVED
//     referent (execution / artifact / intent) is asserted against `resolve_references`;
//   • negatives — an anaphor with NO prior context asks to clarify, NEVER a guessed referent;
//   • safety — a boundary follow-up ("agora transfere 100 kz para essa execução") is REFUSED regardless of
//     context; naming a referent never unlocks a prohibited action;
//   • the /ask pipeline threads the SAFE technical context through and returns the new conversation_context;
//   • "porquê?" after a VERIFIED execution says nothing-to-diagnose (grounded); after a FAILED one diagnoses;
//   • the forward conversation_context carries ONLY safe technical fields (ids/enums) — no prose/PII/secrets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";
import { buildForwardContext } from "../src/pipeline.js";

const require = createRequire(import.meta.url);
const kb = require("../src/rustkb/banzai_api_kb.js");

const resolveRefs = (q, prior) => JSON.parse(kb.resolve_references_json(String(q), JSON.stringify(prior || {})));

// ── the ≥100-conversation dataset (deterministic generator) ─────────────────────────────────────────────
// Phrasing variants per anaphor class (PT + EN, accent/casing variants). Every variant is a real conversational
// reference; the generator combines them with distinct execution/operator pairs to build verifiable journeys.
const V = {
  execution: ["mostra essa execução", "mostra esta execução", "vê essa execução", "detalhes dessa execução", "show that execution", "show this run"],
  diagnose: ["porquê?", "porque?", "e porquê?", "por que?", "why?", "how come?"],
  keys: ["e as chaves?", "e as chaves dele?", "mostra as chaves", "as suas chaves?", "and the keys?", "the keys?"],
  manifest: ["esse manifesto", "mostra esse manifesto", "este manifesto", "o manifesto dele", "that manifest", "this manifest"],
  comparison: ["compare com a anterior", "compara com a anterior", "compare com a última", "com a anterior", "versus a anterior", "with the previous"],
  duration: ["e quanto demorou?", "quanto demorou?", "quanto tempo demorou?", "quanto durou?", "quanto levou?", "how long did it take?"],
  reproduce: ["agora reproduza", "reproduz", "reproduza de novo", "reexecuta", "run again", "rerun"],
  receipt: ["mostre o recibo", "mostra o recibo", "o recibo dessa", "ver o recibo", "the receipt", "recibo de operação"],
};

// The canonical journey (§17): show last execution → explain failure → open artifact (keys) → compare with
// previous → show duration → reproduce → consult receipt (+ the manifest artifact), each a follow-up turn.
const JOURNEY_STEPS = ["execution", "diagnose", "keys", "manifest", "comparison", "duration", "reproduce", "receipt"];

const EXPECT = {
  execution: (seed) => ({ referent_kind: "execution", resolved_intent: "get_execution", execution_id: seed.execution_id }),
  diagnose: (seed) => ({ referent_kind: "diagnose", resolved_intent: "diagnose_failure", execution_id: seed.execution_id }),
  keys: () => ({ referent_kind: "keys", resolved_intent: "get_artifact", artifact: "key_manifest" }),
  manifest: () => ({ referent_kind: "manifest", resolved_intent: "get_artifact", artifact: "implementation_manifest" }),
  comparison: (seed) => ({ referent_kind: "comparison", resolved_intent: "compare_executions", comparison_targets: [seed.execution_id, seed.previous_execution_id] }),
  duration: (seed) => ({ referent_kind: "duration", resolved_intent: "get_duration", execution_id: seed.execution_id }),
  reproduce: (seed) => ({ referent_kind: "reproduce", resolved_intent: "reproduce_execution", execution_id: seed.execution_id }),
  receipt: (seed) => ({ referent_kind: "receipt", resolved_intent: "get_artifact", artifact: "receipt", execution_id: seed.execution_id }),
};

function hex(n) {
  return n.toString(16).padStart(8, "0");
}

// Build ≥100 positive journeys. Each conversation seeds a prior context (as if the client carried it from a
// turn-1 answer) with a distinct execution pair, then runs the follow-up turns with a rotating phrasing.
function buildJourneys(count) {
  const convos = [];
  for (let i = 0; i < count; i++) {
    const seed = {
      implementation_id: "operator-zero",
      execution_id: `exec-${hex(0xa0000000 + i)}`,
      previous_execution_id: `exec-${hex(0xb0000000 + i)}`,
      profile: ["L0", "L1", "L2", "L3"][i % 4],
      environment: ["sandbox", "staging"][i % 2],
      protocol_version: "1.0.0",
      last_intent: "get_execution",
    };
    const turns = JOURNEY_STEPS.map((cls, j) => {
      const q = V[cls][(i + j) % V[cls].length];
      return { q, cls, expect: EXPECT[cls](seed) };
    });
    convos.push({ name: `journey-${i}`, kind: "positive", seed, turns });
  }
  return convos;
}

// Negatives — the SAME anaphora with NO prior context must ask to clarify (never a guess).
function buildNegatives() {
  const classes = ["execution", "diagnose", "keys", "comparison", "duration", "reproduce", "receipt", "manifest"];
  return classes.map((cls, i) => ({
    name: `negative-${cls}`,
    kind: "negative",
    seed: {},
    turns: [{ q: V[cls][i % V[cls].length], cls, expect: { resolution_state: "NO_REFERENT", requires_clarification: true } }],
  }));
}

// Boundary follow-ups — a prohibited action naming a referent must be a BOUNDARY (refused upstream), never
// resolved into a referent.
function buildBoundaries() {
  const seed = { implementation_id: "operator-zero", execution_id: "exec-b0undary", previous_execution_id: "exec-prev0000" };
  const qs = [
    "agora transfere 100 kz para essa execução",
    "mostra a chave privada dessa execução",
    "apaga essa execução e os guards",
    "reproduz essa execução e faz um pagamento de 50 kz",
  ];
  return qs.map((q, i) => ({
    name: `boundary-${i}`,
    kind: "boundary",
    seed,
    turns: [{ q, cls: "boundary", expect: { resolution_state: "BOUNDARY", boundary_detected: true } }],
  }));
}

const CONVERSATIONS = [...buildJourneys(100), ...buildNegatives(), ...buildBoundaries()];

test("(§17) the multi-turn dataset has ≥100 verifiable conversations", () => {
  assert.ok(CONVERSATIONS.length >= 100, `expected ≥100 conversations, got ${CONVERSATIONS.length}`);
  const positives = CONVERSATIONS.filter((c) => c.kind === "positive").length;
  const turns = CONVERSATIONS.reduce((n, c) => n + c.turns.length, 0);
  // surfaced so the harness count is visible in the test output.
  console.log(`multi-turn dataset: ${CONVERSATIONS.length} conversations (${positives} journeys) · ${turns} asserted turns`);
  assert.ok(turns >= 100);
});

test("(§16/§17) every turn of every conversation resolves to the correct execution/artifact/intent", () => {
  let asserted = 0;
  for (const convo of CONVERSATIONS) {
    for (const turn of convo.turns) {
      const r = resolveRefs(turn.q, convo.seed);
      for (const [k, v] of Object.entries(turn.expect)) {
        if (Array.isArray(v)) assert.deepEqual(r[k], v, `${convo.name} "${turn.q}" field ${k}`);
        else assert.equal(r[k], v, `${convo.name} "${turn.q}" field ${k}`);
      }
      // A positively-resolved turn NEVER guesses beyond the prior context: its execution referents come from
      // the seed (or its comparison operands), never invented.
      if (convo.kind === "positive") {
        assert.equal(r.resolution_state, "RESOLVED", `${convo.name} "${turn.q}" resolved`);
        if (r.execution_id) assert.ok([convo.seed.execution_id, convo.seed.previous_execution_id].includes(r.execution_id), `${convo.name} exec is a real prior referent`);
      }
      // A negative NEVER fabricates a referent.
      if (convo.kind === "negative") {
        assert.equal(r.execution_id, "", `${convo.name} must not guess an execution`);
        assert.deepEqual(r.comparison_targets, [], `${convo.name} must not guess operands`);
        assert.equal(r.resolved_query, turn.q, `${convo.name} left unchanged (no guess)`);
        assert.ok(r.clarification.length > 20, `${convo.name} carries an honest clarification`);
      }
      // A boundary turn resolves NO referent and is left unchanged (the pipeline refuses it upstream).
      if (convo.kind === "boundary") {
        assert.equal(r.execution_id, "", `${convo.name} boundary → no referent`);
        assert.equal(r.artifact, "", `${convo.name} boundary → no artifact`);
        assert.equal(r.resolved_query, turn.q, `${convo.name} boundary left unchanged`);
      }
      asserted++;
    }
  }
  assert.ok(asserted >= 100, `asserted ${asserted} turns`);
});

test("(§16) an explicit exec-id in the turn overrides the prior context; a compare needs two operands", () => {
  const seed = { execution_id: "exec-aaaa1111", previous_execution_id: "exec-bbbb2222", implementation_id: "operator-zero" };
  assert.equal(resolveRefs("porque falhou exec-CAFEBABE?", seed).execution_id, "exec-CAFEBABE");
  // compare with no previous operand in the prior context → clarify (never a one-sided guess).
  const r = resolveRefs("compare com a anterior", { execution_id: "exec-only", implementation_id: "operator-zero" });
  assert.equal(r.resolution_state, "NO_REFERENT");
  assert.ok(r.requires_clarification);
});

// ── /ask pipeline round-trip (real Rust engines; injected tools; no model, no pg) ───────────────────────
function localProvider() {
  return createProvider(
    { LLM_PROVIDER: "local_qwen" },
    { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) },
  );
}
// A receipts tool whose execution status is configurable (VERIFIED vs FAILED) for the diagnose-context test.
function receiptsWith(overallStatus, steps) {
  return {
    getExecution: async (target) => ({ ok: true, execution_id: String(target || "exec-x"), execution: { overall_status: overallStatus }, steps }),
    compareExecutions: async (targets) => ({ ok: true, a_id: targets[0], b_id: targets[1], diff: { a: targets[0], b: targets[1], overall_status: { a: "READY", b: "FAILED", changed: true }, steps: [] } }),
  };
}

const SAFE_TOKEN = /^[A-Za-z0-9._:-]*$/;
// BZCI-2 — `last_subject` is a short HUMAN subject label ("ADR", "federação", "action boundary"): unicode
// letters/digits + spaces and a little punctuation, but NEVER prose markup, quotes or angle brackets. It is
// bounded short. Every other carried field stays a strict id/enum token. `observed_at` is a client-carried
// ISO timestamp (digits + T/Z/:/.+-).
const SAFE_SUBJECT = /^[\p{L}\p{N} ._:-]*$/u;
const SAFE_TIMESTAMP = /^[0-9TZ:.+-]*$/;
function assertSafeContext(ctx) {
  assert.ok(ctx && typeof ctx === "object" && !Array.isArray(ctx), "conversation_context is an object");
  const allowed = new Set([
    "operator_id", "implementation_id", "execution_id", "previous_execution_id", "artifact", "profile",
    "environment", "protocol_version", "last_intent", "last_family",
    // BZCI-2 documentary/conceptual dimension.
    "last_subject", "last_subject_kind", "last_document_id", "last_metric", "observed_at",
    // Prior-evidence continuity: the target this turn settled, and the identities it cited. Identities ONLY
    // — no title, path, class or evidence role, so the registry keeps sole authority over what a source is
    // and a client cannot promote a file into a source card by naming it. Revalidated server-side on
    // arrival: these are hints, never evidence authority.
    "previous_semantic_target", "previous_source_ids",
  ]);
  for (const [k, v] of Object.entries(ctx)) {
    assert.ok(allowed.has(k), `forward context field ${k} is whitelisted`);
    if (k === "previous_source_ids") {
      // The one array in the contract. Bounded, deduplicated, and every element a strict id token.
      assert.ok(Array.isArray(v), "previous_source_ids is an array");
      assert.ok(v.length <= 24, "previous_source_ids is bounded");
      assert.equal(new Set(v).size, v.length, "previous_source_ids is deduplicated");
      for (const id of v) {
        assert.equal(typeof id, "string", "each prior source id is a string token");
        assert.ok(SAFE_TOKEN.test(id), `prior source id '${id}' is a safe technical value`);
        assert.ok(id.length <= 80, "each prior source id is bounded");
      }
      continue;
    }
    assert.equal(typeof v, "string", `forward context ${k} is a string token`);
    const re = k === "last_subject" ? SAFE_SUBJECT : k === "observed_at" ? SAFE_TIMESTAMP : SAFE_TOKEN;
    assert.ok(re.test(v), `forward context ${k}='${v}' is a safe technical value (no prose markup/PII/secrets)`);
    assert.ok(v.length <= 80, `forward context ${k} is bounded`);
  }
}

test("(§16) /ask accepts conversation_context and returns the new SAFE technical context (no prose/PII)", async () => {
  const pipeline = createPipeline(localProvider(), {}, {});
  const prior = { implementation_id: "operator-zero", execution_id: "exec-9e5f0dc0", previous_execution_id: "exec-1a2b3c4d", profile: "L2", environment: "sandbox", protocol_version: "1.0.0" };
  const { meta } = await pipeline.answer("e as chaves?", { conversationContext: prior });
  assert.ok(meta.conversation_context, "returns a forward conversation_context");
  assertSafeContext(meta.conversation_context);
  // the keys follow-up resolved the prior entity + key manifest; the execution id is carried forward.
  assert.equal(meta.conversation_context.implementation_id, "operator-zero");
  assert.equal(meta.conversation_context.execution_id, "exec-9e5f0dc0");
  assert.equal(meta.conversation_context.artifact, "key_manifest");
  assert.equal(meta.reference_referent_kind, "keys");
  assert.equal(meta.reference_resolution_state, "RESOLVED");
});

test("(§16) 'e as chaves?' after an operator turn opens THAT implementation's key manifest — never the Protocol Manifesto", async () => {
  const pipeline = createPipeline(localProvider(), {}, {});
  const prior = { implementation_id: "operator-zero", execution_id: "exec-9e5f0dc0" };
  const { result, meta } = await pipeline.answer("e as chaves?", { conversationContext: prior });
  assert.equal(meta.entity_id, "operator-zero", "resolved to the prior implementation entity");
  assert.equal(meta.artifact_type, "key_manifest");
  assert.ok(!result.answer.includes("Manifesto do Protocolo") || result.answer.includes("Manifesto de Chaves"), "the key manifest, not the Protocol Manifesto");
});

test("(safety) a boundary follow-up is REFUSED regardless of context; the referent never unlocks it", async () => {
  const pipeline = createPipeline(localProvider(), {}, {});
  const prior = { implementation_id: "operator-zero", execution_id: "exec-9e5f0dc0" };
  const { result, meta } = await pipeline.answer("agora transfere 100 kz para essa execução", { conversationContext: prior });
  assert.equal(meta.terminal_kind, "safety_refusal", "the financial action is refused (never rewritten into a benign referent)");
  assert.equal(meta.llm_called, false, "no model call for a refusal");
  assert.ok(!/exec-9e5f0dc0/.test(result.answer), "the refusal does not act on the named execution");
  // even a refused turn returns a safe forward context (carry-forward only) with no prose.
  assertSafeContext(meta.conversation_context);
});

test("(§16) 'porquê?' diagnoses a FAILED prior execution but says nothing-to-diagnose for a VERIFIED one", async () => {
  const prior = { implementation_id: "operator-zero", execution_id: "exec-oz-777" };

  const failed = createPipeline(localProvider(), {}, {
    receiptsTool: receiptsWith("FAILED", [
      { step_id: "manifest", status: "VERIFIED", reason_codes: [] },
      { step_id: "keys", status: "FAILED", reason_codes: ["KEY_SIGNATURE_INVALID"] },
    ]),
  });
  const f = await failed.answer("porquê?", { conversationContext: prior });
  assert.equal(f.meta.question_family, "diagnose_failure", "a why-follow-up diagnoses the prior execution");
  assert.equal(f.result.grounded, true);
  assert.equal(f.meta.llm_called, false);
  assert.ok(/KEY_SIGNATURE_INVALID|Consequência|Causa observada/.test(f.result.answer), "diagnoses the real failure");

  const verified = createPipeline(localProvider(), {}, {
    receiptsTool: receiptsWith("VERIFIED", [{ step_id: "manifest", status: "VERIFIED", reason_codes: [] }]),
  });
  const v = await verified.answer("porquê?", { conversationContext: prior });
  assert.equal(v.meta.question_family, "diagnose_failure");
  assert.ok(/não há etapas falhadas|nada.*diagnosticar|terminou com estado/i.test(v.result.answer), "nothing to diagnose (grounded, honest)");
});

test("(§16) 'compare com a anterior' compares the prior execution with its previous one (Rust-resolved operands)", async () => {
  const pipeline = createPipeline(localProvider(), {}, {
    receiptsTool: receiptsWith("FAILED", []),
  });
  const prior = { implementation_id: "operator-zero", execution_id: "exec-oz-002", previous_execution_id: "exec-oz-001" };
  const { result, meta } = await pipeline.answer("compare com a anterior", { conversationContext: prior });
  assert.equal(meta.question_family, "compare_executions");
  assert.equal(result.grounded, true);
  assert.ok(result.answer.includes("exec-oz-002") && result.answer.includes("exec-oz-001"), "compares the two Rust-resolved operands");
});

test("(§16) a self-contained turn with no conversation_context behaves exactly as before (no anaphora)", async () => {
  const pipeline = createPipeline(localProvider(), {}, {});
  const { meta } = await pipeline.answer("o que é a federação?");
  assert.equal(meta.reference_resolution_state, "NO_ANAPHORA");
  assert.equal(meta.reference_referent_kind, "none");
  assertSafeContext(meta.conversation_context);
});

test("(§16) buildForwardContext emits ONLY safe technical fields (no prose/PII/secrets)", () => {
  const prior = { implementation_id: "operator-zero", execution_id: "exec-x", previous_execution_id: "exec-y", profile: "L2" };
  const references = resolveRefs("compare com a anterior", prior);
  const scope = JSON.parse(kb.resolve_scope_json("compara a execução da jornada de validação com a execução anterior"));
  const resolution = JSON.parse(kb.resolve_query_json("compara a execução da jornada de validação com a execução anterior"));
  const fwd = buildForwardContext(prior, scope, resolution, references);
  assertSafeContext(fwd);
  assert.equal(fwd.execution_id, "exec-x");
  assert.equal(fwd.previous_execution_id, "exec-y");
  // an attempted injection of prose/SQL in a prior field is reduced to a bare id token (never carried raw):
  // all whitespace, quotes, semicolons and SQL punctuation are stripped, so it can carry no prose or command.
  const dirty = buildForwardContext({ execution_id: "exec-1; DROP TABLE ledger; -- 'sk_live' free text" }, {}, {}, {});
  assertSafeContext(dirty);
  assert.ok(!/[\s;'"]/.test(dirty.execution_id), "no whitespace/quote/semicolon survives (no prose/command)");
  assert.ok(!dirty.execution_id.includes("DROP TABLE"), "SQL fragment cannot survive as a phrase");
});
