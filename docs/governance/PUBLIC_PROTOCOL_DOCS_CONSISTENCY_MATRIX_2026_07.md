# Public Protocol Documentation Consistency Matrix (2026-07)

**Base:** `main` `015c070` · **Phase:** 7P · Consistency review of the primary public-facing
documents against the protocol boundary (calibrated to the prudence of `SECURITY.md` and
`docs/governance/REPOSITORY_STRUCTURE.md`).

**Result: 0 BLOCKED · 0 MANUAL_REVIEW_REQUIRED.** All primary documents now align with
`/operators=[]`, `production_certificates=false`, pre-production, BanzAI-non-normative, and
VERSION 1.0.0.

| Path | Public-facing | Issue found | Action applied | Remaining risk | Institutional-ready |
|---|---|---|---|---|---|
| `README.md` | Yes (GitHub) | Opening "Public rules, contracts, **certification criteria** and a federation model — implementable by **anyone**"; "**certification** (L0–L4)"; "**Certified operators federate**" / "Certified operators at L3+ federate" as current reality; "A certification framework (L0–L4)" | Opening → "public rules, protocol contracts, **conformance evidence** and a **future federation governance model** — implementable by **qualified candidate operators**"; "**conformance levels and certification governance** (L0–L4)"; federation → "**When production certification opens**, operators certified at the applicable level may federate"; "What BANZA is" cell → "Conformance levels and certification governance (L0–L4)" | Remaining "certification criteria/framework" are governance-context (link to the framework doc; "BanzAI *explains* criteria") — correct | ✅ |
| `spec/overview.md` | GitHub | Header "**Version: 2.0**" vs `VERSION=1.0.0`; hardcoded "Latência alvo: < 2 s"; present-tense CA/federation | "**Version: v1.0**", "**Repository VERSION: 1.0.0**", "Status: Official v1.0 · pre-production · no certified operator"; top boundary note ("does not operate wallets/move/settle funds…"); latency → implementation-declared objective (BANZA does not promise operational latency); federation & CA issuance → future/conditional | none | ✅ |
| `conformance/README.md` | GitHub | "**Banza sandbox operator**" / "**reference/sandbox-operator/**" as canonical target; "**Conformance certifies** PROTOCOL INTEROPERABILITY only"; SDK/provider/QR-runtime/event-emitter scope; mixed-case "Banza" | "## Reference operator" → "## **Conformance targets** — There is no reference operator in this repository…"; "Conformance **produces technical evidence**… does not certify/approve/replace legal/KYC/KYB"; scope → "candidate operator implementations and protocol artifacts tested against BANZA contracts and invariants"; sandbox runner → conformance runner + explicit "evidence only, not certification"; Banza→BANZA | none | ✅ |
| `contracts/README.md` | GitHub | "**Banza's infrastructure**" / "**Banza's platform**"; product/consumer framing | "shared truth between **BANZA protocol** and its consumers"; "a formal interface that **operator implementations may expose or consume** when implementing BANZA … does not define a BANZA-operated platform, wallet, payment runtime or settlement system" | none | ✅ |
| `docs/reference/pt/completa.md` | GitHub | "**Qualquer entidade pode tornar-se um operador certificado** … Não existem acordos bilaterais, volumes mínimos nem **aprovações discricionárias**" (absolute); related | "Qualquer entidade **candidata tecnicamente qualificada** pode submeter evidência… A eventual certificação depende do processo de governação/certificação (M2/M3) e não substitui obrigações legais/regulatórias/bancárias/KYC/KYB. **Ao nível técnico**, o protocolo elimina dependências bilaterais… — critérios públicos, determinísticos e auditáveis" | Other "qualquer entidade" lines already future/M2-M3-qualified | ✅ |
| `docs/reference/en/complete.md` | GitHub | "**no discretionary approval**. No bilateral agreement… No minimum volume" (absolute); "not discretionary" | "certification is technical and evidence-based. **Technical conformance criteria are public, deterministic and auditable**…"; "…**there is no bilateral agreement required**…" | none | ✅ |
| `decisions/adr/ADR-001-…md` | Yes (`/decisoes/adr-001`) | Founding ADR: "financial primitives … wallet model, settlement, QR runtime"; "financial primitives of instant payment networks" | Boundary note **strengthened** ("historical extraction … does not operate wallets, process payments, move funds, settle funds, hold balances, maintain user accounts or run payment infrastructure"); "protocol-level models — … wallet/account implementation model, … settlement semantics, QR protocol surface"; "**protocol-level models for financial interoperability**" | Historical "Banza began as a private fintech product" kept (historical context) | ✅ |
| `website/content/decisions/adr/ADR-001-…md` | Yes (public page) | Snapshot | Same ADR-001 edits applied (byte-identical to canonical) | none | ✅ |
| `website/content/BANZA_REFERENCIA.md` | Yes (`/referencia`) | Snapshot of PT reference | Same PT edits applied (differs from canonical only by pre-existing depth-corrected link) | none | ✅ |

## Notes / follow-up (out of 7P scope)

`reference/sandbox-operator/` still appears as an **implementation-example path** in a few
already-reviewed docs (`ADR-009`, `ADR-030`, `spec/capability-negotiation.md`,
`spec/payment-lifecycle.md`, `spec/federation/*`). `ADR-003`/`ADR-004` already carry
illustrative/historical boundary notes covering this. These are not dangerous BANZA-as-operator
claims and were left untouched to respect the "do not reopen 7N" scope; a future light pass may
add an "illustrative, not in this repository" note to those spec files. Classified
**HISTORICAL_CONTEXT_ACCEPTED**.
