# Phase 7Q — Final Public Wording Hardening (2026-07)

**Base:** `main` `7682076` · **Branch:** `fix/phase-7q-final-public-wording-hardening-2026-07`
**Status:** non-normative record. Final public-documentation wording hardening. **No** protocol
version, contract, conformance-vector, OpenAPI, schema, service, runtime, VM or secrets change.

## Objective

Close the last editorial residues in the primary public documents so BANZA reads as a serious,
prudent, auditable, operator-neutral financial protocol — no automatic certification, no current
certified operator, no reference-operator, no "BANZA platform", no conformance-as-certification,
no broad "any entity" institutional promises.

## Methodology

A parallel mapping workflow (one read-only agent per doc) produced verbatim `find`/`replace`
maps; every edit was **reviewed** and applied byte-exact. On review, agent quotes that mis-cased
or dropped line-wraps were re-derived from the file; and three further "certification test
vectors" occurrences (README tree, `docs/reference/compatibility.md`, `getting-started.md`) were
fixed for consistency.

## Corrections by file

- **README.md** — FAQ "Products are built by independent **certified operators**" → "built
  outside this repository by independent **operator implementations**; production participation
  depends on the applicable legal, regulatory and protocol-governance process"; FAQ "**Any
  entity** … Certification is issued by BANZA CA" → "a **candidate operator may submit conformance
  evidence** … certification, **if applicable**, is a separate BANZA governance/CA process and is
  not automatic"; "The BANZA CA issues certificates." → "**In the production phase**, the BANZA CA
  **will** issue certificates as part of a separate governance process."; tree "certification test
  vectors" → "conformance test vectors".
- **spec/overview.md** — architecture row "Operadores certificados L3+" → "…**quando a
  certificação de produção estiver aberta**"; "A BANZA CA **verifica** a assinatura durante a
  certificação" → "**Quando certificação governance estiver ativa**, a BANZA CA **verificará**…".
- **conformance/README.md** — "verify **the reference operator passes**" → "verify that **the
  selected candidate endpoint or fixture satisfies the published vectors**"; "deploying **Banza**"
  → "deploying **BANZA**". (Canonical L0 name "Protocol Sandbox" preserved.)
- **contracts/README.md** — "**Certification** test vectors" → "**Conformance** test vectors".
- **docs/reference/pt/completa.md** & **en/complete.md** — the absolute "A única condição imposta
  pelo protocolo é técnica … Não existem … aprovações discricionárias" / "Não existe processo de
  aprovação institucional" / "qualquer entidade … poderá entrar" / "There is no institutional
  approval, no minimum…" → prudent formulations: public/deterministic/auditable technical
  conformance criteria; candidate entity may submit conformance evidence for BANZA-CA review;
  production participation subject to the governance/certification process and to legal,
  regulatory, banking, KYC/KYB obligations. Lines already M2/M3-qualified were left as-is.
- **website/content/BANZA_REFERENCIA.md** — identical PT mirror; same edits applied (differs from
  canonical only by two pre-existing depth-corrected links).
- **docs/reference/compatibility.md**, **getting-started.md** — "certification test vectors" →
  "conformance test vectors".

## Scans

- **Claims sweep (public targets):** 0 live for `Products are built by independent certified
  operators`, `Any entity that implements the contracts`, `Certification is issued by BANZA CA`
  (unqualified), `certification test vectors`, `Conformance certifies`, `reference operator
  passes`, `Banza platform`, `any entity can become certified`, `qualquer entidade pode tornar-se
  operador certificado`, `qualquer entidade … poderá entrar`, `Version: 2.0`.
- **Old-path sweep:** 0 old-path links in the target docs.

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · **0 broken links** · JSON/YAML/OpenAPI
valid · website build.

## Scope & confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock (`llm_calls=0`) · CSP-Report-Only active · GitHub metadata protocol-first. No contract-
vector/OpenAPI/schema semantics changed (only prose in `contracts/README.md`); no services/
infra-runtime/`.env`/secrets/DNS/Cloudflare/TLS change; no ADR renumber/status change. No M2,
operator or certificate.

## Verdict

The primary public documents no longer contain automatic-certification, current-certified-operator,
reference-operator, BANZA-platform, conformance-as-certification, or broad "any entity" residues.
BANZA can be presented as an institutional financial protocol with prudent, professional wording.
Ready for institutional-facing / M2-readiness review.
