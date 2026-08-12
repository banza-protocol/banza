# A/B multi-operator scenarios (§147–§157) — coverage by existing executed evidence

| Scenario | Expectation | Covered by (executed test) | Strength |
|---|---|---|---|
| AB-01 publish→resolve→fetch→trust→conformity→evidence | technical eligibility path | operator-zero-e2e-root: signed_manifest_verifies, signed_evidence_bundle_verifies, verification_trace_is_complete | E4 |
| AB-02 tamper metadata | fail-closed | operator-zero-e2e-root: tampered_payload_fails | E4 |
| AB-03 revoked key | fail-closed | operator-zero-e2e-root: revocation_blocks_trust_fail_closed; banza-trust signing_chain revocation tests | E3/E4 |
| AB-04 wrong origin | fail-closed | banza-artifact-fetcher: host_mismatch_blocked_end_to_end, userinfo_url_blocked_end_to_end | E4 |
| AB-05 profile insufficient | no L3 eligibility | banza-l3-readiness tests (profile applicability); federation MANIFEST-FEDERATION-NO-EVIDENCE (fixture, E1 — executor chip) | E2 / E1 |
| AB-06 expired evidence | fail-closed | banza-trust build_input(missing/invalid) fail-closed; live FED-INVARIANTS INV-FEDEVAL-005 | E3 |
| AB-07 BanzAI down | validation continues | by construction: readiness/trust/conformance/fetcher engines have NO BanzAI dependency (verified: no banzai/llm/qwen import in engine src) | E3 |
| AB-08 replay | deterministic equivalent | determinism replay: OZ evidence bundle byte-identical across 2 independent generator runs | E6-adjacent |
| AB-09 build changed | new digest / re-eval | operator-zero-e2e-root: tampered_payload_fails (content hash changes → verification fails) | E4 |
| AB-10 registry empty | evaluation not prohibited | verification-api /operators=[] does not block direct public-material evaluation (OZ e2e evaluates from published artifacts, not registry presence) | E3/E5 |

GAP: a single consolidated two-operator scenario driving the 30 committed federation fixtures as executed vectors — filed as a follow-on task (federation-fixture-executor). The load-bearing fail-closed behaviour is proven at engine level (E3/E4) independent of that executor.
