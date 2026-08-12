# Trust, Security and Contracts Realignment Report — M2.19B (Finding B)

**Milestone:** M2.19B — the first build submilestone of the M2.19-FINAL launch program.
**Branch:** `release/m2-19-final-banza-v1-launch-2026-08-01` · **Base:** `8caf872` (M2.19A).
**Decision of record:** [ADR-058 — Trust Invariant Registry Realignment](../../decisions/adr/ADR-058-trust-invariant-registry-realignment.md).
**Discovery input:** `artifacts/m2-19-final/finding-b-map.json`.

## Why this ran

M2.19A made the ADR tree current-only. Deleting the CA-era ADRs (004/022/026/027/032) exposed
**Finding B**: the layers *below* the ADRs — the canonical invariant registry, the federation
specifications, the conformance suite, the readiness/assurance/trust engines, the security corpus, the
public Reference, BanzAI's grounding index and the protocol-state database — still carried the removed
central-authority model in *identifiers* and in *artifacts*. ADR-038 had superseded the
`INV-TRUST-001…007` federation-trust invariant series "in full" (→ `INV-OTE-*`) and ADR-040 had defined
`INV-FEDEVAL-001…010`, but neither realignment had been applied to the implementation. The residue:

- **333 occurrences of the retired `INV-TRUST-*` identifiers across ~68 files.**
- The canonical registry `contracts/invariants.json` declared `INV-TRUST-001…007` as live, contained
  **zero** `INV-OTE-*` and **zero** `INV-FEDEVAL-*`, and mis-attributed the removed ids to ADR-040.
- Residual operator-certificate artifacts: 7 `CERT-*.json` fixtures, `certificate_url` in 15 fixtures, a
  matrix requirement to publish a BANZA-signed certificate, the verification-api `/certificates` route +
  its SQL, and the `certificates` table + `certification_level`/`certificate_id` columns in the DB schema.

## What changed

**Canonical registry realigned** (`contracts/invariants.json`). The `TRUST` family was removed; the
ADR-authoritative families were registered verbatim: **`INV-OTE-001…010`** (ADR-038, general Open Trust
Evaluation) and **`INV-FEDEVAL-001…010`** (ADR-040, federation-routing application). The surviving root/key
family was extended with the re-homed custody invariants **`INV-ROOT-007…010`** (no single-entity root
control; bounded delegation; seat continuity; authenticated key rotation).

**333 citations re-homed** across contracts, federation specs, conformance suite, MATRIX governance docs,
the security corpus, the bilingual Reference + website mirror, and the engines (with golden vectors) — per
the authoritative mapping table in ADR-058:

| Retired | → | Retired | → |
|---|---|---|---|
| INV-TRUST-001 | INV-FEDEVAL-004 | INV-TRUST-007 | INV-ROOT-010 |
| INV-TRUST-002 | INV-FEDEVAL-006 | INV-TRUST-ROOT-001 | INV-ROOT-007 |
| INV-TRUST-003 | INV-FEDEVAL-002 | INV-TRUST-CA-001 | INV-ROOT-008 |
| INV-TRUST-004 | INV-FEDEVAL-007 | INV-TRUST-DELEG-001 | INV-ROOT-008 |
| INV-TRUST-005 | INV-FEDEVAL-005 | INV-TRUST-SEAT-001 | INV-ROOT-009 |
| INV-TRUST-006 | INV-FEDEVAL-005 | | |

Enumerated invariant tables merged the two pairs that share a target (005+006→INV-FEDEVAL-005;
CA-001+DELEG-001→INV-ROOT-008) into a single row; free prose replaced ids inline.

**Operator-certificate artifacts removed.** The 7 `CERT-*.json` fixtures were recast into
signed-protocol-metadata fixtures (`SPM-*.json`, preserving each failure mode); `certificate_url` was
stripped from 15 fixtures (replaced by `signed_protocol_metadata_url` where a published-material URL is
needed); `MANIFEST-MISSING-CERTIFICATE-URL.json` (which tested a removed requirement) was deleted;
`MANIFEST-FEDERATION-NO-CERT` became `MANIFEST-FEDERATION-NO-EVIDENCE`; the conformance `FED-CERT-*` vector
group became `FED-SPM-*`. The MATRIX_C requirement to publish a BANZA-signed certificate was replaced with
"publish signed protocol metadata + reproducible conformance evidence". The verification-api `/certificates`
route + handler + SQL were removed (canonical evidence route: `/conformance/evidence`); `operators()`
stopped selecting `certification_level`/`certificate_id`. The DB init schema dropped the `certificates`
table, the operator certificate columns and the BRL `certificate_id` (→ `revoked_ref`, crypto-material
scoped); an idempotent migration (`infra/banza-network/postgres/migrations/M2_19B_remove_operator_certificates.sql`)
brings an already-initialised database in line. The `banza-operator-certificate-lifecycle` SVG (whose content
was already the current conformance/self-publication lifecycle) was renamed to
`banza-operator-conformance-lifecycle`.

