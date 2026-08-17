#!/usr/bin/env node
// Derive the lexical keyword index the Rust router consults.
//
// `engines/banzai-query-core/src/entries-index.json` is the candidate set for `retrieve_topk_ids` —
// the keyword-scoring path (score >= 2 over keyword hits, stable by index order). It is NOT the list of
// critical entries and NOT a projection of every entry: entries outside it are still resolved by the
// subject, concept, glossary and deterministic paths, and one entry inside it routes to the model.
//
// Until now membership was a hand-maintained list of 27 with no rule anywhere. The comment in the Rust
// core said "generated from ENTRIES", which was false and invited the wrong conclusion — that a file
// with 27 rows next to 163 entries must simply be stale. Membership is now declared at the source, one
// entry at a time, with `lexicalCandidate: true`, and this generator projects exactly those.
//
// The property is deliberately NOT `critical`. They are orthogonal axes: `critical` says an answer
// carries a high-risk protocol truth; `lexicalCandidate` says an entry takes part in this particular
// keyword-scoring mechanism. 136 of the 144 critical entries are not in this index and must not be
// added by a generator — that would silently change routing across the knowledge base.
//
// Output is a pure function of the source: no timestamps, no host paths, no environment. Order follows
// `ENTRIES`, because `retrieve_topk_ids` breaks score ties by index position — reordering would change
// which entry wins a tie.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "engines/banzai-query-core/src/entries-index.json";

const { ENTRIES } = await import(join(ROOT, "services/banzai-api/src/knowledge.js"));

const eligible = ENTRIES.filter((e) => e.lexicalCandidate === true);

if (eligible.length === 0) {
  console.error("no entry declares lexicalCandidate: true — refusing to emit an empty index");
  process.exit(2);
}
const seen = new Set();
for (const e of eligible) {
  if (seen.has(e.id)) {
    console.error(`duplicate eligible entry id: ${e.id}`);
    process.exit(2);
  }
  seen.add(e.id);
  if (!Array.isArray(e.keywords) || e.keywords.length === 0) {
    console.error(`eligible entry has no keywords, so it can never score: ${e.id}`);
    process.exit(2);
  }
}

// id + keywords + the ANSWER POLICY. The policy travels with the entry because the router used to infer
// it from the id prefix: a `def-` name silently meant "answer this deterministically". A naming convention
// carrying semantics is a rule nobody can see, and it cannot express a def-* entry that should NOT be
// settled model-free, nor a settled fact whose id is not a definition. The declaration is now data on the
// canonical entry, derived into here, and read by Rust — generators write, checks observe.
// Only id + keywords + deterministic: the Rust `Entry` struct deserializes exactly these fields, and shipping the
// answers into the engine index would duplicate prose that already lives in the canonical source.
const out = JSON.stringify(
  eligible.map((e) => ({
    id: e.id,
    keywords: e.keywords,
    deterministic: e.deterministic === true,
  })),
  null,
  2,
) + "\n";

if (process.argv[2] === "--stdout") {
  process.stdout.write(out);
} else {
  writeFileSync(join(ROOT, TARGET), out);
  console.log(`  wrote ${TARGET}  (${eligible.length} lexically eligible of ${ENTRIES.length} entries)`);
}
