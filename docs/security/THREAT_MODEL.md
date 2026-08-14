# BANZA — Threat Model (BX2.0)

> Internal threat model for the BANZA protocol, its artifacts, the L0–L4 readiness tools and the BanzAI
> Workbench. Not an external audit, not certification, not a production claim.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa, não
> liquida e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados.

## 1. Actors

| Actor | Description |
|---|---|
| BANZA protocol | The open specification, contracts, invariants and conformance criteria. |
| Candidate operator | Implements the protocol; prepares readiness/evidence (test-only). |
| Authorised operator | Provides real financial services under its own regulatory authorisation. |
| Malicious operator | Attempts to bypass invariants, replay, or route to a revoked peer. |
| End user | Consumer of an operator's service. |
| Merchant | Payee in a payment flow. |
| Auditor | Independent external reviewer (out of scope for BX2.0; required before production). |
| Protocol maintainers | Maintain and evolve the protocol; custody the Trust Root — they **do not** authorise, accept, approve or certify operators, and are **not** a regulator. |
| Trust Root | Offline 2-of-3 signing root — signs protocol metadata, delegated signing keys, releases and revocation lists; **never** operators, payments or licences. |
| BanzAI Workbench | Explains + runs Rust/WASM tools; does not certify/approve/decide. |
| External attacker | Network/supply-chain/forgery adversary. |
| Insider | Privileged actor with repo/infra access. |

## 2. Assets

Protocol contracts · operator manifests · keys · key manifests · BRL · traces · ledger artifacts ·
settlement artifacts · evidence bundles · readiness reports · Workbench UI · machine routes
(`/operators`, `/certificates`, `/.well-known/banza/*`, `/federation/revocation-list.json`,
`/conformance/evidence`) · public documentation.

## 3. Threats and mitigations

| Threat | Mitigation (current) | Residual owner |
|---|---|---|
| Replay attack | L2 idempotency check (same key → consistent, replay flagged); operators enforce at runtime | operator |
| Duplicate payment intent | idempotency key + trace linkage; L2 structure check | operator |
| Idempotency bypass | idempotency required in payment intent + endpoint contract (idempotency flag) | operator |
| Forged manifest | Operator Manifest Validator (form + sandbox-safety invariant); trust chain at federation | protocol/operator |
| Forged certificate fixture | trust engine form checks; signature verification is a trust-engine concern; M2 root ceremony pending | protocol |
| Revoked operator accepted | **BRL fail-closed** (INV-FEDEVAL-002) — a revoked operator blocks in L3/L4 | engine (fail-closed) |
| BRL ignored | operators MUST fetch fresh BRL ≤ 6h; engine treats missing/invalid BRL as blocking | operator |
| Trace tampering | trace linkage + cross-operator correlation checks (INV-TRACE/INV-RECON) | protocol |
| Ledger imbalance | double-entry + zero-sum + single-currency checks (INV-LEDGER) | operator |
| Settlement inconsistency | `net = gross − fee` coherence, ≥ 0, linked to intent (ADR-019/ADR-025) | protocol |
| Evidence tampering | SHA-256 canonical hashing; validate recomputes and detects tampering | engine |
| Downgrade / version negotiation | L4 version negotiation (selected ∈ supported, requested or fallback) | protocol |
| Endpoint contract mismatch | L4 endpoint contract map (path/method/schemas/idempotency/trace) | protocol |
| Malicious operator profile | L4 profile validation; production/live flags → INVALID | engine |
| BanzAI over-claiming authority | refusal intents; deterministic answers; CLI forbidden-claim check; no real provider | frontend |
| Public copy implying PSP/licence | `make regulatory-check`; forbidden-phrases test; boundary docs | frontend/governance |
| Supply-chain compromise | pinned image tags; reproducible bundle; Rust-first engines; SBOM/signing = open item | infra |
| Secret leakage | no secrets in repo; purity/identity guards; mock provider; no external calls | infra |
| Deployment drift | website-only deploy from fixed commit; rollback tag; drift automation = open item | infra |
| Availability failure | preserve non-website services on deploy; health checks | infra |
| Audit-log incompleteness | machine routes are read-only; append-only artifacts; formal log review = open item | infra |

## 4. Trust boundaries

- **protocol vs operator** — BANZA defines rules; operators execute financial services under their own
  authorisation.
- **BANZA vs the reference operator** — the protocol is operator-neutral; a reference operator is a role,
  not the protocol.
