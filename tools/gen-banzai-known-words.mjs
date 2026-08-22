// GENERATOR — the words this engine ALREADY KNOWS, so typo recovery never "corrects" one of them.
//
// Two different questions were being answered by one set: which words a typo may be corrected TO, and
// which words are KNOWN and must never be corrected FROM. The known-word set was built from the
// entries INDEX — 28 lexically routable entries out of 215 — so almost the entire declared vocabulary
// was invisible to it.
//
// The consequence is not subtle. `public` is not in those 28; `publica` is. Recovery rewrote "What is a
// public key?" to "what is a publica key" at HIGH CONFIDENCE, before any router saw it, and the
// question resolved to nothing. The same happened to `contrato`→`controlo`, `schema`→`scheme` and
// `transfer`→`transfere` — four correct words turned into different words, each then unanswerable.
//
// So known-word protection draws on the WHOLE declared vocabulary: every entry's keywords, every
// declared domain alias, and the profile levels. Routing eligibility is a separate decision and stays
// in the entries index.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { ENTRIES } = await import(join(ROOT, "services/banzai-api/src/knowledge.js"));
const domain = JSON.parse(readFileSync(join(ROOT, "engines/banzai-query-core/src/domain-terms.json"), "utf8"));

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const words = new Set();
const take = (phrase) => {
  for (const w of norm(phrase).split(" ")) {
    // Three characters is the floor the resolver already uses; below that a token is not distinctive
    // enough to protect without freezing ordinary short words out of correction entirely.
    if (w.length > 2) words.add(w);
  }
};
for (const e of ENTRIES) for (const k of e.keywords || []) take(k);
for (const c of domain.concepts || []) for (const a of c.aliases || []) take(a);

const out = [...words].sort();
writeFileSync(
  join(ROOT, "engines/banzai-query-core/src/known-words.json"),
  JSON.stringify({ _generated_by: "tools/gen-banzai-known-words.mjs", count: out.length, words: out }, null, 2) + "\n",
);
console.log(`  wrote engines/banzai-query-core/src/known-words.json  (${out.length} declared words from ${ENTRIES.length} entries + ${(domain.concepts || []).length} domain concepts)`);
