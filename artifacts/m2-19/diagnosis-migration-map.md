All facts confirmed. Highest ADR = ADR-056 → next is **ADR-057**; highest RFC = RFC-0006 → next is **RFC-0007**; repo-guards range is `1..=56` (line 184) with a stale `1..=54` doc comment (line 172) and error text `001..056` (line 185); execution-state defines 20 phases with a launch gate. Here is the consolidated migration map.

---

# BANZA M2.19 — Technical Interoperability Certification: Consolidated Migration Map

## 0. The one reconciliation principle (applies to every surface)

Every edit below is an instance of a single split. The repo today asserts an **absolute** "BANZA nunca certifica". M2.19 replaces that with a **qualified** stance:

- **KEEP (still true, never soften):** no CA / no `certificate authority` / no `BANZA CA`; not a financial licence; not a regulatory authorisation / commercial approval / institutional guarantee; no discretionary or human approval; no Qwen in the decision path; PASS is verifiable evidence not a licence; **BanzAI, ADRs and guards themselves do not certify — the Rust engines do**; Operador Zero is never counted; `production_certificates` stays `false` until infra is real.
- **NEW (introduce consistently):** BANZA issues a **deterministic, evidence-based, Rust-engine-computed Technical Interoperability Certification** that a *concrete implementation* (operator + implementation + environment + profile + protocol version + capabilities + evidence + validity window) demonstrated conformance to a **public, versioned interoperability profile** — re-derivable, **time-bounded and revocable**.

Canonical term everywhere: **PT** "Certificação Técnica de Interoperabilidade" · **EN** "Technical Interoperability Certification". Never bare "certificação/certification" without the "de interoperabilidade técnica / technical interoperability" qualifier on the public surface.

The hardest single conflict in the whole repo: **`engines/banzai-query-core/src/validate.rs:223-281`** deterministically blocks the exact third-person vocabulary M2.19 introduces. That is the highest-risk change and needs the most fixtures.

---

## 1. ADRs / RFCs to supersede / amend + next number

**Next free ADR = `ADR-057`** (confirmed: highest on disk is ADR-056; no ADR-057 exists). **Next free RFC = `RFC-0007`** (confirmed: RFC-0001…0006 exist).

### 1.1 Author `decisions/adr/ADR-057-technical-interoperability-certification.md`
- Title: "Technical Interoperability Certification" (Certificação Técnica de Interoperabilidade).
- Frame as **AMEND, not reverse**. Follow the ADR-038 "removed vs active" table pattern: a two-column table distinguishing *operator/entity certification + financial authorisation + CA* (**removed, stays removed**) from *technical-interoperability certification of a concrete implementation's conformance* (**new, active**).
- Explicitly: deterministic, evidence-based, engine-computed per **ADR-037** (Rust sole authority), Qwen out of the decision path.
- **Amends `ADR-040`** (add evidence-based certification records, still no CA); **preserves `ADR-038`** (no-CA open trust model) and **`ADR-039`** (self-publication / machine-verifiable conformance) by citing them as the evidence substrate; notes the **CA parts of `ADR-027`** stay removed while the offline Trust Root / signed-metadata architecture survives and is reused.
- Cite the BanzAI/Qwen "não certifica" ADRs — **ADR-032, ADR-041, ADR-044:118, ADR-054** — as *evidence the agent stays out of the decision path*. **Do not edit them.**
- Extend, do not contradict, invariant series **INV-OTE-001..010** (ADR-038) and **INV-FEDEVAL-001..010** (ADR-040); register new certification invariants (e.g. INV-ICERT-*) in `contracts/invariants.json`.

### 1.2 Author `decisions/rfc/RFC-0007-*.md`
Required because **`ADR-040:286-287`** mandates a public RFC that explicitly supersedes the canonical decision before any certificate-adjacent term is reintroduced. Cross-reference RFC-0007 from ADR-057.

### 1.3 Index / cross-link
- Add ADR-057 to `decisions/adr/README.md` (Active table).
- Add `Related` back-links in ADR-038 / 039 / 040.
- Note the amendment in the authority lines of **ADR-021** ("makes no certification claim", lines 16, 85-90) and **ADR-031:29** ("PASS … não certificação. Nenhum operador está certificado").
- **Do NOT rewrite superseded/historical records** (ADR-022, ADR-026, ADR-027, dated PHASE_*/M2_* reports) — ADR-038 "Historical artifacts" rule; ADR-057 names removed-vs-new instead.
- Re-sync the stale website mirror `website/content/decisions/adr/` (currently stops at ADR-054) to add **ADR-055, 056, 057**.
- Record the amend-vs-keep decision per file in a new auditable inventory doc under `docs/governance/` (mirror `M2_2_ARCHITECTURE_REFACTOR_INVENTORY.md §5`).

