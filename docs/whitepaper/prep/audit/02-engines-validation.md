# Audit 02 — Deterministic Validation Engines + the Nine-Step Journey

> Whitepaper prep, non-normative, scientific-technical, operator-neutral. Every claim below is
> grounded in a repository file that was read for this audit; each is cited by repo-relative path +
> line/section. Nothing here is fabricated. Where a divergence or obsolete term was found it is flagged
> explicitly in §12–§13.

Audit date: 2026-07-30. Scope: `engines/*` (Rust), `services/banzai-api/src/validate.js`,
`services/banzai-api/src/fetcherClient.js`, `services/banzai-api/src/server.js` (validate routes), and
`engines/banza-artifact-fetcher` (SSRF-hardened server-side fetch).

---

## 1. Method & what "the journey" is

The **official nine-step journey** is *endpoint-originated operator validation* (M2.19G.1, ADR-068). It
is defined in one TypeScript orchestration file — `services/banzai-api/src/validate.js` — whose only job
is to shuttle JSON: resolve a target in Rust, fetch each artifact from the implementation's public
endpoints via the secure Rust fetcher, run the matching Rust/WASM decision engine on the fetched
content, and assemble receipts. The header comment states the contract verbatim
(`validate.js:1-15`): *"Rust decides every verdict (registry + decision engines). TypeScript never
decides; it shuttles JSON… There is NO model call."*

The canonical step spine is a Rust-named constant (`validate.js:38-48`):

```
STEP_ORDER = [discovery, manifest, keys, conformance, interoperability, trust, federation, evidence, certification]
```

---

## 2. Engine inventory (every crate in `engines/`, one-line purpose)

Purposes are grounded in each crate's `Cargo.toml` `description` and, where read, its `lib.rs`.
"On journey path" = imported/invoked by `validate.js`.

