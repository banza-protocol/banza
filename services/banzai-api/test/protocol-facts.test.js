// Two protocol facts that must never be composed by a model.
//
// Production QA asked how many authorities control the Trust Root and was told "uma autoridade" — the
// most consequential fact in the protocol, stated wrongly, and wrongly in the direction that makes the
// root look weaker than it is. Asked for the protocol version, it said the canonical documentation
// declares none — which would tell an implementer there is nothing to pin against.
//
// Both are fixed facts with one correct answer, so both are decided by routing into a canonical entry
// rather than assembled from retrieval. These tests pin the route (what the live endpoint acts on) and
// the content, in the phrasings QA actually used.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";

const routed = (q) => JSON.parse(kb.route_question_json(q)).entry_id;

const entry = async (id) => {
  const mod = await import("../src/knowledge.js");
  const entries = mod.ENTRIES ?? [];
  const list = Array.isArray(entries) ? entries : Object.values(entries).flat();
  const e = list.find((x) => x && x.id === id);
  assert.ok(e, `${id} must exist in the knowledge base`);
  return e.answer;
};

test("root cardinality and threshold route to the canonical answer", () => {
  for (const q of [
    "Quantas autoridades controlam a Trust Root do BANZA?",
    "How many authorities control the BANZA Trust Root?",
    "Qual é o threshold da Trust Root do BANZA?",
    "What is the BANZA root threshold?",
    "qual é o quorum da raiz?",
  ]) {
    assert.equal(routed(q), "def-root-authorization", `composed instead of decided: ${q}`);
  }
});

test("the root answer states three authorities, threshold two, counted as distinct", async () => {
  const a = await entry("def-root-authorization");
  assert.match(a, /três autoridades/, "cardinality must be three");
  assert.match(a, /quaisquer duas das três/, "threshold must be any two of the three");
  assert.match(a, /autoridades distintas/, "the threshold counts distinct authorities");
  assert.match(
    a,
    /nenhuma chave de raiz autoriza sozinha/i,
    "no single key authorises alone",
  );
  // Authorization is not hardware — the conflation this milestone removed from the documents must not
  // reappear in the answer.
  assert.match(a, /controlos de custódia/, "custody must be named as separate from authorization");
  assert.doesNotMatch(
    a,
    /porque (existem|há) (dois|três) (HSM|módulos)/i,
    "the threshold is never derived from the number of devices",
  );
  // The root does not exist yet, and an answer that omits this implies a live production root.
  assert.match(a, /Nenhuma cerimónia de produção foi realizada/, "the gate state must be stated");
});

// The protocol version is asserted where it is decided — engines/banzai-query-core/src/attribute.rs,
// which owns declared-attribute facts and answers it before the glossary is consulted. Duplicating the
// assertion here would create a second place to keep in step with the manifest.
