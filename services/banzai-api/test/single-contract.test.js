// M2.18B.6 (§13/§14) — the single Grounded-Synthesis contract: startup fail-closed self-check + the
// Rust-owned contract versions that key the answer cache.
import { test } from "node:test";
import assert from "node:assert/strict";
import { singleContractSelfCheck, contractVersions, buildFactualPackagePlanned } from "../src/knowledge.js";

test("(m2.18b6 §13) the single contract is ready — every required WASM export is present", () => {
  const c = singleContractSelfCheck();
  assert.equal(c.ready, true, `missing single-contract exports: ${c.missing.join(", ")}`);
  assert.deepEqual(c.missing, []);
});

test("(m2.18b6 §14) Rust owns the contract versions (non-empty, stable)", () => {
  const v = contractVersions();
  assert.ok(v.factual_package_version >= 2, "factual package schema is v2+");
  assert.ok(v.prompt_version.length > 0, "prompt contract version present");
  assert.ok(v.validator_policy_version.length > 0, "validator policy version present");
  // stable within a build
  assert.deepEqual(contractVersions(), v);
});

test("(m2.18b6 §14) the planned package carries the contract versions + a package checksum for cache keying", () => {
  const p = buildFactualPackagePlanned("t", "explica a ADR-006 sobre dupla entrada", "ADR-006", "");
  const v = contractVersions();
  assert.equal(p.prompt_version, v.prompt_version);
  assert.equal(p.validator_policy_version, v.validator_policy_version);
  assert.equal(p.version, v.factual_package_version);
  assert.ok(p.package_checksum && p.package_checksum.length > 0, "package_checksum present");
  // the checksum is deterministic across identical builds (cache key stability)
  const q = buildFactualPackagePlanned("t", "explica a ADR-006 sobre dupla entrada", "ADR-006", "");
  assert.equal(p.package_checksum, q.package_checksum);
});
