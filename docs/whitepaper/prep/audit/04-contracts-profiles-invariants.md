# Audit 04 — Contracts, Profiles, Schemas, Invariants, Discovery/Identity + Obsolete-Term Scan

> Whitepaper-prep grounded audit. Non-normative. Every claim below cites a file I actually read
> (repo-relative path + line/section). Scope: `contracts/**`, `spec/**`, discovery/identity/key/
> revocation schemas, and a whole-repo obsolete-term scan on active surfaces.
> Date: 2026-07-30. Auditor: subagent (contracts/profiles/invariants track).

---

## 1. Invariant families (canonical registry)

**Single source of truth:** `contracts/invariants.json` (schema_version 1, spec_version 1.0). It is the
"single machine-readable source of truth for every financial, trust, and structural invariant"
(`contracts/invariants.json:4`). Contracts and conformance may cite only IDs that appear here as a
canonical `id` or a registered `alias`; `tools/check-invariants.sh` / `make invariant-check` fail the
build on any cited-but-unregistered ID (`contracts/invariants.json:4`). Where a prose doc and the
registry disagree, "this registry's `statement` plus its cited `source` govern"
(`contracts/invariants.json:6`).

Severity ladder: `critical` (creates/destroys/misattributes value or breaks the trust anchor — blocks
conformance unconditionally), `high` (integrity/safety guarantee), `medium` (auditability/interop)
(`contracts/invariants.json:7-11`).

### Families with one-line each (grounded in `contracts/invariants.json:12-28`)

| Family | One-line | Source line |
|---|---|---|
| **LEDGER** | Double-entry integrity: balance, immutability, integer precision, atomicity. | `invariants.json:13` |
| **WALLET** | Wallet balance integrity: ledger-derived, non-negative, reserved/available identity. | `invariants.json:14` |
| **SETTLE** | Settlement correctness: `gross=net+fee`, no negative balances, immutable batches. Canonical IDs use `INV-STL-*`; `INV-SETTLE-*` is the advertised alias. | `invariants.json:15` |
| **IDEM** | Idempotency and replay safety. | `invariants.json:16` |
| **RECON** | External reconcilability: posting linkage via `trace_id`. Family alias `INV-RECON-*` maps to `INV-FED-RECON-001`. | `invariants.json:17` |
| **QR** | QR integrity: single-use, expiry, atomicity, signature, environment binding. | `invariants.json:18` |
| **TRACE** | Causal traceability across the event chain. | `invariants.json:19` |
| **IDENT** | Wallet-native identity uniqueness. | `invariants.json:20` |
| **EVENT** | Event stream integrity: id uniqueness, timestamp immutability. | `invariants.json:21` |
| **MON** | Monetary representation: integer minor units across the whole surface. | `invariants.json:22` |
| **OTE** | Open Trust Evaluation (ADR-038): CA-less trust model — signed-metadata authenticity, evidence binding/reproducibility, fail-closed, revocation validity; no BANZA-issued artifact and no human decision is an input. | `invariants.json:23` |
| **FEDEVAL** | Federation Trust Evaluation (ADR-040): ten conjunctive, locally-executed, fail-closed checks a routing party runs over a peer's published material. | `invariants.json:24` |
| **ROOT** | Root key / Key Manifest / key-management integrity: signing scope, manifest signature/expiry, validity windows, threshold custody, bounded delegation, seat continuity, authenticated rotation. | `invariants.json:25` |
| **FED** | Federation correctness: cross-operator trace identity, obligations, idempotency, value conservation, revocation, reconcilability. | `invariants.json:26` |
| **COLLECTION** | Payment collections (splits): no value holding, amount identity, terminal shares, idempotent creation. | `invariants.json:27` |

### The financial invariants named by CLAUDE.md, mapped to canonical IDs

- **INV-LEDGER-\*** — `INV-LEDGER-001` debits=credits (critical, `invariants.json:30-32`); `-002`
  immutability/append-only (`:33-35`); `-003` integer amounts i64, never float (`:36-38`); `-004`
  atomic postings (`:39-41`); `-005` no double settlement, one transfer per batch (`:42-44`).
