// Pre-composed terminals are reader-facing prose too.
//
// Most answers are selected: a knowledge entry carries realizations and the resolved locale picks one.
// Some are WRITTEN by the pipeline itself — source-evidence follow-ups, operational failures — and those
// have no realization to select. They were therefore never part of the locale migration, and the
// source-evidence terminal was still emitting the Portuguese sentence, a separator and the English
// sentence together, exactly as the knowledge entries had before they were migrated. Every reader got
// both languages regardless of what they asked in.
//
// Two properties keep that from coming back.
//
// IDENTITY. A terminal declares what it is (`precomposed_terminal`). It used to be recognised by the
// ABSENCE of `realizations`, which any malformed or legacy object also satisfies — a shape is not a
// declaration, and a wrong object served as a terminal is served as though someone meant it.
//
// PROVENANCE. A terminal's prose must be written FOR the locale that was resolved. Composing Portuguese
// and labelling it English afterwards is the same defect with better paperwork, so the pipeline refuses
// the mismatch rather than trusting the label.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PIPELINE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "pipeline.js");
const src = () => readFileSync(PIPELINE, "utf8");

/** Source with comments stripped — this file's own explanations must not satisfy its assertions. */
function code() {
  return src()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("terminals are recognised by declaration, not by the absence of realizations", () => {
  const c = code();
  assert.match(
    c,
    /precomposed_terminal/,
    "pre-composed terminals must declare an explicit identity",
  );
  // Pin the CONCEPT, not one spelling of it. The first version of this assertion matched a single
  // textual form and let `!(hit && hit.realizations)` straight through — a mutation proved it.
  const decision = c.match(/const isPrecomposedTerminal\s*=\s*([^;]+);/);
  assert.ok(decision, "the terminal decision must be a named, findable expression");
  assert.match(
    decision[1],
    /precomposed_terminal/,
    `terminal classification must read the declared identity, got: ${decision[1].trim()}`,
  );
  assert.doesNotMatch(
    decision[1],
    /realizations/,
    `terminal classification must not be derived from the presence or absence of realizations, got: ${decision[1].trim()}`,
  );
});

test("the terminal prose owner exists and covers both supported locales", () => {
  const c = code();
  assert.match(c, /TERMINAL_TEXT/, "terminals must have a locale-keyed prose owner");
  const block = c.slice(c.indexOf("TERMINAL_TEXT"), c.indexOf("TERMINAL_TEXT") + 600);
  assert.match(block, /"pt-PT"/, "terminal prose must cover Portuguese");
  assert.match(block, /\ben\b/, "terminal prose must cover English");
});

test("no terminal composes both locales into one answer", () => {
  // The exact defect that survived the entry migration: a composer gluing PT and EN with the separator.
  const c = code();
  // Pin the CONCEPT: the bilingual separator must not appear in ANY reader-facing string literal,
  // however it is assembled. The first version required the `"..." + "..."` form and a mutation that
  // put both locales inside ONE literal walked straight through it.
  const composed = [...c.matchAll(/"[^"\n]*\\n\\n---\\n\\n[^"\n]*"/g)];
  assert.deepEqual(
    composed.map((m) => m[0]),
    [],
    "a terminal composer still glues two locales into one reader-facing answer",
  );
});

test("a terminal whose prose was composed for another locale is refused", () => {
  // Provenance: metadata cannot relabel prose after the fact. Asserted on the guard in the source, since
  // reaching this branch through the full pipeline needs a live request path.
  const c = code();
  assert.match(
    c,
    /answer_locale\s*&&\s*hit\.answer_locale\s*!==\s*locale/,
    "the pipeline must compare a terminal's composed locale against the resolved locale",
  );
  assert.match(
    c,
    /terminal prose must be written for the locale that was resolved/,
    "and must refuse the mismatch with a reason naming the property",
  );
});

test("the source-evidence terminal declares its class and its locale", () => {
  const c = code();
  assert.match(c, /precomposed_terminal:\s*"source_evidence"/, "the terminal must name its class");
  assert.match(c, /answer_locale:\s*locale/, "and must record the locale it was composed for");
});

test("the assertions above read real pipeline source, not an empty string", () => {
  // Non-vacuity: every property here is a source property, so an unreadable or relocated pipeline would
  // make them all pass silently.
  const c = code();
  assert.ok(c.length > 5000, `pipeline source looks truncated (${c.length} chars)`);
  assert.match(c, /function deterministic\(/, "the composer under test must be present");
  assert.match(c, /answerFor\(/, "the locale-aware selector must be present");
});
