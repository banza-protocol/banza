# Final Public Wording Hardening Matrix (2026-07)

**Base:** `main` `7682076` · **Phase:** 7Q · Final wording hardening of the primary public
documents. **Result: 0 BLOCKED · 0 MANUAL_REVIEW_REQUIRED.**

| Path | Public-facing | Issue found | Action applied | Remaining risk | Institutional-ready |
|---|---|---|---|---|---|
| `README.md` | Yes (GitHub) | FAQ "Products are built by independent **certified operators**"; FAQ "**Any entity** that implements the contracts … **Certification is issued by BANZA CA**"; "The BANZA CA issues certificates."; tree "**certification** test vectors" | "Products are built outside this repository by independent **operator implementations**. Production participation depends on the applicable legal, regulatory and protocol-governance process."; "A **candidate operator may submit conformance evidence** … Certification, **if applicable**, is a separate BANZA governance/CA process and is not automatic."; "**In the production phase**, the BANZA CA **will** issue certificates as part of a separate governance process."; "**conformance** test vectors" | none | ✅ |
| `spec/overview.md` | GitHub | Architecture row "Federação … **Operadores certificados L3+**" (current); "A BANZA CA **verifica** a assinatura durante a certificação" (present) | "Operadores certificados L3+**, quando a certificação de produção estiver aberta**"; "**Quando certificação governance estiver ativa**, a BANZA CA **verificará** a assinatura…" | none | ✅ |
| `conformance/README.md` | GitHub | "Run the conformance runner to verify the **reference operator passes**"; "any operator deploying **Banza**" | "…verify that **the selected candidate endpoint or fixture satisfies the published vectors**"; "…deploying **BANZA**" | none | ✅ |
| `contracts/README.md` | GitHub | "**Certification** test vectors …" | "**Conformance** test vectors …" | none | ✅ |
| `docs/reference/pt/completa.md` | GitHub | "A única condição imposta pelo protocolo é técnica … Não existem volumes mínimos, acordos prévios, **aprovações discricionárias**"; "**Não existe processo de aprovação institucional**"; "qualquer entidade … **poderá entrar**" | reframed to: candidate submission for BANZA-CA review; "os critérios de conformidade são públicos, determinísticos e auditáveis"; production participation subject to governance + legal/regulatory/banking/KYC/KYB obligations | Other "qualquer entidade" lines already future/M2-M3-qualified | ✅ |
| `docs/reference/en/complete.md` | GitHub | "Certification access is defined by the protocol rules alone…"; FAQ "Yes, provided they pass … **There is no institutional approval, no minimum**…" | reframed: technical conformance criteria are public/deterministic/auditable; "A **technically qualified candidate entity may submit conformance evidence** … Production participation **requires** the governance/certification process and legal/regulatory/KYC/KYB obligations" | none | ✅ |
| `website/content/BANZA_REFERENCIA.md` | Yes (`/referencia`) | Snapshot of the PT reference (identical mirror) | Same PT edits applied (differs from canonical only by 2 pre-existing depth-corrected links) | none | ✅ |
| `docs/reference/compatibility.md` | GitHub | "SDK **certification** test vectors" | "SDK **conformance** test vectors" | none | ✅ |
| `docs/reference/getting-started.md` | GitHub | "contains the **certification** test vectors" | "contains the **conformance** test vectors" | none | ✅ |

## Notes

The canonical L0 level name **"Protocol Sandbox"** was preserved (agent-suggested rename rejected
on review). `reference/sandbox-operator/` implementation-example paths in `ADR-009/030` + a few
spec files remain **HISTORICAL_CONTEXT_ACCEPTED** (already-reviewed; ADR-003/004 carry
illustrative notes) — out of the public-docs scope, follow-up noted in the 7P matrix.
