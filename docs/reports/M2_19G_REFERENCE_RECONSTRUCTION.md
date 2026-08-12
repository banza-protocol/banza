# M2.19G — Reference Reconstruction

**Chapter-by-chapter realignment of the canonical Reference to the three-layer architecture**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`
**Files:** `website/content/BANZA_REFERENCIA.md` (+502 / −… lines), `website/lib/reference.ts` (chapter metadata)

The Reference is the canonical prose specification, sliced at build time into 15 chapters by
`website/lib/reference.ts` (`CHAPTER_DEFS`) — each rendered at `/referencia/<slug>` and inside
`/referencia/completa`. The markdown predated the M2.19 realignment and was the core rewrite target of
M2.19G. Chapter positions are unchanged; the content was realigned.

---

## Chapter-by-chapter changes

| # | Slug | Title | Treatment | What changed |
|---|---|---|---|---|
| 1 | o-que-e | O Que É o BANZA | minor | Verified against three-layer + "not a bank/PSP/wallet/scheme/financial-service-provider"; hero-line qualified (see §Hero). |
| 2 | porque-existe | Por Que o BANZA Existe | minor | Absolute "sem acordos bilaterais" phrasings qualified to "sem reconstruir integrações técnicas bilaterais entre cada par". |
| 3 | principios | Princípios Fundamentais | minor | Kept; "ausência de autoridade certificadora" retained as the correct absence framing. |
| 4 | arquitectura | Arquitectura do Protocolo | **REWRITE** | Now presents the **three-layer institutional architecture** (L1 Protocolo / L2 Certificação / L3 Esquema Operacional Banzami, BanzAI transversal) — replacing the stale protocol/operator two-layer + core/business picture. Invariant namespaces verified (INV-OTE-*/INV-FEDEVAL-*/INV-ROOT-* per ADR-058). |
| 5 | postgresql | PostgreSQL — Estado Protocolar | minor | Aligned (ADR-042 protocol-state store); the diagram's `certificates` table reference cleaned to certification records. |
| 6 | confianca | Confiança | minor | Open Trust Evaluation (ADR-038), no CA; residual absolute "sem acordos bilaterais" qualified; INV-OTE naming verified. |
| 7 | certificacao | **Conformidade e Certificação** | **REWRITE** | Retitled (was "Conformidade e Evidência"). Presents the **ADR-064/065/066 L2 model** — Certification Profile → CertifiedImplementation → CertificationRecord, the closed state machine, reason codes, the Technical Registry — instead of L0–L4 as the headline certification-levels framework. L0–L4 demoted to conformance **scope**. |
| 8 | operadores | Operadores | **REWRITE** | Rebuilt as the taxonomy: **entidade, operador, implementação, implementação certificada, participante de esquema** — who implements, what evidence they publish, what responsibilities they bear, what BANZA never delivers. L0–L4-as-levels removed; the `banza-operators-v1.svg` embed rewritten to scope framing. |
| 9 | operador-zero | Operador Zero | **REBUILD** | Rebuilt from the SIMULATOR model to the **ADR-067 read-only reference**: exposes manifest, capabilities, endpoints, metadata, keys and evidence for discovery and verification; `NOT_CERTIFIED`; no real money; validated exclusively in BanzAI (9-step journey). The v1 simulator SVG embeds dropped in favour of the v2 read-only set; `100/100`, "seis etapas", "sete amostras", "clone em memória", the fictional interactive KZ_DEMO ledger and the negative-flow execution removed. |
| 10 | federacao | Federação | minor | Federation by evidence + OTE (ADR-040); L3+ references kept as conformance scope; absolute bilateral phrasings qualified. |
| 11 | governacao | Governança | minor | N1–N5 hierarchy + open governance; Banzami framing verified against ADR-060 (designated operator) and governance ≠ scheme. |
| 12 | banzai | BanzAI — Agente do Protocolo | **REWRITE** | BanzAI presented as the **single human interface, transversal across the three layers and NOT a layer** (ADR-054/067) — replacing "camada oficial de orientação e orquestração" (ADR-041 framing). Two modes + the 9-step journey; Rust decides, local Qwen explains; does not create rules, approve or certify. |
| 13 | programadores | Recursos para Programadores | minor | Contracts/schemas/endpoints/engines; the "sete passos" developer flow kept (legitimate — it is the developer flow SVG, not the retired journey); L0–L4 references reframed to conformance scope. |
| 14 | roteiro | Roteiro de Maturidade | minor | Updated to the M2.19 reality: protocol v1.0 frozen, the L2 certification model active, pre-production with real payments off, the Banzami Operational Scheme in regulatory preparation. |
| 15 | faq | Perguntas Frequentes | **REWRITE** | Corrected the answers that carried BanzAI-as-layer ("Sim, como camada oficial"), L0–L4-as-levels and the Operador Zero simulator framing, to the current three-layer / transversal-BanzAI / read-only-reference answers. |

---

## Chapter metadata (`website/lib/reference.ts`, `CHAPTER_DEFS`)

The one-line chapter summaries were rewritten to match the new bodies. Load-bearing changes:

- **ch.4** summary now names the three layers ("L1 Protocolo, L2 Certificação, L3 Esquema Operacional
  Banzami — com o BanzAI transversal").
- **ch.7** summary changed from "Níveis L0–L4 … PASS como evidência verificável" to "Conformidade
  verificável … e a Certificação de Conformidade e Interoperabilidade (L2), por implementação e baseada em
  evidência: perfil, registo de certificação, ciclo de vida e registo técnico; não é licença, admissão nem
  autorização."
- **ch.8** summary now names the taxonomy ("Entidade, operador, implementação, implementação certificada e
  participante de esquema").
- **ch.9** summary changed from "O simulador canónico … ledger fictício KZ_DEMO …" to "A implementação
  canónica de referência, apenas de leitura: expõe manifest, capabilities, endpoints, metadata, chaves e
  evidência … NOT_CERTIFIED; sem dinheiro real; validada exclusivamente no BanzAI."
- **ch.12** summary changed from "Interface primária humano-operador (ADR-054)" to "A interface humana
  única do protocolo (ADR-054/067), transversal às três camadas e não uma camada: dois modos e a jornada
  de nove etapas; o Rust decide, o Qwen local explica."
- **ch.14** summary updated to the frozen-v1.0 / L2-active / pre-production / regulatory-preparation state.

The chapter comment for the ch.8→9→10 ordering was rewritten: ch.9 now reads as "the canonical read-only
reference implementation (how an implementation presents itself, validated in BanzAI)" rather than "a
complete implementation running", so its position between Operadores and Federação still makes sense.

---

## Hero / bilateral-agreements qualification

Across the Reference (and `layout.tsx` / `page.tsx`), the absolute claim that BANZA works "sem acordos
bilaterais" was qualified to the accurate **"sem reconstruir integrações técnicas bilaterais entre cada
par"**. The protocol removes the need to rebuild *technical* integration for every pair of participants; it
does not claim to eliminate every commercial contract, settlement arrangement or counterparty-risk
agreement, which remain in the operators' domain. The qualified phrasing appears consistently in the intro,
the "por que existe" chapter, the confiança/federação chapters, the operator taxonomy and the developer
chapter; the remaining bare "acordos bilaterais" occurrences are in sentences that explicitly reason about
the *cost* of bilateral agreements in a closed network (the Pix/UPI rationale), where the term is the
subject of the argument, not an absolute product claim.

---

## Verdict

The 15-chapter Reference now presents the three-layer architecture, the L2 certification model, the
read-only Operador Zero and the transversal BanzAI interface, with the bilateral-agreements claim
qualified. Five chapters were rewritten (4, 7, 8, 12, 15), one rebuilt (9), and nine minor-realigned. The
retired framings (protocol/operator two-layer, L0–L4-as-levels, BanzAI-as-layer, Operador-Zero-as-simulator)
no longer appear as current content.
