// A guarantee is a fact. Claiming one BANZA does not have is worse than refusing to answer.
//
// Production QA asked whether BANZA provides global transparency and was told it does — "o BANZA
// fornece transparência global através de sua natureza como um protocolo financeiro aberto". The
// specification denies exactly that property in its first section. An operator reading the answer
// would plan a verification design around a guarantee that is not there, and would find out when the
// two states it cannot distinguish diverge.
//
// These tests run the SAME resolution the live /banzai/ask path uses. They pin the denial, and they
// pin the distinction the hotfix corrected everywhere else: expiry bounds the age of each artifact,
// never the coherence between them.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";

const intent = (q) => JSON.parse(kb.resolve_query_json(q)).primary_intent;

const BOUNDARY = [
  "O BANZA fornece transparência global?",
  "Does BANZA provide global transparency?",
  "O BANZA detecta split-view?",
  "O BANZA garante consistência de conjunto entre artefactos?",
  "does BANZA guarantee set consistency",
  "o banza previne mix-and-match de artefactos?",
  "quais são as garantias de confiança do BANZA?",
];

test("a question about the trust guarantees is answered, not refused", () => {
  for (const q of BOUNDARY) {
    assert.notEqual(intent(q), "unsupported", `refused as out of scope: ${q}`);
  }
});

test("the answer denies the two guarantees BANZA does not provide", async () => {
  const mod = await import("../src/knowledge.js");
  const entries = mod.ENTRIES ?? [];
  const list = Array.isArray(entries) ? entries : Object.values(entries).flat();
  const def = list.find((e) => e && e.id === "def-trust-guarantees");
  assert.ok(def, "def-trust-guarantees must exist in the knowledge base");
  const a = def.answer;

  assert.match(a, /^\*\*Não\.\*\*/, "must open with the denial, not bury it");
  assert.match(
    a,
    /não fornece — consistência de conjunto/,
    "set consistency must be named as absent",
  );
  assert.match(
    a,
    /não fornece — consistência entre observadores/,
    "cross-observer consistency must be named as absent",
  );

  // The conflation this hotfix corrected: expiry is a bound on freshness, never on set coherence.
  assert.match(
    a,
    /não a coerência entre eles/,
    "expiry must not be presented as bounding set consistency",
  );

  // Denying two guarantees must not quietly deny the two that do exist.
  assert.match(a, /fornece — frescura do artefacto/, "artifact freshness is provided");
  assert.match(a, /fornece — monotonicidade local/, "local monotonicity is provided");
});

test("an operational request is still not answered as a concept", () => {
  for (const q of ["certifica este artefacto", "aprova esta implementacao", "assina isto por mim"]) {
    assert.notEqual(intent(q), "explain_concept", `an operation must not be a concept: ${q}`);
  }
});
