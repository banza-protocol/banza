# Phase 7R — GitHub and Website Source-of-Truth Reconciliation (2026-07)

**Base / current `main`:** `1bcf28e` (post-7Q) · **Branch:** `chore/phase-7r-github-website-source-of-truth-2026-07`
**Status:** verification/reconciliation record. **No code, protocol, contract, conformance,
runtime or metadata change** — this phase only proves the truth and documents it.

## Trigger

After 7Q, a public reading of `github.com/banza-protocol/banza/tree/main` appeared to show an
**old** structure (`apps/`, root `BANZA_*.md`, an old README and old repo description). This phase
does **not** trust the prior reports; it proves the actual state using `git`, `git ls-remote`,
`gh api`, `gh repo view`, GitHub raw content (via the API), the VM repo and the live website.

## Verdict

**The GitHub source of truth is correct and reconciled. The "old `tree/main`" was a GitHub UI
cache / stale browser fetch** — every authoritative source (git refs, the branch API, the git
tree API, raw file content, the VM checkout and the live website) shows the final protocol-only
state at `1bcf28e`. There is **no old tree in `main`**.

## Cross-validation table (FASE 16)

| Source | Expected | Observed | Result |
|---|---|---|---|
| `git ls-remote origin refs/heads/main` | `1bcf28e…` | `1bcf28ef93e…` | ✅ |
| local `HEAD` / `origin/main` | `1bcf28e` | both `1bcf28e` | ✅ |
| `gh api …/branches/main .commit.sha` | `1bcf28e` | `1bcf28ef93e…` | ✅ |
| `gh api …/commits/main .sha` | `1bcf28e` | `1bcf28ef93e…` | ✅ |
| `1bcf28e` vs `origin/main` | HEAD or ancestor | **HEAD of origin/main (case A)** | ✅ |
| `gh repo view .defaultBranchRef` | `main` | `main` | ✅ |
| repo description | "Open protocol for financial interoperability and conformance." | exact match | ✅ |
| repo topics | protocol-first | `protocol, open-protocol, financial-interoperability, conformance, openapi, payments-protocol, financial-infrastructure, ledger, governance, angola, banza, banzai` | ✅ |
| license (`gh api …/license .license.spdx_id`) | Apache-2.0 | `Apache-2.0` | ✅ |
| `gh api git/trees/main?recursive=1` — forbidden | none of `apps/`, `docs/protocol`, `docs/adr`, `docs/rfc`, root `BANZA_*.md`, `deploy.sh` | **none present** | ✅ |
| tree/main — required top-level | spec/contracts/conformance/decisions/docs/examples/website/services/infra/tools/assets/.github + README/VERSION/LICENSE/NOTICE/SECURITY.md | all present | ✅ |
| raw `README.md` (via API) | "conformance evidence", "future federation governance model"; no "certification criteria and a federation model", no "Products are built by independent certified operators", no "Any entity that implements the contracts" | conformance evidence ×5, future-fed-gov ×2; old phrases 0 | ✅ |
| raw `VERSION` | `1.0.0` | `1.0.0` | ✅ |
| raw `spec/overview.md` | "Version: v1.0" + "Repository VERSION: 1.0.0"; no "Version: 2.0"; no unqualified "Operadores certificados L3+" | v1.0 ✓ + Repo VERSION ✓; 2.0 = 0; unqualified L3+ = 0 | ✅ |
| raw `conformance/README.md` | "no reference operator in this repository"; no "Banza sandbox operator", "Conformance certifies", "reference operator passes" | present ✓; old phrases 0 | ✅ |
| raw `contracts/README.md` | protocol framing + "Conformance test vectors"; no "Banza platform", no "Certification test vectors" | "public protocol contracts … BANZA protocol"; Conformance vectors ✓; old 0 | ✅ |
| raw `docs/reference/pt/completa.md` | prudent candidate/evidence/governance/legal-KYC; no "poderá entrar", "pode tornar-se um operador certificado", "A única condição imposta … técnica" | prudent ✓ (KYC/KYB ×15); old phrases 0 | ✅ |
| raw `docs/reference/en/complete.md` | prudent candidate/evidence/governance; no "any entity may enter", "any entity can become certified", "no institutional approval, no min" | prudent ✓ (6 formulations); old phrases 0 | ✅ |
| raw `decisions/adr/ADR-001-…md` | boundary note present | "Current protocol boundary note" present | ✅ |
| GitHub rendered UI (`tree/main`, `blob/main/*`) | final structure | (browser-cache artifact only; API/raw above are authoritative and correct) | ✅ (cache) |
| VM `/srv/banza-protocol/repo` HEAD | `1bcf28e` = origin/main | branch `main`, HEAD `1bcf28e` = origin/main, clean, VERSION 1.0.0, apps/ absent, root BANZA_*.md = 0 | ✅ |
| website pages | `/`, `/referencia`, `/referencia/completa`, `/decisoes`, `/decisoes/adr-001`, `/banzai`, `/operadores`, `/programadores`, `/confianca` | all 200; 0 old wording in live HTML | ✅ |
| machine routes | `/operators`=[], `/certificates` production_certificates=false, `/.well-known/banza/{root,key-manifest}.json` 200, `/federation/revocation-list.json` 200, `/conformance/evidence` 200, POST 405 | all as expected | ✅ |
| headers | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP-Report-Only; no enforcing CSP | 6/6 present, enforcing CSP absent | ✅ |
| BanzAI | mock, llm_calls=0 | `LLM_PROVIDER=mock` | ✅ |

## Notes

- **GitHub UI cache:** the rendered `tree/main` / `blob/main` pages can serve a stale snapshot to
  a browser session; the git refs, tree API and raw content prove `main` is the final protocol-only
  state. No repository change was warranted or made in response to the UI view — correcting a repo
  because of a cache would have been wrong.
- **`gh repo view --json licenseInfo` returned `null`** while the REST `…/license` endpoint and the
  `LICENSE` file both report **Apache-2.0**. This is a GraphQL-field lag/cache artifact, not a real
  regression — the license chip resolves to Apache-2.0.

## Checks

No repo change required for reconciliation. Confirmatory local checks on `main` were run:
`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` — all PASS (recorded in the phase report).

## Confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock (`llm_calls=0`) · CSP-Report-Only active · default branch `main` · description/topics
protocol-first · Apache-2.0. No force push, no destructive reset, no `main` history rewrite. No
M2, operator or certificate.

**PHASE 7R GITHUB AND WEBSITE SOURCE OF TRUTH RECONCILED.**
