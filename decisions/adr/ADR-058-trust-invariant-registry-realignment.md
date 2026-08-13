# ADR-058 — Trust Invariant Registry Realignment (Retire the INV-TRUST Namespace)

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19B (Trust, Security and Contracts Realignment — Finding B)
- **Completes:** **ADR-038** (which superseded `INV-TRUST-001…007` "in full" but left the removed
  identifiers in the contracts, specs, engines, grounding and public reference) and **ADR-040** (which
  defined `INV-FEDEVAL-001…010` but was never wired into the canonical invariant registry). This ADR
  reverses **no** decision of ADR-038/039/040 — it removes the residue those decisions left behind.
- **Related:** ADR-037 (Rust-first engines), ADR-039 (operator self-publication), ADR-042 (PostgreSQL
  is a protocol-state store, not a financial DB), ADR-057 (current-only canonical ADR tree)

---

## Context

ADR-038 removed CA/certificate-based operator trust from the active protocol model and stated, in its
*Invariants* section, that the former central-authority federation-trust series `INV-TRUST-001 … INV-TRUST-007`
"was expressed entirely over the removed issued certificate and **is superseded in full**", replaced by the
Open Trust Evaluation series `INV-OTE-001 … INV-OTE-010`. ADR-040 then decomposed that same evaluation, for
federation routing, into the ten mandatory checks and the invariant series `INV-FEDEVAL-001 … INV-FEDEVAL-010`.

Those two decisions are sound and stand. But they were applied to the *decisions* layer only. The
**implementation** layer — the canonical machine-readable invariant registry, the federation specifications,
the conformance fixtures and suite, the readiness/assurance/trust engines, the security corpus, the public
Reference, BanzAI's grounding index, and the protocol-state database schema — was never realigned. The
M2.19B discovery (`artifacts/m2-19-final/finding-b-map.json`) measured the residue:

- **333 occurrences of the retired `INV-TRUST-*` identifiers across ~68 files.** The *statements* had
  already been re-narrated to the signed-protocol-metadata / conformance-evidence / revocation model, but
  they still wear the identifiers of the removed certificate series. A reader — or BanzAI's `/ask` grounding —
  reaches the removed identifiers as if they were the current canonical invariants.
- **The two canonical surviving families are entirely absent from the registry.** `contracts/invariants.json`
  declares `INV-TRUST-001…007` as live, contains **zero** `INV-OTE-*` and **zero** `INV-FEDEVAL-*`, and
  mis-attributes the removed `INV-TRUST` identifiers to ADR-040 (which defines `INV-FEDEVAL-*`, not
  `INV-TRUST-*`). The machine source of truth diverges from the ADRs it cites.
- **Residual operator-certificate artifacts survive as live content.** Seven `CERT-*.json` conformance
  fixtures model a BANZA-issued, expiring, level-bearing certificate *about an operator* — the exact artifact
  ADR-038 removed; fifteen manifest/routing fixtures carry a `certificate_url` pointing at a removed
  `/.well-known/banza/certificate.json`; a matrix row *requires* operators to publish that certificate; the
  verification-api exposes a `/certificates` route whose SQL selects issued operator certificates; and the
  protocol-state database schema defines a `certificates` table plus `certification_level` / `certificate_id`
  columns on `operators` and `brl_entry`.

This is not a second contradiction inside the ADR tree (M2.19A resolved that). It is the removed model
persisting in the layers *below* the ADRs — the layers people and machines actually consume. Leaving it in
place means the protocol's canonical invariant registry, its conformance suite and its public Reference all
still describe, in identifiers and in artifacts, a Certificate Authority that ADR-038 removed.

## Decision

**The `INV-TRUST-*` identifier namespace is retired from the entire repository. Every surviving statement it
carried is re-homed, verbatim in intent, to the canonical series the current ADRs define — `INV-OTE-*`
(ADR-038, general Open Trust Evaluation), `INV-FEDEVAL-*` (ADR-040, federation-routing application), or the
surviving `INV-ROOT-*` family (root/key custody). Residual operator-certificate artifacts are removed as
removed-CA content. No invariant's normative meaning changes; only its identifier and, for the removed
certificate artifacts, its existence.**

