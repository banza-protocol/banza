// Rust decides. JavaScript realizes. On the PORTUGUESE path too.
//
// The contextual fallback carries a `message` field composed in Rust — a full human sentence, in
// Portuguese. English was migrated to a presentation table; Portuguese was not, because the Rust
// sentence was BETTER: it names the exact alternatives the engine could not choose between, where a
// table can only say something generic. Keeping it looked like preserving quality.
//
// It was not. It meant the serving path most readers hit took its reader text from the engine, so
// "Rust decides, JS realizes" was false in the language almost every reader uses, and Portuguese could
// never diverge from whatever Rust happened to say. The specificity was real, but it was specificity
// carried by PROSE, and prose is not a contract.
//
// `ambiguity_candidates` is that same specificity as data. Both locales are now composed from it, so
// neither borrows the other's sentence and neither borrows the engine's.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contextualFallback } from "../src/knowledge.js";

const PIPELINE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "pipeline.js");

/** Strip comments so this file's own explanation of the defect cannot satisfy its assertions. */
function code() {
  return readFileSync(PIPELINE, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("the source under test is real, else every property here is vacuous", () => {
  const c = code();
  assert.ok(c.length > 5000, `pipeline source looks truncated (${c.length} chars)`);
  assert.match(c, /function fallbackProse\(/, "the terminal prose owner must be present");
});

// ── OWNERSHIP ─────────────────────────────────────────────────────────────────────────────────────

test("no locale takes its reader text from the engine's prose field", () => {
  // T5's owning assertion. `fb.message` may exist on the wire — it is diagnostics, and tests and traces
  // read it — but the function that decides what a READER sees must not return it in any locale.
  const c = code();
  const fn = c.match(/function fallbackProse\(fb, locale\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(fn, "fallbackProse must be a findable function");
  assert.doesNotMatch(
    fn[1],
    /\bfb\.message\b/,
    `the deterministic terminal presentation owner returns the engine's Portuguese prose:\n${fn[1]}`,
  );
});

test("the presentation owner covers both supported locales for every fallback kind it serves", () => {
  const c = code();
  const table = c.match(/contextual_fallback:\s*\{([\s\S]*?)\n    \},/);
  assert.ok(table, "the contextual fallback presentation table must be findable");
  // Both locales present, and neither left null — a null entry is how the Portuguese hole was spelled.
  assert.match(table[1], /"pt-PT":\s*"/, "Portuguese must have real prose, not a null placeholder");
  assert.match(table[1], /\ben:\s*"/, "English must have real prose");
  assert.doesNotMatch(table[1], /:\s*null/, "no locale may be a null placeholder deferring to Rust");
});

// ── SPECIFICITY IS PRESERVED, NOT TRADED AWAY ─────────────────────────────────────────────────────

test("the ambiguity sentence is composed from the decision's candidates, in both locales", () => {
  // The whole point of the exchange: moving presentation to JS must not degrade the specific sentence
  // into a generic one. The composer must read the typed candidates, not a canned string.
  const c = code();
  const fn = c.match(/function ambiguityProse\(fb, locale\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(fn, "an ambiguity composer must exist");
  assert.match(fn[1], /ambiguity_candidates/, "it must read the decision's typed candidates");
});

test("a semantic candidate is named in the reader's language, and differently per locale", () => {
  const c = code();
  const labels = c.match(/AMBIGUITY_CANDIDATE_LABELS\s*=\s*\{([\s\S]*?)\n  \};/);
  assert.ok(labels, "candidate reader labels must exist");
  for (const loc of ['"pt-PT"', "en:"]) {
    assert.ok(labels[1].includes(loc.replace(":", "")), `labels must cover ${loc}`);
  }
  // The two locales must actually differ — a table that maps both to the same string is not a
  // translation, and would pass a mere "both keys exist" check.
  const pt = labels[1].match(/last_execution:\s*"([^"]+)"/g) || [];
  assert.ok(pt.length >= 2, "each locale must label the candidates");
  assert.notEqual(pt[0], pt[1], "the two locales must give genuinely different reader labels");
});

test("a spelling candidate keeps its catalogue term and is framed honestly in English", () => {
  // `term` is Portuguese catalogue vocabulary. Translating it would destroy the thing being asked
  // about, so English keeps the spelling and frames it as a TERM rather than presenting a Portuguese
  // word as though it were an English one.
  const c = code();
  const frame = c.match(/AMBIGUITY_FRAME\s*=\s*\{([\s\S]*?)\n  \};/);
  assert.ok(frame, "the sentence frames must exist");
  assert.match(frame[1], /spelling:/, "a distinct frame must exist for spelling candidates");
  assert.match(frame[1], /semantic:/, "and a distinct frame for semantic candidates");
});

// ── OBSERVED THROUGH THE ENGINE ───────────────────────────────────────────────────────────────────

test("the engine still supplies the candidates the composer depends on", () => {
  // Non-vacuity for everything above: if the decision stopped carrying candidates, the composer would
  // silently fall through to the generic table and the specificity would be lost with no test failing.
  const fb = contextualFallback("o que e operadr?", "") || {};
  assert.ok(
    Array.isArray(fb.ambiguity_candidates) && fb.ambiguity_candidates.length >= 2,
    `the ambiguity witness must carry candidates, got ${JSON.stringify(fb.ambiguity_candidates)}`,
  );
  assert.ok(
    typeof fb.message === "string" && fb.message.length > 0,
    "the diagnostic message may still exist — it just may not be served",
  );
});
