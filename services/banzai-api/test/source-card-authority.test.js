// What a source IS, and what it DID, are two different questions.
//
// The public card used to answer the first one wrongly and identically for everything: an ADR, a
// specification and a glossary all rendered as `REFERÊNCIA`. Nothing was dropping the classification in
// transit — the public source path never carried one. `SOURCES` held `{id, title, path}`, and the frontend
// turned the missing value into `"reference"`, which is the label belonging to the canonical descriptive
// Reference and to nothing else.
//
// So the class is declared HERE, at the registry that owns source metadata, and stamped onto the entries
// themselves. Every consumer carries it without plumbing that could drop it. Two rules make the result
// honest rather than merely populated:
//
//   * `reference` names the canonical Reference. It is never a fallback, because an absent classification
//     is not evidence of canonical authority.
//   * an unclassified source stays unclassified, and the card says FONTE/SOURCE.
//
// Document class must not touch evidence semantics. Calling ADR-002 an ADR rather than a Reference cannot
// change whether it establishes anything — that property is asserted below, because a classification that
// can move a threshold is not a label, it is authority.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCES, sourceKind } from "../src/knowledge.js";
import { isPublicSource } from "../src/answerContract.js";
import { harness } from "./_pipeline-harness.mjs";

async function answer(q) {
  const h = harness({});
  const r = await h.pipeline.answer(q, {});
  return { sources: (r.result || {}).sources || [], meta: r.meta, result: r.result || {} };
}

const byId = (sources, id) => sources.find((s) => s.id === id);

// ── The registry declares the class ───────────────────────────────────────────────────────────────

test("every registered source is either classified or honestly unclassified", () => {
  const known = new Set(["adr", "rfc", "spec", "contract", "conformance", "governance", "reference", "code", "doc"]);
  const unclassified = [];
  for (const s of Object.values(SOURCES)) {
    const kind = sourceKind(s);
    if (kind === null) {
      unclassified.push(s.path);
      continue;
    }
    assert.ok(known.has(kind), `${s.path}: ${kind} is not in the declared vocabulary`);
  }
  // Unclassified is allowed and must stay visible — it is what the card reports as FONTE/SOURCE. If this
  // count ever reaches zero silently, someone has started guessing.
  assert.ok(unclassified.length >= 1, "the unclassified case must remain reachable");
});

test("reference names the canonical Reference and nothing else", () => {
  // The label that the defect handed to everything. Only the two canonical editions may carry it.
  for (const path of [
    "docs/reference/pt/BANZA_REFERENCIA.md",
    "docs/reference/en/BANZA_REFERENCE.md",
  ]) {
    assert.equal(sourceKind({ path }), "reference", path);
  }
  for (const path of [
    "docs/reference/getting-started.md",
    "docs/reference/PROTOCOL_GLOSSARY.md",
    "decisions/adr/ADR-002-x.md",
    "spec/overview.md",
  ]) {
    assert.notEqual(sourceKind({ path }), "reference", `${path} is not the canonical Reference`);
  }
});

test("an unknown public source is not promoted to a class", () => {
  // Absence of metadata must not become a claim. This is the exact inversion the defect performed.
  assert.equal(sourceKind({ path: "some/unregistered/thing.md" }), null);
  assert.equal(sourceKind({ path: "" }), null);
  assert.equal(sourceKind({}), null);
});

// ── The class survives to the answer, per class ───────────────────────────────────────────────────

test("an ADR arrives on the answer classified as an ADR", async () => {
  const { sources } = await answer("O que é uma implementação?");
  const adr = byId(sources, "ADR-002");
  assert.ok(adr, "the ADR must be cited");
  assert.equal(adr.kind, "adr", "an ADR must not be presented as anything else");
  assert.match(adr.path, /^decisions\/adr\//);
});

test("a specification arrives classified as a specification", async () => {
  const { sources } = await answer("O que é uma implementação?");
  const spec = byId(sources, "SPEC-OVERVIEW");
  assert.ok(spec, "the specification must be cited");
  assert.equal(spec.kind, "spec");
});

test("the classes an answer carries are the classes its documents have", async () => {
  // Three documents, three different classes, in one answer. Before this they were one label.
  const { sources } = await answer("Quem certifica uma implementação?");
  const kinds = Object.fromEntries(sources.map((s) => [s.id, s.kind]));
  assert.equal(kinds["ADR-002"], "adr");
  assert.equal(kinds["ADR-005"], "adr");
  assert.equal(kinds["GOVERNANCE-GLOSSARY"], "doc");
  assert.ok(
    !Object.values(kinds).includes("reference"),
    "no document here is the canonical Reference, so none may claim to be",
  );
});

test("contract and conformance sources keep their own classes", () => {
  assert.equal(sourceKind({ path: "contracts/production/protocol-version.json" }), "contract");
  assert.equal(sourceKind({ path: "conformance/README.md" }), "conformance");
  assert.equal(sourceKind({ path: "spec/federation/x.md" }), "spec");
  assert.equal(sourceKind({ path: "GOVERNANCE.md" }), "governance");
});

// ── Class is not role, and neither is authority ───────────────────────────────────────────────────

test("classifying a source does not change what it establishes", async () => {
  // The property that makes this presentation work rather than semantics. ADR-002 is now labelled an ADR;
  // the answer it supports, the terminal it reaches and the model it does not call are all unchanged.
  const a = await answer("O que é uma implementação?");
  assert.equal(a.result.entry_id, "def-implementation");
  assert.equal(a.meta.llm_called, false);
  assert.notEqual(a.meta.terminal_kind, "insufficient_evidence");
  assert.ok(a.sources.length > 0, "evidence is still evidence");
});

test("the class field never carries an evidence role", async () => {
  // One field, one dimension. If a role word ever appears here, the two have been collapsed.
  const roles = new Set(["establishing", "supporting", "contextual", "primary", "secondary"]);
  const { sources } = await answer("Quem certifica uma implementação?");
  for (const s of sources) {
    assert.ok(!roles.has(String(s.kind)), `${s.id}: ${s.kind} is a role, not a document class`);
  }
});

// ── The internal boundary is upstream, not in the UI ──────────────────────────────────────────────

test("an internal-only source cannot become a card, classified or not", async () => {
  // Block 5A's property, restated for this layer: the exclusion happens before anything renders, so no UI
  // decision is load-bearing. CLAUDE.md is deliberately left unclassified AND ineligible — either alone
  // would be enough, and it has both.
  assert.equal(isPublicSource(SOURCES.claudeMd), false, "CLAUDE.md is not a citable public source");
  assert.equal(sourceKind(SOURCES.claudeMd), null, "and it carries no class to display");
  for (const q of ["implementar o protocolo", "O que é o BANZA?", "Quem certifica uma implementação?"]) {
    const { sources } = await answer(q);
    assert.ok(
      !sources.some((s) => /claude|memory\/|\.env/i.test(String(s.id) + String(s.path))),
      `${q}: internal material must not reach the card path`,
    );
  }
});