| ID | Rule |
|----|------|
| **D-058-01** | **The `INV-TRUST-*` namespace is retired.** No canonical id, alias, citation, contract, spec, fixture, engine reason code, grounding chunk, public page or database comment may use an `INV-TRUST-*` identifier. The namespace is not re-mapped as an alias (an alias would keep the removed identifier alive); it is removed. |
| **D-058-02** | **The canonical registry carries the ADR-authoritative families.** `contracts/invariants.json` registers `INV-OTE-001…010` verbatim from ADR-038 and `INV-FEDEVAL-001…010` verbatim from ADR-040, and extends the surviving `INV-ROOT-*` family with the re-homed key/custody invariants. The `TRUST` family is removed. |
| **D-058-03** | **Re-homing preserves meaning.** Each retired statement is re-homed by the authoritative mapping table below. The re-homed statement's severity, behaviour and enforcement are unchanged; identifiers move, decisions do not. Where a target invariant already states the rule (ADR-038/040 are the authority), the retired statement's text is dropped in favour of the canonical text, not duplicated. |
| **D-058-04** | **Federation-routing citations map to `INV-FEDEVAL-*`.** Every `INV-TRUST-001…006` citation lives in a federation-routing context (federation specs, federation contracts, federation conformance, L3/L4 federation-eligibility readiness), so it re-homes to the federation-routing series `INV-FEDEVAL-*`, per the mapping. The general `INV-OTE-*` series is the canonical *general* trust series and is registered as such; it is not substituted into existing federation-routing citations. |
| **D-058-05** | **Key/custody invariants re-home to `INV-ROOT-*`.** The root-custody, bounded-delegation, seat-continuity and authenticated-key-rotation invariants are not part of the trust *evaluation*; they are key-lifecycle invariants and survive under the `INV-ROOT-*` family (ADR-038 *Legacy compatibility* carries the offline-threshold root, delegated keys and key manifest forward unchanged). `INV-TRUST-CA-001` and `INV-TRUST-DELEG-001` are the same statement and de-duplicate to one target. |
| **D-058-06** | **Operator-certificate artifacts are removed.** The `CERT-*.json` operator-certificate fixtures, the `certificate_url` field and its removed well-known path, the matrix requirement to publish an operator certificate, the verification-api `/certificates` issued-certificate route and its SQL, and the `certificates` table plus `certification_level` / `certificate_id` columns in the protocol-state schema are removed. The canonical published-material URL is signed protocol metadata; the canonical evidence route is `/conformance/evidence`. |
| **D-058-07** | **Surviving trust primitives are preserved exactly.** The offline threshold Trust Root, delegated signing keys, the signed Key Manifest, domain separation, key lifecycle, revocation-as-cryptographic-signal, the `root → delegated → signed-protocol-metadata` signature chain, and the `not_certificate` / `not_operator_certificate` boundary assertions in the production schemas all survive unchanged. This ADR removes the removed CA; it does not touch what ADR-038 kept. |
| **D-058-08** | **No financial invariant is touched.** `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`/`INV-STL-*`, `INV-IDEM-*`, `INV-RECON-*`/`INV-FED-RECON-*`, `INV-QR-*`, `INV-FED-*` and `INV-FED-LEDGER-*` are unchanged. They govern what a correct implementation does with money — orthogonal to who is trusted and by what identifier. |

### Authoritative mapping table

The single source of truth for the M2.19B sweep. Every retired identifier maps to exactly one canonical
successor; the "meaning" column confirms the re-home preserves the statement.

