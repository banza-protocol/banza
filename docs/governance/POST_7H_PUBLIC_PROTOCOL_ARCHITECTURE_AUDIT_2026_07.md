# Post-7H Public Protocol Architecture Audit (2026-07)

**Base:** `main` `63e89a5` · **Branch:** `docs/post-7h-public-protocol-architecture-audit-2026-07`
**Type:** read-only validation audit (repo + public website + GitHub + VM). **No** protocol,
contract, conformance, runtime, code or version change. No merge. No deploy.

## 1. Executive summary

**Verdict: PASS WITH WARNINGS — POST-7H PROTOCOL ARCHITECTURE VALIDATED WITH FOLLOW-UP ITEMS.**

The PHASE 7H final protocol-only architecture is **structurally sound and fully applied**.
Top-level layout, guards, link integrity, machine-readable routes, GitHub paths, security
headers, website build and deploy all verify. **No P0.** All follow-up items are either
**pre-existing legacy content** (operator-era wording inside two canonical decision documents)
or **GitHub metadata polish** — none are 7H regressions and none block the current
pre-production state.

- **Main risk:** one canonical ADR (`ADR-006`) still contains the operator-era sentence
  *"Banza moves money on behalf of merchants and their customers"*, which is **publicly rendered**
  at `/decisoes/adr-006` and contradicts the protocol boundary ("BANZA does not move or hold
  funds"). Classified **P1**. A related RFC (`RFC-0006`) has softer operator-possessive wallet
  wording (**P2**).
- **M2 readiness:** the architecture and trust surface are ready to proceed toward M2. The P1
  wording item should be resolved (via a governance-approved clarification, **not** a silent ADR
  edit) before institutional/award-facing visibility, but it does not block M2 root-key work.

## 2. Scope

- **Repo** (read-only): structure, guards, links, contracts/conformance path refs, examples.
- **Public website** `https://banza.network/`: pages, machine routes, headers, live HTML.
- **GitHub** `banza-protocol/banza`: metadata, branch protection, path presence/absence.
- **VM/runtime** (read-only): container status only; `.env`, certs, nginx, Postgres untouched.
- **Not changed:** protocol, contracts, conformance semantics, ADR/RFC content, version,
  runtime, secrets. No operator or certificate created. BanzAI remains mock.

## 3. Architecture verification

| Area | Result |
|---|---|
| Top-level | `.github assets conformance contracts decisions docs examples infra services spec tools website` + root files (`README VERSION LICENSE SECURITY.md CHANGELOG CONTRIBUTING CODE_OF_CONDUCT Makefile`) + `CLAUDE.md` (operational exception). **Clean — matches the final architecture.** |
| `spec/` | Protocol-only specification. "settlement/liquidação" appears only as a protocol boundary/rules concept, not as a real-settlement claim. No wallet/app/backoffice/funds. ✅ |
| `contracts/` | No semantic change; no old path refs (`docs/adr`, `docs/rfc`, `docs/protocol`, `apps/`). OpenAPI 3.1.0×4 + 3.0.3×1 parse-valid. ✅ |
| `conformance/` | No semantic change. `report-schema.json` explicitly states a report **is not a certification**; `README` lists "✗ Regulatory approval". PASS = technical evidence, not certificate/authorisation. ✅ |
| `decisions/` | `adr/` = exactly `ADR-001..036` (36, no gaps, none out of range, no phantom ADRs); `rfc/` = exactly `RFC-0001..0006`. ✅ (content findings: §9 F-01/F-02) |
| `docs/` | Taxonomy = `reference, governance, security, guides, images` only. `REPOSITORY_STRUCTURE.md` reflects the final architecture; `FINAL_PROTOCOL_REPOSITORY_ARCHITECTURE_2026_07.md` present and correct. ✅ |
| `examples/` | `merchant-checkout, payment-link, qr-payment, webhook-handler` + README ("not production code and not SDKs"). Conceptual only. ✅ (minor: F-06) |
| `website/` | Replaces `apps/website`. No `apps/` imports; no old GitHub path refs in source; reads new sources (`content/decisions/{adr,rfc}`, `content/BANZA_REFERENCIA.md`). Production build ✓ (79/79 static pages). ✅ |
| `services/` | `verification-api` + `banzai-api` present. BanzAI provider allowlist frozen `["mock","deepseek","qwen"]`, mock default/offline/deterministic, `llm_calls` tracked, no hardcoded keys. ✅ |
| `infra/` | Compose contexts → `.../website`, `.../services/verification-api`, `.../services/banzai-api`; `validate-compose.sh` PASS; no `deploy.sh`; no `/srv/apps`; no tracked secrets/certs; Postgres internal-only. ✅ |
| `tools/` | Guards (`check-repository-purity`, `check-operator-contamination`, `check-invariants`, `check-openapi-compatibility`), `assert-reference-svgs`, `banza-conformance` CLI, `root-ceremony`. ✅ |
| `assets/` | `branding/README.md` only (image assets live in `website/public`). ✅ (INFO I-05) |

## 4. Removed legacy paths (confirmed absent, tracked)

`apps/`, `apps/website`, `apps/verification-api`, `apps/banzai-api`, `apps/docs`,
`docs/protocol`, `docs/adr`, `docs/rfc`, `docs/core`, `docs/history`, `docs/operations`,
`docs/audits`, `docs/architecture`, `docs/federation`, `docs/trust`, `docs/validation`,
`docs/observability`, `docs/whitepaper`, `docs/annexes`, root `BANZA_*.md`, `deploy.sh`,
root `PHASE_*.md`. **All absent.**

## 5. GitHub verification

- New paths **200**: `spec`, `decisions/adr`, `decisions/rfc`, `website`, `services`, `SECURITY.md`, `README.md`.
- Old paths **404**: `apps`, `docs/adr`, `docs/rfc`, `docs/protocol`, `BANZA_REFERENCE.md`, `BANZA_CERTIFICATION.md`, `deploy.sh`.
- Public, default branch `main`, README renders, `SECURITY.md` present.
- Branch protection on `main`: 1 required review + 8 required checks (conformance vectors, OpenAPI, schema, QR, trace, manifest, identity, purity); `enforce_admins=false`.
- **Findings:** repo **description** (F-03) and **topics** (F-04) are product-leaning; **license not auto-detected** (F-05).

## 6. Website verification

- Pages **200** (12/12): `/`, `/referencia`, `/referencia/completa`, `/decisoes`, `/decisoes/adr-001`, `/decisoes/adr-036`, `/governacao`, `/confianca`, `/programadores`, `/operadores`, `/banzai`, `/banzai/chat`.
- Machine routes **200**: `/operators` (`[]`), `/certificates` (`production_certificates: false`), `/.well-known/banza/root.json`, `/.well-known/banza/key-manifest.json`, `/federation/revocation-list.json`, `/conformance/evidence`. `POST /operators → 405`.
- Security headers present: HSTS (preload), `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy`, `permissions-policy`. **CSP absent** (F-07).
- Live HTML: **0** occurrences of `apps/website`, `docs/protocol`, `docs/adr`, `BANZA_*.md`; GitHub links target `decisions/`; `og:image` present.

## 7. Claims and identity

- `make identity-check` PASS (Level-1 brand denylist clean; Level-2 advisory only).
- Dangerous-claims sweep (repo + live website): machine routes and public pages are clean —
  `/operators=[]`, `production_certificates=false`, "no certified operator" posture intact;
  BanzAI FAQ correctly negated (*"Não... Apenas a BANZA CA emite certificados"*).
- National-infrastructure names (EMIS, Multicaixa) appear only as **landscape context** in
  reference prose, framed as *not-yet-integrated* — allowed per the neutrality policy (INFO I-04).
- **Exceptions (canonical decision docs, pre-existing):** F-01, F-02.

## 8. Checks

| Check | Result |
|---|---|
| `make reference-svg-check` | ✅ 27/27 |
| `make purity-check` | ✅ PASS |
| `make identity-check` | ✅ PASS |
| `make invariant-check` | ✅ PASS |
| `infra/banza-network/tests/validate-compose.sh` | ✅ PASS (3 contexts) |
| Broken relative links | ✅ 0 |
| JSON (88) / YAML / OpenAPI (5) | ✅ valid |
| Website production build | ✅ 79/79 static pages |

## 9. Findings

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| F-01 | **P1** | `decisions/adr/ADR-006:10` (+ website mirror; public at `/decisoes/adr-006`) | Context says *"Banza moves money on behalf of merchants and their customers"* — operator-era claim contradicting "BANZA does not move/hold funds". | Governance-approved clarification of operator-era Context sections (erratum or bracketed note), **not** a silent ADR rewrite. See rec. R-1. |
| F-02 | P2 | `decisions/rfc/RFC-0006:12` (public at `/decisoes/rfc-0006`) | *"Banza wallets can authorize and complete payments"* — operator-possessive wallet/payment framing. | Same normalization pass (R-1); reframe as "operator wallets, per the BANZA protocol". |
| F-03 | P2 | GitHub repo description | *"…programmable payments, operators, wallets, settlement, and certification"* reads as a product. | Reword protocol-first: rules/contracts/conformance/federation for interoperable operators; operator-neutral; pre-production. |
| F-04 | P2 | GitHub topics | Include `wallet`, `wallet-native`, `settlement`, `fintech`, `digital-payments` (product-leaning). | Curate to protocol topics (protocol, financial-infrastructure, interoperability, pki, conformance, payments). |
| F-05 | P3 | GitHub license chip | `licenseInfo` null although `LICENSE` present. | Verify `LICENSE` is a clean, GitHub-recognised Apache-2.0 so the license chip renders. |
| F-06 | P3 | `examples/README.md:10` | Normative-truth pointer names `contracts/` + `conformance/` but not `spec/`. | Add `spec/` (now the human-normative layer). |
| F-07 | P3 | Public website headers | No `Content-Security-Policy` (other security headers present). | Add a CSP in a future website-hardening pass. |
| I-01 | INFO | `docs/governance/` | Three restructure records (`CLEAN_…`, `FINAL_…`, `PHASE_7F_…`) coexist with `REPOSITORY_STRUCTURE.md`'s "never left as a phase report". | Acknowledge governance-approved records as the explicit exception, or archive to git history. |
| I-02 | INFO | `docs/governance/MATRIX_A_BANZA.md`, `MATRIX_C_OPERATOR.md` | Canonical **scope** matrices (Matrix C is brand-free); could be confused with the forbidden operator implementation-**status** matrix (CLAUDE.md: repo owns no validation matrix). | Add a one-line note distinguishing scope matrices from the implementation-status matrix. |
| I-03 | INFO | `docs/governance/BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md` | Operational-transition content referencing sibling-repo paths (`apps/banzai/…`). | Confirm it belongs in the public protocol governance set vs. operator/ops docs. |
| I-04 | INFO | `docs/reference/en/complete.md:66` | EMIS/Multicaixa as landscape context. | Allowed per policy (framed as not-yet-integrated); verify disclaimer remains explicit. |
| I-05 | INFO | `assets/` | Holds only `branding/README.md`; images live in `website/public`. | Optional: consolidate brand assets or keep as a documented placeholder. |

## 10. Recommendations

- **R-1 (before institutional/award visibility):** a small **ADR/RFC operator-boundary language
  normalization** phase — resolve F-01 and F-02 by clarifying operator-era Context/intro
  sections (governed erratum notes; decisions themselves unchanged). Highest value because
  F-01 is publicly rendered.
- **R-2 (metadata, low effort):** update GitHub description + topics (F-03, F-04) and verify the
  license chip (F-05). Outward-facing repo settings — apply with explicit approval.
- **R-3 (polish):** F-06 (examples README) and F-07 (CSP) in the next website/docs pass.
- **R-4 (governance hygiene):** reconcile I-01 wording; add the I-02 distinguishing note.

None of R-1..R-4 alter the protocol, contracts, conformance semantics, or the final architecture.

## 11. Verdict

**PASS WITH WARNINGS — POST-7H PROTOCOL ARCHITECTURE VALIDATED WITH FOLLOW-UP ITEMS.**

The final protocol-only architecture is validated end-to-end (repo, guards, links, build,
deploy, machine routes, GitHub). Follow-up items are pre-existing legacy wording (F-01/F-02) and
metadata polish (F-03..F-07) — no P0, no 7H regression, nothing that blocks the pre-production
state or M2 preparation.
