# Phase 7N — Full Protocol Corpus Constitutional Review (2026-07)

**Base:** `main` `93d59fa` · **Branch:** `fix/phase-7n-full-protocol-corpus-review-2026-07`
**Status:** non-normative record. **No** protocol version, contract, conformance, OpenAPI,
schema, service, runtime, VM, DNS, TLS or secrets change.

## Objective

Review the **entire** documentation corpus of the repository — every README, ADR, RFC, spec,
governance/security/reference doc, guide, example, service/infra/tools doc and website snapshot —
so that no public or canonical document contradicts the current state of BANZA: an open,
operator-neutral financial-interoperability **protocol**, not an operator, wallet, app, bank, PSP,
settlement system or payments runtime.

## Methodology

- Inventory of all **187** tracked Markdown documents (144 + 43 website snapshots).
- Global claims sweep + old-paths sweep across the whole tree (excluding `node_modules`/build).
- Read-only review passes over the corpus by area (READMEs, `spec/**`, `docs/reference/**` + the
  large EN/PT canonical references, ADRs/RFCs already reviewed in 7M, governance).
- Targeted boundary refinements to the founding constitutional documents per the phase brief.
- Per-area/per-document classification in
  [`FULL_PROTOCOL_CORPUS_REVIEW_MATRIX_2026_07.md`](FULL_PROTOCOL_CORPUS_REVIEW_MATRIX_2026_07.md).

## Result

The corpus was already strong (7H–7M). The review found the **READMEs (25/25), docs/reference
(15/15) and spec/ (24/25) all PASS** — one minor spec wording fix. The remaining work was the
constitutional refinement of the founding ADRs/RFC and two governance-doc boundary notes.

### Documents changed (17)

**Founding ADRs / RFC (constitutional):**
- **ADR-001** — added a *Current protocol boundary note* (BANZA defines protocol-level models …
  does not operate wallets, execute settlement, move funds, hold balances or run payment
  infrastructure); softened "financial state machines (…, wallets, settlement)" →
  "state-machine models (…, wallet/account models, settlement semantics)"; "certification
  vectors" → "conformance test vectors".
- **ADR-002** — added a *Current boundary note* (repo is protocol-only; operator-era migration
  docs may no longer exist).
- **ADR-003** — added a *Current boundary note* (EMIS/Multicaixa/Firebase and
  `reference/sandbox-operator/` are illustrative operator examples, outside the protocol repo).
- **ADR-004** — added a *Historical note* (reference/sandbox-operator/simulated-settlement is no
  longer the architecture).
- **ADR-005** — "certification" (as a design output) → "conformance evidence".
- **ADR-010** — refined to "account-based, **wallet/account-compatible** and QR/@handle-addressable,
  not card-first" (already had "BANZA is not a wallet / does not move, hold or settle funds").
- **RFC-0006** — operational verbs reframed: "The protocol core reserves/settles …" → "The
  operator implementation may reserve/settle …"; "credit risk that Banza should not bear" →
  "…that an operator implementation should not create or bear"; erratum strengthened to state
  BANZA does not reserve balances, settle payments, bear credit risk or operate wallets.

**Spec:** `spec/overview.md` — PT "O BANZA **usa** uma hierarquia PKI" → "O BANZA **define** …".

**Governance:** `BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md` and `MATRIX_A_BANZA.md` — added top
boundary notes clarifying that "BANZA certifies" denotes the BANZA CA governance role (a
future/pending step); pre-production; no certified operator; conformance PASS ≠ certificate.

**Website snapshots:** the 7 ADR/RFC snapshots re-synced in place (depth-corrected links preserved).

### Not changed (deliberate)

- READMEs, docs/reference, and the rest of spec/ — reviewed PASS, no change.
- Historical migration prose (`docs/migration/*`) in ADR-002/008 — point-in-time ADR records.
- Errata already present (ADR-006/010/017, RFC-0006) — confirmed.
- Certification/federation ADRs and federation specs — they describe the certification/trust
  **model** (BANZA CA issues operator certificates; BRL; L0–L4) as future/pending, honestly
  pre-production (no certified operator, `/operators` empty). Correct — no change.

## Claims & paths

Global claims sweep (whole repo, current claims): `Banza/BANZA wallet` · `wallet-native payment
network` · `BANZA moves/holds/settles funds` · `BANZA authorizes/completes/processes payments` ·
certified-operator/production-certs as current reality · BanzAI-as-authority — **0 live**.
Remaining occurrences are inside errata, model descriptions, or governance records now carrying
boundary notes. Old-paths sweep (as markdown links): **0** (`apps/`, `docs/protocol`, `docs/adr`,
`docs/rfc`, `docs/docs/`, `BANZA_*.md`, `deploy.sh`).

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · **0 broken links** · JSON/YAML/OpenAPI
valid · website build 79/79.

## Scope & confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` ·
BanzAI mock (`llm_calls=0`) · CSP-Report-Only active · GitHub metadata protocol-first. No ADR/RFC
renumbered; no status changed (notes/errata only); no contract/conformance/OpenAPI/schema
semantics changed; no services/infra-runtime/`.env`/secrets/DNS/Cloudflare/TLS change. No M2,
operator or certificate.

## M2-readiness

The full corpus is boundary-clean and consistent with the current pre-production state. 0
`MANUAL_REVIEW_REQUIRED`, 0 `BLOCKED`. The constitutional documentation is ready for M2-readiness /
institutional-facing review.
