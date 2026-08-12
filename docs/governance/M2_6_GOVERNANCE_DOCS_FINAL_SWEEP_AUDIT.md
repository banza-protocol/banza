# M2.6 — Governance Documentation Final Sweep · Audit

Vistoria da documentação de governação antes de alterar (Parte 1). Fecha o follow-up de M2.5:
`BANZA_TRUST_ARCHITECTURE.md` e docs de governação residuais ainda com prosa do modelo antigo.

> **Regra central.** BANZA é um protocolo financeiro aberto. Operadores independentes implementam o
> protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O
> trust é avaliado por signed protocol metadata, delegated signing keys, public protocol registry e
> revocation/fail-closed. Não existe BANZA CA, certificado de operador, operador certificado, aprovação
> humana central ou certificação como modelo activo. Operadores validam no BanzAI Workbench; CI/guards são
> ferramentas internas de maintainers.

## Classificação
1 Resíduo activo — corrigir · 2 Negação clara — pode ficar · 3 Rota legacy `/certificates` — só se
necessário · 4 Phase report histórico — não linkar como narrativa activa · 5 Guard/negative test — permitido
· 6 Termo legítimo noutro contexto.

## Resultado por grupo

| Documento | Estado | Decisão |
|---|---|---|
| `BANZA_TRUST_ARCHITECTURE.md` | **15 hits, ~8 reais** — "BANZA CA é a autoridade operacional de confiança", "5 passos", "Regra de Verificação Tripla", "operador certificado", "certificado assinado pela BANZA CA" | **1 — reescrever integralmente** (Parte 2) para signed metadata + delegated keys + manifest + conformance evidence + registry + revocation/fail-closed + Workbench-only |
| `BANZA_CA_PRODUCTION_ROLE.md` | doc inteiramente sobre a BANZA CA (modelo removido); referenciado só pelo cluster old-model, não por superfície activa | **1 — apagar** (superseded por ADR-038/039/040; sem refs activas) |
| `OPERATOR_ADMISSION_FLOW.md` | "operator admission" (modelo removido em M2.2 → self-publication); referenciado só pelo cluster | **1 — apagar** (superseded; sem refs activas) |
| `M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md`, `PROTOCOL_RELEASE_GOVERNANCE.md`, `PROTOCOL_PRODUCTION_STATE_MODEL.md` | cluster M2-produção com refs a CA/admission | **1 — limpar** ao modelo activo + remover refs aos docs apagados; marcar histórico onde aplicável |
| `EVIDENCE_BUNDLE.md` | 3 hits ("não substitui a BANZA CA", "revisão real pela BANZA CA") | **1 — limpar** as menções activas; manter negações |
| `BANZA_PROTOCOL_BOUNDARY.md`, `BANZA_REGULATORY_POSITIONING.md` | 5–6 hits (linguagem PSP/licença + resíduo) | **1 — limpar** resíduo; manter fronteira |
| `L1..L4_READINESS.md`, `OPERATOR_MANIFEST_VALIDATION.md`, `PUBLIC_PROTOCOL_REGISTRY.md`, `PROTOCOL_GOVERNANCE_ROLES.md`, `FEDERATION_TRUST_MODEL.md`, `WORKBENCH_ONLY_OPERATOR_VERIFICATION.md` | contagens baixas, maioria negações | **1/2 — limpar** os poucos resíduos activos; manter negações |
| `M2_4_TRUST_ENGINE_SIGNED_METADATA.md` | hits são negações ("Nenhum nome público contém «certificate»") | **2 — manter** (já activo) |
| `PHASE_*.md`, `*_MATRIX_*.md`, `*_INVENTORY.md`, `M2_5_PUBLIC_SURFACE_AUDIT.md`, este ficheiro | registo histórico de implementação | **4 — histórico**; o guard exclui-os; nota histórica onde útil; nunca fonte activa do Assistente |
| `LEGACY_CERTIFICATES_ROUTE_COMPATIBILITY.md` | rota legacy `/certificates` | **3 — manter** (rota máquina legacy, `production_certificates=false`) |

## Entregas
- Reescrever `BANZA_TRUST_ARCHITECTURE.md` (modelo activo).
- Apagar os docs inteiramente old-model (`BANZA_CA_PRODUCTION_ROLE.md`, `OPERATOR_ADMISSION_FLOW.md`) e
  limpar os refs de entrada.
- Limpar os docs de governação com resíduo activo; manter negações + rota legacy.
- Novo guard `make governance-docs-clean-check` (+ self-tests + CI).
- Assistente: intents de arquitectura de trust/governança pelo modelo activo (se houver lacuna).
- Phase reports: histórico, não linkados como narrativa activa.

## Critério
Zero resíduo activo de arquitectura antiga em governance docs; `governance-docs-clean-check` verde; os guards
existentes (public-surface-clean, workbench-only, open-governance, regulatory, reference-svg) continuam verdes;
`/operators=[]`, `production_certificates=false`, `llm_calls=0` inalterados.
