# M2.19D — Conformance & Interoperability Certification (Layer 2)

**Status:** COMPLETE + LIVE
**Milestone:** M2.19-FINAL · submilestone D
**Layer:** L2 — Conformance & Interoperability Certification
**ADRs:** ADR-064 (certification model) · ADR-065 (Technical Registry) · ADR-066 (closed state machine)
**Base commit:** `d8e014a` (M2.19C COMPLETE + LIVE)
**Branch:** `release/m2-19d-conformance-interop-certification`

---

## 1. What M2.19D delivers

M2.19D makes Layer 2 of the three-layer institutional architecture (ADR-059) a
first-class, deterministic, verifiable protocol subsystem. It answers one
question with an auditable machine: **"is this specific implementation certified,
against which public yardstick, in which environment, with which scope, until
when — and can anyone verify that offline?"**

The answer is produced by a **Rust engine** (`engines/banza-certification`),
never by a language model and never by a human override. Certification is a
**technical** statement about an **implementation artifact**; it is explicitly
**not** a licence, an admission to any operational scheme (L3), a regulatory
authorisation, a commercial approval, or an institutional guarantee.

### Core objects (ADR-064)

| Object | Role |
|---|---|
| `CertifiedImplementation` | The subject — an implementation identified by its artifact hash (`implementation_hash`). |
| `InteroperabilityCertificationProfile` | The public, versioned yardstick (`profile_id`, protocol version, required capabilities, environment, scope). |
| `ConformanceReport` / `InteroperabilityReport` | The evidence the verdict is decided from (bound by hash into the record). |
| `InteroperabilityCertificationRecord` | The verdict: Rust-decided, evidence/hash-bound, scoped, time-limited, self-verifiable. |

### Closed state machine (ADR-066)

`NOT_CERTIFIED · CERTIFIED · EXPIRED · SUSPENDED · REVOKED · SUPERSEDED`

- Only `CERTIFIED` is a valid, currently-recognised certification.
- Transition table is fixed; **REVOKED is terminal**.
- **Renewal is a new record**, never an extension of an old one.
- Temporal expiry + revocation are evaluated **with fail-closed semantics**
  (`effective_status()`): anything ambiguous resolves to *not valid*.

### Technical Registry (ADR-065)

A public, root-verifiable, **account-free** index of certified implementations,
derived from certification records. It is a **technical index of certification
results** — deliberately **independent of** any scheme participant directory
(L3). Presence means "this implementation holds this certification record" and
never "this entity is admitted to a scheme" or "authorised by a regulator".
Baseline is empty and honest (`production_certificates = false`).

---

## 2. Deterministic authority — the Rust engine

`engines/banza-certification` (crate `banza-certification`, lib + bin):

- `certify(CertifyInput) -> InteroperabilityCertificationRecord` — the pipeline:
  identity → signature → trust → revocation → profile → protocol → environment →
  artifact hash → evidence completeness → capability coverage → conformance →
  interoperability → validity window. Any failed check yields a non-`CERTIFIED`
  record with a machine-readable `ReasonCode`. **Fail-closed throughout.**
- `record_checksum` / `verify_record` — canonical SHA-256 over the record
  (via `banza-trust::canonical_sha256`), so a third party reproduces the verdict
  offline from the record alone.
- `transition()` — the closed ADR-066 table; illegal transitions are rejected;
  REVOKED is absorbing.
- `effective_status()` — temporal + revocation state applied fail-closed.
- `registry_entry()` — projects a record into a Technical Registry entry
  (never changes the verdict).

**Authority boundary (enforced in-code and by guard):** no Qwen, no external
model, no human `FAIL → PASS` override. The engine decides; the registry
reflects; BanzAI only explains.

### Tests

- `engines/banza-certification`: **14** unit + property tests — happy path;
  determinism; hash-change invalidates; one-implementation certification does not
  inherit to another; profile/protocol/environment mismatch; incomplete evidence;
  missing interoperability report; capability/trust failures; state-machine legal
  + illegal transitions; expired/revoked/superseded never valid; tamper →
  not-certified; renewal = new record; registry projection never changes the
  verdict; suspension/revocation must be signed + dated.