| Retired `INV-TRUST-*` | Statement (unchanged) | Re-homed to | Authority |
|---|---|---|---|
| **INV-TRUST-001** | Signed protocol metadata is valid iff its signature verifies against the key resolved from the active Key Manifest for its `issuer_key_id` (trust root or delegated key). | **INV-FEDEVAL-004** | ADR-040 (check 5) |
| **INV-TRUST-002** | Trust material rejected past `expires_at`, no grace period; ≤ 90-day window for L3+. | **INV-FEDEVAL-006** | ADR-040 (check 9) |
| **INV-TRUST-003** | Any revoked key/artifact/implementation id → rejected from all routing, regardless of any other signal. | **INV-FEDEVAL-002** | ADR-040 (check 6 / fail-closed) |
| **INV-TRUST-004** | `supports_federation: true` requires published, valid, fresh, non-revoked L3+ conformance evidence that passes the Open Trust Evaluation. | **INV-FEDEVAL-007** | ADR-040 (check 7) |
| **INV-TRUST-005** | The Revocation List MUST be signed by the revocation-domain delegated key; unsigned/unverifiable ⇒ treated as absent (fail-closed). | **INV-FEDEVAL-005** | ADR-040 (check 6) |
| **INV-TRUST-006** | No routing decision against a Revocation List older than 6 hours (staleness within the list's freshness window). | **INV-FEDEVAL-005** | ADR-040 (check 6) |
| **INV-TRUST-007** | A key rotation MUST be authenticated by signing the rotation request with the currently-bound private key. | **INV-ROOT-010** | ADR-038 *Legacy compatibility* (key lifecycle) |
| **INV-TRUST-ROOT-001** | No single entity may solely control the protocol's maximum authority; root custody requires threshold control. | **INV-ROOT-007** | ADR-038 *Legacy compatibility* (offline threshold root) |
| **INV-TRUST-CA-001** | No delegated signing key may exercise authority beyond what the active Trust Root delegates to it. | **INV-ROOT-008** | ADR-038 *Legacy compatibility* (bounded delegation) |
| **INV-TRUST-DELEG-001** | *(identical to INV-TRUST-CA-001)* No delegated key may exercise authority beyond its explicitly delegated scope. | **INV-ROOT-008** | ADR-038 *Legacy compatibility* (bounded delegation) |
| **INV-TRUST-SEAT-001** | Loss or replacement of an institutional seat occupant cannot compromise continuity of the protocol's maximum authority. | **INV-ROOT-009** | ADR-038 *Legacy compatibility* (custody continuity) |

The `INV-TRUST-*` *family* references (`INV-TRUST-*` as a group name) become "the trust invariants
(`INV-OTE-*` / `INV-FEDEVAL-*`) and the root/key invariants (`INV-ROOT-*`)".

### Conformance vector renaming

The `FED-CERT-*` conformance vector group and the `CERT-*.json` fixtures are named for the removed operator
certificate. They re-home to `FED-SPM-*` (signed-protocol-metadata) vectors over `SPM-*.json` fixtures,
testing the same behaviours against the surviving artifact: expired signed protocol metadata, invalid SPM
signature, insufficient conformance scope, operator-id mismatch, capability gap, `issuer_key_id` absent
from the Key Manifest. The negative fixture asserting a manifest is invalid *without* a certificate URL is
deleted (it tested a removed requirement); "federation without a certificate" is recast to "federation
without published conformance evidence" (INV-FEDEVAL-007).

## Consequences

**Positive.**

- **The registry matches the ADRs.** `contracts/invariants.json` — the machine source of truth that contracts
  and the conformance suite must cite — carries exactly the families ADR-038 and ADR-040 define. The
  `trust_contract_adr_divergence` gate reaches zero.
- **No removed identifier survives.** A reader, an auditor, a verifier and BanzAI all reach `INV-OTE-*` /
  `INV-FEDEVAL-*` / `INV-ROOT-*` — never a `INV-TRUST-*` identifier and never an operator certificate. The
  `legacy_trust_invariants`, `removed_ca_content`, `ambiguous_certificate_routes` and
  `certificate_chain_runtime_paths` gates reach zero.
- **The conformance suite tests the real artifact.** `FED-SPM-*` vectors exercise signed protocol metadata —
  the artifact peers actually verify — rather than a certificate no one issues.
- **The boundary is now structural at every layer.** ADR-038 made it structural in the decisions; M2.19B
  makes it structural in the contracts, the engines, the schema and the public surface.

**Negative (accepted).**

- **A large, mechanical sweep.** 333 citations across ~68 files change identifier. The risk is a wrong
  mapping or a missed occurrence; it is contained by the single authoritative mapping table above, by
  adversarial per-batch verification, and by the `invariant-check` guard, which fails the build on any cited
  identifier absent from the registry.
- **Machine output changes.** Engines that emitted `INV-TRUST-*` reason codes now emit the re-homed
  identifiers; the affected golden vectors are updated in the same change. Evidence bundles produced after
  M2.19B cite the canonical identifiers — which is the intended end state.

**Untouched.** Every financial invariant; the offline threshold Trust Root and its custody; delegated keys;
the signed Key Manifest; revocation-as-security-signal; the surviving signature chain; operator neutrality;
Rust as the sole decision authority; and the rule that BanzAI's model never sits in a decision path.

## References

- `artifacts/m2-19-final/finding-b-map.json` — the M2.19B discovery, per-file, with the gate counts
- ADR-038 *Invariants* — "`INV-TRUST-001 … INV-TRUST-007` … is superseded in full"; the `INV-OTE-*` series
- ADR-040 *Protocol Invariants* — the `INV-FEDEVAL-001 … INV-FEDEVAL-010` series
- `contracts/invariants.json` — the canonical machine-readable registry realigned by this ADR