- **INV-WALLET-\*** — `INV-WALLET-001` `balance_minor = available_minor + reserved_minor`, ledger-derived,
  available never < 0 (`invariants.json:45-47`).
- **INV-SETTLE-\*** — advertised alias; canonical `INV-STL-001` amount identity `gross=net+fee`, no money
  creation (`invariants.json:48-51`); `INV-STL-002` no negative balances (`:52-55`); `INV-STL-003` batch
  immutability + `PENDING→PROCESSING→COMPLETED/FAILED` lifecycle (`:56-59`).
- **INV-IDEM-\*** — `INV-IDEM-001` idempotency-key replay safety; same key twice → same result; same key +
  different body → 409 (`invariants.json:60-62`).
- **INV-RECON-\*** — advertised alias of `INV-FED-RECON-001` cross-operator reconcilability, independently
  auditable without operator cooperation (`invariants.json:217-220`).
- **INV-QR-\*** — `INV-QR-001` dynamic single-use → 422 on replay (`:79-81`); `-002` expiry (static
  `expires_at=null`, dynamic set+future) (`:82-84`); `-003` terminal-state rejection (`:85-87`); `-004`
  ledger↔status-USED atomicity (`:88-90`); `INV-QR-SIGN-001` server-side HMAC verification (`:91-93`);
  `INV-QR-ENV-001` sandbox `BANZA-SBX:` prefix binding (`:94-96`).

### Trust / key families (grounded)

- **INV-OTE-001..010** (`invariants.json:97-126`, source ADR-038): metadata signature validity; evidence
  binds to its manifest; evidence version/vector-anchored; reproducible; fail-closed on missing/invalid/
  expired/revoked material; revocation-list validity; **INV-OTE-007 no BANZA-issued artifact about an
  operator is an input**; **INV-OTE-008 no human decision is an input** and no human converts a negative
  result into positive; **INV-OTE-009 trust root signs nothing about operators**; INV-OTE-010 fail-closed
  is a local interaction decision, not a judgment/sanction.
- **INV-FEDEVAL-001..010** (`invariants.json:127-156`, source ADR-040): routing needs checks 1-9 all pass,
  self-evaluated; fail-closed on missing/invalid/revoked; evidence reproducible; signed metadata verifies
  to root; revocation list signed+fresh; freshness window ≤ 90 days for L3+, no grace; capability needs
  covering evidence; **INV-FEDEVAL-008 no human / no BANZA-issued artifact / no registry-listing step
  (registry listing is not a check)**; trust root doesn't sign operator evidence; revocation is a security
  signal only (not a regulatory sanction).
- **INV-ROOT-001..010** (`invariants.json:157-186`): no `test-` key ids in prod; **INV-ROOT-002 Key
  Manifest is root-signed**; manifest expiry; **INV-ROOT-004 root signs only Key Manifests, never protocol
  metadata / evidence / revocation lists directly**; **INV-ROOT-005 BRL signed by the designated
  revocation-domain key**; key validity maxima (issuing ≤ 184 days, root ≤ 24 months); INV-ROOT-007 no
  single-entity root control (threshold 2-of-2 M2 bootstrap → future 3-of-5 Shamir); bounded delegation;
  seat continuity; authenticated key rotation (signed with the currently-bound private key).
- **INV-FED-\*** (`invariants.json:187-220`): trace identity across boundaries; one obligation per routing
  request; capability integrity; routing idempotency; value conservation (no money created/destroyed
  cross-operator); trust-material freshness mandatory; revoked operator excluded within 6h; cross-operator
  double-entry sums to zero; integer arithmetic; global `routing_request_id` uniqueness; `INV-FED-RECON-001`
  reconcilability.
- **INV-COLLECTION-001..008** (`invariants.json:221-244`): collections never hold value / no ledger posting;
  closed-rule amount identity; exact divisibility; collected-amount identity; PAID only via real Transfer;
  terminal PAID share; post-OPEN immutability; idempotent creation.
- **MON-001** (`invariants.json:75-78`, alias `INV-MON-001`): integer-only monetary values across the whole
  surface; every monetary field carries the `_minor` suffix.

