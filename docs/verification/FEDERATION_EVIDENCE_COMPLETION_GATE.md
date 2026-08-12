# BANZA — Federation & Multi-Operator Evidence Completion Gate

> Closes the four technical/evidence gaps behind the prior **CONDITIONAL GO**
> ([`PUBLIC_TECHNICAL_CLAIMS_EVIDENCE.md`](PUBLIC_TECHNICAL_CLAIMS_EVIDENCE.md)) by **implementing what the
> canon already required, executing what had not yet been demonstrated, and producing evidence a technical
> third party can reproduce**. Not an editorial audit; no new features; no strengthened public claims.

## The four gaps → closed

| Gap | Was | Now (executed) | Evidence |
|---|---|---|---|
| **GAP-1 — authenticated revocation in the OTE** | OTE fail-closed on a self-published `revoked` flag; `verify_revocation_list` existed but was not wired in | `evaluate_federation_ote`'s `not_revoked` verifies a **revocation-domain-signed BRL** and checks membership; fail-closed on missing/invalid BRL; never trusts a self-published flag | `engines/banza-trust/tests/federation_ote.rs` (wrong-key / expired / listed-operator negatives) |
| **GAP-2 — OTE 10/10 + canonical outcome** | 8 of 10 checks; emitted `TRUST_VALID` | 10 of 10 checks incl. `capabilities_compatible` + `endpoint_contract_compatible`; emits `ROUTING_ALLOWED` / `FAIL_CLOSED` | 14 positive+negative tests; `banza-trust federation-ote-demo` → `ROUTING_ALLOWED` (all ten) |
| **GAP-3 — committed fixtures executed as vectors** | 30 fixtures declared with expected outcomes; no runner | `run_fed_fixtures` executes **37 fixture-backed cases** vs the fixtures; 0 mismatch, 0 drift; CI-gated | `engines/banza-conformance/tests/federation_fixtures.rs`; `make conformance-fed-fixtures-check` |
| **GAP-4 — A→B multi-operator + replay** | single-origin endpoint validation only | consolidated **A→B** between two cryptographically distinct operators: mutual `ROUTING_ALLOWED`, atomic idempotent routed payment, negatives fail-closed, **byte-identical independent replay** | `engines/banza-conformance/tests/federation_ab.rs`; `make conformance-ab-check` |

## How to reproduce

```bash
cargo test -p banza-trust                                  # OTE 10/10 + authenticated BRL (Track A+B)
engines/banza-conformance/target/release/banza-conformance-rs run-fed-fixtures   # 37 fixtures (Track C)
engines/banza-conformance/target/release/banza-conformance-rs run-ab             # A→B end-to-end + replay (Track D)
engines/banza-trust/target/release/banza-trust federation-ote-demo               # positive ROUTING_ALLOWED path
make public-claims-evidence                                # full battery + commit-pinned bundle manifest
```

The A→B scenario prints a stable `result_sha256`; two independent runs are byte-identical (E6 reproducibility).

## What changed in the canon artifacts (completing, not weakening)

- **CORRECTION-1 — `FED-SPM-009` fixture inconsistency.** The case composed `SPM-A-VALID` (`operator-a-test`)
  with `BRL-REVOKED-PEER` (which revokes `operator-b-test`) yet expected `operator_revoked_in_brl`. The
  operator was not in the BRL, so the declared verdict was unsatisfiable from the data. The rule is
  unambiguous (an operator is rejected iff listed in the BRL); only the data was wrong. Fix: added
  `SPM-B-VALID` (operator-b) and repointed the case, so the vector genuinely exercises a revoked operator.
  This also gives the previously-orphaned `MANIFEST-B-VALID` a matching SPM sibling. **No result was bent to
  the implementation; the fixture was corrected to its own stated intent.**
- **`build_input` enrichment (banza-trust).** The valid trust material now also carries the operator's
  federation surface (`supports_federation`, capability flags, `interop_endpoint`) and metadata
  `capabilities`. These fields are inert for the trust-status evaluation; existing trust tests are unchanged.

