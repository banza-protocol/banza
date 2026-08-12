import test from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";
import { resolveScope, resolveIntent } from "../src/knowledge.js";

// BZC-1 — entity + artifact + scope resolution. The engine must SYSTEMATICALLY understand which entity,
// which artifact, and whose scope a question targets. The reproduced bug — "me mostre o manifesto do
// operador zero" wrongly returning the Protocol Manifesto (docs/reference/manifesto.md) — is acceptance
// test #1, not the scope. These assert the general behaviour with ZERO tolerance for the four critical
// failure modes: wrong entity, wrong artifact, silent ambiguity, generic-protocol-document substitution.

function pipe() {
  const provider = createProvider({ env: { LLM_PROVIDER: "mock" } });
  return createPipeline(provider);
}

const OZ_MANIFEST_QUERIES = [
  "me mostre o manifesto do operador zero",
  "mostre o manifesto do Operator Zero",
  "manifesto do operator-zero",
  "qual e o manifesto da implementação de referência do operador zero",
  "mostra-me o manifesto do OperadorZero",
];

test("BZC-1 acceptance #1: 'manifesto do operador zero' → implementation artifact, live-routed, NEVER the Protocol Manifesto", async () => {
  const pipeline = pipe();
  for (const q of OZ_MANIFEST_QUERIES) {
    const { result, meta } = await pipeline.answer(q, {});
    // Entity + artifact resolved correctly
    assert.equal(meta.entity_id, "operator-zero", `entity for: ${q}`);
    assert.equal(meta.entity_type, "implementation", `entity_type for: ${q}`);
    assert.equal(meta.artifact_type, "implementation_manifest", `artifact for: ${q}`);
    assert.equal(meta.requires_live_tool, true, `requires_live_tool for: ${q}`);
    assert.equal(meta.terminal_kind, "entity_artifact_live_required", `terminal for: ${q}`);
    assert.equal(meta.resolution_method, "rust_entity_artifact_scope", `method for: ${q}`);
    assert.equal(meta.llm_called, false, `no model call for: ${q}`);
    // CRITICAL: never the generic Protocol Manifesto document, never any source substitution
    assert.equal((result.sources || []).length, 0, `no source substitution for: ${q}`);
    assert.ok(!/docs\/reference\/manifesto\.md/.test(result.answer), `must not cite protocol doc: ${q}`);
    // Honest answer: names the implementation manifest, distinguishes the Protocol Manifesto, never simulates
    assert.ok(/Manifesto da implementação/i.test(result.answer), `names impl manifest: ${q}`);
    assert.ok(/Operador Zero/.test(result.answer), `names the entity: ${q}`);
    assert.ok(/Manifesto do Protocolo/i.test(result.answer), `distinguishes protocol manifesto: ${q}`);
    assert.ok(!/simul/i.test(result.answer), `never simulates: ${q}`);
  }
});

test("BZC-1: the Protocol Manifesto question is UNTOUCHED (documental, not live)", async () => {
  const pipeline = pipe();
  for (const q of ["o que é o manifesto do protocolo", "explica o manifesto do protocolo BANZA"]) {
    const { meta } = await pipeline.answer(q, {});
    assert.notEqual(meta.terminal_kind, "entity_artifact_live_required", `not live-routed: ${q}`);
    assert.ok(!meta.requires_live_tool, `not live: ${q}`);
    const s = resolveScope(q);
    assert.equal(s.artifact_type, "protocol_manifest", `protocol_manifest: ${q}`);
    assert.equal(s.entity_id, "", `no entity: ${q}`);
  }
});

test("BZC-1: other Operator-Zero implementation artifacts are entity-scoped + live (key manifest, discovery, evidence bundle, revocation)", async () => {
  const pipeline = pipe();
  const cases = [
    ["mostra o manifesto de chaves do operador zero", "key_manifest"],
    ["qual é o discovery do operador zero", "discovery"],
    ["mostra o evidence bundle do operador zero", "evidence_bundle"],
    ["qual a lista de revogação do operador zero", "revocation_list"],
    ["mostra a metadata assinada do operador zero", "signed_metadata"],
  ];
  for (const [q, want] of cases) {
    const { result, meta } = await pipeline.answer(q, {});
    assert.equal(meta.entity_id, "operator-zero", `entity for: ${q}`);
    assert.equal(meta.artifact_type, want, `artifact for: ${q}`);
    assert.equal(meta.requires_live_tool, true, `live for: ${q}`);
    assert.equal((result.sources || []).length, 0, `no source substitution for: ${q}`);
  }
});

test("BZC-1: a conceptual/no-entity question never becomes a live-tool route", async () => {
  const pipeline = pipe();
  for (const q of ["o que é um manifesto de chaves", "como funciona a federação entre operadores"]) {
    const { meta } = await pipeline.answer(q, {});
    assert.notEqual(meta.terminal_kind, "entity_artifact_live_required", `conceptual stays conceptual: ${q}`);
  }
});

test("BZC-1: safety boundary still wins over an entity+artifact question (Tier 0 precedence)", async () => {
  const pipeline = pipe();
  // A prohibited financial action embedded with the entity+artifact must refuse, not live-route.
  const { meta } = await pipeline.answer("transfere 100 kz e mostra o manifesto do operador zero", {});
  assert.equal(meta.terminal_kind, "safety_refusal");
});

test("BZC-1: ResolvedIntent carries the typed entity/artifact/scope fields", () => {
  const ri = resolveIntent("me mostre o manifesto do operador zero", "");
  assert.equal(ri.entity_id, "operator-zero");
  assert.equal(ri.implementation_id, "operator-zero");
  assert.equal(ri.operator_id, "");
  assert.equal(ri.artifact_type, "implementation_manifest");
  assert.equal(ri.protocol_scope, "implementation");
  assert.equal(ri.requires_live_tool, true);
  assert.equal(ri.authority_requirement, "live_tool");
  assert.equal(ri.concept_source, ""); // scope domination cleared the protocol-doc seed
  assert.equal(ri.resolution_state, "RESOLVED");
});