**Section-local crosswalk:** `spec/invariants.md:16-46` maps document-local IDs (`INV-L0x`, `INV-W0x`,
`INV-T0x`, `INV-S0x`, `INV-R0x`, `INV-A0x`) to the registry's canonical IDs, and re-affirms `INV-SETTLE-*`
/ `INV-RECON-*` are aliases (`spec/invariants.md:9-14`). The registry is the source of truth
(`spec/invariants.md:44-46`). Events echo a subset (`contracts/events/types.json:429-439`).

---

## 2. Canonical origin + `.well-known` + Manifest + published-endpoint model

Two consistent publication surfaces exist, both operator-neutral:

**(a) Self-published manifest at `.well-known` (classic operator publication).** The operator manifest
"declares capabilities and conformance scope. It must be served at
`/.well-known/banza/operator.json`" (`docs/reference/en/complete.md:398`; also `spec/overview.md:145`).
L3+ operators must serve it (`docs/reference/conformance.md:121`). Signed protocol metadata is
self-published at `/.well-known/banza/protocol-metadata.json` (`docs/reference/en/complete.md:280,368,748`).
The Key Manifest is published at the canonical location
`https://banza.network/.well-known/banza/key-manifest.json` (`contracts/federation/key-manifest.json:5`;
`docs/reference/en/complete.md:681,701`). The BRL canonical location is
`https://banza.network/federation/revocation-list.json` (`contracts/federation/revocation-list.json:5`).
Federation manifests extend the base operator manifest, "Served at `/.well-known/banza/operator.json`
alongside the base manifest fields" (`contracts/federation/federation-manifest.json:5`).

**(b) Endpoint-originated validation via a canonical origin + Technical Registry (ADR-068).** The current
official validation model. The `DiscoveryDocument` "an implementation publishes at its canonical origin
… the FIRST artifact of the endpoint-originated validation journey … announces the implementation's
identity and the map of its public endpoints" (`contracts/production/discovery-document.production.schema.json:5`).
It requires `operator_id, implementation_id, protocol_version, canonical_origin, endpoints`
(`discovery-document…:13`); every endpoint URL "must be host-bound to the canonical origin — an off-origin
URL is rejected by the discovery engine" (`discovery-document…:30`); `environment` enum is `sandbox|demo`
only (`:21`).

The **14 canonical published endpoints** are pinned in `implementation-record.production.schema.json:31`:
`discovery, manifest, key_manifest, signed_metadata, capabilities, conformance, revocation,
federation_metadata, federation_manifest, evidence_bundle, traces, ledger, payment_qr, payment_refund`
(relative leading-slash paths joined onto `canonical_origin`). The `canonical_origin` is "the
implementation's canonical public HTTPS origin (e.g. `https://zero.banza.network`) … The secure fetcher
pins the host to this origin (ADR-068 §4.7)" (`implementation-record…:22-26`).

**Registry-resolved, secure-fetch, browser-never model.** The validation OpenAPI states the model as
"The operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result; the Technical
Registry publishes the verifiable state" (`contracts/openapi/operator-validation.yaml:13`). Target is
resolved `operator_id → implementation_id → canonical_origin → discovery` from the **closed** BANZA
Technical Registry, "the only source of validation targets" (`operator-validation.yaml:26-28`). The
official fetch is by a "secure Rust artifact fetcher (`engines/banza-artifact-fetcher`), never by the
browser: it pins the host to the registry, enforces HTTPS, blocks private/loopback/link-local ranges and
cloud metadata, forbids cross-host redirects, bounds size and time, validates media type and TLS"
(`operator-validation.yaml:29-35`). No pasted content, uploaded file, user URL, local fixture or
pre-computed result may enter the official journey (`operator-validation.yaml:22-25`); upload/paste lives
only in a local, non-authoritative **draft** tool (`operator-validation.yaml:24-25`).

---

## 3. Identity of an *implementation* (operator ≠ implementation)

Grounded and enforced by two mirrored registry records:

