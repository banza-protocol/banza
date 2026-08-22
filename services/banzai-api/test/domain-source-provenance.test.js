// A DOMAIN source is eligible by MEMBERSHIP of the canonical registry, never by its own description.
//
// The domain layer introduced sources with no repository path — NIST, the IETF, BIS/CPMI — and the
// public-source filter had always required one. Fixing that by accepting "anything declaring class
// domain, a publisher and an https URL" would have turned "no repository path" into "trusted by
// default": any object carrying those three fields would have passed, including a source id that
// arrived from retrieval and was declared nowhere.
//
// So eligibility asks the registry whether the claimed identity exists. The registry is derived from
// the declared sources, so a source is eligible exactly when the corpus says it is, and everything
// else fails closed exactly as it did before the domain layer existed.

import test from "node:test";
import assert from "node:assert/strict";
import { isPublicSource } from "../src/answerContract.js";
import { DOMAIN_SOURCE_REGISTRY, isDeclaredDomainSource, SOURCES, ENTRIES } from "../src/knowledge.js";

test("the registry is populated and every record is complete", () => {
  const ids = Object.keys(DOMAIN_SOURCE_REGISTRY);
  assert.ok(ids.length >= 8, "expected the declared external authorities, saw " + ids.length);
  for (const id of ids) {
    const r = DOMAIN_SOURCE_REGISTRY[id];
    assert.equal(r.source_class, "DOMAIN", id + ": class must be declared DOMAIN");
    assert.ok(String(r.publisher || "").trim(), id + ": no publisher");
    assert.ok(String(r.authority || "").trim(), id + ": no authority category");
    assert.match(String(r.url || ""), /^https:\/\//, id + ": authority must be reachable over https");
    assert.equal(r.eligible, true, id + ": declared records are eligible");
  }
});

// ── D1 · an unknown external source id ───────────────────────────────────────────────────────────
test("an external source that is not in the registry is not eligible evidence", () => {
  const injected = {
    id: "EVIL-EXTERNAL",
    class: "domain",
    publisher: "Somebody",
    authority: "standards body",
    url: "https://evil.example/spec",
  };
  assert.equal(isDeclaredDomainSource(injected.id), false, "an undeclared id is not in the registry");
  assert.equal(
    isPublicSource(injected),
    false,
    "a source that describes itself correctly but is declared nowhere must fail closed",
  );
  // And the shape alone must not be what decides: this object carries every field the first version
  // of the rule checked for.
  assert.ok(injected.publisher && /^https:\/\//.test(injected.url) && injected.class === "domain");
});

// ── D2 · a declared source stripped of its class ─────────────────────────────────────────────────
test("a declared source loses eligibility when it stops claiming the DOMAIN class", () => {
  const declared = Object.values(SOURCES).find((x) => x && x.class === "domain");
  assert.ok(declared, "expected at least one declared domain source");
  const declassed = { ...declared, class: "reference" };
  assert.equal(
    isPublicSource(declassed),
    false,
    "without the DOMAIN class it falls to the path rule, and it has no path",
  );
});

// ── D3 · a genuinely declared authority ──────────────────────────────────────────────────────────
test("a declared authority is eligible and retained", () => {
  for (const id of Object.keys(DOMAIN_SOURCE_REGISTRY)) {
    const src = Object.values(SOURCES).find((x) => x && x.id === id);
    assert.ok(isPublicSource(src), id + ": a declared authority must be citable");
  }
});

test("every domain entry rests on a registered authority", () => {
  const orphans = [];
  for (const e of ENTRIES) {
    if (!e.domain) continue;
    for (const src of e.sources || []) {
      if (src && src.class === "domain" && !isDeclaredDomainSource(src.id)) orphans.push(e.id + " → " + src.id);
    }
    if (!(e.sources || []).some((src) => isPublicSource(src))) orphans.push(e.id + " → no citable source");
  }
  assert.deepEqual(orphans, [], "domain entries citing unregistered authorities: " + orphans.join(", "));
});