| Crate (`engines/…`) | Purpose (one line) | On 9-step path? |
|---|---|---|
| `banza-artifact-fetcher` | The ONLY component that reaches operator public endpoints; SSRF-hardened Rust library + `banza-fetcher` HTTP service (`Cargo.toml:5`). | Yes (transport for every fetch) |
| `banza-target-registry` | CLOSED Technical Registry + resolution/eligibility + discovery verdict + Certification **Readiness** aggregation (`lib.rs:1-11`). | Yes (discovery + certification steps) |
| `banza-operator-manifest` | Deterministic validation of a candidate OperatorManifest (MAN-001..004) (`Cargo.toml:5`). | Yes (manifest step) |
| `banza-trust` | Ed25519 + ADR-038 canonical-JSON evaluation of signed protocol metadata, keys, revocation, fail-closed (`Cargo.toml:5`). | Yes (keys + trust steps) |
| `banza-conformance` | Offline conformance runner: vector-integrity + invariant + certification-level + report (`Cargo.toml:5`). | Yes (conformance step) |
| `banza-l2-readiness` | L2 payment-flow preparation surface (payment intent, idempotency, ledger, trace, settlement) (`Cargo.toml:5`). | Yes (interoperability step) |
| `banza-l3-readiness` | L3 federation preparation surface (federation pair/intent, cross-operator trace) (`Cargo.toml:5`). | Yes (federation step) |
| `banza-evidence-bundle` | Assembles the technical evidence bundle; computes readiness + SHA-256; NEVER certifies (`Cargo.toml:5`). | Yes (evidence step) |
| `banza-certification` | The deterministic Rust **authority** for L2 Conformance & Interoperability Certification (ADR-064/065/066); closed state machine `NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED` (`Cargo.toml:5`). | **No** — not imported by `validate.js` (see §10) |
| `banza-l1-readiness` | L1 technical-preparation aggregation (`Cargo.toml:5`). | No |
| `banza-l4-readiness` | L4 external-interoperability preparation (`Cargo.toml:5`). | No |
| `banza-m2-protocol-gate` | Validates the production PROTOCOL implementation package (`Cargo.toml:5`). | No |
| `banza-open-governance` | Validates the open-protocol governance package; detects central-human-authority dependence (`Cargo.toml:5`). | No |
| `banza-reference-trust-model` | Validates the reference trust model is free of CA/operator-certificate/human-approval trust (`Cargo.toml:5`). | No |
| `banza-security-assurance` | Internal security & risk assurance baseline (`Cargo.toml:5`). | No |
| `banza-simb` | In-process Rust simulator of a BANZA operator/federation peer; test-only (`Cargo.toml:5`). | No |
| `banza-root-ceremony` / `-cli` | Offline 2-of-3 root trust ceremony verify (`-cli` = custodian air-gapped tool) (`Cargo.toml:5`). | No |
| `banza-repo-guards` | Rust repo-hygiene gates (purity, brand contamination, invariant registry, OpenAPI compat) (`Cargo.toml:5`). | No |
| `banzai-api-kb` / `banzai-query-core` | Rust retrieval + query core for the live `/ask` interface (`Cargo.toml:5`). | No (explanation path, §8) |
| `banzai-evidence` / `banzai-doc-indexer` / `banzai-repo-indexer` | Deterministic BanzAI evidence/index engines (`Cargo.toml:5`). | No |
| `banzai-operator-journey` | Rust state machine for the older *guided* journey; safe session summary for Qwen (`Cargo.toml:5`). | No (separate UX) |
| `banzai-onboarding` | Pure-Rust onboarding security-decision engine (email-OTP, `.well-known` origin proof) ADR-069 (`Cargo.toml:5`). | No (adjacent, §11) |
| `operator-zero-core` / `operator-zero-e2e-root` | Rust engine + DEMO-ONLY ephemeral signing root behind Operador Zero simulator (`Cargo.toml:5`). | No (produces the target's artifacts) |
| `rust-rule-guard` | ADR-037 policy gate: blocks new non-Rust engines (`Cargo.toml:5`). | No |

---

## 3. The nine steps — engine, endpoints, engine-status → canonical-status

Grounded in `validate.js` `STEP_SPEC` (lines 50-60), `runEngine` (119-157), and the verdict mapper
`engines/banza-target-registry/src/verdict.rs::step_status` (23-130).

| # | Step | Engine (`STEP_SPEC`) | Fetched endpoint keys (first = primary) | Engine status → canonical status |
|---|---|---|---|---|
| 1 | discovery | `banza-target-registry` | `discovery` | `DISCOVERY_OK`→VERIFIED · `DISCOVERY_INCOMPLETE`→PENDING · else FAILED (`verdict.rs:25-33`) |
| 2 | manifest | `banza-operator-manifest` | `manifest` | `VALID`→VERIFIED · `INCOMPLETE`→PENDING · else FAILED (`verdict.rs:34-42`) |
| 3 | keys | `banza-trust` | `signed_metadata, key_manifest, revocation, manifest, conformance` | `TRUST_VALID`→VERIFIED · `TRUST_MISSING*`/`TRUST_INCOMPLETE`→PENDING · else FAILED (`verdict.rs:43-51`) |
| 4 | conformance | `banza-conformance` | `conformance` | `PASS`→VERIFIED · `WARN`→PENDING · `ok:false`→PENDING(`INCOMPLETE_EVIDENCE`) · else FAILED (`verdict.rs:52-73`) |
| 5 | interoperability | `banza-l2-readiness` | `manifest, payment_qr, payment_refund, ledger, traces` | `L2_READY_FOR_TECHNICAL_REVIEW`→VERIFIED · `L2_INCOMPLETE`→PENDING · else FAILED (`verdict.rs:74-82`) |
| 6 | trust | `banza-trust` | `signed_metadata, key_manifest, manifest, conformance, revocation` | same trust mapping as step 3 (`verdict.rs:43-51`) |
| 7 | federation | `banza-l3-readiness` | `federation_metadata, federation_manifest, traces, manifest` | `L3_READY_FOR_TECHNICAL_REVIEW`→VERIFIED · `L3_INCOMPLETE`→PENDING · else FAILED (`verdict.rs:83-91`) |
| 8 | evidence | `banza-evidence-bundle` | `evidence_bundle` | `ok && readiness==READY`→VERIFIED · `ok && !READY`→PENDING · `!ok`→FAILED (`verdict.rs:92-110`) |
| 9 | certification | `banza-target-registry` | *(none — aggregates the 8 receipts)* | `readiness==READY`→VERIFIED else BLOCKED (`validate.js:298`); aggregate in `verdict.rs::certification_readiness:235-290` |

Endpoint URLs are absolute, host-bound to `zero.banza.network`, from the reference endpoint map
(`engines/banza-target-registry/src/model.rs::Endpoints::reference:56-75`, 14 canonical paths).

Steps 1–8 are "technical steps"; step 9 is the aggregate. For a single-step `certification` request AND
for the full journey, the eight technical steps always run first so readiness is derived from real
endpoint evidence, never a client claim (`validate.js:313-317`, `330-333`).

---

## 4. Inputs — assembled ONLY from fetched artifact content

`validate.js:73-116` documents and implements the rule: single-artifact engines receive the fetched
body verbatim; composite engines (trust/L2/L3) are assembled from the relevant fetched artifacts. "No
fixture contributes any verdict-bearing content."

- **discovery**: `registry.registry_validate_discovery_json(target, fetched.discovery)` — checks identity
  fields + that the published endpoint map is host-bound to the canonical origin
  (`verdict.rs::validate_discovery:134-230`).
- **manifest / conformance / evidence**: the raw fetched body string is passed straight into
  `operator_manifest_validate_json` / `conformance_validate_report_json` / `evidence_bundle_validate_json`
  (`validate.js:126-137`).
- **keys / trust**: `assembleTrustInput` (78-94) builds `{signed_protocol_metadata, operator_manifest,
  conformance_evidence, key_manifest, revocation_status, delegated_signing_key, trust_root_metadata, …}`
  from fetched artifacts; signature/key material is read from the fetched signed metadata itself.
- **interoperability**: `assembleL2Input` (96-107) → `{operator_manifest, payment_intent (=payment_qr),
  idempotency_result, ledger_postings, trace_linkage, settlement_obligation (=payment_refund),
  evidence_reference}`.
- **federation**: `assembleL3Input` (109-116) → `{federation_pair (=federation_metadata),
  federation_intent (=federation_manifest), cross_operator_trace (=traces), operator_manifest}`.

Only registry-resolved `canonical_origin` + `expected_host` + `path` reach the fetcher; the origin
prefix is stripped so the fetcher only ever receives a path, never a caller URL
(`validate.js:66-71, 230-239`). This is the entity/system separation in action: the resolved target
carries both `operator_id` (the entity) and `implementation_id` (the technical system evaluated) —
distinct fields (`model.rs::OperatorRecord:80-88` vs `ImplementationRecord:90-105`, ADR-068 §4.2).

---

## 5. Reason codes

Two closed sets, both Rust-owned:

**(a) Fetcher / SSRF reason codes** — `engines/banza-artifact-fetcher/src/types.rs::ReasonCode`
(124-223), snake_case wire strings: `scheme_not_https, userinfo_in_url, invalid_url,
invalid_expected_host, host_mismatch, port_not_allowed, dns_resolution_failed, no_addresses,
loopback_blocked, private_ip_blocked, link_local_blocked, unique_local_blocked, metadata_blocked,
unspecified_blocked, broadcast_blocked, multicast_blocked, reserved_ip_blocked, redirect_blocked,
tls_error, connect_error, timeout, request_error, http_status_not_ok, size_cap_exceeded,
content_encoding_rejected, media_type_not_allowed, body_decode_error`. On any fetch failure `validate.js`
surfaces these plus a synthetic `FETCH_BLOCKED` and sets the step `BLOCKED` (`validate.js:257-273`).

**(b) Verdict / step reason codes** — emitted by `verdict.rs::step_status` per step, e.g.
`DISCOVERY:*`, `MANIFEST_*`, `L0_PASS`/`L0_WARN`, `CONFORMANCE_EVIDENCE_INCOMPLETE` + `ENGINE:*`,
`L2_*`, `L3_*`, `EVIDENCE_BUNDLE_OK|INVALID` + `READINESS:*`, plus any engine `errors[]` surfaced as
`ERROR:*` (`verdict.rs:118-123`). The certification aggregate emits `NOT_CERTIFIED` (always) +
`READY_FOR_TECHNICAL_REVIEW` / `PRECEDING_STEP_FAILED` / `PRECEDING_STEP_BLOCKED` /
`TECHNICAL_STEPS_INCOMPLETE` (`verdict.rs:252-264`).

**(c) Resolution / eligibility reasons** — `model.rs::ResolutionReason` (15 variants, 154-188):
`unknown_operator, duplicate_operator, operator_unpublished, operator_removed, operator_revoked,
unknown_implementation, duplicate_implementation, implementation_operator_mismatch,
implementation_unpublished, implementation_removed, implementation_revoked, origin_missing,
incompatible_protocol_version, unsupported_environment, incompatible_profile`. Any of these makes the
whole journey return `target_not_resolved` / `eligible:false` before any fetch (`validate.js:310-311,
325-326`).

---

## 6. Blockers & fail-closed behaviour

- **Resolution is the first gate** — an ineligible target (any of the 15 reasons) short-circuits before
  a single endpoint is contacted (`validate.js:311, 326`; `registry.rs::resolve:51-163`).
- **Any required fetch failure → step `BLOCKED`**, with the fetcher's reason codes carried into the
  receipt; the engine is not even run (`validate.js:248-273`).
- **Fetcher fails closed** at every stage: preflight rejects non-HTTPS/userinfo/host-mismatch/bad-port
  before DNS; every resolved IP is classified and the *set* is refused if any member is non-global
  (DNS-rebinding defence); 3xx refused, non-2xx refused, non-identity `Content-Encoding` refused,
  media-type outside allowlist refused, body over cap aborted mid-stream, non-UTF-8 refused
  (`fetch.rs:84-247`; ordering documented `fetch.rs:1-15`).
- **Aggregate fails closed** — Certification Readiness is `READY` only if the set of technical steps is
  non-empty and *all* VERIFIED; otherwise `BLOCKED` (`verdict.rs:247-250`).
- **Overall journey status** is the worst of the technical statuses: FAILED > BLOCKED > PENDING/
  NOT_EVALUATED > VERIFIED (`validate.js:338-345`).
- The banzai-api boot self-check degrades to deterministic grounding and "never publishes an
  unvalidated model answer" — the PT marker "fecho por omissão" (fail-closed) at `server.js:618`.

---

## 7. Versions (`engine_version` / `tool_version`)

The receipt's `engine_version` is read from the engine's own `tool_version` in its output
(`validate.js:278`, `engineVersion = engineOutput.tool_version || "unknown"`). On a fetch-blocked step
`engine_version` is `"n/a"` (`validate.js:270`).

| Engine | Version constant | Value |
|---|---|---|
| `banza-target-registry` | `TOOL_VERSION` (`lib.rs:25`) | `0.1.0` |
| `banza-operator-manifest` | `TOOL_VERSION` | `0.1.0` |
| `banza-trust` | `VERIFIER_VERSION` (`lib.rs:28`) | `0.2.0` |
| `banza-conformance` | `RUNNER_VERSION` (`tool.rs`) | conformance runner version (emitted as `tool_version`) |
| `banza-l2-readiness` | `TOOL_VERSION` | `0.1.0` |
| `banza-l3-readiness` | `TOOL_VERSION` | `0.1.0` |
| `banza-evidence-bundle` | `TOOL_VERSION` | `0.1.0` |
| `banza-l1-readiness` | `TOOL_VERSION` | `0.1.0` |
| `banza-l4-readiness` | `TOOL_VERSION` | `0.1.0` |

Registry supported ranges: protocol `["1.0.0","1.0"]`, environments `["sandbox","demo"]`, profiles
`["L0".."L4"]` (`registry.rs:13-17`). Receipt/workflow versions: `RECEIPT_VERSION = "1.0.0"`,
`WORKFLOW = "operator-validation"` (`validate.js:33-34`).

---

## 8. Rust-decides / Qwen-explains separation — where enforced in code

- **Every receipt hard-codes `qwen_calls: 0` and `external_model_calls: 0`** — the OperationReceipt
  builder (`validate.js:202-203`), the certification aggregate (`verdict.rs:285-286`), and the
  JourneyReceipt (`validate.js:371-372`).
- **The validate module imports no model/provider** — only `node:crypto`, `node:module`, and
  `fetcherClient.js` (`validate.js:17-19`). `provider.js`/Qwen is never referenced on this path.
- **The verdict module is the ONLY place a verdict is decided** and its header states the invariant:
  *"Rust decides every verdict; Qwen only explains; TypeScript never decides"* (`verdict.rs:1-7`). The
  mapping is "a lookup over the engine's own declared status, never a fresh judgement" (`verdict.rs:21-22`).
- **The routes call the validator directly** with no inference (`server.js:589-590` →
  `validateStepReq`/`validateJourneyReq` → `validator.validateStep`/`validateJourney`), which contain no
  model call.
- **Qwen "explains" only on the separate `/ask` route** (`server.js:575-583`) — the human-facing BanzAI
  interface — never on `/validate/*`. BanzAI is a transversal interface, not a decision layer and not an
  authority (consistent with the receipt disclaimer at `validate.js:375-376`: *"Rust decide; a IA nunca
  decide."*).

**Conclusion: there is no AI decision path in the nine-step journey.** Confirmed by (i) no model import,
(ii) hard-coded zero model counters on all three receipt shapes, (iii) verdicts produced solely by Rust
engines + the Rust verdict mapper, (iv) routes wired directly to the validator.

---

## 9. Which engines are L1/L2/L3/L4 readiness

The four `banza-lN-readiness` crates are conformance-**profile** preparation engines (BX1.7–1.10),
all `TOOL_VERSION = 0.1.0`, all "local, no-network … NOT certification, NOT approval, does not move
funds" (`Cargo.toml:5` each):

| Engine | Readiness surface | On 9-step journey |
|---|---|---|
| `banza-l1-readiness` (BX1.7) | L1 technical-preparation aggregation | No |
| `banza-l2-readiness` (BX1.8) | L2 payment-flow (intent, idempotency, ledger, trace, settlement) | Yes — **interoperability** step |
| `banza-l3-readiness` (BX1.9) | L3 federation (pair, intent, cross-operator trace) | Yes — **federation** step |
| `banza-l4-readiness` (BX1.10) | L4 external-interoperability | No |

Their statuses are `LN_READY_FOR_TECHNICAL_REVIEW` / `LN_INCOMPLETE` / `LN_INVALID`, and their guidance
text explicitly states "preparação técnica test-only … Não houve pagamento nem movimentação de fundos"
(`banza-l2-readiness/src/lib.rs:546-552`) and "Não houve federação activa nem movimentação de fundos"
(`banza-l3-readiness/src/lib.rs:588-589`).

> **Terminology caution (see §13 risk):** these L0–L4 are conformance *profiles*, a different axis from
> the three-layer architecture L1/L2/L3 (Protocol / Certification / Operational Schemes). The whitepaper
> must not conflate "L2 readiness engine" (payment-flow profile) with "Layer 2 = Certification".

---

## 10. Endpoint "Certification Readiness" vs the `banza-certification` authority

Two distinct concepts, correctly separated in code:

1. **Endpoint-journey step 9 = Certification *Readiness*** — produced by `banza-target-registry`
   (`verdict.rs::certification_readiness:235-290`). It is a `READINESS_AGGREGATE` that is **never** a
   Certification Record and **never** returns `CERTIFIED`; it hard-sets `certification_status:
   "NOT_CERTIFIED", certified:false, authorised:false, licensed:false` and `readiness: READY|BLOCKED`.
   The JourneyReceipt mirrors this: `certification_status:"NOT_CERTIFIED", certified:false`
   (`validate.js:367-369`). Unit test `certification_readiness_never_certifies`
   (`lib.rs:477-504`) asserts `readiness != CERTIFIED`.

2. **`banza-certification` = the L2 Conformance & Interoperability Certification *authority*** (ADR-064/
   065/066) — a separate deterministic Rust engine with a closed state machine
   `NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED` that *can* emit an
   `InteroperabilityCertificationRecord`; "No Qwen, no external model, no human FAIL->PASS. Certification
   is technical, per-implementation, and is not a licence, scheme admission or regulatory authorisation
   (ADR-061)" (`banza-certification/Cargo.toml:5`).

**This engine is NOT invoked by the nine-step journey** — it is not among the seven WASM packages
vendored in `services/banzai-api/src/validatewasm/` (banza_conformance, banza_evidence_bundle,
banza_l2_readiness, banza_l3_readiness, banza_operator_manifest, banza_target_registry, banza_trust) and
is not imported anywhere in `services/banzai-api/src/` (verified by grep). The journey stops at
*readiness*; certification proper is a separate authority path. This matches the boundary that
certification is per-implementation and scoped to profile+version+environment+scope+evidence+validity.

---

## 11. The SSRF-hardened server-side fetcher (`banza-artifact-fetcher`)

The ONLY component that reaches operator public endpoints (`Cargo.toml:5`). Split into pure, fully
unit-testable modules:

- **`policy.rs`** — pure, no I/O/network/clock (`policy.rs:1-10`). `preflight` enforces HTTPS-only
  (http only under a `#[doc(hidden)]` test-only policy, never reachable from `/fetch` — `policy.rs:16-51`),
  no userinfo, host == registry `expected_host`, port in allowlist (default `[443]`). `classify_ip`
  applies the full IPv4/IPv6 blocklist (loopback, private, CGNAT 100.64/10, link-local, unique-local,
  cloud-metadata `169.254.169.254` / `fd00:ec2::254`, unspecified, broadcast, multicast, reserved/
  documentation ranges) and unwraps IPv4-mapped/-compatible IPv6 so `::ffff:127.0.0.1` cannot slip past
  (`policy.rs:119-251`). Decompression-bomb guard refuses any non-identity `Content-Encoding`
  (`policy.rs:277-285`).
- **`fetch.rs`** — resolves the host once, validates *every* returned IP (rebinding defence), then a
  per-request `reqwest` client with `redirect::Policy::none()`, connect+total timeouts, `no_proxy()`,
  `https_only(true)`, and connection pinned to the validated IPs via `resolve_to_addrs` so no unvalidated
  second lookup can occur (`fetch.rs:99-135`). Refuses 3xx/`redirect_blocked`, non-2xx/`http_status_not_ok`,
  size over cap (declared **and** streamed), media type outside allowlist; hashes raw bytes (SHA-256) and
  decodes UTF-8 (`fetch.rs:143-247`). Never panics; always returns a typed `FetchResponse`
  (`fetch.rs:58-59`).
- **Defaults**: 1 MiB size cap, 8 s timeout, ports `[443]` (`types.rs:10-15`). The TS client mirrors
  these and injects `fetchImpl` for hermetic tests (`fetcherClient.js:15-17, 76-109`).

The TS `fetcherClient.js` NEVER fetches an operator endpoint itself and NEVER accepts a user-supplied
URL; all SSRF policy lives in Rust and the TS layer only shuttles typed JSON to `POST /fetch`
(`fetcherClient.js:1-12`). Host is re-checked in Rust as defence in depth (`fetcherClient.js:26-28`).

---

## 12. Boundary-compliance check (against the audit's required facts)

Each required fact and where the code upholds it:

- **operator ≠ implementation; one operator → many implementations** — UPHELD. Distinct records
  (`model.rs:80-105`); `OperatorRecord.implementation_ids: Vec<String>`; resolution enforces the
  implementation belongs to the named operator (`registry.rs:90-98`). ADR-068 §4.2 cited in code.
- **certification ≠ scheme admission ≠ regulatory authorisation; per-implementation, scoped** — UPHELD.
  Registry `BOUNDARY` string: "Resolução … prova elegibilidade — não é admissão, não é autorização e não
  movimenta dinheiro real" (`lib.rs:26-27`); aggregate sets `authorised:false, licensed:false`
  (`verdict.rs:279-280`); `banza-certification/Cargo.toml:5` states "not a licence, scheme admission or
  regulatory authorisation".
- **BANZA is an open protocol, not a bank/PSP/wallet/operator; holds no accounts; moves no funds; does
  not settle/license/authorise** — UPHELD across engine descriptions (e.g. `banza-l2-readiness`,
  `banza-l3-readiness`, `banza-m2-protocol-gate` `Cargo.toml:5`) and readiness guidance ("não houve …
  movimentação de fundos").
- **Rust EXECUTES/DETERMINES; Qwen only EXPLAINS; BanzAI is a transversal interface, not a 4th layer/
  authority** — UPHELD (see §8; `verdict.rs:1-7`; receipt disclaimer `validate.js:375-376`).
- **Operador Zero = sandbox reference implementation, read-only, no real funds, NOT_CERTIFIED, not
  production** — UPHELD. Production registry seeds exactly `operator-zero` / `operator-zero-ref-impl`,
  `environment:"sandbox"`, `profile:"L0"` (`registry.rs:166-193`); journey always returns
  `certification_status:"NOT_CERTIFIED"` (`validate.js:368`); `operator-zero-core/Cargo.toml:5` "no real
  money, no private keys".
- **No AI decision path** — UPHELD (§8).

No violations of these facts were found on the audited code path.

---

## 13. Findings — obsolete terminology & risks

### Obsolete term found (package metadata — flag)

- **"BANZA CA"** appears in TWO `Cargo.toml` `description` fields:
  - `engines/banza-evidence-bundle/Cargo.toml:5` — *"…the technical evidence bundle a candidate operator
    prepares before a real BANZA CA review…"*
  - `engines/banza-l1-readiness/Cargo.toml:5` — *"…does not run the BANZA CA review."*

  "BANZA CA" is obsolete: M2.2–M2.5 removed the BANZA CA in favour of the open trust model (signed
  protocol metadata, Open Trust Evaluation). The engines' own `lib.rs` and output are correctly updated
  — `banza-evidence-bundle/src/lib.rs:9-24` states "NOT a certificate … no central human authority
  accepts operators … não há aprovação humana central" and every bundle carries `not_a_certificate =
  true`. The stale term survives ONLY in the two Cargo package descriptions (build/metadata surface),
  not in decision logic, receipts, or user-facing output. Recommend rewording both descriptions to the
  open-trust "technical review / verifiable evidence" phrasing. **This is package metadata, not a
  normative or public surface** — flagged for completeness per the audit's obsolete-term list.

No other flagged obsolete terms were found on the audited path: no operator X.509 certificates, no
"general company certificate", no central-human-approval-as-protocol-requirement (the code explicitly
denies it), no "BANZA as operator/bank/PSP/settlement", no "BanzAI as authority", no "Qwen as decider",
no "Operador Zero as production", no active real funds, no unlimited entity certification (registry is a
closed set — `registry.rs:166-194`).

### Risks / ambiguities (could confuse a whitepaper reader)

1. **Two meanings of "L1/L2/L3"** — the three-layer architecture (Protocol / Certification / Operational
   Schemes) vs the conformance *profiles* L0–L4 vs the `banza-lN-readiness` engines. The whitepaper must
   disambiguate; the "interoperability" step uses the **L2 payment-flow profile** engine, not "Layer 2
   certification". (Grounded: `registry.rs:17` profiles, §9 above, three-layer model per MEMORY
   ADR-059..063.)
2. **Two meanings of "certification"** — the journey's step-9 Certification *Readiness*
   (`banza-target-registry`, never CERTIFIED) vs the `banza-certification` *authority* engine (can emit
   CERTIFIED). They are separate code paths; the nine-step journey never issues a certificate (§10). A
   reader could wrongly infer the journey certifies.
3. **`banza-trust` is invoked twice** (steps `keys` and `trust`) with overlapping but different endpoint
   sets (`validate.js:53, 56`); both map through the same trust status table (`verdict.rs:43-51`). Worth
   stating explicitly so the two steps are not read as two different engines.
4. **`engine_version` can be `"unknown"`** if an engine omits `tool_version`, or `"n/a"` on a fetch-blocked
   step (`validate.js:270, 278`). Not a defect, but the whitepaper should not claim every receipt carries
   a numeric engine version.