**Grounding regenerated + WASM rebuilt.** `doc-index.json` and the repo-index were regenerated from the
realigned docs, and the WASM bundles that embed them (`/ask` grounding shim) and the changed engine reason
strings were rebuilt, so live behaviour matches the source. After regeneration, `INV-TRUST` survives in the
grounding only in the ADR-058 chunks (the authoritative removal record).

## Preserved (surviving trust — untouched)

The offline threshold Trust Root, delegated signing keys, the signed Key Manifest, domain separation, key
lifecycle, revocation-as-cryptographic-signal, the `root → delegated → signed-protocol-metadata` signature
chain, the `not_certificate` / `not_operator_certificate` boundary assertions in the production schemas, and
the `banza-trust` engine's active rejection of operator-certificate inputs. `production_certificates = false`
is the ADR-038-endorsed honest boundary flag and is kept everywhere. No financial invariant
(`INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`, `INV-IDEM-*`, `INV-FED-RECON-*`, `INV-QR-*`, `INV-FED-*`,
`INV-FED-LEDGER-*`) was changed.

**Legitimately still name `INV-TRUST` (to explain the removal):** ADR-038/057/058 + their website mirrors,
the query-core removed-term catalogue, and `tools/check-trust-invariant-realignment.sh` (which detects the
identifier). These are excluded by design.

## Gate results

| Gate | Target | Result | Evidence |
|---|---|---|---|
| `removed_ca_content` | 0 | **0** | no `CERT-*.json`; no `certificate_url`; MATRIX_C requirement replaced; SVG renamed; DB table dropped |
| `ambiguous_certificate_routes` | 0 | **0** | `/certificates` route + handler removed; README/ANNEX/`/estado`/verification-api-README updated; legacy compat doc → removal record |
| `legacy_trust_invariants` | 0 | **0** | 0 `INV-TRUST-*` on the active surface (verifier CHECK-1 leaks all fixed) |
| `trust_contract_adr_divergence` | 0 | **0** | registry carries INV-OTE-*(10)+INV-FEDEVAL-*(10), 0 INV-TRUST, no TRUST family; `invariant-check` PASS |
| `certificate_chain_runtime_paths` | 0 | **0** | `/certificates` SQL removed; `certificate_url` conformance chain removed; surviving root→delegated→SPM signature chain distinguished and kept |

## Verification

- **`make invariant-check`** — PASS (contracts/ + conformance/ cite only registered ids).
- **`make trust-invariant-realignment-check`** (new guard, ADR-058, self-testing; wired into Makefile + CI) — PASS on all 5 gates.
- **Adversarial verification** (independent agent): CHECK-2 (semantic mapping) PASS — 0 mismaps across 17+ sampled sites, merge rule correct; CHECK-3 (surviving-trust intact) PASS; CHECK-1 found 9 residual leaks, **all fixed** (CONTRIBUTING/Makefile → INV-FEDEVAL-005; SECURITY.md family list; 4 PHASE_ historical docs; the normative-hierarchy SVG family list; the generated doc-index via regeneration).
- **Conformance suite validation**: `suite.json` valid, 0 dangling fixture references, 7 SPM recasts present, 0 `certificate_url`/`issuer:BANZA` operator-certificate bodies, all federation contract JSON parse.
- **`cargo fmt --check`** clean on the 5 touched engines; the trust engines' `cargo test` green.
- **Full guards battery + builds** — all green: 40+ guards (identity, purity, invariant, rust-rule, trust-invariant-realignment, postgres-boundary, reference-IA, license-notice, open-governance, all BanzAI grounding/vocab/corpus guards, SVG guards), conformance-rs (fed+live over the recast SPM fixtures), cargo query-core + trust engines + repo-guards tests, banzai-api node 301, website vitest 340, tsc + next build clean.
- **CI** — PR #216, 145 checks pass / 0 fail (2 fixes after first run: repo-guards ADR range `1..=57`→`1..=58` for ADR-058; brand-neutral M2.19B artifacts, as the Banzami scheme + its identity-guard allowance land in M2.19C/H).
- **Merged + deployed + live-QA** — merged to `main` (`b15851b`); prod (`banza-prod`) rebuilt website + verification-api + banzai-api, applied the `M2_19B` DB migration (`ALTER×2`, `DROP TABLE certificates`, `certificate_id`→`revoked_ref`), restarted reverse-proxy. Public-edge live-QA: `/certificates` → **404** (dropped from the canonical-routes hint); `/operators` `[]`, `/conformance/evidence`, revocation-list (**not degraded** — migration verified), key-manifest → 200; `/banzai/ask` on a trust-invariant question grounds on **`INV-FEDEVAL-002`** with **0 `INV-TRUST`**, `grounded=true`, `external_model_called=false`.

## Status

**COMPLETE + LIVE.** All five gates = 0, verified in source and in production.

## References

- [ADR-058](../../decisions/adr/ADR-058-trust-invariant-registry-realignment.md) — the decision + authoritative mapping table
- `contracts/invariants.json` — the realigned canonical registry
- `artifacts/m2-19-final/finding-b-map.json` — the discovery
- `tools/check-trust-invariant-realignment.sh` — the enforcement guard