### 1.4 Governance corpus to qualify (entity-level negations only)
Reword these from absolute to the KEEP/NEW split — keep "no CA / no financial licence / no discretionary approval", drop "does not certify [operators]":
`GOVERNANCE.md:63` (§9) and `:73`; `README.md:52-53`; `docs/governance/certification-boundary.md` (esp. 20-24, 37, 39, 131-132, 214, 269, 282, 291, 380-382); `docs/governance/BANZA_PROTOCOL_BOUNDARY.md:108-114 §5, :124, :126`; `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md:69, :77`; `docs/governance/PROTOCOL_PRODUCTION_STATE_MODEL.md:62`; `docs/governance/PROTOCOL_SUCCESSION_AND_SURVIVAL.md:149, :220`; `docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md:37`; `docs/governance/MATRIX_A_BANZA.md:5`; `docs/governance/REPOSITORY_STRUCTURE.md:73`; `CLAUDE.md:154/162/169` (terminology table + L0-L4 line); `docs/governance/roadmap.md` (retitle "Portal/Certificação self-service" items to deterministic technical-interop certification, **no CA portal**).

**Engine-level reversal (special):** `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md:77` and `docs/governance/PROTOCOL_GOVERNANCE_ROLES.md` currently say "Motores de verificação … Não conferem estatuto". M2.19 **reverses this specific line**: Rust engines **do** compute a technical-certification verdict (while still not conferring financial/regulatory status).

**Do NOT touch** BanzAI/Qwen "não certifica" statements in `EVIDENCE_BUNDLE.md`, `SIMB_PRE_REVIEW_GATE.md`, ADR-032/041/044/054 — they reinforce "no Qwen in the decision path".

---

## 2. Schemas + Rust engine + record artifacts to CREATE (and what they CONSUME)

### 2.1 New Rust crate: `engines/banza-interoperability-certification/`
Standalone Cargo crate (own `Cargo.toml` + `Cargo.lock`, **no workspace**), mirroring `engines/banza-reference-trust-model` + `engines/banza-m2-protocol-gate`:
- `src/lib.rs` — pure native-testable pipeline; computes lifecycle status + reason codes + SHA-256 record hash **in Rust**; `#![recursion_limit="512"]`; `BOUNDARY` + `PROTOCOL_STANCE` consts; `llm_calls=0`, `external_model_called=false`, `test_only`, `fixtures/demo_fixtures`, `schema()`/`tool_version()`.
- `src/wasm.rs` — feature-gated `#[wasm_bindgen]` JSON-in/JSON-out fns named `<domain>_<verb>_json`: `interop_cert_evaluate_json`, `validate_record_json`, `schema_json`, `tool_version_json`.
- `tests/`, `golden/parity.json`, optional `src/bin/cli.rs`.
- Fail-closed + revocation-aware: `revoked | unknown | expired ⇒ not certified`.

**CONSUMES (bind, do not duplicate):**
- `contracts/production/conformance-evidence.production.schema.json` — `conformance_status` (pass/fail/not_run) + `conformance_report_hash` + `evidence_bundle_hash` + `verified_by_tool_version` + `trust_root_version` + `signed_protocol_metadata` + `revocation_status` = the "demonstrated conformance" evidence.
- `contracts/production/conformance-report.production.schema.json` — per-level L0-L4 + `invariants_checked` + `evidence_refs`.
- `contracts/production/evidence-bundle.production.schema.json` + `engines/banza-evidence-bundle` (`build_bundle`/`compute_readiness`/`validate_bundle`, `REQUIRED_ARTIFACTS`, hash triple).
- `engines/banza-l4-readiness/src/lib.rs` — the existing **external interoperability profile** shape (operator_id/environment/protocol_version/supported_versions/capabilities/levels; endpoint_contract_map; capability_matrix; interop_envelope; trust & BRL fail-closed) — the profile shape the engine/record consume.
- `engines/banza-trust/src/lib.rs` + `src/sign.rs` — `canonical_bytes`, `canonical_sha256`, `verify_ed25519`, `verify_signed_doc`, `verify_signed_protocol_metadata`, `verify_evidence_package`, `verify_revocation_list`. **Phase 5 reuses these — do not reimplement canonical-JSON / ed25519.**
- `contracts/production/signed-protocol-metadata.production.schema.json` — `expires_at` + `revocation_status` (time-bounded + revocable); record signatures `$ref` this signature shape (key_id/signer_type/custodian/signature/algorithm).
- `contracts/production/revocation-entry.production.schema.json` + `brl.production.schema.json` — `subject_type` enum [key, operator, artifact]; **decide: add a `certification` subject_type or reuse `artifact`**.
- `contracts/production/operator-manifest.production.schema.json` + `engines/banza-operator-manifest` (`validate_manifest`) — operator_id/capabilities/supported_levels/protocol_version.
- Detection/status scaffolding to mirror: `engines/banza-reference-trust-model` + `engines/banza-open-governance` (`walk`/`strings`/`contains_word`/`detect_by`, `STATUS_VALUES` enum + `blocked_items` + `next_steps` + `report_hash`).

### 2.2 New schema: `contracts/production/interoperability-certification-profile.production.schema.json`
Public, versioned interoperability profile: `profile_id`, `protocol_version`, required conformance levels/checks, capabilities, freshness/validity policy. Draft-2020-12; `$id` under banza.network; `_spec_version`/`_status`/`_authority`/`_boundary`; `additionalProperties:false`.

