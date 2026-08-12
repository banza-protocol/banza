# Phase M2.6 — Governance Documentation Final Sweep

**Date:** 2026-07-18
**Branch:** `docs/m2-6-governance-docs-final-sweep-2026-07`
**Type:** `docs(governance)` — documentation sweep + new guard (no engine trust-logic changes)

---

## 1. Objective

Remove the last of the **removed trust vocabulary** from the governance, security and
reference documentation, and present **only the active open-protocol trust model**. The
removed vocabulary — BANZA CA, operator certificate, certified operator, human approval /
central acceptance, certification path, certificate-based trust — was retired across the
engines and contracts in M2.2–M2.4 (open governance, reference trust redesign, and the
signed-protocol-metadata trust engine). This phase closes the residual **prose** that still
described the retired model as if it were active, and adds a guard so the drift cannot return.

## 2. The active model (stated positively)

> BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo,
> publicam manifests e demonstram compatibilidade por **evidência verificável de conformidade**.
> O trust do protocolo é avaliado por **signed protocol metadata**, **delegated signing keys**,
> **operator manifests**, **conformance evidence**, **public protocol registry** e
> **revocation/fail-closed**. A **Trust Root** (offline, 2-de-3) assina metadados do protocolo,
> chaves delegadas, releases e listas de revogação — **nunca** operadores, pagamentos ou licenças.
> Humanos **mantêm e evoluem** o protocolo; **não autorizam, aceitam, aprovam ou certificam**
> operadores. Operadores validam compatibilidade protocolar no **BanzAI Workbench**.

There is **no BANZA CA, no operator certificate, no certified operator, no central human
approval and no certification as an active model.**

## 3. Scope boundary drawn in this phase

The machine layer had already migrated: `contracts/federation/key-manifest.json` lists key
domains `protocol-metadata` / `revocation` / `conformance-evidence` (the `cert` domain is
gone), and `contracts/federation/operator-certificate.json` was deleted. The residual
certificate vocabulary survived only in **documentation** — including the production
root-key-ceremony suite under `docs/security`, which still described a `cert` key domain and
an "operator certificate" artifact that the schema no longer defines. Those docs were stale
against the live schema and were brought into line here.

**Deliberately out of scope (engine follow-up, not documentation):** the `banza-l1/l3/l4-readiness`
engines still carry an optional `certificate` fixture form and a `"cert"` key-domain fixture.
These are engine artifacts, not governance prose; migrating them (and the stale
`banza-cert-202608` example still in the key-manifest schema's `key_id` description) is a
separate engine phase and is tracked as a follow-up.

## 4. Documentation rewritten to the active model

- **`BANZA_TRUST_ARCHITECTURE.md`** — rewritten to the active model; carries the three
  mandatory sentences (trust architecture basis; validation-is-not-authorisation/certification/
  licence; operators validate in the BanzAI Workbench).
- **`certification-boundary.md`** — Certification Process → **Conformance Evidence Process**
  (self-publication → Open Trust Evaluation → public protocol registry); L3 "BANZA CA-signed
  operator certificate" → published signed protocol metadata + L3 conformance evidence;
  issuance/badge/CA-review steps removed.
- **`SIMB_PRE_REVIEW_GATE.md`** — "revisão real pela BANZA CA" destination → self-published
  conformance evidence + Open Trust Evaluation.
- **`docs/security` production-trust & ceremony suite** — `PRODUCTION_ROOT_READINESS_REPORT.md`,
  `PRODUCTION_ARTIFACT_SIGNING_POLICY.md`, `KEY_MANAGEMENT_POLICY.md`, `TRUST_CEREMONY_PLAN.md`,
  `TRUST_TEST_ONLY_BOUNDARY.md`, `ROOT_KEY_CEREMONY_RUNBOOK.md`, `ROOT_KEY_CEREMONY_PROCEDURE.md`,
  `PRODUCTION_TRUST_PATH.md` — the `cert` key domain → `protocol-metadata` (`banza-meta-YYYYMM`
  signs **signed protocol metadata**); "operator certificate" → "signed protocol metadata";
  domain separation and test-only/M2-pending gating preserved.
- **Terminology** — `certified operator` → `conformant operator` (or plain `operator`) across
  `README.md`, `OPERATOR_NEUTRALITY_TERMINOLOGY.md`, `MATRIX_C_OPERATOR.md`, `roadmap.md`,
  `ANNEX-BANZA-NETWORK-INFRASTRUCTURE.md`, `BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md`,
  `BANZA_SVG_STANDARDS.md`, and the `docs/security` control matrices / auditor briefing / event
  runbook. `MATRIX_A_BANZA.md` — stale reference to the deleted `operator-certificate.json`
  repointed to the live federation-trust artifact.
- **`CLAUDE_BASE.md`, `THREAT_MODEL.md`, `BANZAI_COMPONENT_BOUNDARY_2026_07.md`** — BANZA CA
  actor/glossary rows → Trust Root / protocol maintainers / Open Trust Evaluation.
- **BanzAI Assistente (`banzai-evidence`)** — the ADR-026 federation summary (`lib.rs`,
  `index.rs`) now describes conformant operators verifying the peer's **signed protocol
  metadata** (trust root → delegated key chain) against the public registry and BRL — not a
  peer certificate.

## 5. New guard — `make governance-docs-clean-check`

`tools/check-governance-docs-clean.sh` scans `docs/governance`, `docs/security`, `docs/reference`,
the governance page, and the BanzAI assistant router, and blocks the removed vocabulary when it
is presented as **active** architecture. It is clause-scoped: a boundary sentence that clearly
**negates** a term ("a Trust Root assina metadados, não operadores"; "Nenhum destes diagramas
mostra ... operador certificado"), a reject-status description ("… é rejeitada com
`TRUST_INVALID_BOUNDARY`"), a `❌` checklist item, a markdown mapping-row mention, a router
deny-list/offered-question literal, the `/certificates` legacy route and the
`production_certificates` flag are all allowed. The guard **self-tests its own regexes on every
run** (exit 2 if that logic breaks) and is wired into the `identity-guard` CI workflow. The
public-`corpus`/`KB` concern is intentionally left to `make regulatory-check` (public-UI scope).

## 6. Invariants and boundaries preserved

`/operators = []`, `production_certificates = false`, `llm_calls = 0`,
`external_model_called = false`, provider `mock`; no real federation, no external integration,
no payments, no fund custody; no private keys generated; no `.env`/DNS/Cloudflare/TLS/Postgres
touched. All engine machine identifiers and golden vectors unchanged; the trust engine logic is
untouched — this phase is documentation + a text-linter guard only.
