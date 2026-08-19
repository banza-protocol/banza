// The serving path may not read the compatibility projection.
//
// `entry.answer` survives as a deprecated view of realizations["pt-PT"]. It exists so that 66 tests and
// guards whose property genuinely is "the Portuguese answer says X" did not have to be rewritten to prove
// what they already proved. That bargain only holds while SERVING code cannot reach it: the moment a
// response is composed from the projection, the reader's locale stops deciding what they read, and the
// defect that started all of this — a Portuguese answer served to an English question — is back.
//
// The projection is convenient, short, and the obvious thing to reach for. That is exactly why it needs a
// guard rather than a comment.
//
// CRITICAL DISTINCTION. The final API response object also has a property called `answer`, and it is
// legitimate everywhere — `result.answer`, `body.answer`, `contract.answer`. Banning the token would make
// this guard unownable and would be deleted by the first person it inconvenienced. So the rule is scoped
// to reads of a KNOWLEDGE ENTRY, identified by where the value came from.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Serving code: everything the request path can execute. Tests and tools are a different domain. */
const SERVING_FILES = readdirSync(SRC).filter((f) => f.endsWith(".js"));

/** Strip comments so a file may NAME the forbidden pattern in order to forbid it. */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Every identifier in a file that holds a KNOWLEDGE ENTRY.
 *
 * An entry is whatever came out of the entry API. Anything else called `.answer` — a response, a
 * terminal, a family, an attribute — is a different object with a different owner and is not this rule's
 * business.
 */
function entryBoundIdentifiers(src) {
  const names = new Set();
  const bindings = [
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getEntry\s*\(/g,
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?retrieve\s*\(/g,
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?retrieveTopK\s*\(/g,
    /\b(?:const|let|var)\s+(\w+)\s*=\s*ENTRIES\s*\.\s*find\s*\(/g,
    /\bfor\s*\(\s*(?:const|let)\s+(\w+)\s+of\s+ENTRIES\b/g,
  ];
  for (const re of bindings) {
    for (const m of src.matchAll(re)) names.add(m[1]);
  }
  return names;
}

/** Reads of the compatibility projection on a knowledge entry, in serving code. */
function projectionReads(src) {
  const found = [];
  const names = entryBoundIdentifiers(src);
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const n of names) {
      const re = new RegExp(`\\b${n}\\s*(?:\\?\\.|\\.)\\s*answer\\b|\\b${n}\\s*\\[\\s*["']answer["']\\s*\\]`);
      if (re.test(line)) found.push({ line: i + 1, name: n, text: line.trim() });
    }
    // Direct, unbound forms: getEntry(x).answer / retrieve(q).answer
    if (/(?:getEntry|retrieve|retrieveTopK)\s*\([^)]*\)\s*(?:\?\.|\.)\s*answer\b/.test(line)) {
      found.push({ line: i + 1, name: "<direct>", text: line.trim() });
    }
  });
  return found;
}

test("no serving file reads a knowledge entry's compatibility projection", () => {
  const violations = [];
  for (const f of SERVING_FILES) {
    const src = code(readFileSync(join(SRC, f), "utf8"));
    for (const v of projectionReads(src)) {
      violations.push(`${f}:${v.line} reads ${v.name}.answer — use answerFor(entry, locale)\n      ${v.text}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `${violations.length} serving path(s) read the deprecated PT projection instead of selecting a ` +
      `realization by locale:\n    ${violations.join("\n    ")}`,
  );
});

test("the guard actually reads serving code, and is not scanning an empty set", () => {
  // Non-vacuity: a rule over no files passes. Prove the corpus is real and contains the API surface the
  // rule is about, so a refactor that moves or renames these files fails here rather than going quiet.
  assert.ok(SERVING_FILES.length >= 5, `only ${SERVING_FILES.length} serving files discovered`);
  for (const required of ["knowledge.js", "pipeline.js", "provider.js", "server.js"]) {
    assert.ok(SERVING_FILES.includes(required), `${required} must be in the scanned serving corpus`);
  }
});

test("the detector finds a planted projection read", () => {
  // The mutation this guard exists to catch, run against the detector itself. Without this, a detector
  // whose binding patterns silently stopped matching would report the same clean result as a working one.
  const planted = `
    const entry = getEntry("def-profile-l0");
    return { answer: entry.answer };
  `;
  const hits = projectionReads(planted);
  assert.equal(hits.length, 1, "a planted entry.answer read must be detected");
  assert.equal(hits[0].name, "entry");
});

test("the detector does NOT flag the API response's own answer property", () => {
  // The response object legitimately carries `answer` everywhere. If this guard flagged it, it would be
  // unownable and would be deleted rather than obeyed — so the distinction is asserted, not assumed.
  const responseShaped = `
    const result = await pipeline.answer(question, {});
    const contract = normalizeBanzaiAnswer(result.answer, result.sources);
    return { answer: contract.answer, sources: contract.sources };
  `;
  assert.deepEqual(projectionReads(responseShaped), []);
});

test("the detector does not flag a locale-aware read", () => {
  const correct = `
    const entry = getEntry("def-profile-l0");
    const realization = answerFor(entry, locale);
    return { answer: realization.text };
  `;
  assert.deepEqual(projectionReads(correct), []);
});