## STOP-RULE (§5) outcome

No normative gap was hit. Every check the OTE and the fixture runner apply is determined by an existing
ADR/contract/schema/fixture: the ten checks and the `ROUTING_ALLOWED`/`FAIL_CLOSED` outcome are the
`contracts/production/federation-trust-evaluation.production.schema.json` authority; the fixture verdicts
are the suite's own `expected`/`expected_error`. The single data inconsistency (FED-SPM-009) had an
unambiguous intended rule, so it was corrected and documented rather than invented.

## Adversarial pass (attempts to refute the upgrades)

All refutations came back **PLAUSIBLE precision notes, none reversing an upgrade**; each is already reflected
in the evidence wording:

1. **OTE check #10 (`fail_closed_on_missing_or_invalid`) is the conjunction of the other nine** — it is the
   contract's explicit fail-closed meta-rule, surfaced as required; it adds no independent signal beyond the
   nine and is not claimed to.
2. **`endpoint_contract_compatible` is a structural surface check** (HTTPS origin-bound + federation declared),
   not a live endpoint probe. Stated as such; live fetch is proven separately by `banza-artifact-fetcher`.
3. **"Distinct operators", never "distinct codebases".** A/B is two distinct operator identities/keys/material/
   ledgers under the one shared open-protocol verification engine — operators do not reimplement verification.
   The evidence says exactly this; no claim of two implementations.
4. **Replay is independently *reproducible*, not a second implementation** — a third party re-running the
   committed code gets the same SHA-256. That is E6 reproducibility, phrased as such.
5. **Fixture runner is structural, not cryptographic** — transparently classified (33 structural/semantic,
   1 crypto-delegated to `banza-trust` real ed25519, 3 SimB-driven). The signature case is executed with real
   keys, not asserted from a placeholder-signature fixture.

## Mandated declarations

- **Trust valid ≠ routing allowed (§30).** The OTE carries `trust_status` (e.g. `TRUST_VALID`) but the
  routing decision is the separate `outcome` enum. An operator can hold valid trust and still `FAIL_CLOSED`
  on capability, endpoint or authenticated revocation. The A→B scenario exercises exactly this separation.
- **No central clearing intermediary (§136-137).** Nothing here adds a central clearing/settlement
  intermediary to "prove L3". Routing is exercised by the in-process `banza-simb` operator ledgers (atomic
  postings, obligations, bilateral netting); BANZA is in neither the trust path nor the funds path.
- **Whitepaper not edited (§7).** No file under `docs/whitepaper/` was changed. See the proposal below.
- **Website not changed first (§8).** No `website/` surface was changed. This gate is engine + evidence only.
- **Production trust root out of scope.** All keys are deterministic TEST material; the production root-key
  ceremony (M2) is a separate milestone and is not a claim of this gate.

## Whitepaper change proposal

**None required.** The whitepaper's federation and reproducibility wording (§10 federation as a bounded,
local, per-interaction relation with `ROUTING_ALLOWED`/`FAIL_CLOSED`; §12 deferring production-scale
reproducibility and performance) remains accurate and is now **more** supported by executed evidence, not
less. This milestone strengthened internal evidence completeness without changing any public claim, so there
is nothing to add, qualify, or retract. Any future edit must still originate in the Overleaf PT edition per
[`docs/whitepaper/BUILD.md`](../whitepaper/BUILD.md).

## Verdict

**GO — pre-production reference implementation.** The four completeness gaps are closed and executed; the
public claim classification improves to **80 PROVEN / 25 PARTIALLY_PROVEN / 4 IMPLEMENTED_BUT_UNTESTED /
1 DOCUMENTED_ONLY / 1 TESTED_BUT_NOT_LIVE**, with zero NOT_IMPLEMENTED and no strengthened public wording.
The GO is bounded to the pre-production reference implementation and does not depend on the production trust
root or a live multi-origin network.