- **BanzAI vs Open Trust Evaluation** — BanzAI explains/runs tools; Open Trust Evaluation verifies the
  operator's published material (signed protocol metadata → delegated signing keys → manifest +
  conformance evidence + public registry + revocation/fail-closed); neither is a regulator, and neither
  authorises, accepts, approves or certifies operators.
- **readiness vs trust evaluation** — L0–L4 readiness is preparation; trust is evaluated over the
  operator's self-published conformance evidence by Open Trust Evaluation — there is no central authority
  that certifies, approves or accepts operators (production trust metadata M2/M3 pending).
- **evidence vs licence** — an evidence bundle is technical evidence, never a licence.
- **demo/test-only vs production** — everything here is test-only; production requires external audit +
  controlled pilot + authorised operators.
- **local validation vs live integration** — validation is local/no-network; live operator-URL/external
  integration is disabled and gated to a future phase.

## 5. Out of scope for BX2.0

Real money movement · live operators · production certificates · regulator approval · real federation ·
real external integration · PSP licensing. None of these is asserted or activated by this phase.

## BX2.1 — Threat model deepening

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

BX2.1 deepens this threat model with an abuse-case catalogue and end-to-end attack scenarios, and maps
them to controls and evidence. The existing sections (actors, assets, threats, trust boundaries,
out-of-scope) are unchanged; the following documents extend them:

- [`ABUSE_CASES.md`](ABUSE_CASES.md) — ≥ 17 abuse cases (`AB-*`) against the protocol, the L0–L4 readiness
  engines, the Evidence Bundle, the machine routes and the BanzAI Workbench/Assistente, each with a
  protocol/engine control, a residual owner and a coverage status.
- [`ATTACK_SCENARIOS.md`](ATTACK_SCENARIOS.md) — narrative end-to-end scenarios (`AS-*`): malicious
  operator replay, forged certificate/BRL, MITM on well-known discovery, insider repo/evidence tamper,
  deployment drift weakening a header, and social-engineering a boundary claim.
- [`THREAT_COVERAGE_MATRIX.md`](THREAT_COVERAGE_MATRIX.md) — maps every `AB-*`/`AS-*` id to a mitigating
  control (from [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md)), an evidence artifact
  (engine/test/CI job), a coverage status and a residual owner.

**Feeds the validator.** This abuse-case + attack-scenario deepening is the input to the **THREAT_AND_ABUSE**
track of `engines/banza-security-assurance :: validate_deep_assurance` (readiness is computed **in Rust**,
never in TypeScript). Every critical abuse path is `covered` or `partial` — **none `uncovered`** — so the
track does not raise a critical threat gap; a single `uncovered` critical path would make the engine return
**`DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP`**. This is an **internal pre-audit** signal only; it is
not production, not certification, not a licence, and does not make BANZA a PSP.

## M2.19C — Three-layer architecture threats

> **M2.19C introduces the three-layer institutional architecture** (ADR-004..063): L1 the open BANZA
> protocol, L2 per-implementation conformance & interoperability certification, L3 the designated L3
> scheme operator's operational scheme (ADR-006), conditioned on a regulatory framework. The layers are
> separated by responsibility, infrastructure and keys. This section **appends** threats that arise
> precisely because the protocol's creator is also the first scheme operator, and because a third,
> regulated layer now exists. The sections above (actors, assets, threats, trust boundaries,
> out-of-scope) are unchanged — including the INV-FEDEVAL fail-closed mitigations. Naming the L3 layer
> does **not** activate real money, does **not** make BANZA an operator, and does **not** assert any
> regulatory status.

**M2.19C threats and mitigations.**

