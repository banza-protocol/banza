# M2.5 — Public Surface & Workbench Audit

Vistoria das superfícies públicas antes de alterar (Parte 1). Registo do estado, classificação e decisão.

> **Regra central.** BANZA é um protocolo financeiro aberto. Operadores independentes implementam o
> protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O
> trust é avaliado por signed protocol metadata, delegated signing keys, public protocol registry e
> revocation/fail-closed. Não existe autoridade humana central, certificado de operador, aprovação BANZA
> ou BANZA CA no modelo activo.
>
> **Princípio de UX.** Simplicidade é um princípio do protocolo. A interface ajuda operadores a executar
> tarefas concretas — não expõe a história interna das fases M2/M2.1/M2.2/M2.3/M2.4.

## Classificação
1 Remover · 2 Substituir por modelo activo · 3 Manter só em roadmap interno · 4 Manter só em guard/negative
test · 5 Manter só na rota legacy `/certificates`.

## Estado geral

Grande parte do modelo normativo já foi limpo em M2.3/M2.4 (reference, contracts, invariants, SVGs do
reference, engine cripto). A pendência de M2.5 é a **camada de produto**: home, páginas públicas, reference
chapters de website, BanzAI Chat, e sobretudo o **Workbench organizado por milestones M2.x**.

## Ocorrências por superfície (contagem bruta em website/app + website/components)

| Termo | Ocorrências | Decisão |
|---|---:|---|
| `certificação` / `Certificação` | 37 | 2 — capítulo/rota/label → Conformidade; manter só negações |
| `Pendente` | 58 | 2 — "M2/M3 Pendentes" como foco → estado neutro ("pré-produção", "registo vazio") |
| `M2/M3` | 29 | 3 — só roadmap; remover do painel de estado principal |
| `M2.1`/`M2.2`/`M2.3`/`M2.4` | ~13 | 1 — labels de milestone no Workbench → nav orientada a tarefa |
| `operador certificado` | 5 | 2 — → "operador com evidência verificável de conformidade" |
| `M2 protocol gate` | 4 | 1 — remover do Workbench de operador |
| `Assistente de Certificação` | 2 | 2 — → "Assistente de Conformidade" |
| `certificado de produção` | 2 | 2/5 — só rota legacy `/certificates` + campo `production_certificates=false` |
| `corpus` | 2 | 1 — remover de UI pública |
| `BANZA CA` | 1 | 1 — remover |

## Alvos principais

| Superfície | Estado | Decisão |
|---|---|---|
| `website/app/page.tsx` + `HeroEstado.tsx` | mayormente activo (M2.3); ROADMAP M1/M2/M3 + AUDIENCE `/certificacao` + estado com "Pendente" | 2 — reframe home Parte 3: painel de estado neutro, CTA (Ler referência/Abrir Workbench/Ver rotas/Começar), roadmap de-enfatizado |
| `website/app/certificacao/page.tsx` | conteúdo já activo, título "Certificação", rota `/certificacao` | 2 — nova rota canónica `/conformidade`; `/certificacao` redirect |
| `website/app/referencia/*` + `website/content/BANZA_REFERENCIA.md` | 37 hits "certifica" (mistura de negações + "certificação" como capítulo) | 2 — "Certificação"→"Conformidade"; manter negações |
| `website/components/banzai/BanzaiChat.tsx` | **Workbench por milestones**: M2 protocol gate + M2.1/M2.2/M2.3 SectionLabels na Conformidade; Evidence checklist com labels M2.x; TrustPanel já M2.4 | 1 — remover painéis de milestone; nav por tarefa (Guia/Manifest/Conformidade/Trust/Federação/Evidence/Traces/Referência/Programadores); default Guia; fixtures orientados a operador |
| `website/components/banzai/workbench.ts` | TABS por ferramenta; TRUST_CARDS com "certificado de operador" | 2 — nav nova + ask-cards de operador |
| `website/components/banzai/BanzaiChat.tsx` (Chat) | "Assistente de Certificação"; sugestões cert-centradas | 2 — "Assistente de Conformidade"; sugestões de tarefa |
| `website/app/{operadores,confianca,federacao,estado,faq,arquitectura,governacao,programadores,roteiro,o-que-e,porque-existe}` | resíduos dispersos | 2 |
| `website/components/SiteFooter.tsx` + `DecisionsExplorer.tsx` | "certificação" residual | 2 |
| SVGs (`docs/reference/diagrams`, `website/public/diagrams`) | maioria limpa (M2.3); confirmar zero CA/certificado/milestone-pipeline | 2 — novos: open-protocol-overview, operator-journey, workbench-operator-flow, protocol-governance-simple |
| `README.md` / `SECURITY.md` / docs | maioria activa (M2.3); confirmar "certification"/"qualified candidate"/"future federation governance" | 2 |
| engines (M2 gate, root-ceremony, open-governance, reference-trust-model, banzai-evidence) | Rust interno, guard-exempt | 3/4 — engines permanecem; só a UI de operador deixa de os expor por milestone; Assistente ganha intent "M2 é roadmap, não ferramenta de operador" |

## Fora de âmbito (permanece)
Engines Rust (guard-exempt, milestones são governação); rota legacy `/certificates` + `production_certificates
=false`; ADRs e PHASE reports (registo histórico); denylists/negative-tests dos guards. `/operators=[]` e
`production_certificates=false` inalterados.

## Critério de aceitação
Home/reference/capítulos/BanzAI Chat/Workbench/SVGs/README apresentam só o modelo activo; Workbench orientado
a tarefas de operador (sem M2.x, sem M2 protocol gate, default Guia/Manifest); `make public-surface-clean-check`
verde; `/operators=[]`, `production_certificates=false`, `llm_calls=0` inalterados.
