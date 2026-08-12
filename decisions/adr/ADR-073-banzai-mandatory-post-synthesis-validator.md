# ADR-073 — Mandatory post-synthesis authority validator on the publish path

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** M2.19G.5C
- **Related:** ADR-055 (Rust-first grounded synthesis — the single model call and its intrinsic factual
  validator), ADR-050 (unified public interface — authority boundary), ADR-054 (BanzAI non-decisive),
  ADR-059..063 (three-layer architecture; certification ≠ admission ≠ authorisation; real-money gate)

---

## Context

The grounded pipeline already runs an **intrinsic factual validator** inside synthesis (every claim maps
to a package fact; every citation is within the allowed source ids) before a model answer is returned from
the synthesis step. A **second**, deterministic authority/leak validator — `validate_response` in
`engines/banzai-query-core` (`validate.rs`), wrapped as `postValidate` in the service — was **built and
telemetry was anticipated for it**, but it is **never called** on any path. Grep confirms `postValidate`
has zero call sites; consequently `validation_status` on `/ask` is structurally always `"passed"` — even
for deterministic terminals and cache hits that were never a model output.

This leaves a gap: a synthesised answer that claims normative authority, invents protocol/certification
state, conflates a PASS or readiness with a certificate, or leaks the system prompt / key material /
chain-of-thought would be published unchecked by this last line of defence.

## Decision

**D-073-01 — `postValidate` / `validate_response` is MANDATORY on the grounded publish path.** After the
single model synthesis (ADR-055) and after the intrinsic factual validator, and **before** any grounded
model answer is published or cached, the deterministic authority/leak validator runs on the exact answer
bytes that would be published. This runs in addition to the intrinsic factual validator; it does not
replace it.

**D-073-02 — On failure, degrade safely; never publish the rejected bytes.** A failed post-validation
BLOCKS publication and degrades to the safe deterministic grounding via the existing emergency path, with a
stable enum `fallback_reason` prefixed `post_validation_`. The rejected model text is discarded — never
shown, never logged verbatim, never cached. Because the cache writes sit downstream of the gate, a rejected
answer is structurally never cached, and cache hits (which skip re-validation) can only ever return
answers that passed the current policy.

**D-073-03 — The validator's rule set.** Keep the 14 existing typed rules (secret/prompt/chain-of-thought
leak; certificate/certification issuance; operator-approval/licence/fund-handling claims; model-as-source
claims). ADD six negation-aware whole-word authority rules — scheme admission, regulatory authorisation,
Technical-Registry publication by the model, result alteration/revocation, PASS-is-a-certificate
conflation, and readiness-is-certification conflation — plus two gate-level checks: an unsupported-claim
citation verifier (every cited source resolves to a package fact and the published answer carries at least
one source) and a contradiction check against the deterministic exact facts for the seeded entity.

**D-073-04 — Honest three-state `validation_status`.** `validation_status` becomes `rejected` when
`fallback_reason` starts with `post_validation_`; `passed` when a model answer actually passed the gate
this turn (model called, grounded, no fallback); and `n/a` otherwise (deterministic terminal, cache hit,
insufficient evidence, or any non-post-validation degrade). It never falsely claims a model validation
"passed" for a response that was never a model output.

**D-073-05 — Cache-policy versioning.** A `post_validation_policy_version` token is bound into the grounded
cache key, so tightening the validator evicts answers validated under the prior policy.

**D-073-06 — This is runtime-behaviour-changing; ship gated.** Enforcement is behind an environment flag.
Before enabling it in production, the offline eval corpora are run with enforcement ON; deployment uses a
canary with auto-rollback on a degraded/error-rate spike; disabling the flag instantly restores the prior
publish behaviour with no redeploy. The `postValidate` definition already exists, so reverting the wiring
never leaves a dangling symbol.

## Consequences

- A new guard `banzai-post-synthesis-validation-check` fails if `postValidate` remains defined-but-uncalled
  and asserts the gate runs before publish and cache and that `validation_status` is derived from the real
  gate outcome (no hardcoded "passed").
- New safe telemetry: `post_validate_runs_total{result}`, `post_validation_rejections_total{reason}`,
  `model_answers_published_total`, `model_answers_unvalidated_total` (a live invariant that must stay 0),
  and the real `validation_status` distribution — counts/enums only, never content.
- The repo-guards ADR range is bumped to include ADR-073. Refines ADR-055 and the ADR-050/054 authority
  boundary; supersedes neither.

## Alternatives considered

1. **Leave `postValidate` uncalled (status quo).** Rejected: the last line of defence is inert and
   `validation_status` is a disguised constant.
2. **Publish the rejected model answer with a warning.** Rejected: an authority-claiming or leaking answer
   must never reach the user; degrading to the deterministic grounding is the safe outcome.
3. **Enforce immediately without a canary.** Rejected: a false positive would downgrade a legitimate model
   answer to the deterministic fallback; the offline eval + canary + flag mitigate this before full rollout.
