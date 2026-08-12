# Phase 7S — English Reference and Final Deep Content Hardening (2026-07)

**Base:** `main` `156cd2b` · **Branch:** `fix/phase-7s-english-reference-final-hardening-2026-07`
**Status:** non-normative record. Final deep wording hardening of the public/canonical reference
corpus. **No** protocol version, contract, conformance-vector, OpenAPI, schema, service, runtime,
VM or secrets change.

## Objective

Bring the public and canonical reference corpus to an institutional, prudent, operator-neutral
standard, with the **English reference (`docs/reference/en/complete.md`) as primary target**, and
close the last residues of: reference-operator-as-current-entity; BANZA as direct certificate
issuer; federation as a current operational reality; "unified payment network"; funds-credited-
immediately as a runtime promise; absolute "any entity / open access" without legal/regulatory/
governance prudence; conformance-as-certification; and unqualified "certification testing".

## Key finding: EN lagged PT

The Portuguese canonical reference had been hardened in phases 7P/7Q (M2/M3 qualifiers, explicit
"BANZA does not move funds / hold balances / execute settlement" notes at PT L1474/L1532, prudent
open-access wording). The **English reference had not received the equivalent treatment** and still
carried, in current tense: reference-operator claims, "In production a customer on any operator can
pay a merchant", "receives the funds immediately", "unified payment network", "Settlement is
executed by open rules", "It defines the rules, issues certificates", "Only BANZA issues
certificates", "Any legal entity may apply for BANZA certification", "Any entity with verifiable
conformance", the "What it certifies" levels header, "Certification test vectors", and a stale
ADR-010 label. 7S raises EN to PT's prudence level and closes the residual PT/website items.

## Methodology

1. **Direct reading was the authoritative source.** The full EN reference (1469 lines) and the
   smaller public docs were read directly; PT/website (2998 lines) were compared line-by-line.
2. **A parallel agent workflow was a cross-check only.** One read-only agent per document produced
   verbatim find/replace maps. The agents confirmed the table headers and a few federation phrases
   but **missed** the core reference-operator-as-entity residues and several operational-federation
   claims (EN L119/L133/L552/L684/L952/L1256-1258/L1399/L1451; PT L295/L347/L1472/L1601/L1953/L2793).
   Per the phase rule (don't treat prior reports as truth), the direct read was used and every edit
   was applied byte-exact.
3. **The sweep tooling itself was validated.** An initial cross-doc sweep silently returned zero
   because the shell is `zsh` (unquoted `$DOCS` is not word-split) and `grep` resolves to `ugrep`;
   it was re-run with a proper zsh array and known-present control strings to prove it works before
   any "0 hits" was trusted.

## Corrections by file

- **docs/reference/en/complete.md (primary, 18 edits):**
  - Reference-operator-as-entity removed: §2 "this repository does not contain a reference operator;
    candidate operator implementations are external … must submit conformance evidence through the
    applicable governance process"; §3 "Operator implementations demonstrate protocol capabilities,
    but no operator owns the protocol"; §7 BanzAI "nor any operator implementation"; §8 "Every
    candidate or future certified operator — including any first production operator if certification
    opens — is subject to the same published technical criteria and the same applicable governance
    process"; §10 "BANZA is not owned by any operator / not governed by any operator / No operator
    implementation controls the conformance or certification-governance framework".
  - Federation reframed to future/governed model, not operational promise: participation "Once
    certified operators are in production — production federation depends on milestone M3 — a payer …
    can pay a payee"; "Settlement is carried out by operators according to open protocol rules —
    BANZA does not move or settle funds"; "the BANZA CA issues a certificate"; crediting/funds
    availability = receiving operator's responsibility, "BANZA does not move or hold funds"; added a
    settlement-execution note (parity with PT L1532): "The bank transfer is executed by the operators
    … outside the protocol. BANZA … does not move funds, hold positions, or guarantee any
    participant's solvency"; netting-example label "Bank transfers by operators"; "The federation
    model specifies how independently operated implementations may interoperate under one open
    protocol … BANZA itself does not move funds, hold balances or execute settlement" (replacing
    "unified payment network"); FAQ "Once production federation opens (milestone M3), Customer A …
    can pay Merchant B".
  - Certificate issuance routed through the CA + governance: "It defines the rules and owns the
    conformance test set; the BANZA CA issues certificates through the applicable governance process,
    when production certification opens"; "Only the BANZA CA issues certificates — through the
    applicable governance process, after an operator passes the deterministic conformance test set".
  - Open access made prudent: "Technical conformance criteria are public, deterministic and auditable
    — not gated by institutional access, bilateral agreements or minimum transaction volumes. A
    technically qualified candidate entity may submit verifiable evidence … Certification, if
    applicable, depends on the protocol governance/certification process and does not replace
    applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations"; participation-table cell
    "Technically qualified entities with verifiable conformance — production certification depends on
    M2/M3".
  - Evidence not certification: levels header "What it evidences"; developer-resources
    "Conformance test vectors".
  - Accuracy: ADR-010 reference label "Wallet-native identity" → "Account/Participant Identity Model"
    (the real ADR title; spec/overview already used the correct label).
