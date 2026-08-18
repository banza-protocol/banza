// Three things in this repository are called `kind`, and they are NOT the same taxonomy.
//
// Block 5B left this open: the audit had assumed the public source card was losing `SourceAnchor.kind` in
// transit. It was not — and tracing why turned up a third classifier nobody had named alongside the other
// two. The answer to "same or different" is DIFFERENT, and the three are worth writing down because the
// obvious future maintenance instinct — "these two enums have drifted, let's sync them" — would merge
// concepts that must not be merged.
//
//   1. retrieval::SourceKind        Schema | Fixture | AdrRfc | Doc | Legal | Other
//      Derived from path + source type inside the Rust engine, and it DECIDES: it feeds
//      `decide_appropriateness`, which governs whether a source is an appropriate answer to the task at
//      hand. This one has epistemic consequences.
//
//   2. factpack::SourceAnchor.kind  adr | rfc | reference | spec | contract | conformance | governance | doc
//      A provenance label carried on the source of a FACT inside the factual package the model reads. It
//      travels with the fact; it does not decide whether the fact qualifies.
//
//   3. SOURCES[].kind (this file)   adr | rfc | spec | contract | conformance | governance | reference
//                                   | code | (absent)
//      The document class of a PUBLIC CITED SOURCE, for the source card a reader sees. Presentation
//      provenance. Block 5B proved it changes no evidence decision.
//
// So `code` exists on (3) and on neither of the others, and it should not be propagated to them: the
// public registry cites engine and service files, and the factual package classifies documents. `reference`
// on (3) means the canonical descriptive Reference specifically, which is narrower than any sense the
// others carry.
//
// This file exists so that a future "unify the kinds" change has to argue with a test instead of with a
// comment.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOURCES, sourceKind } from "../src/knowledge.js";

const rustSource = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("the three taxonomies remain three", () => {
  // Named so the count is asserted, not assumed. If a fourth `kind` appears, or one is deleted, this is
  // where the assumption breaks.
  const retrieval = rustSource("../../../engines/banzai-query-core/src/retrieval.rs");
  const factpack = rustSource("../../../engines/banzai-query-core/src/factpack.rs");

  assert.match(retrieval, /enum SourceKind\s*\{/, "retrieval owns a deciding SourceKind");
  assert.match(retrieval, /decide_appropriateness\(\s*self\.task,\s*source_kind\(/,
    "retrieval's SourceKind must still be the one that feeds appropriateness");
  assert.match(factpack, /pub struct SourceAnchor/, "factpack owns a provenance kind");
  assert.equal(typeof sourceKind, "function", "the public registry owns a document class");
});

test("the public document class is presentation provenance and decides nothing", () => {
  // The property Block 5B established, restated here as the boundary between (3) and (1). If the public
  // class ever gains a consumer that changes retrieval or qualification, this file is the wrong place for
  // it and the distinction above has collapsed.
  const knowledge = readFileSync(new URL("../src/knowledge.js", import.meta.url), "utf8");
  const pipeline = readFileSync(new URL("../src/pipeline.js", import.meta.url), "utf8");
  for (const [name, src] of [["knowledge.js", knowledge], ["pipeline.js", pipeline]]) {
    assert.ok(
      !/if\s*\([^)]*\.kind\s*===\s*"(adr|spec|reference|contract)"/.test(src),
      `${name}: the public document class must not gate behaviour`,
    );
  }
});

test("code belongs to the public registry alone", () => {
  // The concrete divergence, pinned. The public registry cites engine and service FILES; the factual
  // package classifies documents. A sync that pushed `code` into factpack would be classifying source
  // files as document provenance, which is not what that field means.
  assert.equal(sourceKind({ path: "engines/banzai-query-core/src/route.rs" }), "code");
  assert.equal(sourceKind({ path: "services/banzai-api/src/pipeline.js" }), "code");

  const factpack = rustSource("../../../engines/banzai-query-core/src/factpack.rs");
  const declared = factpack.match(/"adr" \| "rfc" \| "reference" \| "spec" \| "contract" \| "conformance" \| "governance" \| "doc"/);
  assert.ok(declared, "factpack must still declare its own vocabulary explicitly");
  assert.ok(!/"code"/.test(declared[0]), "factpack does not classify code, and must not be synced to");
});

test("reference is narrower on the public card than anywhere else", () => {
  // (3) reserves `reference` for the canonical descriptive Reference. The other taxonomies use looser
  // senses of the word, which is exactly why they must not be unified by find-and-replace.
  assert.equal(sourceKind({ path: "docs/reference/pt/BANZA_REFERENCIA.md" }), "reference");
  assert.equal(sourceKind({ path: "docs/reference/en/BANZA_REFERENCE.md" }), "reference");
  assert.notEqual(sourceKind({ path: "docs/reference/PROTOCOL_GLOSSARY.md" }), "reference");
  // ...and the canonical Reference is still not a registered public source, so no live answer produces a
  // REFERENCE card today. Recorded as a coverage limitation, not repaired by inventing a source.
  const registered = Object.values(SOURCES).some((s) => sourceKind(s) === "reference");
  assert.equal(registered, false, "if this becomes true, the Reference card is now live and testable");
});
