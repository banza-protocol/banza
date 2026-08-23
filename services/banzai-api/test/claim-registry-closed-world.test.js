// The claim registry REFINES the semantic universe; it must never become a second one.
//
// A registry whose facts can drift from the canonical universe is worse than no registry: it would let
// the runtime enforce obligations about units that no longer exist, or cite authority that resolves
// nowhere, while every other guard stayed green.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { ENTRIES, SOURCES } from "../src/knowledge.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const universe = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/semantic-universe.json"), "utf8"));
const kb = createRequire(import.meta.url)("../src/rustkb/banzai_api_kb.js");
const registry = JSON.parse(kb.claim_registry_json());

test("the registry is non-vacuous", () => {
  // Every assertion below passes trivially over an empty list, so the count is asserted first.
  assert.ok(registry.length >= 2, `claim registry collapsed to ${registry.length}`);
});

test("every claim refines a semantic unit that exists", () => {
  const units = new Set(universe.units.map((u) => u.semantic_id));
  const orphans = registry.filter((c) => !units.has(c.semantic_unit)).map((c) => `${c.id} → ${c.semantic_unit}`);
  assert.deepEqual(orphans, [], "claims refining a unit that is not in the universe: " + orphans.join(", "));
});

test("every BANZA claim declares an authority class", () => {
  const bad = registry.filter((c) => c.authority_class !== "BANZA" && c.authority_class !== "DOMAIN").map((c) => c.id);
  assert.deepEqual(bad, [], "claims with no recognised authority class: " + bad.join(", "));
});

test("every declared evidence source resolves in the registry", () => {
  // A claim whose required evidence names something that does not exist can never be satisfied, and
  // would silently fail closed forever.
  // By source ID, not by registry KEY. Most SOURCES entries are keyed camelCase (`adr025`) while
  // their id is the real identifier (`ADR-025`), and a claim names the identifier.
  const known = new Set(Object.values(SOURCES).map((x) => String((x && x.id) || "")).filter(Boolean));
  const dangling = registry
    .flatMap((c) => (c.evidence_any_of || []).map((e) => [c.id, e]))
    .filter(([, e]) => !known.has(e));
  assert.deepEqual(dangling, [], "claim evidence that resolves to no source: " + JSON.stringify(dangling));
});

test("every trigger entry is a real entry", () => {
  const ids = new Set(ENTRIES.map((e) => e.id));
  const ghosts = registry
    .flatMap((c) => (c.trigger_entry || []).map((t) => [c.id, t]))
    .filter(([, t]) => !ids.has(t));
  assert.deepEqual(ghosts, [], "claims triggered by an entry that does not exist: " + JSON.stringify(ghosts));
});

test("no claim is unreachable, and no id is duplicated", () => {
  const dead = registry.filter((c) => !(c.trigger_entry || []).length && !(c.trigger_terms || []).length).map((c) => c.id);
  assert.deepEqual(dead, [], "claims nothing can trigger: " + dead.join(", "));
  const ids = registry.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate claim ids");
});

test("claim ids are locale-independent", () => {
  // A proposition is not a language. PT/EN realizations differ; the identity must not.
  const localised = registry.filter((c) => /[._-](pt|en)([._-]|$)/i.test(c.id)).map((c) => c.id);
  assert.deepEqual(localised, [], "claim ids must not encode a locale: " + localised.join(", "));
});