- **OperatorRecord** = the *responsible entity*. "An operator publishes zero or more implementations; the
  operator is the entity responsible" (`operator-record.production.schema.json:5`). `operator_id` is "a
  lowercase slug, e.g. 'operator-zero'. Operator-agnostic; never a commercial brand"
  (`operator-record…:15`). "Presence of a record NEVER implies admission to a scheme, regulatory
  authorisation, or the ability to move funds" (`operator-record…:5`). Only `publication_status:published`
  is an eligible validation target (`operator-record…:17-21`).
- **ImplementationRecord** = the *technical system evaluated*. "One operator may publish many
  implementations (demonstration, sandbox, pre-production, production; different versions, profiles,
  capabilities and deployments). The validation target is always an operator AND one of its published
  implementations — never the entity in the abstract" (`implementation-record…:5`). An "origin-less,
  unpublished, revoked or incompatible implementation is not an eligible target" (`implementation-record…:5`).
  `environment` enum is `sandbox|demo` — "Never production / real-money at this baseline"
  (`implementation-record…:20`).

The validation surface re-states it: "The **operator** is the responsible entity; the **implementation**
is the technical system evaluated (ADR-068 §4.2/§4.3). Validating an operator always means evaluating one
of its published implementations — never the entity in the abstract" (`operator-validation.yaml:16-19`).
The **subject of certification is the implementation**, not the entity: `CertifiedImplementation` is
"identified by `implementation_id` plus the content hash of the exact artifact set tested … Never an
entity, brand or operator — `declared_by` is attribution/contact only. A different build is a different
subject" (`certified-implementation.production.schema.json:5`).

Typed ineligibility reasons (registry presence is not admission) are enumerated at
`operator-validation.yaml:200-222` (`unknown_operator, operator_revoked, implementation_operator_mismatch,
origin_missing, incompatible_protocol_version, unsupported_environment, incompatible_profile`, …).

---

## 4. Key rotation / revocation (as read)