- **docs/reference/pt/completa.md (10 edits):** the PT mirror of the above residues — §2 L295 /
  §3 L347 reference-operator; ownership bullet L1953; FAQ L2793 "se um operador desaparecer"; L1472
  "executada pelos operadores … o BANZA não movimenta nem liquida fundos"; L1510 funds =
  operator responsibility + "o BANZA não movimenta nem detém fundos"; L1601 "rede de pagamentos
  unificada" → future/governed federation model + "O BANZA não movimenta fundos, não detém saldos e
  não executa liquidação"; L1587 "Transferências bancárias pelos operadores"; L1026 "O que
  evidencia"; L184 "Verificação determinística".
- **website/content/BANZA_REFERENCIA.md (10 edits):** the same PT edits applied byte-identically;
  the file remains a byte-for-byte mirror of the PT canonical reference except the single
  pre-existing depth-corrected relative link at L2513.
- **conformance/README.md (3 edits):** levels header "What it evidences"; H1 → "BANZA Conformance and
  Certification Governance" (no cross-links to the old anchor; the body already separates conformance
  evidence from certification governance); "Any operator implementation deploying BANZA-compatible
  services in production is solely responsible…".
- **contracts/README.md (1 edit):** "the authoritative source for conformance **testing and
  certification-governance review**".
- **spec/overview.md:** verified, no change required (already v1.0 · pre-production · boundary note ·
  future-qualified CA/federation · implementation-declared latency).

## Claims sweep (validated tooling, per-file, 9 main docs)

All 14 remaining occurrences are OK, **0 NEEDS_FIX / 0 MANUAL_REVIEW**:
- OK_NEGATED: EN L119, conformance L74 ("does not contain / there is no reference operator"), EN
  L898 ("BanzAI must not claim … certifies alone"), PT/web L295.
- OK_HISTORICAL_ADR: EN L1456 / PT/web L1931 (ADR-004 title reference).
- OK_FUTURE_GOVERNANCE: PT/web L17/L903/L2823 "aprovações discricionárias" (technically-scoped +
  legal caveats); EN L562/L1363/L1393/L1401 "the BANZA CA issues" (future/M2-M3-qualified).
- CANONICAL_FILENAME_ACCEPTED: `reference-operator.yaml` (EN L1016; real contracts file).

Absolutes confirmed **gone** (0 hits): "unified payment network", "rede de pagamentos unificada",
"receives the funds immediately", "recebe os fundos imediatamente", "Any legal entity may apply for
BANZA certification", "Any entity with verifiable conformance", "no institutional approval",
"a única condição imposta pelo protocolo é técnica", "It defines the rules, issues certificates",
"Only BANZA issues certificates", "What it certifies", "O que certifica", "Certification test
vectors", "Settlement is executed by open rules", "real-time settlement", "settlement executed by
BANZA", "BANZA moves/holds/settles/authorizes/completes", "Banza platform/infrastructure".

## Old-path sweep

0 old-path links in the changed docs. The only hits are the forbidden-paths **list** in
`docs/governance/REPOSITORY_STRUCTURE.md` L47-50 (OK_NEGATED — purity-check documentation).

## Broken links

The 5 changed docs contain **0 broken relative links**. A repo-wide scan surfaced **7 pre-existing**
broken relative links (7E/7H-restructure depth bugs) in `spec/invariants.md`, `spec/README.md`,
`spec/federation/FEDERATION_TRUST_MODEL.md`, `docs/governance/README.md`,
`docs/reference/getting-started.md` — all outside the 7S file set, flagged for a separate
`fix(docs)` PR (not fixed here to keep the 7S diff scoped).

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · JSON/YAML/OpenAPI valid · website build ·
0 broken links in the changed docs.

## Deploy plan

`website/content/BANZA_REFERENCIA.md` changed → website-only rebuild + redeploy on the VM
(`banza-website:rollback-pre-7s`), recreating **only** the website container and preserving
reverse-proxy / verification-api / banzai-api / postgres. No `.env`/certs/DNS/Cloudflare/TLS/Postgres
change.

## Scope & confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock (`llm_calls=0`) · CSP-Report-Only active. No contract/conformance-vector/OpenAPI/schema
semantics changed (only prose in `contracts/README.md` / `conformance/README.md`); no services/
infra-runtime/`.env`/secrets/DNS/Cloudflare/TLS change; no ADR/RFC renumber/status change;
`reference-operator.yaml` preserved as a real filename. No M2, operator or certificate.

## Remaining risk

None in the public documents. The 7 pre-existing broken links (out of scope) and any future
production-federation wording remain for later phases/milestones.

## Verdict

The English reference no longer contains reference-operator-as-current-entity, "BANZA issues
certificates", operational-federation promises, absolute open-access, or conformance-as-certification;
the PT reference and website content are in prudent parity; conformance/contracts use evidence and
governance framing instead of automatic certification; spec/overview remains v1.0 / pre-production.
Ready for institutional-facing / M2-readiness review.