- `cargo fmt --check` ✓ · `cargo clippy --all-targets -D warnings` ✓

---

## 3. Contracts + routes

**Production JSON Schemas** (`contracts/production/`):
`certification-record`, `certification-profile`, `certified-implementation`,
`interoperability-report` (+ pre-existing `conformance-report` /
`conformance-evidence`). The record schema binds `implementation_hash`,
`profile_id`, `scope_levels`, `environment`, `expires_at`,
`conformance_report_hash`, `interoperability_report_hash`, `record_hash`.

**Engine-verified examples** (`contracts/production/examples/`):
`certification-record.valid.json` (generated by the engine; re-verifies) and
`certification-record.invalid-authorised-claim.json` (a record that falsely
claims authorisation → rejected).

**OpenAPI 3.1 public surface**
(`contracts/openapi/interoperability-certification.yaml`) — read-only,
account-free, no financial action:

| Route | Purpose |
|---|---|
| `GET /interoperability-certifications` | List records (filter by status/profile/implementation). |
| `GET /interoperability-certifications/{record_id}` | Fetch a record (effective status applied). |
| `GET /interoperability-certifications/{record_id}/verify` | Recompute `record_hash` + re-evaluate status → deterministic verdict. |
| `GET /technical-registry` | The Technical Registry index (+ boundary notice). |
| `GET /technical-registry/{implementation_hash}` | Registry entry for one implementation. |

The legacy `/certificates` route is **not** reintroduced (guard-enforced).

---

## 4. Governance + public surface

- **Canonical doc:** `docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md`
  — states, verbatim, that certification is technical and per-implementation
  (limited to profile / version / environment / capabilities / scope / validity)
  and is **not** a licence, scheme admission, authorisation, commercial approval
  or institutional guarantee; and that the registry is independent of any scheme
  directory.
- **Decisions index (`/decisoes`):** ADR-064/065/066 rendered from
  `website/lib/decisions.ts` (+ `website/content/decisions/adr/` mirrors),
  normative level N3.
- **ADR range:** `engines/banza-repo-guards` extended to `1..=66`; the
  operator-attribution allowlist extended for ADR-064/065/066 and the L2
  governance doc.

---

## 5. BanzAI grounding — deterministic, 0-model

- `engines/banzai-query-core/src/concept.rs`: brand-free aliases for the L2
  concepts → ADR-064 (certification model), ADR-065 (registry), ADR-066 (state
  machine).
- `engines/banzai-query-core/src/route.rs`: a `def-l2-certification` critical
  entry served at **Tier 1** (0 model) for "certificação de conformidade e
  interoperabilidade" and variants.
- `services/banzai-api/src/knowledge.js`: `def-l2-certification` ENTRY +
  `adr064/065/066` SOURCES. The answer states: technical / per-implementation;
  not a licence / admission / authorisation; verifiable without an account.
- Corpus reindexed: **67 canonical docs / 654 chunks / 61 ADRs** (ADR-064/065/066
  discoverable + resolvable + citable — `artifacts/m2-18b3/corpus-truth-table.json`).
- Vocabulary regenerated (`artifacts/m2-18b7/*.json`).

---

## 6. Guards

- **New:** `tools/check-banza-certification-model.sh` (`banza-certification-model`)
  — asserts the three ADRs + governance doc exist; the record contract is
  implementation-bound with all required fields; the closed state machine is
  exactly the ADR-066 enum with the fail-closed + Rust-sole-authority markers;
  certification ≠ licence/admission/authorisation; registry ≠ scheme directory;
  the L2 public routes are declared; `/certificates` is not reintroduced. Wired
  into the Makefile + the `identity-guard` CI workflow.
- **Green battery:** repo-guards `purity` / `contamination` / `invariants`;
  `identity-check`; `rust-rule-check`; `banzai-canonical-corpus-integrity`;
  `banzai-protocol-vocabulary`; `certification-admission-separation`;
  `three-layer-architecture`; `banzai-repo-knowledge-safety`;
  `public-surface-clean`; `governance-docs-clean`.