| Threat | Mitigation (current) | Residual owner |
|---|---|---|
| Conflict of interest / self-certification bypass — the designated L3 scheme operator's own implementation seeks a reduced profile, a private certification, a reserved endpoint, publication without evidence, a FAIL→PASS override or a secret exception (creator == first operator) | Structural, not by promise (ADR-006): that implementation runs the **same** public versioned profile, the **same** conformance + interoperability suites, the **same** Rust engine, the **same** reason codes, validity and revocation as any other, and is independently verifiable. No reduced profile, no private certification, no bypass, no reserved endpoint, no publication without evidence, no FAIL→PASS, no secret exception. Certification is decided in Rust over reproducible, hash-bound evidence; Rust validates before publishing. Guards: `banza-protocol-scheme-separation-check` and the M2.19C scheme-role separation guard | protocol/engine |
| False regulatory status — a public surface presents the L3 operator as already authorised, BNA-approved, licensed or regulator-recognised | Internal state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` (ADR-007) = preparation, not conclusion. Only the prudent public phrasing is allowed ("A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem desactivados."). No BNA-approval language until every §6 gate of `BANZA_REGULATORY_CLAIM_POLICY.md` holds (evidence + founders' authorisation + reviewed wording + no confidential info + not readable as granted) — none holds today. Guard: `banza-regulatory-state-claim-check`; `make regulatory-check` | governance/frontend |
| Real-money activation — real funds, wallets, settlement or real participants are switched on without formal applicable evidence | **RealMoneyActivationGate** (ADR-007): real funds, real wallets, real settlement, real participants and real financial clients are **fail-closed** until formal applicable evidence exists. Activation is a Rust-validated decision; no public claim, prior technical stage or local-model explanation unlocks it. Operador Zero stays a demonstration reference implementation (ADR-035/053), never a scheme participant nor a real-money path | engine (fail-closed) |
| Protocol/scheme confusion — a reader concludes BANZA = the scheme = the operator = authorised, collapsing three distinct things into one brand | Invariant BANZA ≠ the designated L3 scheme operator and BANZA ≠ the scheme itself (ADR-004/060); layers separated in infrastructure, databases, schemas, roles, keys, secrets, logs, backups, pipelines and permissions, keys never reused across domains (ADR-006); the L1 protocol stays buildable/governable/verifiable with no knowledge of any scheme; Technical Registry ≠ Scheme Participant Directory; identity/contamination guards keep payment-operator brands off the protocol surface | protocol/governance |
| Certification = admission confusion — a reader treats a certified implementation as admitted to the scheme or as regulator-authorised | Technical Certification ≠ Scheme Admission ≠ Regulatory Authorisation (ADR-005): certification certifies an **implementation** against a public versioned profile, never an entity; Scheme Admission is a separate, later operational determination by the scheme operator (never implied by certification); regulatory authorisation belongs to the competent regulator. A PASS is a conformance result, not a licence or an authorisation | protocol/governance |

**M2.19C trust boundaries (append).**

- **certification vs scheme admission vs regulatory authorisation** — three separate determinations
  (ADR-005). A certified implementation is not thereby admitted to any scheme and not thereby authorised
  to move real funds.
- **BANZA (L1/L2) vs the designated L3 scheme operator** — the protocol and certification are
  operator-neutral (ADR-004/060); naming the first scheme operator does not make BANZA an operator, and
  the operator's own implementation earns no self-privilege (ADR-006).
- **Technical Registry vs Scheme Participant Directory** — the L2 technical registry is independent of
  the L3 scheme directory; public verification needs no scheme account.
- **regulatory preparation vs authorisation** — `REGULATORY_AUTHORIZATION_IN_PROGRESS` is preparation;
  it is not authorisation granted, BNA approval, a completed licence, regulatory recognition or active
  financial operation (ADR-007).

**Out of scope for M2.19C** (unchanged from the sections above, restated for the L3 layer): real money
movement · real wallets · real settlement · real participants · regulator approval · a completed licence.
None is asserted or activated by this milestone; every real-money path stays fail-closed.

## M2.19G.1 — Endpoint-originated validation threats (§36)

> **M2.19G.1 makes every artifact in BanzAI's official validation journey come exclusively from the
> public endpoints of the selected implementation** (ADR-034). The target is resolved from the closed
> Technical Registry (`operator_id → implementation_id → canonical_origin → discovery`, ADR-033); the
> fetch is performed by a secure, SSRF-hardened **Rust** artifact fetcher (`engines/banza-artifact-fetcher`,
> ADR-038/ADR-034 §4.7), never the browser; the no-network decision engines receive already-fetched
> content and Rust decides every verdict; each verdict is bound to the exact origin of its inputs in an
> `OperationReceipt`/`JourneyReceipt` (§30/§31). Upload/paste is demoted to a local, non-authoritative
> **draft** tool (`DRAFT_VALIDATION_RESULT`, ADR-034 §4.5). This section **appends** the threats this
> model introduces. The sections above are unchanged. Endpoint-originated validation activates no real
> money, admits no operator, and asserts no regulatory status; a receipt is not a certificate.

Operational rule: **the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result;
the Technical Registry publishes the verifiable state.** The threats map to four control surfaces: the
**fetcher policy** (SSRF hardening + origin pinning), the **registry** (closed target resolution), the
**receipts** (origin binding), and **Rust authority** (Rust decides; the model and the frontend never do).

**M2.19G.1 threats and mitigations.**

| Threat | Mitigation (current) | Residual owner |
|---|---|---|
| Local artifact presented as official — pasted/uploaded/embedded content, a fixture or a pre-computed result is passed off as an official verdict | The official journey consumes **only** artifacts fetched from the implementation's public endpoints (ADR-034 §4.4). Upload/paste lives only in a clearly-marked local **draft** tool whose output is `DRAFT_VALIDATION_RESULT` — local, non-authoritative, never evidence (§4.5). No pasted/uploaded content ever enters the official path | engine (fetcher) / frontend |
| Operator / implementation impersonation — an artifact claims an identity that is not the resolved target | The discovery engine checks that `operator_id`, `implementation_id`, `canonical_origin` and `protocol_version` in the fetched discovery match the resolved target, and that every announced endpoint is host-bound to the canonical origin (`DISCOVERY_MISMATCH` / `DISCOVERY_ENDPOINT_OFF_ORIGIN`) | engine (registry/discovery) |
| Target substitution — a caller tries to point validation at a different operator/implementation or a foreign origin | The target is resolved **only** from the closed Technical Registry (ADR-033); `operator_id`/`implementation_id` are closed-set ids (never URLs), and the fetcher receives a registry-derived `canonical_origin`+`expected_host`, never a caller URL | engine (registry) |
| Registry poisoning — an unpublished / revoked / origin-less / incompatible record is treated as a valid target | Resolution is fail-closed with typed reasons (`unknown_*`, `*_unpublished`, `*_removed`, `*_revoked`, `origin_missing`, `incompatible_protocol_version`, `unsupported_environment`, `incompatible_profile`). Only a `published` operator + `published` implementation with a valid HTTPS origin, supported protocol/environment/profile is eligible | engine (registry) |
| SSRF — the fetch is redirected at an internal service | HTTPS-only, registry-supplied host + port allowlist (443), full IPv4/IPv6 blocklist (loopback/private/CGNAT/link-local/unique-local/unspecified/broadcast/multicast/reserved), most-specific-rule-wins; reason codes `scheme_not_https`, `host_mismatch`, `port_not_allowed`, `loopback_blocked`, `private_ip_blocked`, … (§4.7, §19) | engine (fetcher) |
| DNS rebinding — the host resolves to a benign IP then flips to a private one | The host is resolved **once**; a set is refused if **any** member is non-global; the connection is **pinned** to the validated IPs (`resolve_to_addrs`) so no second, unvalidated lookup can occur, while Host/SNI are preserved | engine (fetcher) |
| Internal-network / cloud-metadata access — the fetch reaches 169.254.169.254 / fd00:ec2::254 or an internal range | Cloud-metadata is a distinct, higher-specificity rule (`metadata_blocked`) evaluated before link-local; every private/internal range is blocked; IPv4-mapped IPv6 is unwrapped and classified as its embedded v4 | engine (fetcher) |
| Redirect abuse — a 3xx sends the fetch off-origin or into a loop | Zero redirects (`redirect::Policy::none()`): a 3xx is returned, never followed (`redirect_blocked`); a self-redirect never loops | engine (fetcher) |
| Host mismatch — an absolute-URL path or a joined URL smuggles another host | The URL is `canonical_origin.join(path)`; the parsed host must equal the registry `expected_host` (`host_mismatch`); `Url::join` replaces the base so an absolute path cannot smuggle a host | engine (fetcher) |
| TLS downgrade / invalid cert — a MITM presents http, a stripped or forged certificate | rustls (ring) + Mozilla roots via webpki-roots; invalid/expired/mismatched/untrusted certs fail (`tls_error`); http is refused before DNS (`scheme_not_https`); `system-proxy` disabled and `.no_proxy()` set so no ambient proxy routes around the policy | engine (fetcher) |
| Content-type spoofing — a non-JSON body is served as a protocol artifact | The pre-`;` media type must be in the caller's allowlist, case-insensitive (`media_type_not_allowed`); a missing content-type is refused | engine (fetcher) |
| Oversized payload — a huge body exhausts memory | Declared `Content-Length` over `max_bytes` is refused before streaming, and the stream is aborted the moment accumulated bytes exceed the cap (`size_cap_exceeded`) | engine (fetcher) |
| Decompression bomb — a small compressed body inflates enormously | Compression is never negotiated and never decompressed; any non-identity `Content-Encoding` is refused outright (`content_encoding_rejected`) | engine (fetcher) |
| Stale / mutable artefact — an endpoint quietly changes its content between fetch and use | Each response is bound to a SHA-256 hash, `fetched_at` timestamp, HTTP status, content type/length and ETag in the `OperationReceipt`; every `evidence_ref` is an endpoint URL + the content hash fetched from it, so a later divergence is detectable | engine (receipts) |
| Split-view response — an endpoint serves different content to different verifiers | The verdict is reproducible from the origin-bound receipt (hash + endpoint + fetched-at + engine version); a second verifier re-fetching the same origin obtains a comparable hash, and the result is specific to the implementation, profile, version, environment, scope, artifacts and moment of evaluation | engine (receipts) |
| Key / signature / metadata mismatch — signed metadata does not verify against the published keys | The trust engine evaluates signed protocol metadata against the fetched key manifest and revocation; the receipt carries `signature_status`; missing/invalid/expired/revoked material is fail-closed (PENDING/FAILED, never a silent pass) | engine (trust) |
| Replay — an old fetch/verdict is re-presented as current | Each step carries a fresh `request_id`, `operation_id`, `fetched_at` and audit ref; freshness is part of the verdict; a receipt is not reusable as a certificate | engine (receipts) |
| Cache poisoning — an intermediary injects a forged response | HTTPS + pinned validated IPs + zero redirects + hash binding mean a forged/injected body fails TLS or is detectable by hash; the fetcher sets no ambient cache trust | engine (fetcher) |
| Profile / environment downgrade — a target claims a weaker profile or a production environment to dodge checks | Resolution enforces supported environments (`sandbox`/`demo` only) and profiles; a mismatch is a typed ineligibility (`unsupported_environment`, `incompatible_profile`); the profile is fixed per certification profile version, not caller-chosen | engine (registry) |
| Operador-Zero fixture bypass — the reference implementation is given a shortcut, official fixture or pre-computed result | Operador Zero receives **no** shortcut/fixture/bypass (ADR-034 §4.9): it exists in the registry as an operator + implementation record, publishes its endpoints at `zero.banza.network`, and is validated through the **same** secure fetch + Rust engines as any implementation, producing real origin-bound receipts | engine (fetcher/registry) |
| Frontend-verdict injection — the browser or TypeScript fabricates or alters a verdict | Rust decides every verdict (registry + no-network decision engines); TypeScript shuttles JSON, assembles engine inputs from fetched content and builds receipts, and never decides; there is no model call in validation mode (`qwen_calls = 0`, `external_model_calls = 0`) | engine (Rust authority) |
| Receipt origin omission — a result is published without its provenance | Every `OperationReceipt`/`JourneyReceipt` binds the result to operator, implementation, endpoint, resolved host, `fetched_at`, HTTP status, content type/length, ETag, hash, signature status and engine version; protocol fetches count as `protocol_fetch_count`, never as `external_model_calls` (§4.8) | engine (receipts) |

**M2.19G.1 trust boundaries (append).**

- **secure Rust fetcher vs the browser** — all official artifact retrieval happens in the Rust fetcher over
  the internal network; the browser never fetches an official target and the fetcher is never exposed via
  the reverse proxy. The fetcher obtains bytes only; it never decides a verdict, signs, or issues records.
- **fetcher (network) vs decision engines (no-network)** — the no-network protocol engines remain
  no-network; they receive already-fetched content and decide. Network reach and verdict authority are
  separated components.
- **closed Technical Registry vs caller input** — validation targets come only from the closed registry;
  `operator_id`/`implementation_id` are closed-set ids, never URLs; the canonical origin is registry-derived.
- **official journey vs draft tool** — the official journey is endpoint-originated and authoritative; the
  draft tool is local, non-authoritative and never produces evidence. The two never share a result path.

**Out of scope for M2.19G.1** (unchanged from the sections above, restated): real money movement · real
wallets · real settlement · real participants · regulator approval · a completed licence · any issued
certification. Endpoint-originated validation produces reproducible technical evidence and a Certification
Readiness (READY/BLOCKED) only; it never returns `CERTIFIED`, and every real-money path stays fail-closed.