### 2.3 New schema: `contracts/production/interoperability-certification-record.production.schema.json`
Binds `operator_id` + `implementation` + `environment` + `profile_id` + `protocol_version` + `capabilities` + evidence refs (`conformance_report_hash`/`evidence_bundle_hash` via `$ref`) + validity window (`issued_at`/`expires_at`) + `revocation_status` + signatures (`$ref` signed-protocol-metadata) + `lifecycle_state`. Its `boundary` object **affirms** technical-interop certification while keeping `not_operator_authorisation` / `not_payment_service_authorisation` / `not_licence` `const:true`.

### 2.4 Validation authority
Use the single in-repo validator `engines/banzai-query-core/src/schemacheck.rs::validate_against_schema` (exposed via `engines/banzai-api-kb/src/lib.rs::validate_against_schema_json`). There is **no dedicated JSON-Schema CI validator** for `contracts/production` — enforcement rides per-crate `cargo test` + repo-guards; the new schemas' tests use this validator.

### 2.5 Qualify (don't delete) the existing schema boundary objects
Update the absolute `not_a_certificate` / `not_operator_certificate` / `certificate_based_trust=false` boundary flags to the qualified stance (**not an operator/financial certificate/licence**, while technical-interop records exist) in: `conformance-evidence`, `evidence-bundle` (`boundary_flags.not_a_certificate`), `federation-trust-evaluation` (`not_operator_certificate` const:true, `certificate_based_trust` const:false), `revocation-entry`, `signed-protocol-metadata`, `public-protocol-registry`, `operator-manifest`. **Leave `root-metadata.production.schema.json:5** `production_certificates:true`/`operator_authorisation_authority:true` **FORBIDDEN** — those are the CA/financial flags that stay banned.

### 2.6 Rust deny-lists to NARROW (not remove) so the new engine's own vocabulary passes
These currently flag bare certification tokens as `INVALID_EVIDENCE` and will trip M2.19:
- `engines/banza-reference-trust-model/src/lib.rs:90-127` `INVALID_EVIDENCE_FIELDS/FLAGS/PHRASES` — narrow to keep `operador certificado` / `certificado de produção` / `operator certificate` forbidden, but stop flagging a technical-interop-conformance result. **Keep `production_certificates(_allowed)=false` (lib.rs:488-494, 669-733) and the `legacy_route_gate` intact.**
- `engines/banza-open-governance/src/lib.rs:129-154` `CERTIFICATE_FIELD_NAMES/FLAGS/PHRASES` → `OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS` — same narrowing; add a positive `does_certify_technical_interoperability`-style flag.
- `engines/banza-trust/src/evaluate.rs:59-81` `boundary_violated()` `CLAIM_FLAGS`/`AFFIRMATIVE` — keep `operator certificate`/`certified operator`/`ca signature`/`certificate_based_trust` blocked; permit the interop-conformance result.
- `engines/banza-operator-manifest/src/lib.rs:86-95, 173-181` — keep rejecting manifests carrying `certified`/`production_ready`/`production_certificate`; do not let a manifest self-declare an interop certification.
- `engines/banza-evidence-bundle/src/lib.rs:453-464, 378-381, 208-221` — `validate_bundle` keeps forbidding `certified`/`approved`/`production_ready`/`operator_certified`; qualify the `not_a_certificate`/`not_an_approval` limitation strings.
- `engines/banza-conformance/src/lib.rs:24-26, 483-513` — `CERTIFICATION_DISCLAIMER` + `validate_report`: keep "PASS is technical conformance evidence, not **production** certification"; add the qualified interop-cert framing so the record may consume a PASS.
- `engines/banza-m2-protocol-gate/src/lib.rs:33, 58-93` — keep `emit_production_certificate`/`issue_production_certificate`/`set_production_certificates_true` as `M2_INVALID_FORBIDDEN_ACTIVATION`; these are financial-production flags, unchanged.

### 2.7 repo-guards range bump (blocks ADR-057 today)
`engines/banza-repo-guards/src/lib.rs:184` — bump `1..=56` to include `057`; update the stale doc comment at `:172` ("1..=54") and the error text at `:185` ("001..056"). **Do NOT create a top-level `sdk-certification/` dir** (`FORBIDDEN_DIRS`). New attribution/index artifacts must be added to the exact-path allowlist and the guard binary rebuilt.

### 2.8 Federation contract note
`contracts/federation/federation-trust.json:8` `_source`/description cite ADR-040 "nothing is issued to … an operator" — update to note the added evidence-based certification records **without a CA**.

---

## 3. Guards / tests enforcing the OLD stance (must be rewritten, not deleted)

Three enforcement shapes across ~90 `tools/check-*.sh`, the `Makefile`, 8 workflows, Rust engine tests, and website/service suites. **Retain in every case:** `BANZA CA` / `certificate authority` / `autoridade certificadora` / financial-licence / discretionary-approval bans. **Narrow:** the blanket `certificação` / `operador certificado` bans to permit "Certificação Técnica de Interoperabilidade / certificação de interoperabilidade técnica".

### 3.1 FORBIDDEN/RETIRED token-list guards — narrow the regex + add self-test fixtures
- `tools/check-svg-visual-quality.sh:53` (FORBIDDEN) and `:56` (NEG_BEFORE escape hatch) — **primary blocker for new certification SVGs**; a positively-asserted "BANZA certifies technical interoperability" has no negation cue and is rejected today.
- `tools/check-svg-visual-system.sh:25` (RETIRED) + `:27` (NEG cue) — scans exactly `website/public/diagrams/protocol/*.svg` where new SVGs live.
- `tools/check-public-surface-clean.sh:45, 68, 136, 142-149, 160-172` (keep the `/certificates` route + `production_certificates` `ROUTE_FLAG_EXEMPT` at :58).
- `tools/check-governance-docs-clean.sh:179-185, 286-347, 391-430`.
- `tools/check-open-governance.sh:144, 191-198, 238-346, 380`.
- `tools/check-homepage-final-public-release.sh:44, 47, 89, 93` (RETIRED `operador(es)? certificad`).
- `tools/check-global-navigation-final.sh:96-98`.
- `tools/check-license-notice-governance.sh:62-67`.
- `tools/check-regulatory-claims.sh:73-82` (keep `ca_signature`/`certificate_url`/`certificate_based_trust`/`banzai (certifica|aprova)` blocked).

### 3.2 REQUIRED-negation guards/tests — reframe from "não certifica" to the split
- `tools/check-homepage-final-validation.sh:85, 96`; `tools/check-banzai-agent-quality.sh:89-91`; `tools/check-banzai-knowledge-quality.sh:74`; `tools/check-banzai-upload-copy.sh:122-123`; `tools/check-banzai-primary-interface-architecture.sh:34, 104`; `tools/check-banzai-protocol-agent.sh:179`; `tools/check-banzai-protocol-vocabulary.sh:83-87`; `tools/check-banzai-public-surface-final-consistency.sh:17, 130`; `tools/check-banzai-workbench-navigation-orchestration.sh:139`; `tools/check-banzai-qwen-routing.sh:50`; `tools/check-banzai-semantic-answer-composition.sh:114`; `tools/check-banzai-governance-developer-vocabulary.sh:7, 46` ("ADR não certifica" — the ADR record is never an authority, **keep**); `tools/check-banzai-intent-source-ranking.sh:101`; `tools/check-banzai-docs-current-state.sh:30, 35`.
- Website vitest: `website/lib/publicSurface.test.ts:106-116, 118-125, 159-163, 17-21`; `website/lib/m2_15b-global-navigation.test.ts:39-44, 99-106`; `website/lib/m2_16-home.test.ts:54-57, 91`; `website/lib/m2_17-homepage.test.ts:96`; `website/lib/referenceIA.test.ts:52-61, 94-105`; `website/lib/m2_14j-public-consistency.test.ts:56-62`.

### 3.3 Rust engine tests — decouple "certification" from the financial `production_certificates` flag
- **Keep intact:** `engines/banza-reference-trust-model/tests/reference_trust_model.rs:313-316, 427` (`the_legacy_route_must_never_flip_production_certificates`, `production_certificates_allowed=false`); `engines/banza-open-governance/tests/open_governance.rs:292, 298, 311` (`does_not_certify_operators`… — *reword the assertion string* to `does_not_certify_operators_for_financial_authorisation` semantics but keep `production_certificates_allowed=false`).
- **Reconcile `not_a_certificate=true`** so a passing readiness/conformance result may FEED the record without asserting BANZA hands an operator a certificate: `engines/banza-l4-readiness/src/lib.rs:27, 581, 606` + l1/l2/l3-readiness; `engines/banza-m2-protocol-gate/src/lib.rs:350, 390`; `engines/banza-security-assurance/src/lib.rs:301, 329, 706, 739`; `engines/banza-open-governance/src/lib.rs:696`; tests `l1.rs/l2.rs/l3.rs/l4.rs`. Add positive tests.

### 3.4 BanzAI Rust decision-path (highest risk)
- `engines/banzai-query-core/src/validate.rs:223-281` — refactor so **first-person BanzAI GRANT claims** (`claims_to_issue_certificate`, `claims_to_certify`, `claims_certified_operator`, `claims_live_certification`, BanzAI-as-authority/certifier/approver, licensed-by-banza) and **financial/operator-licensing** stay blocked, but **third-person engine-determined** statements ("os motores certificam que a implementação X está conforme o perfil Y v1.2, válido até…") are permitted. Reuse the negation-aware helpers `block()`/`affirmative_near()` at `:77, 134-135, 255-259`. **Add many fixtures.**
- `engines/banzai-query-core/src/boundary.rs:197-233` — keep imperative "certifica este operador" as `BND-OPERATOR-CERTIFICATION` critical refusal; route certification-**explanation** questions to grounded answers.
- `engines/banzai-query-core/src/route.rs:961-1050` (ai_authority verb detection), `:541-702` (certification-boundary arms), `:1061-1065` (is_financial_authorization) — add a certification-explanation intent to `Route` (`:27-32`).
- `engines/banzai-query-core/src/prompt.rs:21-24` — SYSTEM_PROMPT rule 2: keep "BanzAI does not grant certificates / confer status", add a clause permitting it to **explain** that engines certify technical-interop conformance from evidence.

### 3.5 Service tests to update to the M2.19 contract
`services/banzai-api/test/operator-publication-boundary.test.js:26-49` (grant refused, explanation allowed); `semantic-answer-composition.test.js:81-98`; `primary-interface-architecture.test.js:41`; `protocol-vocabulary.test.js:52-59`; `operador-zero.test.js:49` + `operador-zero-journey.test.js:37-72` (PASS-demo stays non-certification, Operador Zero `certification:false`); `m2-14j-public-surface-consistency.test.js`; `financial-action-boundary.test.js` (**unchanged** — financial boundary stays).

### 3.6 Generators + reference-IA guards
- `tools/gen-banzai-vocabulary.mjs:69-70` (`HISTORICAL_TERMS` — keep `banza ca`/`certificate authority`/`autoridade certificadora` historical, but "certification" no longer blanket-historical); `tools/check-banzai-canonical-protocol-vocabulary.sh`; `tools/check-banzai-truth-table-current.sh`; `tools/gen-banzai-golden-dataset.mjs` (add interoperability-certification subject + golden answers).
- **Reference chapter/tab title decision (do both together):** `tools/check-reference-chapter-order.sh:36` and `tools/check-reference-information-architecture.sh:27-28` pin slug `certificacao` → title "Conformidade e Evidência"; `publicSurface.test.ts:118-125` forbids any tab named "Certificação". Decide the new chapter/tab title and update guard + test in the same change.
- `tools/check-operator-zero-standalone-surface.sh:123-131` + `tools/check-operator-zero-realistic-journey.sh:126-128` — Operador Zero stays non-certified; `operator-zero-check` must stay green.

### 3.7 New guard + CI wiring
- New crate job in `.github/workflows/rust-engines.yml` (fmt / clippy `-D warnings` / test).
- New `tools/check-*-certification*.sh` proving: certification is **engine-only + deterministic + evidence-time-bounded-revocable + no CA / no discretionary approval / no financial licence**. Register in **three places**: (a) `Makefile` target `<name>-check:` with recipe, (b) the line-1 `.PHONY` list, (c) a step in `.github/workflows/identity-guard.yml` following the single-source-of-truth `bash tools/check-….sh` pattern.
- Extend `.github/workflows/conformance.yml` / `operator-zero.yml` / `repository-purity.yml` as needed.

---

## 4. Public-surface strings / components to migrate (with qualified replacements)

Canonical replacement pattern for every string below: *"Certificação Técnica de Interoperabilidade — verdicto determinístico derivado de evidência pública, reproduzível, temporal e revogável pelos motores Rust. Não é licença financeira, autorização regulatória, nem aprovação humana; não existe CA."*

### Home
- `website/components/home/HeroStatusBar.tsx:28` — `"0 certificados emitidos"` → live count from the certification record/route; pre-production shows **"0 certificações activas"** (launch-gate wording).
- `website/components/home/OperatorRegistry.tsx` — `:18` fallback `"simulador demo · não certificado"`, `:44` comment, `:77-81` counters `"0 Certificados"`/`"0 Em conformidade"`, `:106` `"Nenhum operador está certificado hoje … verificável, não autorizada"` → an issued-certification count sourced from the record (still 0 pre-production, but no longer "certification impossible").
- `website/components/home/ManifestTester.tsx:88` — `"Verificação estrutural local — não certifica."` → keep "local structural check is **not** the certification" but distinguish it from the **engine-issued** Technical Interoperability Certification. (`certification_level` at ManifestTester `:46, :57` is already a required manifest key — **reuse** as the record scope.)
- `website/components/home/banzaiKb.ts` — align KB copy.

### Operators
- `website/app/operadores/page.tsx:15, 22, 65-67, 74, 143-147` — metadata + lede + `PANEL` + `SEM AUTORIDADE CENTRAL` chip + `StatusNote`. Keep "not a list of licensed/approved/admitted operators" and "not granted by a central authority"; replace "not certified / no certification" with "certification = deterministic evidence verdict, not a licence"; surface an evidence-derived certification record + revocation.

### Reference (markdown is canonical)
- `website/content/BANZA_REFERENCIA.md` — `985-1019` ("### O Que a Conformidade Não É"), `1183`, `1189-1218` (report field "This report is conformance evidence, not a production certificate."), `1202/1212`, `1246-1254`, `2286` ("- não certifica operadores;"), `689`. Introduce "Certificação Técnica de Interoperabilidade" as a deterministic, evidence-derived, revocable, time-bounded verdict; change the report statement away from the absolute "not a production certificate"; keep still-true negations (not a financial licence, no admission, no CA, no discretionary approval). **Reuse:** `certification_level_achieved` (`:1199`), the L0-L4 model (§7 "Níveis de Conformidade"), the "Avaliação Determinística, Não Discricionária" reason-code table (`1235-1252`).
- `website/lib/reference.ts:79` (ch-7 "PASS como evidência verificável — não certificação") and `:88` (ch-12 "… não certifica") → describe the new certification without asserting "não certifica".
- `website/app/certificacao/page.tsx` + `website/app/conformidade/page.tsx` both redirect to `/referencia/certificacao` — canonical host for the prose; add the route to `website/app/sitemap.ts` (currently only `/`, `/banzai`, `/referencia`, `/estado`, `/decisoes` + chapters).

### Estado
- `website/app/estado/page.tsx:19, 42-44, 146-148, 159-164, 181-185` — keep `production_certificates: false` PANEL, `/certificates` compat route, "não é uma lista de operadores licenciados", "Nada nesta página constitui aprovação regulatória"; replace "not certified" framing; add certification-record + BRL revocation surfacing. **Decide:** whether M2.19 introduces a **new state flag** rather than overloading `production_certificates=false` (which denotes absence of CA/financial production certificates, distinct from technical-interop records).

### Footer / site config / layout
- `website/components/SiteFooter.tsx:121` — "O BanzAI não certifica, não aprova operadores e não movimenta fundos." → BanzAI clause stays true (agent doesn't certify), but keep both neutrality lines; reword so it doesn't read as "BANZA never certifies". `website/lib/site.ts:52-56` Operador Zero comment adjusted.
- `website/app/layout.tsx:58-72` JSON-LD (keep the deliberate exclusion of `FinancialService`/`Bank`/`PaymentService`) + metadata keywords `:19-28` — mention Technical Interoperability Certification.

### BanzAI UI copy (website)
- `website/components/banzai/banzai-agent.ts` — `:98` `AUTHORITY_COPY.noCertify`, `:100` `caDecides` (keep no-CA), `:101` `passIsEvidence`, `:39` `BANZAI_AGENT.boundary`, `:107-145` `FORBIDDEN_PHRASES` (**split**: keep `certificação de operador`/`BANZA CA`/`certificação automática`/`IA certificadora`/`Assistente de Certificação` forbidden; newly ALLOW `certificação de interoperabilidade técnica`/`perfil de conformidade`/`implementação certificada`), `:150` `AGENT_SUGGESTIONS`, `:156-162` `CONFORMIDADE_LEVELS` (reuse as scope). Update the mirror test `banzai-agent.test.ts:93-114`.
- `website/components/banzai/BanzaiAgent.tsx:205-210` `NEUTRALIZE` regex (stop stripping legitimate certification wording), `:631/808/996/1188/1335` report fields `not_a_certificate`/`not_a_licence`, `:639/816/1004/1196/1343` StatusNote, `:1517` `ConformidadePanel` subtitle, `:282` `ZERO_BOUNDARY` (keep Operador Zero demo boundary).
- `website/components/banzai/SourceBlock.tsx:13-30` — add a certification/conformance-profile badge kind.

### BanzAI service knowledge (`services/banzai-api/src/knowledge.js`)
Rewrite entries: `certified-operators` (:145-151), `pass-is-not-certificate` (:153-159), `banzai-cannot-certify` (:161-167), `banzai-capabilities` (:172-176), `banzai-role` (:184-188), `banzai-vs-engines` (:209), `how-to-federate` (:276), `how-to-demonstrate-conformance` (:280-421), `how-trust-works` (:295-312), `software-license`/`financial-authorization` (:549, :558). Explain engine-determined technical certification (what it certifies = conformance to a versioned public profile; determined by Rust engines from public reproducible time-bounded revocable evidence; renewal/expiry; NOT a financial licence; BanzAI explains, never grants). Keep Operador Zero entries `:513/:525` `production_certificates:false`/`certification:false`. Add a new `SOURCES` entry (`:31-115`) for the interoperability-profile spec + ADR-057 (reuse existing `adr038`/`adr039`/`adr040`/`conformanceSuite`/`evidenceModel`/`brlSchema`). `services/banzai-api/src/server.js:373` boundary string. Add canonical entities to `answerContract.js:126-155` ("Interoperability Certification"/"Conformance Profile"); add typed reason codes to `reasoningTrace.js:45-49, 95` + `engines/banzai-query-core/src/terminal.rs:46-90, 186` + `tasked.rs`/`attribute.rs` enums: `CERTIFIED` / `NOT_CERTIFIED` / `CERTIFICATION_EXPIRED` / `CERTIFICATION_REVOKED` / `PROFILE_UNSUPPORTED`.

**Reconcile the shared `not_a_certificate:boolean`** report flag consistently across `website/lib/banza{L1,L2,L3,L4}Readiness.ts`, `banzaEvidenceBundle.ts`, `banzaOperatorManifest.ts`, `banzaSimb.ts`, `banzaSecurityAssurance.ts`, `banzaConformance.ts` and the BanzAI panels so engine output and public copy agree. Note dead code: `website/components/home/HomeAsk.tsx` is unused (safe to ignore).

---

## 5. SVGs to add / update

Governance: `docs/reference/BANZA_SVG_REGISTRY.md` (registry), `docs/governance/SVG_QUALITY_POLICY.md` + `docs/governance/SVG_VISUAL_SYSTEM.md` (grammar). Guards `tools/check-svg-visual-quality.sh` + `tools/check-svg-visual-system.sh` + `tools/assert-reference-svgs.sh` must be narrowed (§3.1) **before** the SVGs can land, or CI rejects them.

### 5.1 New SVGs in `website/public/diagrams/protocol/` (canonical header/footer/palette; Rust-engine-only decision, no Qwen)
- **(a) certification-pipeline** — evidence bundle → Rust engine conformance determination → issued time-bounded revocable certificate → public registry index.
- **(b) certification-lifecycle** — issued → valid within window → expired/renewed → revoked/fail-closed.
- **(c) responsibility-boundary** — Technical Interoperability Certification vs financial licence/regulatory authorization vs operator responsibility.

Register under a new **"## M2.19 — Technical Interoperability Certification"** section in `docs/reference/BANZA_SVG_REGISTRY.md` with new SVG-P ids **after SVG-P-087**; each note asserts certification but explicitly negates CA/licence/discretionary-approval/Qwen-in-decision. Embed each in `website/content/BANZA_REFERENCIA.md` (certification chapter) so `tools/assert-reference-svgs.sh` (`reference-svg-check`) passes referenced⇒served.

### 5.2 Existing conformance-framed SVGs to retune (base to transform, not duplicate)
- `website/public/diagrams/protocol/banza-certification-v1.svg` ("a conformidade é medida, não concedida"; `production_certificates = false`).
- `banza-operator-conformance-lifecycle-v1.svg` ("PASS técnico … não é certificado").
- `banza-certification-pipeline-v1.svg` (labeled "Pipeline de conformidade", ends at reproducible evidence, no issuance step → add issuance).
- `banza-evidence-vs-certificate-v1.svg` ("A BANZA não autoriza ninguém").
- `banza-decision-risk-matrix-v1.svg` ("PASS ≠ certificado").
- `banza-roadmap-m1-m6-v1.svg` ("production_certificates = false", "Primeiro Operador em Produção").

Retune from absolute "não certifica" to "certifies technical interoperability conformance; not a CA / not a financial licence / no discretionary approval". Base diagrams **SVG-P-029/030/032/052/055** + badges may be superseded rather than duplicated.

### 5.3 Policy prose
`docs/governance/SVG_QUALITY_POLICY.md §5 (~62-66)` and `docs/governance/SVG_VISUAL_SYSTEM.md §6 (~66), §7 (78-81)` — codify the new distinction; keep "motores verificam; BanzAI explica, não decide". Update the registry M2.2-M2.5 section notes (`:282, 295, 308, 319, 326`) that forbade "certificação/badge de certificação" to the qualified stance. **Do not** rewrite the M2.7E repair log (`:38-39`) — historical.

---

## 6. API / registry / route changes

Server: `services/verification-api` (dependency-light Node, GET-only). New routes register in **three places**: `routes.js`, `server.js` TABLE, and nginx `banza.conf`.

### 6.1 New routes
- `GET /interoperability-certifications` — list; **empty `[]` in pre-production**, DB-backed, degraded-safe (reuse `envelope()` + 503 fail-safe).
- `GET /interoperability-certifications/{id}` (+ a verification response) — `server.js` currently uses an **exact-path TABLE with no path params**; add prefix/param dispatch (mirror how nginx already prefix-routes `/operators/` and `/certificates/`); update the 404 hint list.
- `GET /.well-known/banza/interoperability-certification-profile.json` — serve the public versioned profile document.

### 6.2 DB
`infra/banza-network/postgres/init/001_schema.sql` — add an `interoperability_certification` table (+ optional profile/version table) referencing `operators`/`conformance_evidence` with validity window + lifecycle status enum. `GRANT SELECT` to `banza_ro` and `banzai_rw`, `INSERT/UPDATE` to `banza_gov` (existing grant pattern). Keep seed **EMPTY**; Operador Zero demo excluded. Update the `protocol_state` note at `:96-99` ("Nenhum operador está certificado") to the qualified wording; `phase='pre-production'` unchanged.

### 6.3 nginx
`infra/banza-network/nginx/conf.d/banza.conf` — add `location = /interoperability-certifications`, `location ^~ /interoperability-certifications/`, and `location = /.well-known/banza/interoperability-certification-profile.json` proxying to `verification-api:8090`.

### 6.4 OpenAPI (none exists for machine routes today)
Create `contracts/openapi/protocol-registry.yaml` documenting `/operators`, `/certificates`, `/conformance/evidence`, `/federation/revocation-list.json`, `/interoperability-certifications(+/{id})`, and the `.well-known` profile, with `InteroperabilityCertificationProfile`/`Record` schemas. (`contracts/openapi/reference-operator.yaml` remains operator-side `/.well-known/banza/operator.json` — reference its capability vocabulary, don't overload it.)

### 6.5 Strings to qualify
- `services/verification-api/src/routes.js:11-16` NOTE ("BANZA does not centrally certify operators" / "not a grant of status") and `:142` `conformanceEvidence` clarification → ADR-057 qualified framing. **Keep `:26` `envelope()` `production_certificates = phase === 'production'` gate.** Note current drift: smoke test greps "NOT a certificate" but routes.js says "confers no status" — reconcile both.
- `services/verification-api/README.md`, `contracts/production/README.md:33, 62, 69`, `contracts/production/public-protocol-registry.production.schema.json` `_boundary`/`_description`, `federation-trust-evaluation` `_boundary`, `SECURITY.md:5`, `README.md:194, 353, 410`.

### 6.6 Tests
`infra/banza-network/tests/smoke-verification-api.sh:40-53` and `e2e-full-stack.sh:83-88` — cover the new routes, assert **0 active interoperability certifications** in pre-production, reconcile the PASS-wording assertion; `infra/banza-network/tests/README.md:25`.

### 6.7 Decision logic stays in Rust
The JS routes only serialize output from `banza-interoperability-certification` (consuming the `banza-l4-readiness` interoperability-profile shape + conformance-evidence hashes + BRL). **No decision logic in Node.**

---

## 7. Phase-ordered, gated sequence (foundation first, public flip last)

Aligns with the 20 phases in `artifacts/m2-19/execution-state.json`. The **launch gate**: Home may claim active certifications only once engine + schemas + record + registry + APIs + reason-codes + revocation + guards are green and docs aligned; until then Home shows *"Infraestrutura de Certificação de Interoperabilidade BANZA v1.0 em pré-produção"* + *"0 certificações activas"*. Ship in coherent gated increments so the repo is **never split** between "certifies" and "never certifies".

**Gate A — Foundation / authority (Phases 1-2).** ADR-057 + RFC-0007; ADR index + cross-links; the auditable amend-vs-keep inventory doc; bump `repo-guards` ADR range to 057 (§2.7) **first** so ADR-057 passes purity. *Gate: `make rust-rule-check` + repo-guards green with ADR-057 present.*

**Gate B — Contracts / schemas (Phase 3).** Profile + Record schemas (§2.2-2.3); qualify existing schema boundary objects (§2.5). *Gate: schema self-tests via `schemacheck` green.*

**Gate C — Engine + record + lifecycle (Phases 4-6).** New crate `banza-interoperability-certification` (§2.1); narrow the Rust deny-lists (§2.6, §3.3); reuse `banza-trust` sign/verify (Phase 5); lifecycle enum + reason codes + transitions; add crate to `rust-engines.yml`. *Gate: per-crate `cargo fmt --check` + `clippy -D warnings` + `test`; golden `parity.json`; the reference-trust-model legacy-flip test still green.*

**Gate D — Registry + APIs (Phases 7-8).** DB table; three verification-api routes + param dispatch + `.well-known` profile; nginx; `contracts/openapi/protocol-registry.yaml`; qualify route strings; smoke/e2e updated. *Gate: smoke + e2e assert 0 active certs, no 5xx, no external calls; Operador Zero excluded.*

**Gate E — BanzAI decision path (Phase 9).** The riskiest gate: `validate.rs` refactor (§3.4) with heavy fixtures; `boundary.rs`/`route.rs`/`prompt.rs`; knowledge.js entries + SOURCES; reason codes in `terminal.rs`/`reasoningTrace.js`; UI copy `banzai-agent.ts` + `BanzaiAgent.tsx` + `SourceBlock.tsx`. *Gate: grant/licence/CA claims still blocked; third-person engine-certification statements permitted; service tests green; live `/ask` probes show no self-censoring and no boundary regression.*

**Gate F — SVGs + docs + terminology (Phases 12-15).** Narrow SVG guards (§3.1) → author 3 new SVGs + retune 6 existing (§5); update SVG policies + registry; Reference §7 + governance corpus qualification (§1.4); glossary/FAQ/runbooks; classified terminology migration. *Gate: svg-visual-quality/system + reference-svg-check + governance-docs-clean + open-governance green.*

**Gate G — Threat model + tests + guards + CI (Phases 14, 16-17).** Threat model + security; positive/negative/property tests; the 6 new/reinforced guards + Makefile target + `.PHONY` + identity-guard step (§3.7); reconcile reference chapter/tab-title guard+test together (§3.6). *Gate: full `identity-guard.yml` (45+ jobs) green on push + PR.*

**Gate H — PUBLIC FLIP (Phases 10-11 UI copy, then 18-20).** Only after A-G green: migrate Home / Operators / Estado / footer public strings (§4) and the operator-journey "add Certification step"; keep the launch-gate wording until infra real (`production_certificates` stays `false`). Then report + PR(s) + CI green + `gh pr merge --admin` (branch protection) + deploy (VPS `82.165.165.97`, `sudo git pull` on root-owned `/srv/banza-protocol/repo`, `docker compose up -d`) + public-edge QA (pace ≥3.2s for the `/banzai/ask` 20r/m rate limit) + browser QA + cleanup + COMPLETE verdict.

**Cross-cutting gate invariants (must hold at every phase):** `rust_is_sole_decision_authority`, `no_ca`, `no_discretionary_approval`, `no_qwen_in_decision_path`, `operator_zero_never_counted`, `production_flip_gated_until_infra_real` — from `execution-state.json.invariants`. If any file lands that makes the repo simultaneously assert "certifies" and "never certifies", the increment is not coherent and must be re-split.

---

### Key file anchors (quick index)
- Canonical decision: `decisions/adr/ADR-057-*.md` (new), `decisions/rfc/RFC-0007-*.md` (new); index `decisions/adr/README.md`.
- New engine: `engines/banza-interoperability-certification/` (new).
- New schemas: `contracts/production/interoperability-certification-{profile,record}.production.schema.json` (new); OpenAPI `contracts/openapi/protocol-registry.yaml` (new).
- Highest-risk file: `engines/banzai-query-core/src/validate.rs:223-281`.
- Purity blocker to fix first: `engines/banza-repo-guards/src/lib.rs:172/184/185` (`1..=56`→include 057).
- Launch-gate authority: `artifacts/m2-19/execution-state.json` (`launch_gate`, `invariants`, 20 phases).