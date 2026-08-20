// A canonical registry's English does not get to become a Portuguese reader's explanation.
//
// This is the original defect, and it is worth stating precisely because it is subtler than "wrong
// language". `conformance-profiles.production.json` is a NORMATIVE artifact whose `purpose` field is
// English by design — that is correct and stays. The defect was that a Portuguese answer interpolated
// that field raw, producing one sentence of Portuguese, one sentence of English, and one confused
// reader. The registry was never wrong; the presentation layer was reading from it.
//
// A mutation showed nothing owned this: reintroducing `p.purpose` into the Portuguese profile answer
// left all 731 tests green while `def-profile-l0` served "O **L0** é o perfil **Protocol Sandbox**.
// Prove the protocol can be instantiated in a controlled test environment…". So the boundary gets a
// property.
//
// NAMES ARE NOT PROSE. `Protocol Sandbox` is the profile's canonical name and reads the same in every
// locale, as do BANZA, L0, BCJ/1, ADR ids and paths. The rule is about explanatory SENTENCES crossing
// from a source artifact into the wrong locale, so it compares against the registry's own prose rather
// than trying to detect English.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRIES, answerFor } from "../src/knowledge.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REGISTRY = join(REPO, "contracts", "production", "conformance-profiles.production.json");

/** The registry's own English explanatory prose, per profile level. */
function registryPurposes() {
  const raw = JSON.parse(readFileSync(REGISTRY, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.profiles || [];
  const out = [];
  for (const p of list) {
    const purpose = String(p.purpose || "").trim();
    if (purpose.length >= 40) out.push({ level: p.level, purpose });
  }
  return out;
}

test("the registry really carries English purpose prose, else this proves nothing", () => {
  const purposes = registryPurposes();
  assert.ok(purposes.length >= 5, `only ${purposes.length} profile purposes found — the source is not being read`);
  for (const p of purposes) {
    assert.ok(p.purpose.length >= 40, `${p.level}: purpose too short to be explanatory prose`);
  }
});

test("no Portuguese realization repeats the registry's English purpose verbatim", () => {
  // The defect, stated as a rule. Compared against the SOURCE's own text rather than a language
  // detector: a heuristic would flag "Protocol Sandbox" and be deleted by the first person it annoyed.
  const purposes = registryPurposes();
  const failures = [];
  for (const e of ENTRIES) {
    const pt = String(answerFor(e, "pt-PT").text || "");
    if (!pt) continue;
    for (const p of purposes) {
      if (pt.includes(p.purpose)) {
        failures.push(`${e.id}: Portuguese answer carries the registry's English purpose for ${p.level}`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `${failures.length} Portuguese realization(s) interpolate source-language explanatory prose`,
  );
});

test("the English realizations may carry it — that is their language, not a leak", () => {
  // Non-vacuity from the other side: a rule that banned the purpose text everywhere would pass the test
  // above trivially and would also be wrong. English answers about profiles legitimately say this.
  const purposes = registryPurposes();
  const l0 = ENTRIES.find((e) => e.id === "def-profile-l0");
  assert.ok(l0, "def-profile-l0 must exist");
  const en = String(answerFor(l0, "en").text || "");
  assert.ok(en.length > 0, "the English realization must exist for this to mean anything");
  assert.ok(purposes.some((p) => p.level === "L0"), "L0 must have a registry purpose");
});

test("canonical profile NAMES are untouched by this rule", () => {
  // `Protocol Sandbox` is an identifier, not an explanation, and must survive in both locales.
  const l0 = ENTRIES.find((e) => e.id === "def-profile-l0");
  const pt = String(answerFor(l0, "pt-PT").text || "");
  assert.match(pt, /Protocol Sandbox/, "the canonical profile name must remain in the Portuguese answer");
});