---

## 7. Local test battery (pre-merge)

| Suite | Result |
|---|---|
| `banza-certification` (engine) | 14 passed |
| `banzai-query-core` | 201 passed (+ property/metamorphic) |
| `banzai-api-kb` | 119 + passed |
| `banzai-api` (node) | 301 passed |
| website vitest | 340 passed |
| website `tsc --noEmit` | clean |
| website `next build` | success |

---

## 8. Commits (base `d8e014a`)

```
dbc63c3 ADR-064 cornerstone + repo-guards range 1..=64
8e4023b ADR-065 Technical Registry + ADR-066 closed state machine
d3f0cca deterministic Rust certification engine (banza-certification)
0a51028 L2 certification contracts + engine-verified examples
b22098e L2 website decisions + canonical governance doc
3f2c298 BanzAI L2 grounding — concepts + deterministic certification card
58d1b42 banza-certification-model guard + Makefile + CI wiring
57ff044 regen corpus truth-table (67 docs / 654 chunks)
3a0882d L2 public verification + Technical Registry OpenAPI routes + guard coverage
20534fd PT 'fecho por omissão' in decisions.ts (rust-first marker)
```

---

## 9. Production validation

**PR / CI / merge**
- PR [#221](https://github.com/banza-protocol/banza/pull/221) — CI **163 pass / 0 fail** (all identity-guard, repo-guards R10, per-crate, and website jobs green).
- Merged (`--admin --squash`) → **`67f5c05`** on `main`.
- CI fixes applied before green: rebuilt repo-guards binary for the ADR-065 allowlist (stale-binary gotcha); PT "fecho por omissão" in `decisions.ts` (rust-first marker); dropped the operator brand token from this report (contamination, non-allowlisted path); regenerated `canonical-protocol-vocabulary.json` + `subject-registry.json` (stale after the L2 concept additions).

**Deploy (VPS `82.165.165.97`, `/srv/banza-protocol/runtime`)**
- `sudo git pull` → repo at `67f5c05`; `docker compose build website banzai-api` → `docker compose up -d`; `reverse-proxy` restarted.
- Deployed digests: website `sha256:ef5d346b50a3bd28d886f36bffa31bc49eb58a3842d171b2f18a7d2003d7c162`; banzai-api `sha256:8ccd60c224c4ff18e1f662e2e12912748e5746dfb543542babb7df32b9cd5eb2`. Both containers `healthy`.

**Public-edge evidence (`https://banza.network`)**
- `GET /decisoes` → HTTP 200; renders ADR-064, ADR-065, ADR-066 ("certificação de conformidade", "Registo Técnico", "máquina de estados").
- `POST /banzai/ask` "o que é a certificação de conformidade e interoperabilidade?" → HTTP 200, `answer_type=governance_explanation`, **`external_model_called=false`** (0 model), `sources=[ADR-064, ADR-065, ADR-066]`; answer states technical / per-implementation (artifact hash), Rust-decided, scoped + time-limited, and **not** a licence, regulatory authorisation, or scheme admission.
- `POST /banzai/ask` "o que é o registo técnico da BANZA?" → HTTP 200, `external_model_called=false`, `sources=[ADR-065, ADR-060]`.
- `POST /banzai/ask` "a certificação de conformidade é uma autorização para operar?" → HTTP 200, `external_model_called=false`, `sources=[ADR-064, ADR-065, ADR-066]`; reiterates certification is of an implementation, never an authorisation/admission.

**Rollback** — revert `67f5c05` (or check out `b15851b`, M2.19B) and redeploy the prior image digests.

**Verdict: M2.19D = COMPLETE + LIVE.** Layer 2 is a deterministic, Rust-decided, hash-bound, fail-closed protocol subsystem; publicly rendered, deterministically grounded (0 external model), and boundary-clean (certification ≠ licence ≠ admission ≠ authorisation) on the production edge.