**Root & key manifest (Key Manifest model — Reference + registry).** Root generated in a gated offline
ceremony; the Key Manifest "publishes ONLY public keys and their domains (root, issuing, revocation),
validity windows, and a content hash … Private keys NEVER appear" (`key-manifest.production.schema.json:5`);
key `domain` enum `root|issuing|revocation`, `algorithm` ed25519, with `not_before`/`not_after` windows
(`key-manifest…:37-43`). The Reference is explicit: the trust chain is Root Key → BRL-Issuing Key
(`banza-brl-YYYYMM`) → signs BANZA Revocation Lists (`docs/reference/en/complete.md:686`), and **"The
Trust Root signs only Key Manifests — it never directly signs operator metadata, BRLs, or evidence"**
(`docs/reference/en/complete.md:690`, restated as INV-ROOT-004 at `complete.md:793`; INV-ROOT-005 "The BRL
must be signed by the designated BRL delegated key" at `complete.md:794`).

**Rotation.** Issuing keys ≤ 184 days, root ≤ 24 months (`invariants.json:172-174`,
`complete.md:795`). Rotation "MUST be authenticated by signing the rotation request with the
currently-bound private key" (INV-ROOT-010, `invariants.json:184-186`). Threshold custody: no single
entity solely controls maximum authority (INV-ROOT-007, `invariants.json:175-177`).

**Revocation (federation BRL).** `contracts/federation/revocation-list.json` — the live mechanism; signed
by "the BANZA revocation-domain delegated key (NOT the root key and NOT the protocol-metadata or
conformance-evidence keys — ADR-038 domain separation)" (`revocation-list.json:5`); `issuer_key_id`
pattern `^(test-)?banza-brl-[0-9]{6}$` resolved in the Key Manifest (`domain==revocation, status==active`)
(`revocation-list.json:35-39`); fetch cadence ≤ 6h routine / 1h emergency (`:45-49`); a listed
`operator_id` is rejected from all routing "regardless of any other trust signal (INV-FEDEVAL-002)"
(`:50-52`); ed25519 detached signature over canonical JSON (`:82-86`). `reason` = `suspended`
(temporary) or `revoked` (indefinite; operator rejoins by publishing fresh evidence passing the OTE — "No
party re-admits it") (`:65-68`). "Revocation is a protocol security signal — not a sanction, licence or
authorisation" (`:52`).

**Revocation (production trust-root artifact).** `revocation-entry.production.schema.json` — a Revocation
List entry "assinada pela Trust Root … Revogação está no âmbito da raiz e exige o limiar 2-de-3: pelo menos
duas assinaturas de custodiantes independentes" (`revocation-entry…:57-58`); `subject_type`
`key|operator|artifact` (`:20-24`); reason enum is purely technical (`key_compromise, key_superseded,
algorithm_migration, ceremony_error, artifact_defect, material_no_longer_verifiable, operator_request`)
with a machine-readable `security_mechanism_not_regulatory_sanction: const true` (`:71-75`). Revoking
"operator" material "retira-lhe confiança criptográfica … e NÃO afecta o seu estatuto legal, regulatório
ou financeiro" (`:23`).

> ⚠ These two revocation descriptions disagree on **who signs** — see Risk R-1 below.

---

## 5. The invariant families vs the layer boundaries (all confirmed on active surfaces)

- **BANZA is an open protocol — not a bank/PSP/wallet/operator; holds no accounts, moves no funds, does
  not settle, license or authorise.** Confirmed repeatedly on active surfaces:
  `spec/overview.md:3` ("BANZA is a protocol. It does not operate wallets, move funds, settle funds, hold
  balances or run payment infrastructure."); FAQ `docs/reference/pt/completa.md:2680-2694` ("O BANZA é um
  banco? Não. … Não detém fundos, não tem licença bancária e não processa pagamentos."); glossary
  `docs/reference/PROTOCOL_GLOSSARY.md:18` ("It is not a bank, PSP, wallet, or licensed financial…");
  every production schema `_boundary` (e.g. `operator-manifest…:9`, `key-manifest…:9`,
  `protocol-release…:9`: "BANZA is an open protocol; it does not process payments, settle value, or move
  funds. Licence/authorisation belongs to the operator, not to BANZA.").
- **Technical certification ≠ scheme admission ≠ regulatory authorisation; per-implementation, scoped.**
  `certification-record.production.schema.json:5` — a CERTIFIED record asserts "ONLY 'this implementation
  passed this profile version with this evidence, in this scope, until this date' — it is NOT a licence,
  NOT scheme admission and NOT regulatory authorisation (ADR-061)". Scope "never broader than the evidence"
  (`certification-record…:41`); closed status enum `NOT_CERTIFIED|CERTIFIED|EXPIRED|SUSPENDED|REVOKED|
  SUPERSEDED`, all-but-CERTIFIED fail-closed (`:28`); bound to `implementation_hash`, `profile_id+version`,
  `environment`, `scope_levels/capabilities`, validity window, `record_hash` (`:11-47`). The profile is
  "Derived only from L1 protocol contracts; introduces no operator-specific criteria (ADR-003)"
  (`certification-profile.production.schema.json:5`), `validity_days` "never open-ended"
  (`certification-profile…:26`).
- **Rust decides; Qwen only explains; the journey never issues a certificate.**
  `operator-validation.yaml:39` ("Rust decides every verdict; Qwen only explains; TypeScript never
  decides."); `operation-receipt.production.schema.json:62-63` (`qwen_calls const 0`,
  `external_model_calls const 0`, "Rust decides, the model never decides");
  `journey-receipt.production.schema.json:5,51-59` (`certification_status const NOT_CERTIFIED`,
  `certified const false`, `qwen_calls const 0` — "the journey aggregates verdicts, it NEVER issues a
  Certification Record and NEVER returns CERTIFIED").
- **L3 regulatory-state fail-closed baseline.** `regulatory-state.production.schema.json:5,46-70` — state
  pinned `REGULATORY_AUTHORIZATION_IN_PROGRESS`; `real_money_enabled, real_wallets_enabled,
  real_settlement_enabled, real_participants_active, bna_approval_claimed` are all `const false`; boundary
  `not_authorised_yet/no_bna_claim_without_evidence/real_money_fail_closed const true` and
  `authorisation_granted/banzami_presented_as_authorised/replaces_regulator/replaces_scheme const false`
  (`:102-125`); decided by the Rust `RealMoneyActivationGate`, "never in TypeScript and never by the local
  model" (`:5`). Operador Zero is "a demonstration reference implementation, never a real scheme
  participant" (`regulatory-state…:64`).
- **Trust root signs artifacts, not participants.** `trust-root-metadata.production.schema.json:5` — "A
  Trust Root assina exactamente quatro classes de objectos … Não autoriza pagamentos, não cria operadores,
  não emite licenças, não certifica operadores … e não movimenta fundos"; boundary block all-`const`
  (`:100-112`). `signed-protocol-metadata…:81-93` repeats the boundary as machine-readable `const`.

---

## 6. Obsolete-term scan (whole repo, active surfaces)

Command basis: `git grep -nI` across the repository for each term, then classification of every hit as
ACTIVE-violation vs legitimate (enforcement guard / historical-audit artifact / negation / supersession
doc / prohibited-phrase list / TLS test cert).

**Result: NO obsolete term appears as a positive claim on any active surface.** Every hit is legitimate.

| Term scanned | Hits | Verdict |
|---|---|---|
| `BANZA CA` / "certificate authority" / "autoridade certificadora" | Enforcement guards (`Makefile:36,44,144`, `.github/workflows/identity-guard.yml:992`, many `tools/check-*.sh` refs); historical audit artifacts (`artifacts/m2-18b7/**`, `artifacts/m2-19/**`, `artifacts/m2-19-final/**`); negations ("no BANZA CA", "without a certificate authority"); supersession/ADR docs; prohibited-phrase list `TRADEMARKS.md:59` ("`BANZA CA certified.`" under §6 "Phrases that are prohibited", `TRADEMARKS.md:51-61`). | **Clean.** No active positive claim. |
| `X.509` / `x509` | `artifacts/m2-19/ADR-DRAFT-…md:74,121` (planning doc: "Removed — stays removed" and "**not** an X.509"); `infra/banza-network/tests/e2e-full-stack.sh:33` (`openssl req -x509` generates a **TLS** self-signed cert for an e2e origin server — transport cert, not an operator identity cert). | **Clean.** No operator X.509 identity cert. |
| "certificado geral" / "general certificate" / "company certificate" / "entity certification" / "unlimited … certif" | No "general/company certificate" anywhere. "entity certification" only in audit artifacts, guards (`tools/check-public-surface-clean.sh:179,197`, `tools/check-website-public-copy-current.sh`), and reports stating it "stays blocked" (`docs/reports/THREE_LAYER_ARCHITECTURE_REPORT.md:99`, `docs/reports/M2_19G_GUARD_CONVERGENCE.md:67`). | **Clean.** Entity/general certification is explicitly blocked, never asserted. |
| BANZA-as-bank/PSP/wallet/operator/settlement (positive) | Only negations/FAQ (`spec/overview.md:3`, `docs/reference/pt/completa.md:2680-2694`, `docs/reference/PROTOCOL_GLOSSARY.md:18`), forbidden-phrase lists (`website/components/banzai/banzai-agent.ts:212-214`), and correct-model ADR text (`ADR-037…:8` "operator-neutral protocol"). | **Clean.** |
| BanzAI-as-authority (positive) | Only FAQ questions with "No" answers (`docs/reference/en/complete.md:1382`, `pt/completa.md:2566`), forbidden-phrase list (`banzai-agent.ts:203`), refusal examples (`ADR-044…:77`). Reference asserts the opposite: "BanzAI is an agent of the protocol, not an authority" (`complete.md:822`+ §7); "não é uma quarta camada nem uma autoridade" (`website/content/BANZA_REFERENCIA.md:134,553`). | **Clean.** |
| Qwen-as-decider (positive) | Every hit is a correct-model statement: "Rust decides every verdict; Qwen only explains" (`operator-validation.yaml:39`), "Rust decides, the model never decides" (`operation-receipt…:5`), "O Qwen apenas explica resultados já determinados pelos motores Rust" (`website/components/operador-zero/OperadorZeroReference.tsx:356`), ADR-059 D-059-05 authority rule (`website/content/decisions/adr/ADR-059…:53`), gate-cannot-be-bypassed (`ADR-062…:43`). | **Clean.** |

`artifacts/**` (60 tracked files, `m2-17`…`m2-19g2`, `whitepaper-v1`) is milestone audit / planning /
mapping working material — it documents the CA removal (removal-tracking, negations, "removed vs active"
tables) and is not an active protocol/product surface. It is the largest source of obsolete-term strings
and every one is history or negation.

---

## 7. Contract surface inventory (read/confirmed)

- `contracts/openapi/`: `activity.yaml, collections.yaml, interoperability-certification.yaml,
  operator-validation.yaml, reference-operator.yaml, transfers.yaml, wallet-onboarding.yaml`
  (`reference-operator.yaml:70` serves `/.well-known/banza/operator.json`).
- `contracts/events/`: `envelope.schema.json, types.json, webhook-types.json` (invariants block
  `types.json:429-439`). `contracts/webhooks/`: `envelope.schema.json, signature.json`.
- `contracts/qr/`: payload format (`BANZA:` prod / `BANZA-SBX:` sandbox, base64url-JSON, HMAC-SHA256 for
  dynamic), `contracts/qr/payload-format.json:12-27,70-96,130-136`.
- `contracts/federation/`: `federation-event/manifest/obligation/routing/trust.json, key-manifest.json,
  revocation-list.json`.
- `contracts/production/` (37 schemas): identity/registry (`operator-record, implementation-record,
  operator-manifest, operator-self-publication, public-protocol-registry, discovery-document,
  capabilities-document`); trust/keys (`trust-root-metadata, signed-protocol-metadata,
  delegated-signing-key, key-manifest, revocation-entry, root-*` ceremony set); conformance/certification
  (`conformance-report/-evidence, evidence-bundle, interoperability-report, certification-profile/-record,
  certified-implementation, federation-trust-evaluation`); receipts (`operation-receipt, journey-receipt`);
  release/version (`protocol-release, protocol-version.json`); L3 (`regulatory-state`); `brl.production.schema.json`.

---

## 8. Risks / divergences (could affect a whitepaper thesis)

**R-1 (HIGH) — Two contradictory descriptions of *what the Trust Root signs*, both on active surfaces.**
- *Model A (Key Manifest model)* — canonical Reference + registry + federation BRL: the root signs
  **only** the Key Manifest; delegated domain keys (issuing, revocation) sign protocol metadata, evidence
  and the BRL. Grounded: INV-ROOT-004 "The root key signs only Key Manifests. It never signs protocol
  metadata, conformance evidence, or revocation lists directly" (`invariants.json:166-168`;
  `docs/reference/en/complete.md:690,793`); INV-ROOT-005 BRL signed by the revocation-domain delegated key
  (`invariants.json:169-171`, `complete.md:794`); `contracts/federation/revocation-list.json:5` "signed by
  the BANZA revocation-domain delegated key (NOT the root key)".
- *Model B (2-of-3 root-signs-four-classes)* — production trust schemas: the Trust Root **directly** signs
  four classes **including protocol metadata and the revocation list**, under 2-of-3 custody. Grounded:
  `trust-root-metadata.production.schema.json:5,64-72` (`scope` enum = `protocol_metadata, protocol_release,
  delegated_signing_key, revocation`; "A Trust Root assina exactamente quatro classes"); `signed-protocol-
  metadata.production.schema.json:60-69` permits `signer_type: trust_root` with custodian A/B/C signing
  protocol metadata directly; `revocation-entry.production.schema.json:55-70` requires ≥2 signatures from
  root custodians A/B/C on the revocation entry itself.
- Both trust-anchor vocabularies coexist in `contracts/production/` simultaneously
  (`key-manifest.production.schema.json` = Model A; `trust-root-metadata.production.schema.json` +
  `delegated-signing-key.production.schema.json` = Model B). Per the registry's own precedence rule
  (`invariants.json:6`), INV-ROOT-004/005 (Model A) governs — yet Model B production schemas are written
  as if the root signs metadata/revocation directly. **A whitepaper "trust anchor / key management /
  revocation" section must not assert a single "who signs what" without reconciling these; the safe,
  grounded claim is the registry's INV-ROOT-004/005.**

**R-2 (MEDIUM) — Stale `source` line numbers in `contracts/invariants.json` after the M2.19 Reference
rewrite.** The registry cites `docs/reference/en/complete.md:822-827` for INV-ROOT-001..006, but line 822
now contains "### What BanzAI Is" (§7 BanzAI) — the actual INV-ROOT statements moved to `complete.md:790-795`
(verified: line 790 = INV-ROOT-001, line 822 = BanzAI header). The LEDGER family citations (complete.md:
1188-1193) land near but not exactly on the ledger prose (1188 is blank; the section header is 1189). The
`make invariant-check` guard validates *ID* citation, not line accuracy, so these silently rot. Whitepaper
authors dereferencing these `source` locators would be misled; cite the invariant `statement` text, not
the line number.

**R-3 (LOW/MEDIUM) — `spec/overview.md` is pre-three-layer and uses a different layer taxonomy.** Dated
2026-06-11 (`spec/overview.md:11`), it presents **five conceptual architecture layers** (Governação,
Especificação, Conformidade, Federação, Implementação — `spec/overview.md:42-52`) and a **four-layer
signature hierarchy** (`spec/overview.md:169-179`), and describes conformance as "Ninguém certifica
operadores" (`spec/overview.md:245`). This is not obsolete terminology (no-one certifies *operators* is
still true), but it predates and omits the **three-layer institutional model** (L1 Protocol / L2
Technical Interoperability Certification *of an implementation* / L3 Operational Schemes; ADR-059..064)
that the production contracts and the website Reference now use (`certification-record…:5`;
`regulatory-state…:9`; `website/content/BANZA_REFERENCIA.md:553,570`). A whitepaper must not conflate the
"5 conceptual layers" / "4-layer signature hierarchy" of `spec/overview.md` with the "3 institutional
layers" of ADR-059; and should treat `spec/overview.md`'s certification framing as incomplete relative to
the L2 certification-of-implementation now in force.

**R-4 (INFO) — Dual publication surfaces.** Classic `.well-known` self-published manifest (§2a) and the
ADR-068 canonical-origin + closed-registry endpoint-originated model (§2b) both exist. They are
compatible (the 14-endpoint map includes `manifest`, `key_manifest`, `revocation`, etc.), but a whitepaper
should be explicit that official *validation* is endpoint-originated + registry-resolved + secure-Rust-
fetched (`operator-validation.yaml:20-35`), while the `.well-known` manifest remains the operator's
self-publication artifact.

---

## 9. Boundary facts to carry into the whitepaper (all grounded above)

1. operator (entity) ≠ implementation (system evaluated); one operator → many implementations
   (`implementation-record…:5`, `operator-validation.yaml:16-19`).
2. Technical certification is per-implementation and scoped to profile+version+environment+scope+evidence+
   validity; ≠ scheme admission ≠ regulatory authorisation (`certification-record…:5,41`,
   `certification-profile…:26`).
3. BANZA holds no accounts, moves/settles no funds, licenses/authorises no one (`spec/overview.md:3`,
   every production `_boundary`).
4. Rust engines decide/determine; Qwen only explains (const-0 model calls in validation)
   (`operator-validation.yaml:39`, `operation-receipt…:62-63`, `journey-receipt…:56-59`).
5. Operador Zero = sandbox/demo reference implementation, read-only, NOT_CERTIFIED, never a real scheme
   participant (`regulatory-state…:64`, `implementation-record…:15`).
6. L3 Banzami Operational Scheme = REGULATORY_AUTHORIZATION_IN_PROGRESS, all real-money flags fail-closed
   `const false` (`regulatory-state…:41-70`).
7. Obsolete terms (BANZA CA, operator X.509, general/entity certificate, BANZA-as-financial-entity,
   BanzAI/Qwen authority) appear ONLY as guards, history, negations, or prohibited-phrase lists — never
   as active claims (§6).
