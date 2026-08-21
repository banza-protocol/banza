// Every fallback the engine can decide has reader prose in both locales.
//
// Rust decides that a request is out of scope, ambiguous, unsupported by evidence, missing its data or
// blocked on an unavailable tool. This process realizes that decision as text. The engine emits five
// kinds; the table realized two, and the other three fell through to `unavailableRealization` — the
// wording that exists to say "this answer is not yet available in your language", which ends with
// "The sources that support it are still listed below."
//
// Measured against production at `src-14df955`: `Uma implementação pode usar PostgreSQL?` was answered
// with that sentence, in Portuguese — the canonical locale, where by construction no realization is
// missing — and with `sources: []`. It blamed a translation gap for what was a retrieval outcome, and
// promised evidence that did not exist. Both halves false, in one sentence, on the reader's screen.
//
// So this is a CLOSED-WORLD check, in the same discipline `AMBIGUITY_CANDIDATE_LABELS` already states
// for itself: a kind with no realization is a presentation gap, and the way it currently fails is worse
// than an obvious blank. The kind list is read from the Rust source that emits it, so a sixth kind added
// there fails here rather than silently reaching a reader as a sentence about translation.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TAXONOMY = join(HERE, "..", "..", "..", "engines", "banzai-query-core", "src", "taxonomy.rs");
const PIPELINE = join(HERE, "..", "src", "pipeline.js");

/** The kinds `contextual_fallback` can actually return, read from the function that returns them. */
function emittedKinds() {
  const src = readFileSync(TAXONOMY, "utf8");
  const start = src.indexOf("pub fn contextual_fallback");
  assert.ok(start > 0, "expected taxonomy.rs to declare contextual_fallback");
  // The function ends at the next top-level `}` — the first line that is exactly a closing brace.
  const rest = src.slice(start);
  const end = rest.search(/\n}\n/);
  assert.ok(end > 0, "expected to find the end of contextual_fallback");
  const body = rest.slice(0, end);
  const kinds = [...body.matchAll(/kind:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  return [...new Set(kinds)].sort();
}

/** The kinds the realization table covers, and the locales each covers. */
function realizedTable() {
  const src = readFileSync(PIPELINE, "utf8");
  const start = src.indexOf("contextual_fallback: {");
  assert.ok(start > 0, "expected pipeline.js to declare the contextual_fallback realization table");
  const region = src.slice(start, src.indexOf("\n    },\n  };", start));
  const table = {};
  for (const m of region.matchAll(/^\s{6}([a-z_]+):\s*\{/gm)) {
    const kind = m[1];
    const after = region.slice(m.index, region.indexOf("\n      },", m.index));
    table[kind] = {
      pt: /"pt-PT":/.test(after),
      en: /\ben:\s*"/.test(after),
    };
  }
  return table;
}

test("every fallback the engine emits has prose in both locales", () => {
  const kinds = emittedKinds();
  assert.ok(kinds.length >= 5, `expected the engine to emit several kinds, saw ${kinds.join(", ")}`);
  const table = realizedTable();
  for (const kind of kinds) {
    assert.ok(table[kind], `the engine can decide "${kind}" and nothing realizes it for a reader`);
    assert.ok(table[kind].pt, `"${kind}" has no Portuguese realization`);
    assert.ok(table[kind].en, `"${kind}" has no English realization`);
  }
});

test("no fallback prose claims a translation gap or promises absent sources", () => {
  const src = readFileSync(PIPELINE, "utf8");
  const start = src.indexOf("contextual_fallback: {");
  const region = src.slice(start, src.indexOf("\n    },\n  };", start));
  // The READER PROSE only. Comments in this region necessarily quote the wording being forbidden — that
  // is how the reason for forbidding it gets recorded — so a check that scanned them would fail on its
  // own justification.
  const prose = region
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(
    prose,
    /não existe uma resposta determinística|not yet available in (English|Portuguese)/i,
    "a retrieval outcome must not be reported to the reader as a missing translation",
  );
  assert.doesNotMatch(
    prose,
    /listadas abaixo|listed below/i,
    "prose served with sources: [] must not promise the reader sources below it",
  );
  assert.ok(prose.includes("insufficient_source"), "expected the insufficient_source realization to be present");
});
