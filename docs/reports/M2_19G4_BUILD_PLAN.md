# M2.19G.4 — Build Plan & §2 Verification (evidence-grounded)

> Auto-generated from the §2 mandatory verification workflow (8 agents, file:line evidence). This is the canonical build spine for M2.19G.4. Human review gate applies before merge/deploy.

# Plano Build-Ready — M2.19G.4 (Premium Production Workspace para /banzai)

> Base: findings de verificação §2 (file:line). Nenhuma reconstrução do que já existe. Decisão de arquitectura central: **`/banzai` permanece UMA interface** (um shell, uma sessão sempre-montada, um closed-registry) mas passa a expor **contextos navegáveis como segmentos de rota reais**, com deep links resolvidos **server-side**, sem aceitar URLs arbitrárias.

---

## 1. ESTADO REAL CONFIRMADO

| Domínio | Artefacto-chave (file:line) | Estado actual | Veredicto |
|---|---|---|---|
| Rota /banzai | `website/app/banzai/page.tsx:1-42` (async, canonical, dynamic) | 1 rota, só `page.tsx`, sem subpastas | **CHANGE_GOVERNED** |
| URL→estado | `website/lib/banzaiState.ts:62-96` (parseBanzaiState, never throws) | choke-point único, SSR+cliente | **REUSE_EXTEND** |
| Seed ids fechados | `banzaiState.ts:91-93`; `banzaiValidation.ts:149-152` (isClosedId/CLOSED_ID) | slug fechado, nunca URL | **REUSE_ASIS** |
| Allowlists workflow/step/target | `banzaiValidation.ts:174-238`; `banzaiState.ts:79-83` | 9 steps, 1 target `operator-zero` | **REUSE_EXTEND** |
| Troca de modo/tab | `BanzaiAgent.tsx:191,336,356` (setMode/setActiveTool, sem router) | estado puro, URL **não** muda | **CHANGE_GOVERNED** |
| SSR first-paint + popstate | `page.tsx:24-35`; `BanzaiAgent.tsx:234-268` | popstate só sincroniza mode+view | **CHANGE_GOVERNED** |
| Guard single-interface | `tools/check-banzai-single-interface.sh:56-77` (assert #2) | proíbe subpastas sob app/banzai | **CHANGE_GOVERNED** |
| Guard no-orphan-tabs | `tools/check-banzai-no-orphan-tabs-check.sh:31-52` | painel↔tab simétricos | REUSE_ASIS (se novo painel: extend) |
| Middleware /banzai | `website/middleware.ts:18-53`; `lib/zeroSubdomain.ts:98-100` | apex-only; subdomínio→apex já cobre subpaths | **REUSE_EXTEND** |
| Sitemap/robots | `app/sitemap.ts:14-34`; `app/robots.ts:1-8` | 1 entrada `/banzai`, indexável | **REUSE_EXTEND** |
| Deep links vivos | `app/page.tsx:112`, `glossario:138`, `certificacao:285`, `decisoes/[slug]:111`, `operadorZeroStatus:104` | query-string `?mode=`/`?doc=`/`?q=` | **REUSE_ASIS (preservar)** |
| Modelo de dados onboarding | `infra/.../001_schema.sql:116-168` (session→candidates→implementations) | 3 níveis, sem self-FK | **REUSE_ASIS** |
| candidateView (contrato UI) | `services/banzai-api/src/onboarding/service.js:19-41` | shape público-seguro | **REUSE_EXTEND** (receipts/blockers fora) |
| GET candidato individual | `service.js:204-209,414-427` (getCandidateDetail exportado, **não montado**) | só lista | **REUSE_EXTEND** (só wiring) |
| Journey engine 9 passos | `services/banzai-api/src/validate.js:34-60,322-379` | sequencial, stateless, Rust decide | **REUSE_ASIS** |
| Registry fechado (Rust) | `engines/banza-target-registry/registry.rs:169-197` | 1 operador, 1 implementação | **REUSE_EXTEND (governado)** |
| useValidationSession | `website/components/banzai/validationJourney.tsx:225-260` | store cliente, 1 alvo, sem persistência | **REUSE_EXTEND** |
| Superfície validação | `BanzaiValidationMode.tsx:97-819` | Fase 0 + workspace + Resultados | **REUSE_EXTEND** |
| Runtime-truth /health | `server.js:122-157` (payload completo) | existe, **interno-only** | **REUSE_EXTEND** |
| Labels provider (BADGES) | `banzai-agent.ts:183`; `BanzaiAgent.tsx:418,686` | "Qwen local" **hardcoded** | **BUILD_NEW** |
| Telemetria /ask (pública) | `server.js:263-315`; `banzaiKb.ts:418-423` | engine_state/model_name já vêm | **REUSE_EXTEND** |

---

## 2. JÁ FEITO — NÃO RECONSTRUIR

A §9 (cluster segurança/persistência/engine) está **integralmente implementada**. Tratar como fundação read-only:

- **AuthZ + ownership em toda mutação** — `ownedCandidate`/`ownedImplementation` (`service.js:198-253`), scoped por `owner_email`. ✔
- **Isolamento de sessão** — cookie opaco `${sessionId}.${token}`, só HMAC persistido, verificação constant-time + idle(12h)/absolute(7d)/revoked em Rust (`service.js:144-164`; `engines/banzai-onboarding/lib.rs:192,210`). ✔
- **CSRF** — SameSite=Strict + allowlist de Origin (`http.js:37-41`; `routes.js:76-79`). ✔
- **Rate limiting** — per-IP in-process (40/10min) + per-email OTP DB-backed em Rust (`routes.js:70-74`; `service.js:47-70`). ✔ (caveat: per-IP não agrega entre réplicas; depende de `BANZAI_TRUST_PROXY`.)
- **Nonces single-use + expiry** — `origin_challenges.consumed_at`, replay recusado antes do fetch (`service.js:299-311,363-365`). ✔
- **SSRF/DNS-rebinding** — `banza-artifact-fetcher` (HTTPS-only, host-pin, classify-all-IPs, zero-redirect, size/encoding caps) — controlo mais forte do cluster, **não tocar** (`policy.rs:63-251`; `fetch.rs:99-214`). ✔
- **Audit append-only** — `onboarding_audit` (`store.js:14-19`). ✔
- **__Host- cookie** — Path=/, HttpOnly, SameSite=Strict, Secure, sem Domain (`config.js:30,43-49`). ✔
- **Journey engine + verdict interpreter** — Rust decide tudo; `qwen_calls/external_model_calls=0` por construção; readiness só `READY|BLOCKED`, nunca `CERTIFIED` (`validate.js:202-203`; `verdict.rs:235-290`). ✔
- **EvidenceBundle assembler** — `banza-evidence-bundle` (`not_a_certificate=true`). ✔

**Único item de segurança EM FALTA e relevante:** não há idempotency-key genérica para `createCandidate`/`createImplementation` (POST repetido cria nova linha — `service.js:174-185,222-244`). Coluna `email_challenges.request_id` existe como hook não-ligado. → **BUILD_NEW opcional** se M2.19G.4 permitir criação idempotente (baixa prioridade; os passos sensíveis OTP/origem já são replay-safe).

---

## 3. GOVERNANÇA

### ADR-070 (superveniente ao ADR-067 D-067-02) — outline

**Título:** *ADR-070 — Contextos Navegáveis na Interface Única do BanzAI (segmentos de rota fechados, resolvidos server-side)*
`decisions/adr/ADR-070-banzai-navigable-contexts-single-interface.md`

**Decisão (cláusulas):**
- **D-070-01** — `/banzai` continua a ser **a única interface humana-operador**. "Interface única" passa a significar **uma aplicação/shell coerente com uma sessão sempre-montada**, e **não** literalmente um único ficheiro de rota. Supersede a leitura "one route file" do D-067-02 (mantém o espírito: nenhuma segunda aplicação, nenhum `/banzai/validar`).
- **D-070-02** — Contextos de navegação (global → operador → implementação) podem ser expressos como **segmentos de rota reais** sob `app/banzai/`, desde que: (a) cada segmento seja um **slug fechado** validado por `isClosedId`; (b) resolva contra o **closed Technical Registry** (nunca URL/scheme/path arbitrário — mantém ADR-068 §4.4/§4.7); (c) seja resolvido **server-side** via `parseBanzaiState` antes de render (SSR sem flash); (d) partilhe a **mesma** `useValidationSession` via `layout.tsx`.
- **D-070-03** — Segmento/id desconhecido faz fallback determinístico para o contexto global (ou 404 honesto), nunca aceita conteúdo do utilizador como alvo.
- **D-070-04** — Os deep links legados `?mode=`/`?target=`/`?workflow=`/`?doc=`/`?q=`/`?view=guia` continuam válidos e resolvidos pelo mesmo choke-point; os novos segmentos são canónicos e adicionais, não substitutivos.
- **D-070-05** — **Delimitação explícita** (ver §3b): os "contextos" da UI **não são** as três camadas ADR-059..063 nem os perfis L0–L4. Vocabulário obrigatório: *contexto* (global/operador/implementação), nunca *camada* nem *nível de certificação*.

**Registry/closed-set preservado:** operator-zero-only mantém-se (ADR-053); um segundo operador real continua CHANGE_GOVERNED. `next_free_adr = ADR-070`. Após criar o ADR: **bump do range em `engines/banza-repo-guards/src/lib.rs`** (`1..=69` → `1..=70`) e re-index das superfícies de grounding do BanzAI (`gen-banzai-vocabulary`).

### Guards a actualizar (edições cirúrgicas) e como

| Guard | Ficheiro | Alteração necessária |
|---|---|---|
| single-interface **#2** | `tools/check-banzai-single-interface.sh:64-77` | Trocar "só `page.tsx`, sem subpastas" por **allowlist fechada de segmentos** (`layout.tsx`, `page.tsx`, e as pastas `operador/[operatorId]/[implementationId]`); manter proibição de `banzai/validar` (#1/#3/#4) e "BanzAI Web"/"Validation Workbench" (#5/#6). |
| single-interface **#11** | `:168-180` | Estender: **cada** `page.tsx` de segmento importa `parseBanzaiState`. |
| single-interface **#12** | `:168-180` | Se `workbenchDeepLink` passar a emitir segmento, reconciliar a asserção `/banzai?mode=validation` (ou manter query-form e adicionar helper novo `workbenchContextLink`). |
| no-orphan-tabs | `tools/check-banzai-no-orphan-tabs-check.sh:31-52` | Só se adicionar painel renderável novo (inspector/artefactos): registar tab-key correspondente em lockstep. |
| operator-validation-mode | `tools/check-banzai-operator-validation-mode-check.sh:36-52` | Se a copy §25 renomear o label/header de validação: actualizar strings exactas **+ nota no ADR-070** (cláusula §4.1 do ADR-068). |
| technical-registry-page | `tools/check-technical-registry-page.sh:30-41` | **Não introduzir** copy que apresente L0–L4 como "tiers/níveis de certificação" (linha 38 falha). Adicionar secções/links é livre. |
| workbench-navigation-orchestration | `tools/check-banzai-workbench-navigation-orchestration.sh:38-85` | Se a nav ganhar grupo de contexto: reconciliar o modelo de 2 grupos + ordem Modos→Recursos. |
| single-results-area | `tools/check-banzai-single-results-area-check.sh:27-44` | Manter **UMA** área Resultados; contextos não podem virar entradas de sidebar separadas. |
| no-arbitrary-url / closed-target-registry | `check-banzai-no-arbitrary-url-check.sh`; `check-banzai-closed-target-registry-check.sh` | **Sem edição** — os segmentos passam pelo mesmo `isClosedId`; garantir que continuam verdes. |
| operator-experience (OE1-13) | `tools/check-banzai-operator-experience.sh:40-110` | **Sem edição** desde que options/registry continuem Rust-fetched; nenhum const estático de operador reintroduzido. |
| operator-onboarding | `tools/check-operator-onboarding.sh:33-104` | **Sem edição** salvo se o path `/banzai/onboarding/` mudar (não muda). |

Guards **sem impacto** (correr para ficarem verdes, ~restantes da suite ~33 total): identity-guard, rust-rule-check, postgres-data-boundary, license-notice-governance, svg-visual-*, reference-information-architecture, public-surface-clean, semantic-regression, operator-zero-*/zero-subdomain-*.

---

## 3b. RISCO CRÍTICO — "contextos" ≠ "camadas ADR-059..063"

**Perigo real de conflação tripla.** A UI vai ter uma hierarquia de navegação **global → operador → implementação**. Isto **NÃO é**, e não pode ser apresentado como:

1. **As três camadas arquitecturais** (ADR-059..063: *protocolo BANZA* → *BanzAI* → *operadores* / the operational scheme layer). Essas são a arquitectura do ecossistema, não uma navegação de UI.
2. **Os perfis/tiers de certificação L0–L4** — o guard `check-technical-registry-page` **falha** copy que trate L0–L4 como "níveis de certificação".

**Mitigação obrigatória (copy + ADR-070 D-070-05):**
- Usar o termo **"contexto"** (contexto global / contexto do operador / contexto da implementação). **Evitar "nível" e "camada"** por completo nesta superfície.
- Nenhuma página/breadcrumb/label pode escrever "camada", "layer", "3 camadas", "L0-L4 como certificação".
- Adicionar asserção defensiva num guard (novo ou em `check-banzai-single-interface`): a copy dos contextos **não** contém `camada`/`layer`/`nível de certificação`.
- O ADR-070 declara explicitamente a delimitação face a ADR-059..063 e a ADR-065 (L0-L4).

---

## 4. MAPA DE ROTAS (Next app-router real)

Segmentos concretos sob `app/banzai/` (todos governados por ADR-070 + guard revisto):

```
app/banzai/
  layout.tsx                                   ← NOVO: client boundary; monta UMA vez o shell
                                                  + provider da useValidationSession (persiste
                                                  entre navegações de filho — layouts não
                                                  re-renderizam ao navegar entre children)
  page.tsx                                      ← contexto GLOBAL (existente, adaptado):
                                                  lê searchParams (?mode/?target/?doc/?q/?view)
                                                  → parseBanzaiState → initialState
  operador/
    [operatorId]/
      page.tsx                                  ← contexto OPERADOR
      [implementationId]/
        page.tsx                                ← contexto IMPLEMENTAÇÃO
```

**Resolução server-side (cada page.tsx de segmento):**
1. `const { operatorId, implementationId } = await params;` + `const sp = await searchParams;`
2. **Validação closed-shape**: `isClosedId(operatorId)` / `isClosedId(implementationId)` (`banzaiValidation.ts:149-152`). Falha → fallback contexto global (D-070-03) ou `notFound()`.
3. Resolver contra o registry: server component chama o mesmo caminho de `resolveTarget`/`mapCatalogueToOperators`; id ausente do registry vivo → `null` → fallback. **Nunca** aceita o id como conteúdo (mantém ADR-068 §4.6).
4. `parseBanzaiState` **estendido** para aceitar `pathSeed` (operatorId/implementationId dos segmentos) além de query — continua a ser o choke-point único (satisfaz guard #11). Precedência: segmento > query.
5. Passa `initialState` a `<BanzaiAgent>` (via layout/provider). **SSR first-paint sem flash**, sobrevive a refresh/nova aba/URL partilhada (igual a hoje, `page.tsx:24-35`).

**Back/forward (resolvido pela mudança arquitectural):**
- Navegação entre contextos passa a usar `<Link>`/`router.push` do app-router → cria entrada de histórico e re-executa o server component do filho, **mantendo o `layout.tsx` (e a sessão) montado**. Back/forward passam a funcionar nativamente para contexto — resolve a lacuna actual (`BanzaiAgent.tsx:234-244` só sincronizava mode+view).
- Troca de **modo/tab** (ask/validation/onboarding, assistente/guia/…) **continua estado puro sem escrita de URL** (preserva `BanzaiAgent.tsx:191,336,356` e o guard). Só a mudança de **contexto operador/implementação** escreve URL.
- Estender o handler popstate para o caso de o utilizador voltar de um deep link `?mode=` legado (mode+view já cobertos; adicionar target/impl se vier por query).

**Redirects / compat das rotas antigas `?mode=`:**
- **Não quebrar nada:** `/banzai` mantém o handling de `?mode=/?target=/?workflow=/?step=/?doc=/?q=/?view=guia` via `parseBanzaiState` — os 6 deep links vivos (§ finding routing) continuam a funcionar **sem redirect**.
- **Canonicalização opcional (não-quebradora):** quando `?target=` resolve a um operador conhecido, o server pode emitir um redirect 307/308 para o segmento canónico `/banzai/operador/<id>[/<impl>]` preservando restante query. Manter os antigos como aliases permanentes.
- **Middleware:** o redirect subdomínio→apex já cobre `/banzai/` e `/banzai?` (`zeroSubdomain.ts:98-100`) — os novos subpaths são reencaminhados automaticamente; **sem edição** no middleware.
- **Sitemap:** adicionar entradas indexáveis se os contextos forem SEO-relevantes (`app/sitemap.ts:14-34`); guard #7 só proíbe `banzai/validar`. Recomendação: manter só `/banzai` no sitemap (contextos operador/implementação são estados de sessão, não conteúdo canónico) para evitar diluição.

---

## 5. ÁRVORE DE COMPONENTES

### Reutilizar (as-is / estender)
- **`useValidationSession`** (`validationJourney.tsx:225-260`) — mover a instância para o **provider no `layout.tsx`** (montada uma vez). Hoje é hardwired a 1 `(operatorId, implementationId)`; para contexto multi-implementação, **re-seed via `select(operator, impl)`** quando o segmento muda (não instanciar N vezes; um store keyed pelo alvo activo). **REUSE_EXTEND**.
- **`resolveTarget`/`resolveOperatorIn`/`mapCatalogueToOperators`** (`banzaiValidation.ts:110-194`) — reutilizar para resolver segmentos server-side. **REUSE_ASIS**.
- **`STEPS`/`STEP_META`/`STATUS_LABEL_PT`** (`validationJourney.tsx:39-162`) — inalterados. **REUSE_ASIS**.
- **`ValidationContextPanel`** (`BanzaiValidationMode.tsx:511-597`) — base do inspector contextual colapsável. **REUSE_EXTEND**.
- **`fetchRegistry`/`fetchOptions`/`validateStepRequest`/`validateJourneyRequest`** (`banzaiValidateClient.ts:14-157`) — inalterados. **REUSE_ASIS**.
- **`banzaiOnboardingClient.ts`** + `BanzaiOnboardingMode.tsx` — inalterados na lógica; só copy §25. **REUSE_EXTEND**.
- **`Server*Receipt` + `downloadReceipt`** (`operationReceipt.ts:24-88,231-244`) — inalterados. **REUSE_ASIS**. (Não confundir com as shapes legadas browser-built `:91-227`.)
- **`Ico`/`CARD`** (`banzaiUi.tsx`) — estender `PATHS` se surgir ícone novo. **REUSE_EXTEND**.

### Criar (BUILD_NEW)
- **`app/banzai/layout.tsx`** — client boundary com o provider da sessão + shell chrome; garante sessão sempre-montada entre contextos.
- **Páginas de contexto** — `operador/[operatorId]/page.tsx`, `.../[implementationId]/page.tsx` (server components finos: resolvem + delegam ao shell).
- **Vista GLOBAL** (overview de registry) — reutiliza `mapCatalogueToOperators`; lista operador-zero + estado honesto vazio.
- **Vista OPERADOR** — cartão do operador + suas implementações (do `candidateView`/registry); ligação para cada implementação.
- **Vista IMPLEMENTAÇÃO** — reusa `BanzaiValidationMode` workspace inteiro (`:335-486`) + Resultados (`:620-818`).
- **Inspector contextual colapsável** — evolução do `ValidationContextPanel`: progresso/próxima acção/bloqueios/endpoint/evidência, colapsável, partilhado entre contextos.
- **Superfície de Artefactos** — hoje `receipts/blockers` **não têm read-path** no `candidateView` (`service.js:28-39`). Para os mostrar em refresh: **estender `candidateView`** (dados já persistidos em `store.js:192-199`) **+ montar `GET /onboarding/candidate/:id`** (função `getCandidateDetail` já existe e exportada, `service.js:204-209` — só wiring em `routes.js`).
- **Componente de runtime-truth derivado** (ver §7 fase runtime-truth) — substitui BADGES/footer hardcoded.

**Persistência de runs de validação:** hoje **efémera** (React state, `validationJourney.tsx:287-330`). Se M2.19G.4 exigir runs resumíveis por implementação → **BUILD_NEW** (nova tabela Postgres, template = padrão `onboarding/store.js`: SQL parametrizado, HMAC-only, boundary ADR-042) → **CHANGE_GOVERNED** (novo ADR + bump repo-guards). Recomendação: manter efémero na v1 do G.4 salvo requisito explícito.

---

## 6. MAPA DE COPY §25 (de → para)

| # | Actual (file:line) | Tipo | Acção |
|---|---|---|---|
| 1 | "Validar operador" (`banzai-agent.ts:75`, +`:115`, +`BanzaiValidationMode.tsx:668`, +`BanzaiOnboardingMode.tsx:459`) | Label MODE primário | **GOVERNADA** — editar guard `operator-validation-mode` + nota ADR-068 §4.1; 3+ call-sites em lockstep |
| 2 | "Onboarding de operador" (`banzai-agent.ts:79`, +`:133`, +`:135`) | Label MODE primário | **Livre** (nenhum guard dedicado); 3 call-sites |
| 3 | "Submeter novo operador" (`banzai-agent.ts:142`; `BanzaiOnboardingMode.tsx:178,292`) | Título path card | **Livre** |
| 4 | "Emitir desafio de origem" (`BanzaiOnboardingMode.tsx:443`, **hardcoded inline**) | CTA primário | **Livre** — editar JSX directamente (não está em constants) |
| 5 | "candidatura"/"candidaturas" (`banzai-agent.ts:136,138,143,166`; `BanzaiOnboardingMode.tsx:267,280,284,300`) | Vocabulário pervasivo | **Livre** — manter a **substância** das cláusulas de neutralidade ("uma candidatura não é operador publicado") |
| 6 | `ORIGIN_PENDING`→"Origem por verificar" (`BanzaiOnboardingMode.tsx:27,37`) | Enum→label PT | **GOVERNADA (dados)** — o token cru é KEEP (enum backend); mudar só o VALUE do mapa `:27/:37`, nunca a KEY |
| 7 | `{st.status} · {STATUS_LABEL_PT}` (`BanzaiValidationMode.tsx:431`; bare `:749`) | Código+label | **Livre** — nota: vocabulário é VERIFIED/FAILED/BLOCKED, **não "PASS"** |
| 8 | VALIDATION_COPY header "Validação técnica de implementação" (`banzai-agent.ts:116`) | Header | **GOVERNADA** (guard operator-validation-mode) |
| 9 | "PASS é evidência técnica…" (`AUTHORITY_COPY.passIsEvidence`, `banzai-agent.ts:190`) | Boundary | **KEEP** — asserção unit-testada (`banzai-agent.test.ts:91`) |
| 10 | Certification block "…nunca devolve CERTIFIED (ADR-068 §4.10)" (`BanzaiValidationMode.tsx:476-479`) | Garantia | **KEEP** substância (NOT_CERTIFIED) |
| 11 | BADGES "Motor por omissão: Qwen local" (`banzai-agent.ts:183`) | Chip provider | **BUILD_NEW** derivado (ver §7); actualizar assert `banzai-agent.test.ts:76-78` |
| 12 | "Fase 0 · contexto" / "Fase 0 · onboarding" (`BanzaiValidationMode.tsx:105`; `BanzaiOnboardingMode.tsx:152`) | Chip | **Livre** — evitar "camada"/"nível" (§3b) |
| 13 | Boundary shell "não aprova, não certifica…" (`banzai-agent.ts:42-43`) | Neutralidade | **KEEP** substância |

**Regra transversal §3b para toda a copy nova:** usar **"contexto"**, banir **"camada"/"layer"/"nível de certificação"**; não apresentar L0-L4 como tiers.

---

## 7. PLANO FASEADO (commit-a-commit até READY-FOR-REVIEW)

Execução contínua (memória: cada prompt corre até merge+deploy+QA). Commits/sessões = checkpoints, nunca gates. Esforço em dias-engenheiro é indicativo.

**Fase 0 — Governança (bloqueia tudo).** ~0.5d.
`decisions/adr/ADR-070-…md` (D-070-01..05, delimitação §3b explícita) → bump `engines/banza-repo-guards/src/lib.rs` `1..=69→1..=70` → re-index grounding (`gen-banzai-vocabulary`, concept.rs se necessário). **Dep:** nenhuma. **Commit 1.**

**Fase 1 — Guards primeiro (falham a build até rotas existirem — ordem intencional).** ~0.5d.
Rever `check-banzai-single-interface.sh` (#2 allowlist de segmentos, #11 multi-page, #12 deep-link) + asserção anti-"camada"/"nível". **Dep:** F0. **Commit 2.**

**Fase 2 — Rotas + estado.** ~1.5d.
`parseBanzaiState` aceita `pathSeed` (`banzaiState.ts`) → `app/banzai/layout.tsx` (provider sessão única) → `operador/[operatorId]/page.tsx` + `[implementationId]/page.tsx` (resolução server-side + `isClosedId` + fallback). Verificar `make banzai-single-interface-check` passa. **Dep:** F1. **Commits 3-5.**

**Fase 3 — Páginas de contexto (global/operador/implementação).** ~2d.
Vista global (registry overview) → vista operador (candidateView + implementações; montar `GET /onboarding/candidate/:id`, estender `candidateView` com receipts/blockers) → vista implementação (reusar BanzaiValidationMode workspace+Resultados). **Dep:** F2. **Commits 6-9.**

**Fase 4 — Inspector contextual colapsável + superfície de artefactos.** ~1.5d.
Evoluir `ValidationContextPanel`; wiring no-orphan-tabs se novo painel. **Dep:** F3. **Commits 10-11.**

**Fase 5 — Runtime-truth §24.** ~1d.
Substituir BADGES/footer/estado hardcoded por label **derivado da telemetria /ask** (`o.engine_state`/`o.local_model_name`/`o.external_model_called`, `banzaiKb.ts:418-423`) com label neutro pré-primeiro-ask; actualizar assert `banzai-agent.test.ts:76-78`. **Opcional (CHANGE_GOVERNED):** expor `/banzai/runtime` público read-only (nginx `banza.conf` + catch-all) para first-paint correcto — decidir vs. derivar-de-/ask. Recomendo derivar-de-/ask (sem novo endpoint, sem furar boundary interno). Tocar prose estática `estado/page.tsx:26`, `roteiro/page.tsx:31`, `banzai/page.tsx:20`. **Dep:** independente de F2-4. **Commits 12-13.**

**Fase 6 — Copy §25.** ~1d.
Aplicar mapa §6 (governadas → guard+ADR nota; livres → JSX/constants). **Dep:** F1 (guards). **Commit 14.**

**Fase 7 — Migração / redirects.** ~0.5d.
Confirmar 6 deep links legados intactos; canonicalização opcional 307 `?target=`→segmento; sitemap decisão. **Dep:** F2. **Commit 15.**

**Fase 8 — Suite completa de guards (~33) verde.** ~0.5d.
`make identity-check` + rust-rule + single-interface + no-orphan-tabs + operator-experience + technical-registry + single-results-area + no-arbitrary-url + closed-target-registry + workbench-navigation + operator-onboarding + postgres-boundary + license/governance + svg-* + semantic-regression. **Dep:** F2-6. **Commit 16.**

**Fase 9 — Testes.** ~2d.
- **E2E (~30):** navegação global→operador→implementação; back/forward preserva sessão; refresh/nova aba/URL partilhada; deep links legados `?mode=/?doc=/?q=/?view=guia`; segmento id inválido→fallback; jornada 9 passos por implementação; runtime-truth reflecte /ask; Operador Zero NOT_CERTIFIED honesto (qwen/external=0).
- **Unit/route:** `parseBanzaiState` com pathSeed; resolução de segmentos; `GET /candidate/:id`.
- **AuthZ/isolation:** contexto de operador alheio → not_found; sessão email-scoped.
- **a11y/responsive:** inspector colapsável, breadcrumbs de contexto, mobile.
**Dep:** F2-6. **Commits 17-19.**

**Fase 10 — Screenshots + build/deploy + live-QA + PR.** ~1d.
Build website (fresh wasm-pack antes de commit), deploy VPS (`sudo git pull` — repo root-owned), public-edge QA (pacing ≥3.2s por rate-limit), screenshots dos 3 contextos, abrir PR (branch protection → `gh pr merge --admin`). **Dep:** todas. **Commits 20-21 → READY-FOR-REVIEW.**

**Esforço total realista:** ~13-15 dias-engenheiro. **Caminho crítico:** F0→F1→F2→F3 (governança + rotas + páginas são serialmente dependentes); F5 (runtime-truth) e F6 (copy) paralelizáveis. **Maior risco de esforço:** F3 (mover a sessão para layout provider sem perder o always-mounted invariant) e F9 E2E de back/forward. **Gate humano §26** provável antes de deploy (padrão do ecossistema para mudanças de superfície pública): flags/rotas ficam adicionais e não-quebradoras até aprovação.

---

## Appendix — raw §2 verification findings (per cluster)

```json
[
  {
    "area": "BanzAI ROUTING + STATE + single-interface constraint (current real state, for M2.19G.4)",
    "findings": [
      {
        "item": "The /banzai route (single route, no subfolders)",
        "current_state": "There is exactly ONE route: an async Server Component at website/app/banzai/page.tsx. app/banzai/ contains ONLY page.tsx — no layout.tsx, no subfolders, no other files. The retired parallel route /banzai/validar was removed. The page reads searchParams (a Promise in this Next version), runs parseBanzaiState(sp), and renders <BanzaiAgent initialState={state}/> plus an sr-only <h1>. It exports metadata with alternates.canonical = '/banzai'. Reading searchParams opts the page into dynamic rendering (per its own comment). There is NO ?mode= route-splitting — mode/target/workflow/step/view/doc/q are all query params on the same single route.",
        "evidence": "website/app/banzai/page.tsx:1-42 (async fn 29-42, canonical 21, dynamic-render comment 24-28); ls app/banzai/ shows only page.tsx (no layout, no subdirs)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "A 'routes-per-level' change (e.g. per-step or per-mode folders) directly conflicts with the single-interface guard assertions #1/#2 (no subfolders, page.tsx only) — see the guard finding. Any new route folder trips CI."
      },
      {
        "item": "URL-state contract — parseBanzaiState",
        "current_state": "website/lib/banzaiState.ts exports parseBanzaiState(sp) -> BanzaiState. It NEVER throws; every field resolves against a closed allowlist and falls back to a safe default. Modes are BanzaiMode = 'ask' | 'validation' | 'onboarding' (resolveMode: 'validation'->validation, 'onboarding'->onboarding, else 'ask'; default 'ask'). Fields returned: mode, target (ValidationTarget, always real), targetKnown (bool), workflow (ValidationWorkflow), step (ValidationStepId|null), view ('guia'|null), initialOperatorId (string|null), initialImplementationId (string|null). Recognised query params: mode, target, workflow, step, view, implementation (and separately, client-side, q + doc). first() collapses array params to their first element.",
        "evidence": "website/lib/banzaiState.ts:22-23 (BanzaiMode), 52-56 (resolveMode), 62-96 (parseBanzaiState), 65-70 (raw params incl. implementation)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "This is the single choke point that maps URL->state and is read BOTH server-side (page.tsx first paint) and is safe client-side. A per-level routing change should keep flowing through here so SSR + guard #11 (page imports parseBanzaiState) stay satisfied."
      },
      {
        "item": "Seed ids + closed-shape id handling",
        "current_state": "Fase 0 seed ids are shape-validated, never trusted as content. initialOperatorId = (targetKnown && isClosedId(target.id)) ? target.id : null. initialImplementationId = (initialOperatorId && isClosedId(rawImplementation)) ? rawImplementation : null. isClosedId(v) tests CLOSED_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/ — a lowercase slug ONLY, never a URL/path/scheme (ADR-068 §4.7). target resolution: resolveTarget(rawTarget) against the closed VALIDATION_TARGETS map; unknown/off-list -> null, then falls back to VALIDATION_TARGETS[DEFAULT_TARGET_ID] ('operator-zero') and records targetKnown=false. The operator LIST itself is no longer a static client map — it is fetched at runtime from GET /banzai/validate/registry; seeds are re-resolved against the fetched list in the session (a seed absent from the live registry resolves to null).",
        "evidence": "website/lib/banzaiState.ts:75-77 (target fallback), 91-93 (seed ids); website/lib/banzaiValidation.ts:149-152 (CLOSED_ID/isClosedId), 34-44 (VALIDATION_TARGETS single key + DEFAULT_TARGET_ID), 191-194 (resolveTarget), 110-145 (mapCatalogueToOperators runtime fetch)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "SSRF/path-traversal/injection are impossible by construction: no caller-supplied URL is ever accepted; only closed slugs pass. Any new route param must go through isClosedId/closed allowlists to keep this invariant."
      },
      {
        "item": "Closed allowlists — workflow, step, target registry",
        "current_state": "VALIDATION_WORKFLOWS = ['full', + 9 step ids]; resolveWorkflow -> 'full' if off-list. VALIDATION_STEP_IDS = the 9 ordered steps: discovery, manifest, keys, conformance, interoperability, trust, federation, evidence, certification; resolveStep -> null if off-list (incl. 'full'). In parseBanzaiState, step = resolveStep(rawStep) ?? resolveStep(rawWorkflow) — so a step-shaped ?workflow= also seeds the step; 'full'/off-list -> null (shell starts at discovery). VALIDATION_TARGETS has exactly one key 'operator-zero' (artifacts_base https://zero.banza.network, environment 'demo', demo_only true). workbenchDeepLink(targetId, workflow) returns `/banzai?mode=validation&target=…&workflow=…`; workbenchDeepLinkAbsolute prefixes https://banza.network.",
        "evidence": "website/lib/banzaiValidation.ts:174-201 (workflows/resolveWorkflow), 203-223 (step ids/resolveStep), 34-44 (targets), 225-238 (workbenchDeepLink/Absolute); banzaiState.ts:79-83 (step derivation)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Guard #8 pins exactly 9 canonical step ids; guard #10 pins exactly one target key = operator-zero; guard #12 pins workbenchDeepLink shape. A routes-per-level scheme must map to these same closed step/workflow ids."
      },
      {
        "item": "How BanzaiAgent switches modes/tabs (pure state, NO route change)",
        "current_state": "website/components/banzai/BanzaiAgent.tsx is a client component. Mode is pure React state: const [mode,setMode]=useState(initialState.mode). Switching mode (renderMode onClick -> setMode(m.mode); if ask -> setActiveTool('assistente')) and switching ask-mode tabs (renderTab onClick -> setMode('ask'); setActiveTool(t.key)) are PURE state — there is NO history.pushState/replaceState, NO router.push, NO useRouter, NO redirect anywhere in components/banzai/** or app/banzai/** (verified by grep). Consequence: switching mode/tab does NOT change the URL and creates NO history entry, so browser Back does not undo an in-app mode/tab switch. activeTool is a WbTab ('assistente'|'guia'|'rfc'|'programadores'|'resultados'); 'assistente' = the ask conversation workspace, the others are ask-mode panels via renderPanel(). The validation session (useValidationSession) is ALWAYS mounted (even in ask mode) so switching modes never loses selection/progress/receipts. onboarding mode renders BanzaiOnboardingMode.",
        "evidence": "website/components/banzai/BanzaiAgent.tsx:191 (mode state), 336 (renderTab setMode/setActiveTool), 356 (renderMode setMode), 318-326 (renderPanel switch), 197-202 (always-mounted session), 441-444 (onboarding); grep for pushState/replaceState/router.push/useRouter/redirect in components/banzai + app/banzai = none",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "KEY CONSTRAINT for M2.19G.4: today one URL serves all modes/tabs and the URL never updates on switch. A 'routes-per-level' design that wants deep-linkable/back-navigable levels must ADD URL writes (pushState or router) that currently do not exist — while preserving the always-mounted single session and the single-interface guard."
      },
      {
        "item": "SSR first-paint + back/forward behaviour",
        "current_state": "First paint: page.tsx (server) resolves initialState via parseBanzaiState before render, so the correct mode/step renders server-side with no flash and no hydration divergence, and survives refresh / new tab / shared URL. Back/forward: a popstate useEffect re-reads window.location.search and sets ONLY mode (validation vs ask) and activeTool (guia vs assistente) — it does NOT re-sync target/workflow/step/onboarding/implementation on popstate. A hashchange useEffect focuses the ask input on #perguntar/#assistente/#agent. A mount useEffect prefills the ask textarea from ?q= and stashes ?doc= (ADR/RFC id regex) for the first ask(). Because in-app switches write no history, popstate only ever fires for entries created by external navigation/deep-links.",
        "evidence": "website/app/banzai/page.tsx:24-35 (server-side state, no-flash comment); website/components/banzai/BanzaiAgent.tsx:234-244 (popstate syncs only mode+view), 214-231 (hashchange focus), 246-268 (?q=/?doc= prefill)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "popstate currently drops target/workflow/step/onboarding — a routes-per-level change that makes those back/forward-navigable must extend this handler (or move to the router) to avoid stale state on Back."
      },
      {
        "item": "Single-interface guard (tools/check-banzai-single-interface.sh) — exact assertions",
        "current_state": "M2.19E/F.2, ADR-067. FAILS the build (exit 1) on any of 12 assertions, plus a self-test. (1) no app/banzai/validar folder. (2) app/banzai/ has NO route subfolders AND contains ONLY page.tsx (any other file/subdir fails) — this is the 'only page.tsx may exist' rule. (3) literal 'banzai/validar' appears NOWHERE in middleware.ts, next.config.*, or app/** (comments included). (4) no 'banzai/validar' or 'ValidationWorkbench' link/import in website/** (excl. /wasm/). (5) retired brand 'BanzAI Web' absent from website .ts/.tsx (excl. .test + wasm), docs/** (excl. reports), decisions/** (excl. archival ADR-067 file), and public/diagrams/*.svg. (6) 'Validation Workbench' product name absent from active website source. (7) sitemap does not list banzai/validar. (8) VALIDATION_STEP_IDS = exactly the 9 canonical ids. (9) no legacy 7-step markers (JOURNEY_STEPS|0/7|7 etapas|journeyLength) under components/banzai/**. (10) VALIDATION_TARGETS has exactly one key = operator-zero. (11) page.tsx imports parseBanzaiState from @/lib/banzaiState. (12) workbenchDeepLink returns a /banzai?mode=validation link. Prereq files: page.tsx, banzaiValidation.ts, banzaiState.ts, sitemap.ts.",
        "evidence": "tools/check-banzai-single-interface.sh:56-77 (assertions 1-2, single-route/only-page.tsx), 82-97 (3-4), 99-128 (5-7), 130-166 (8-10), 168-180 (11-12), 182-194 (self-test)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "HARD BLOCKER for routes-per-level: assertion #2 (no subfolders, page.tsx only) forbids adding any app/banzai/<level>/ route folder. Wired in Makefile target banzai-single-interface-check (Makefile:417-419) and CI job 'banzai-single-interface' (.github/workflows/identity-guard.yml:231-237). If M2.19G.4 adds routes, this guard must be revised under governance (ADR)."
      },
      {
        "item": "No-orphan-tabs guard (tools/check-banzai-no-orphan-tabs-check.sh)",
        "current_state": "M2.19G.1, ADR-068 §29. Extracts the renderPanel() switch body from BanzaiAgent.tsx and every 'case \"x\"' label; requires each label to be a sidebar tab key (grep 'key:\"...\"' from banzai-agent.ts) OR the literal 'assistente' (the ask workspace). Also asserts NO renderable panel for a retired analyser: case matching (trust|simb|manifest|conformidade|conformance|evidence|traces|receipts) must not exist. Current renderPanel() cases = guia, rfc, programadores, resultados (default null) — all present in TABS, so it passes.",
        "evidence": "tools/check-banzai-no-orphan-tabs-check.sh:31-52; website/components/banzai/BanzaiAgent.tsx:318-326 (renderPanel cases); website/components/banzai/banzai-agent.ts:96-101 (TABS keys)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Wired: Makefile:643-645 and CI job 'banzai-no-orphan-tabs' (identity-guard.yml:1172-1178). Any new renderable panel added for a routes-per-level view must get a matching sidebar tab key or it fails."
      },
      {
        "item": "Middleware / host routing for /banzai (website/middleware.ts + lib/zeroSubdomain.ts)",
        "current_state": "middleware.ts is a thin wrapper over the pure, unit-tested resolveZeroRoute(host, pathname, search). On the apex (banza.network) /banzai is a strict pass-through (decision 'next'). On the dedicated subdomain zero.banza.network, ANY /banzai path — exactly '/banzai', '/banzai/...', or '/banzai?...' — returns a 307 redirect to https://banza.network<pathname><search>. So /banzai (and every query-string variant) is APEX-ONLY; the subdomain only links to it. Matcher runs on everything except _next/static, _next/image, favicon.ico, robots.txt, sitemap.xml. No storage/DB/secrets — routing only. (The subdomain also rewrites '/' -> /oz and *.json -> /oz/*.json; /operador-zero is 410 Gone on every host.)",
        "evidence": "website/middleware.ts:18-53; website/lib/zeroSubdomain.ts:72-104 (resolveZeroRoute), 98-100 (/banzai -> apex redirect preserving search)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "The subdomain->apex /banzai redirect uses startsWith('/banzai/') and '/banzai?' — it already covers sub-paths, so if routes-per-level introduces /banzai/<level> the existing redirect keeps forwarding them to the apex. Nothing else in middleware special-cases /banzai."
      },
      {
        "item": "Sitemap + robots handling of /banzai",
        "current_state": "sitemap: app/sitemap.ts lists '/banzai' as a single static entry in ROUTES (priority 0.7, changeFrequency monthly) — no mode/step/query variants; reference chapters are appended separately. robots: app/robots.ts allows all ('/', userAgent '*') and points at https://banza.network/sitemap.xml — /banzai is NOT disallowed and has no noindex. Both robots.txt and sitemap.xml are excluded from the middleware matcher.",
        "evidence": "website/app/sitemap.ts:14-34 (ROUTES incl. '/banzai'); website/app/robots.ts:1-8; website/middleware.ts:52 (matcher excludes robots.txt/sitemap.xml)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "If routes-per-level creates real indexable sub-routes, sitemap ROUTES would need entries; today only the single /banzai URL is advertised. Single-interface guard #7 only forbids 'banzai/validar' in the sitemap — it does not forbid adding other /banzai entries."
      },
      {
        "item": "Existing /banzai deep-links that any routing change must preserve",
        "current_state": "Live internal deep-links to /banzai across the site: home hero CTA /banzai?mode=validation (app/page.tsx:112); glossary /banzai?mode=validation&target=operator-zero&workflow=full (app/glossario/page.tsx:138); certificacao page same full-journey link (app/certificacao/page.tsx:285); operadorZeroStatus evidence_ref /banzai?mode=validation&target=operator-zero&workflow=certification (lib/operadorZeroStatus.ts:104); decisoes -> /banzai?doc=<ADR>&q=<prompt> (app/decisoes/[slug]/page.tsx:111 and components/decisoes/DecisionsExplorer.tsx:192); and the legacy /banzai?view=guia. Programmatic builders: workbenchDeepLink / workbenchDeepLinkAbsolute (banzaiValidation.ts:225-238).",
        "evidence": "grep '/banzai?' across website: app/page.tsx:112, app/glossario/page.tsx:138, app/certificacao/page.tsx:285, app/decisoes/[slug]/page.tsx:111, components/decisoes/DecisionsExplorer.tsx:192, lib/operadorZeroStatus.ts:104, lib/banzaiValidation.ts:232",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "A routes-per-level change must keep these query-string deep-links working (or add redirects), and keep the ?doc= + ?q= ask prefill path and ?view=guia intact — these are consumed client-side in BanzaiAgent (lines 234-268), not in parseBanzaiState."
      }
    ]
  },
  {
    "area": "DATA MODEL + PERSISTENCE — onboarding candidate/session/implementation model (M2.19G.3/3A/3B, ADR-069)",
    "findings": [
      {
        "item": "Three-level hierarchy: session(email) → candidates(operator) → candidate_implementations",
        "current_state": "The model is exactly three tiers. candidate_sessions binds an opaque cookie to an email_normalized. candidates is the operator-candidate row (owner_email, operator_name, institutional_name, state). candidate_implementations FK-references candidates(candidate_id) and holds the per-implementation fields. origin_challenges FK-references a candidate_implementation. There is no fourth level and no cross-linking beyond these FKs.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:116-168 (candidate_sessions, candidates, candidate_implementations FK line 140, origin_challenges FK line 158)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "This is the canonical visible-domain model the new UI reads."
      },
      {
        "item": "NO self-FK — an operator (candidate) cannot contain another operator",
        "current_state": "candidates has no parent_candidate_id / self-reference of any kind. The ONLY foreign key touching candidates is candidate_implementations.candidate_id REFERENCES candidates(candidate_id). A candidate can therefore contain implementations but never another candidate. Confirmed by grep: the only 'REFERENCES candidates' occurrence is the implementations FK.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:126-136 (candidates has columns candidate_id, owner_email, operator_name, institutional_name, state, timestamps, published_operator_id — no self-FK); line 140 is the sole REFERENCES candidates",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Nesting is impossible by schema. New UI can safely render a flat operator→implementations tree."
      },
      {
        "item": "One email/session owns MANY candidates (no per-email cap, no upsert, no dedup)",
        "current_state": "owner_email is a plain (non-unique) column with a lookup index candidates_owner_idx. insertCandidate always mints a fresh UUID and inserts a new row — there is no upsert and no per-owner limit. listCandidatesByOwner returns ALL rows for owner_email ordered by last_activity_at DESC. createCandidate/listCandidates operate on session.email. So one email → N candidates, each → M implementations.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:128,136 (owner_email column + candidates_owner_idx); services/banzai-api/src/onboarding/store.js:112-133 (insertCandidate new uuid, listCandidatesByOwner); services/banzai-api/src/onboarding/service.js:174-195 (createCandidate/listCandidates)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "No UNIQUE constraint on operator_name or on canonical_domain either — the same email can create duplicate-named operators and duplicate-domain implementations; nothing dedups."
      },
      {
        "item": "Session↔candidate link is the EMAIL, not the session id",
        "current_state": "candidate_sessions stores email_normalized; candidates stores owner_email. The ownership gate compares c.owner_email !== session.email (never session_id). Any valid session for a given email sees exactly that email's candidates, so multiple concurrent sessions/devices for one email share the same candidate set.",
        "evidence": "services/banzai-api/src/onboarding/service.js:198-202 (ownedCandidate: c.owner_email !== session.email); service.js:150-164 (authenticate returns {sessionId, email})",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "State persists fully in Postgres — nothing in memory; refresh re-reads DB",
        "current_state": "There is no in-memory session/candidate store. The browser holds only an opaque cookie value `${sessionId}.${token}`; server stores only session_hash (HMAC) — the token is never persisted. Per request, authenticate() looks up candidate_sessions by session_id and Rust verifies token vs hash + idle/absolute expiry + revoked_at, touching last_seen_at. Candidate/implementation progress lives in durable columns candidates.state, candidate_implementations.origin_verification_state / validation_state / receipts / blockers. On refresh the UI re-reads via GET /onboarding/session and GET /onboarding/candidates. Connection is via a pg Pool as role banzai_rw.",
        "evidence": "services/banzai-api/src/onboarding/db.js:14-41 (pg Pool, query); service.js:144-164 (authenticate), 119-132 (session issue in a withTransaction); store.js:103-105 (touchSession); routes.js:128-147 (/session, /candidates)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Session TTLs (idle + absolute) enforced in Rust; expires_at/last_seen_at/revoked_at are the persisted controls."
      },
      {
        "item": "candidateView() — exact public-safe shape the UI receives",
        "current_state": "candidateView returns: candidate_id, operator_name, institutional_name|null, state, created_at, last_activity_at, published_operator_id|null, and implementations[] where each item = {candidate_implementation_id, implementation_name, canonical_domain, expected_protocol_version|null, expected_profile|null, expected_environment|null, origin_verification_state, validation_state}. This is the object returned by createCandidate, listCandidates and getCandidateDetail.",
        "evidence": "services/banzai-api/src/onboarding/service.js:19-41",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "This is the authoritative contract the new UI binds to."
      },
      {
        "item": "receipts, blockers, owner_email, updated_at, description, published_implementation_id are DELIBERATELY NOT in candidateView",
        "current_state": "The candidate_implementations table stores receipts jsonb, blockers jsonb, description, published_implementation_id, updated_at, and candidates stores owner_email/updated_at — but candidateView omits all of them. The origin receipt is only ever returned inline in the verifyOrigin response (result.receipt), never re-surfaced through the candidate list. So a UI that wants to show receipts/blockers per implementation currently has NO read path for them.",
        "evidence": "services/banzai-api/src/onboarding/service.js:28-39 (impl mapping omits receipts/blockers/published_implementation_id/description); service.js:347-369 (receipt only returned inline from verifyOrigin); store.js:192-199 (updateImplementationValidation persists receipts/blockers)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "If M2.19G.4 needs to display receipts/blockers/validation history on refresh, candidateView must be extended (and the persisted data already exists to do so)."
      },
      {
        "item": "No single-candidate GET route — getCandidateDetail is exported but NOT mounted",
        "current_state": "service.js exports getCandidateDetail (ownership-checked, returns candidateView with implementations), but routes.js dispatch has no GET for an individual candidate. The only candidate reads are GET /onboarding/candidates (full list) and GET /onboarding/session. Mutations: POST /onboarding/candidate (create), /candidate/abandon, /candidate/reconcile, /implementation, /origin/challenge, /origin/verify.",
        "evidence": "services/banzai-api/src/onboarding/service.js:204-209,414-427 (getCandidateDetail defined+exported); services/banzai-api/src/onboarding/routes.js:143-248 (routes: /candidates list only, no /candidate/:id GET)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Today the UI must fetch the whole list and pick client-side. A detail route would only need wiring — the service function already exists."
      },
      {
        "item": "Candidate lifecycle state values + transitions (Rust-owned)",
        "current_state": "Persisted candidates.state is a free-text column defaulting to 'DRAFT'; valid states are enumerated in Rust: EMAIL_PENDING, EMAIL_VERIFIED, DRAFT, ORIGIN_PENDING, ORIGIN_VERIFIED, VALIDATING, BLOCKED, VALIDATION_COMPLETED, PUBLICATION_ELIGIBLE, PUBLISHED, EXPIRED. Transitions are decided only by the Rust engine (candidate_transition_json); TypeScript never mutates state directly except by writing the Rust-returned next_state. abandon fires event 'expired' → EXPIRED (allowed from any state). reconcile drives validation_started→validation_completed→publication_eligible→published.",
        "evidence": "engines/banzai-onboarding/src/lib.rs:33-47 (states), 224-240 (transition table incl. (_,\"expired\")→EXPIRED); services/banzai-api/src/onboarding/service.js:211-219 (abandon), 378-412 (reconcile drives the chain)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "candidates.state and candidate_implementations.origin_verification_state/validation_state have NO DB CHECK constraint (unlike operators.status line 30) — integrity is enforced solely by the Rust state machine."
      },
      {
        "item": "candidate_implementations fields the visible-domain model exposes",
        "current_state": "Per implementation: implementation_name, description, expected_protocol_version, expected_profile, expected_environment (all three validated on write against the canonical Rust registry option sets — fecho por omissão, 400 if missing/422 if off-list), canonical_domain (the visible/verifiable domain, sanitized via safeDomain), origin_verification_state (default ORIGIN_PENDING → ORIGIN_VERIFIED), validation_state (default DRAFT), receipts jsonb, blockers jsonb, published_implementation_id.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:138-154; services/banzai-api/src/onboarding/routes.js:189-225 (required + canonical-option validation via CANONICAL_OPTIONS from banza_target_registry); store.js:150-199",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "canonical_domain is the origin-proof target used by origin_challenges and the secure Rust fetcher; it is the 'visible domain' of the model."
      },
      {
        "item": "origin_challenges — single-use per implementation, latest-wins",
        "current_state": "origin_challenges FK-references candidate_implementation_id; stores challenge_hash (HMAC of nonce; nonce lives only in the operator's published .well-known doc), issued_at/expires_at, result, reason_code, receipt_ref, and consumed_at. verifyOrigin reads latestOriginChallenge (ORDER BY issued_at DESC LIMIT 1); a consumed challenge short-circuits and is refused before any network fetch. On a positive verify the challenge is marked consumed_at (single-use, first-verify-wins) and the impl flips to ORIGIN_VERIFIED with the receipt appended.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:156-168 (consumed_at line 167); services/banzai-api/src/onboarding/store.js:202-247 (latestOriginChallenge, markOriginChallengeConsumed, originChallengeCounts); service.js:292-370",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "Schema drift risk: no ALTER migration adds expected_* / consumed_at to a pre-existing candidate_implementations table",
        "current_state": "init/001_schema.sql (empty-volume only) and migrations/M2_19G3_operator_onboarding.sql both now include expected_protocol_version/profile/environment and published_implementation_id, but M2_19G3 uses CREATE TABLE IF NOT EXISTS — if the table already existed without those columns, re-running adds nothing (no ALTER ADD COLUMN for them anywhere). Only origin_challenges.consumed_at got a dedicated ALTER (M2_19G3A). email_challenges/candidate_sessions/candidates likewise rely on IF NOT EXISTS.",
        "evidence": "infra/banza-network/postgres/init/001_schema.sql:138-154; infra/banza-network/postgres/migrations/M2_19G3_operator_onboarding.sql:50-66 (IF NOT EXISTS, includes expected_* + published_implementation_id); migrations/M2_19G3A_origin_single_use.sql:11 (only consumed_at ALTER)",
        "reuse_or_build": "N/A",
        "notes": "Prod per project memory (M2.19G.3B live) evidently has the columns; flagged as a caveat, not a confirmed prod defect. Any NEW column M2.19G.4 adds must ship an explicit ALTER-based migration, not rely on IF NOT EXISTS."
      },
      {
        "item": "Persistence guarantees: transactions, fail-safe, boundary (no PII/secrets)",
        "current_state": "Multi-write steps (verify OTP → mark verified → mint session) run in db.withTransaction (BEGIN/COMMIT/ROLLBACK). DB outages throw and are caught → clean 503, never a crash. Only HMAC digests, opaque ids, states, timestamps and jsonb receipts/blockers are stored — no plaintext OTP, no session token, no keys, no PII beyond the contact email (ADR-042 boundary). onboarding_audit is append-only with a meta jsonb explicitly excluding secrets/PII. Tables are owned RW solely by role banzai_rw.",
        "evidence": "services/banzai-api/src/onboarding/db.js:45-64 (withTransaction); routes.js:81-87 (catch → 503); store.js:1-6 + service.js:1-10 (boundary comments); init/001_schema.sql:200-203 (banzai_rw grants), 170-174 (onboarding_audit)",
        "reuse_or_build": "REUSE_ASIS"
      }
    ]
  },
  {
    "area": "Cluster SECURITY — M2.19G.3/.3A operator onboarding (services/banzai-api/src/onboarding/* + engines/banza-artifact-fetcher + engines/banzai-onboarding). Real current state documented for M2.19G.4 to adapt to; no redesign proposed.",
    "findings": [
      {
        "item": "Server-side authorization + ownership on every mutation (ownedCandidate / ownedImplementation)",
        "current_state": "Every mutating route requires an authenticated session and gates through a central ownership check. `ownedCandidate(session, id)` loads the candidate and returns null unless `c.owner_email === session.email`; `ownedImplementation` resolves the impl then re-checks its candidate via ownedCandidate. createCandidate writes owner_email = session.email. abandon/createImplementation/issueOriginChallenge/verifyOrigin/reconcile all call ownedCandidate/ownedImplementation first and return not_found on a foreign object. reconcile additionally asserts impl.candidate_id === candidateId. Ownership is enforced in the Node service (not just SQL); listCandidates is scoped by owner_email in the query.",
        "evidence": "services/banzai-api/src/onboarding/service.js:198-202 (ownedCandidate), :247-253 (ownedImplementation), :174-185 (createCandidate owner_email), :211-219 (abandon), :222-244 (createImplementation), :256-259 (issueOriginChallenge), :292-295 (verifyOrigin), :378-383 (reconcile ownership + candidate_id match); routes.js:126,141 (session required before all authed routes); store.js:127-133 (listCandidatesByOwner)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. Central gate is solid. Ownership is email-scoped (person owns candidate), not per-session — any valid session for the same owner email sees the same candidates, which is intended."
      },
      {
        "item": "Session isolation",
        "current_state": "Sessions are opaque: cookie value is `${sessionId}.${token}`; only the HMAC session_hash is stored, never the token. authenticate() looks up by session_id, then Rust sessionVerify checks token→hash (constant-time HMAC), idle timeout, absolute expiry and revoked_at. A session carries only {sessionId, email}; all data access is re-scoped to that email. Sessions are minted atomically with OTP consumption inside a DB transaction. logout revokes (revoked_at) and clears the cookie. No cross-tenant data path — every read/write is filtered by owner_email derived from the session.",
        "evidence": "service.js:119-141 (verifyOtp mints session in withTransaction), :144-164 (authenticate → engine.sessionVerify), :166-171 (logout/revoke); engine.js:79-100 (sessionIssue/sessionVerify); store.js:83-109 (insert/get/touch/revoke session); engines/banzai-onboarding/src/lib.rs:192,210 (session_hash = hmac; hmac_verify token); db.js:45-64 (withTransaction)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. Idle (12h) + absolute (7d) expiry both enforced in Rust; revocation honoured on every request."
      },
      {
        "item": "CSRF — Origin allowlist (http.js) + SameSite=Strict",
        "current_state": "Primary control is the SameSite=Strict session cookie. Defence-in-depth: every POST rejects a cross-site Origin. originAllowed() returns true only if the Origin header is in the configured allowlist; a MISSING Origin is tolerated (returns true) deliberately, relying on SameSite=Strict. Allowlist defaults to banza.network + www + zero subdomains, overridable via ONBOARDING_ALLOWED_ORIGINS. Enforced for all POST at the router entry before dispatch.",
        "evidence": "services/banzai-api/src/onboarding/http.js:37-41 (originAllowed, absent-Origin tolerated); routes.js:76-79 (POST Origin check → 403 forbidden_origin); config.js:23-25,50-54 (DEFAULT_ALLOWED_ORIGINS + override); http.js:21-32 (SameSite=Strict cookie)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. Note the intentional design choice: absent-Origin requests pass the CSRF check and rely solely on the SameSite=Strict cookie. No CSRF token (double-submit) — SameSite=Strict + Origin allowlist is the model."
      },
      {
        "item": "Rate limiting (per-IP)",
        "current_state": "Two layers. (1) Per-IP coarse cap across the WHOLE onboarding surface: in-memory fixed-window RateLimiter (default 40 req / 10 min) keyed by clientId, applied at router entry → 429 with retry_after_ms. clientId = socket.remoteAddress, or first X-Forwarded-For hop only when BANZAI_TRUST_PROXY=1. (2) Per-email OTP rate limit (default 5 / 1h rolling) + min-reissue (60s), both DECIDED in Rust from DB counts, returning 429. OTP verify also has a max-attempts cap (default 5) enforced in Rust.",
        "evidence": "services/banzai-api/src/onboarding/routes.js:70-74 (per-IP rl.allow → 429); index.js:19-22 (RateLimiter from cfg.rate.perIp*); limits.js:78-102 (fixed-window RateLimiter, in-memory Map); server.js:84-90 (clientId, XFF only if BANZAI_TRUST_PROXY=1); service.js:47-58 (per-email window), :60-70 (min-reissue); config.js:63-70 (limits); engine.js:141-149 (ratelimitDecide)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE, with two caveats for M2.19G.4: the per-IP limiter is IN-PROCESS (per banzai-api instance; would not aggregate across replicas), and IP attribution depends on BANZAI_TRUST_PROXY being set correctly behind nginx or all requests collapse to the proxy IP. Per-email/OTP limits are DB-backed and instance-independent."
      },
      {
        "item": "Single-use nonces + expiry (origin_challenges.consumed_at + expires_at)",
        "current_state": "Origin challenges are single-use: on a positive verify the service calls markOriginChallengeConsumed (sets consumed_at only if NULL — first verify wins), and a subsequent verify short-circuits BEFORE the network fetch (if challenge.consumed_at → Rust originVerify returns replay verdict, audited as origin_verify_replay_rejected). Expiry: origin challenges carry expires_at (24h) checked in Rust. OTP: single active code per email+purpose (invalidateOpenChallenges nulls older open ones), expires_at (10min) + attempts + verified_at/invalidated_at all fed to Rust otpVerify. Nonce/token/OTP secrets are never stored — only HMAC digests. The consumed_at column exists in both the migration and canonical init schema.",
        "evidence": "service.js:299-311 (consumed short-circuit + replay audit), :363-365 (markOriginChallengeConsumed on verify); store.js:228-233 (consumed_at set only if NULL), :211-217 (latestOriginChallenge); engine.js:122-138 (originVerify consumed_at_ms); infra/banza-network/postgres/migrations/M2_19G3A_origin_single_use.sql:11; infra/banza-network/postgres/init/001_schema.sql:167 (consumed_at); service.js:79-80 (OTP invalidateOpenChallenges); engines/banzai-onboarding/src/lib.rs:136,350 (expiry+attempts / nonce_ok)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. Replay is closed at both DB (consumed_at guard) and engine (Rust refuses consumed) layers, and short-circuits before re-hitting the operator origin."
      },
      {
        "item": "SSRF / DNS-rebinding hardening (Rust banza-fetcher / banza-artifact-fetcher)",
        "current_state": "The Node service NEVER fetches an operator endpoint and NEVER accepts a caller URL: origin+host+path for the .well-known fetch are derived server-side from impl.canonical_domain, sent to the sole egress component — the Rust fetcher — via fetcherClient. Rust policy: HTTPS-only, no userinfo, host must equal registry expected_host (path cannot smuggle an absolute URL — Url::join + host mismatch), port allowlist. DNS-rebinding defence: resolve host ONCE, classify EVERY resolved IP against the full blocklist (loopback/private/CGNAT/link-local/metadata 169.254.169.254 + IPv6 equivs, IPv4-mapped unwrapped), then pin the connection to the validated IPs via resolve_to_addrs so no unvalidated second lookup can occur. Zero redirects (Policy::none, 3xx refused), no proxy, connect+total timeouts, Content-Encoding refused (decompression-bomb guard), media-type allowlist (application/json), size cap checked against declared length AND while streaming (1 MiB). Production always uses FetchPolicy::strict (allow_http/allow_loopback are test-only, unreachable from the /fetch endpoint).",
        "evidence": "services/banzai-api/src/onboarding/service.js:315-320 (registry-derived origin, fetcher.fetchArtifact); fetcherClient.js:1-48,76-110 (no caller URL, transport-only); engines/banza-artifact-fetcher/src/policy.rs:63-113 (preflight), :119-251 (classify_ip incl. metadata/IPv4-mapped), :277-285 (content_encoding_ok); fetch.rs:99-128 (resolve-once + classify-all + resolve_to_addrs pin), :144-157 (no redirect / non-2xx), :174-214 (size caps streaming); policy.rs:26-51 (strict is production)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE and comprehensive. This is the strongest control in the cluster."
      },
      {
        "item": "Idempotency keys",
        "current_state": "There is NO generic idempotency-key mechanism (no Idempotency-Key header, no dedup table) for onboarding mutations. Replay/duplicate safety is achieved narrowly and per-operation instead: OTP = single active code + attempt cap + verified/invalidated flags; origin verify = single-use consumed_at nonce; reconcile = a deterministic Rust state-machine chain that refuses illegal transitions (a re-run from PUBLISHED would fail the first transition). createCandidate and createImplementation are NOT idempotent — repeating the POST creates a new row each time (candidate_id/impl id are fresh UUIDs). email_challenges carries an unused request_id column but it is not wired to any idempotency logic.",
        "evidence": "service.js:174-185 (createCandidate — new UUID each call, no dedup), :222-244 (createImplementation — same); store.js:22-33 (request_id column, only set, never read for dedup); service.js:394-400 (reconcile state-machine guards); grep for 'idempotency' across onboarding/ + server.js returns nothing",
        "reuse_or_build": "BUILD_NEW",
        "notes": "MISSING as a generic control. Partially mitigated by single-use nonces (INV-IDEM-* replay-safety is met for the security-sensitive OTP/origin steps), but duplicate candidate/implementation creation is possible. If M2.19G.4 needs idempotent POST create, this is the one item to build; request_id column is a ready hook."
      },
      {
        "item": "Audit log (onboarding_audit)",
        "current_state": "Append-only audit table written on every meaningful event: otp_requested/verified/failed/delivery_failed, session_revoked, candidate_created/abandoned/reconciled + per-transition candidate_* events, implementation_created, origin_challenge_issued, origin_verified, origin_verify_failed, origin_verify_replay_rejected. Each row = {event, entity_type, entity_id, meta jsonb, created_at}. store.audit is a parameterised INSERT; meta never contains secrets/plaintext codes (ADR-042 boundary — hashes/ids/states only). Table + bigserial sequence granted to banzai_rw.",
        "evidence": "services/banzai-api/src/onboarding/store.js:14-19 (audit INSERT); service.js:88,92,115,130,169,182,217,235,281,309,327,365,367,399,404 (audit call sites); infra/.../init/001_schema.sql:170; migration M2_19G3_operator_onboarding.sql:81-90 (table + grants)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. One nuance: most audit INSERTs run on the shared pool AFTER the state write (not inside the same transaction, except verifyOtp which audits within withTransaction), so an audit write could in theory fail independently of its state change. Table is append-only by convention (no UPDATE/DELETE code path), not by a DB trigger/revoked DELETE grant — banzai_rw does hold DELETE on the table."
      },
      {
        "item": "__Host- cookie SameSite=Strict",
        "current_state": "Session cookie name is __Host-banzai_candidate when cookieSecure (production default true); serializeCookie always emits Path=/, HttpOnly, SameSite=Strict, Secure, and NO Domain attribute — satisfying every __Host- prefix requirement. Max-Age = session absolute TTL. In a non-secure local dev context the prefix is dropped (name banzai_candidate) so the cookie is still settable over http. HttpOnly makes it invisible to JS; SameSite=Strict blocks cross-site credentialed sends. clearCookie mirrors the attributes with Max-Age=0.",
        "evidence": "services/banzai-api/src/onboarding/config.js:30,43-49 (name switch, sameSite Strict, cookieSecure default true); http.js:19-32 (serializeCookie/clearCookie: Path=/, HttpOnly, SameSite, Secure, no Domain); routes.js:37-48 (setSessionCookie/clearSessionCookie); http.js:1-4 (module doc: __Host- + Secure + Path=/ + no Domain)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "ALREADY_DONE. Correct __Host- discipline. Verify at deploy that ONBOARDING_COOKIE_SECURE is not set to false in production, otherwise the prefix silently drops."
      }
    ]
  },
  {
    "area": "VALIDATION ENGINE + JOURNEY + EVIDENCE (endpoint-originated 9-step operator-validation, M2.19G.1 / ADR-068)",
    "findings": [
      {
        "item": "Nine-step journey orchestrator (server engine glue)",
        "current_state": "services/banzai-api/src/validate.js is the authoritative journey runner. createValidator(env,{fetchImpl}) exposes resolveTarget / validateStep / validateJourney / catalogue / options. STEP_ORDER = [discovery, manifest, keys, conformance, interoperability, trust, federation, evidence, certification] (validate.js:38-48). STEP_SPEC maps each step to its Rust engine + the registry endpoint keys it fetches (validate.js:50-60). runTechnicalStep() fetches each artifact via fetcherClient->banza-fetcher, JSON.parses bodies, runs the matching WASM engine on FETCHED content, and builds an OperationReceipt (validate.js:222-288). Any required fetch failure => step result.status BLOCKED + FETCH_BLOCKED reason (validate.js:258-273). Rust decides every verdict; qwen_calls/external_model_calls are hardcoded 0 (validate.js:202-203). WORKFLOW constant = 'operator-validation' (validate.js:34), RECEIPT_VERSION = '1.0.0' (validate.js:33).",
        "evidence": "services/banzai-api/src/validate.js:34,38-60,119-157,222-288",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "This is the single official journey engine. Steps run SEQUENTIALLY in-process (a plain await loop in validateJourney, validate.js:332); there is no per-step parallelism, no job queue, no persistence."
      },
      {
        "item": "Journey aggregate receipt builder (validateJourney)",
        "current_state": "validateJourney(operatorId, implementationId) resolves the target, runs the 8 technical steps sequentially, then runCertificationStep aggregates them, and returns { ok, journey_receipt } shaped exactly as ServerJourneyReceipt (validate.js:322-379). overall_status is derived worst-first FAILED>BLOCKED>PENDING/NOT_EVALUATED>VERIFIED over the 8 technical steps (validate.js:338-345). certification_readiness comes from the cert receipt (READY|BLOCKED); certification_status is hardcoded 'NOT_CERTIFIED' and certified:false (validate.js:367-369). Carries a PT disclaimer string (validate.js:375-376).",
        "evidence": "services/banzai-api/src/validate.js:322-379",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "HTTP routes: /validate/step, /validate/journey, /validate/registry, /validate/options",
        "current_state": "server.js wires: GET /validate/registry (validator.catalogue()) + GET /validate/options (validator.options()) with ETag + 300s public cache + 304 handling (server.js:590-600); POST /validate/step -> validateStepReq (server.js:604); POST /validate/journey -> validateJourneyReq (server.js:605); explicit 405 for wrong method on each (server.js:600,606). Both POST handlers are rate-limited via rateLimiter.allow(clientId(req)) returning 429+retry_after_ms (server.js:505-511,539-545). Inputs sanitized through safeId() to a closed lowercase slug shape (server.js:495-501,518-520,551-552); missing target => 400, unknown_step => 400, target_not_resolved => 404, engine throw => 502 (server.js:524-534,556-565). Served same-origin under nginx location /banzai/validate/ (server.js:601-603).",
        "evidence": "services/banzai-api/src/server.js:495-566,590-606",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "Closed Technical Registry engine (banza-target-registry)",
        "current_state": "engines/banza-target-registry (lib.rs, model.rs, registry.rs, verdict.rs, wasm.rs). production_registry() seeds EXACTLY ONE operator ('operator-zero') + ONE implementation ('operator-zero-ref-impl', version 0.1.0, protocol 1.0.0, profile L0, environment sandbox, capabilities qr_payment_demo/refund_demo/reconciliation_demo, canonical_origin https://zero.banza.network) (registry.rs:169-197). SUPPORTED_PROTOCOL_VERSIONS=['1.0.0'], SUPPORTED_ENVIRONMENTS=['sandbox','demo'], SUPPORTED_PROFILES=['L0'..'L4'] (registry.rs:13-18). resolve() enforces eligibility with typed ResolutionReason (UnknownOperator/DuplicateOperator/OperatorRemoved/Revoked/Unpublished, etc.) (registry.rs:50-80). WASM exports consumed by validate.js: registry_resolve_json, registry_catalogue_json, registry_tool_version_json, registry_validate_discovery_json, registry_step_status_json, registry_certification_readiness_json (lib.rs:35-127). TOOL_VERSION='0.1.0' (lib.rs:25). expected_host is the SSRF pin the fetcher validates (model.rs:130-146).",
        "evidence": "engines/banza-target-registry/src/registry.rs:13-80,169-197; engines/banza-target-registry/src/lib.rs:25,35-127",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Registry is operator-zero-ONLY today. Any per-implementation surface that must list more than one operator/implementation is bounded by this closed seed (ADR-053 Operator-Zero-only policy). Adding a real second implementation would be CHANGE_GOVERNED (new ADR + repo-guards range bump per project memory)."
      },
      {
        "item": "Rust verdict interpreter + Certification Readiness aggregator (verdict.rs)",
        "current_state": "verdict.rs is the ONLY place a step verdict or readiness is decided. step_status(step, engine_output) maps each engine's own status onto canonical VERIFIED/PENDING/FAILED (verdict.rs:23-130): manifest VALID->VERIFIED/INCOMPLETE->PENDING; keys|trust TRUST_VALID->VERIFIED/TRUST_MISSING*->PENDING; conformance PASS->VERIFIED/WARN->PENDING; interoperability L2_READY_FOR_TECHNICAL_REVIEW->VERIFIED; federation L3_READY_FOR_TECHNICAL_REVIEW->VERIFIED; evidence readiness READY->VERIFIED. validate_discovery() checks identity fields + host-bound endpoint map (verdict.rs:134-230). certification_readiness() aggregates the 8 technical verdicts: readiness='READY' only if all_verified, else 'BLOCKED'; always emits certification_status:'NOT_CERTIFIED', certified:false, authorised:false, licensed:false, and reason_codes incl. NOT_CERTIFIED / READY_FOR_TECHNICAL_REVIEW / PRECEDING_STEP_FAILED/BLOCKED / TECHNICAL_STEPS_INCOMPLETE (verdict.rs:235-290).",
        "evidence": "engines/banza-target-registry/src/verdict.rs:23-130,235-290",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Readiness is READY|BLOCKED and NEVER a Certification Record and NEVER returns CERTIFIED (verdict.rs:6-7,284). This invariant is load-bearing for any Validação/Certificação surface."
      },
      {
        "item": "Client-side journey state machine + STEP catalogue (validationJourney.tsx)",
        "current_state": "website/components/banzai/validationJourney.tsx owns useValidationSession(), the single client store. STEPS[] holds the 9 StepMeta {id,num,title,engine,blurb} (validationJourney.tsx:45-118) — titles/engines: 1 Discovery/banza-target-registry, 2 Manifest/banza-operator-manifest, 3 Keys/banza-trust, 4 Conformidade/banza-conformance, 5 Interoperabilidade/banza-l2-readiness, 6 Confiança/banza-trust, 7 Federação/banza-l3-readiness, 8 Evidence Bundle/banza-evidence-bundle, 9 Prontidão de certificação/banza-target-registry. Exposes runOne / runFrom / runAll / cancel / reset / exportJourney / exportStep + derived progress, overall, blockers, evidence, receipts, certificationReadiness ('READY'|'BLOCKED'|null), certificationStatus ('NOT_CERTIFIED') (validationJourney.tsx:225-260,357-576). STEP_ORDER re-exported from banzaiValidation VALIDATION_STEP_IDS (validationJourney.tsx:35).",
        "evidence": "website/components/banzai/validationJourney.tsx:45-118,225-260,268-577",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Store is hardwired to a single (operatorId, implementationId) selection. A multi-implementation 'Validação' surface reuses this hook per target but would need one instance/target or a keyed store."
      },
      {
        "item": "Per-step UI state model (blankResults / StepState / status vocabulary)",
        "current_state": "StepState = {status: StepStatus, running: bool, error, receipt, reason_codes[], evidence_refs[]} (validationJourney.tsx:134-141). BLANK_STEP defaults status:'NOT_EVALUATED', running:false (validationJourney.tsx:143-150); blankResults() seeds every step to BLANK_STEP (validationJourney.tsx:152-154). StepStatus vocabulary is NOT_EVALUATED | PENDING | VERIFIED | FAILED | BLOCKED (operationReceipt.ts:12) — NOTE: verdicts are VERIFIED/FAILED, NOT literal 'PASS'/'FAIL' as the cluster brief phrased it. STATUS_LABEL_PT maps each to PT (validationJourney.tsx:156-162). 'running' is a transient boolean flag, not a status value; runAll sets every step running:true then replaces with server verdicts (validationJourney.tsx:418-421,430-441). On step error the client forces status 'BLOCKED' + uppercased error reason code (validationJourney.tsx:379-390).",
        "evidence": "website/components/banzai/validationJourney.tsx:134-162,363-390,418-452; website/lib/operationReceipt.ts:12",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "ServerOperationReceipt + ServerJourneyReceipt (per-step + aggregate receipts)",
        "current_state": "website/lib/operationReceipt.ts defines the server-issued receipt contracts (mirroring validate.js §30/§31). ServerOperationReceipt has full origin binding: operation_id, workflow, step, operator_id, implementation_id, canonical_origin, endpoint, resolved_host, fetched_at, http_status, content_type/length, etag, last_modified, input_hash, signature_status, engine/engine_version, result{status}, reason_codes[], evidence_refs[], output_hash, duration_ms, qwen_calls, external_model_calls, protocol_fetch_count, audit_ref (operationReceipt.ts:24-57). ServerJourneyReceipt adds journey_id, started_at/finished_at, step_count, steps[], overall_status, certification_readiness ('READY'|'BLOCKED'), certification_status ('NOT_CERTIFIED'), certified:false, disclaimer (operationReceipt.ts:61-88). downloadReceipt() serializes any receipt to a JSON blob download (operationReceipt.ts:231-244). Receipts are BUILT SERVER-SIDE in validate.js buildOperationReceipt (validate.js:167-207); the browser only renders/exports them.",
        "evidence": "website/lib/operationReceipt.ts:24-88,231-244; services/banzai-api/src/validate.js:167-207",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "Legacy browser-built OperationReceipt / JourneyReceipt + hashing helpers (same file)",
        "current_state": "operationReceipt.ts ALSO still contains the older browser-authored receipt shapes: OperationReceipt (actor:'banzai-web', target:'operator-zero', qwen_calls:0, external_calls:0) and JourneyReceipt (certification_status:'NOT_CERTIFIED', certification_readiness:'PRE_PRODUCTION', demo_only:true) (operationReceipt.ts:91-131), plus newId(), fnv1a32/contentHash (SHA-256 via SubtleCrypto w/ fnv fallback), hashMap, buildReceipt, aggregateStatus (operationReceipt.ts:133-227). These belong to the OLD browser-local journey, not the endpoint-originated path.",
        "evidence": "website/lib/operationReceipt.ts:91-131,133-227",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Two receipt generations coexist in one file. The endpoint-originated surface uses only the Server* interfaces + downloadReceipt; the legacy shapes are still referenced by the older draft/journey path. Do not confuse certification_readiness 'PRE_PRODUCTION' (legacy) with 'READY'|'BLOCKED' (current)."
      },
      {
        "item": "EvidenceBundle engine (banza-evidence-bundle) + evidence step",
        "current_state": "engines/banza-evidence-bundle assembles technical evidence in Rust: REQUIRED_ARTIFACTS=[simb_pre_review, conformance_l0]; RECOMMENDED includes trace_verification, trust_engine_report, operator_manifest_validation, l1..l4_readiness_report, security/gov reports (lib.rs:31-45). compute_readiness(simb,l0) => READY only if both required present (lib.rs:100-103). Every bundle carries not_a_certificate=true, not_an_approval=true, requires_conformance_evidence_review=true, llm_calls=0, external_model_called=false (lib.rs:8-11). WASM export evidence_bundle_validate_json (wasm.rs:21) is called by validate.js step 8 (validate.js:31,134-136); verdict.rs maps its ok+readiness onto VERIFIED/PENDING/FAILED (verdict.rs:92-110). In the endpoint-originated path the bundle is FETCHED from the implementation's evidence_bundle endpoint, not assembled locally (validate.js:58,134-136).",
        "evidence": "engines/banza-evidence-bundle/src/lib.rs:8-11,31-45,100-103; engines/banza-evidence-bundle/src/wasm.rs:21; services/banzai-api/src/validate.js:134-136",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "banza-evidence-bundle is the ASSEMBLER/validator; there is also a separate engines/banzai-evidence crate (distinct) — verify which one a new Evidência surface needs."
      },
      {
        "item": "OriginVerificationReceipt — belongs to ONBOARDING (ADR-069), NOT the validation journey",
        "current_state": "OriginVerificationReceipt is produced by engines/banzai-onboarding/src/lib.rs during the .well-known domain-ownership challenge flow (M2.19G.3/G.3A). origin_verify_json emits {ok, result, reason_code, receipt} with receipt_type='OriginVerificationReceipt' (lib.rs:307-364,325-333). Single-use: a challenge with consumed_at_ms set is refused (lib.rs:334-340). WELL_KNOWN_PATH=/.well-known/banza/ownership-challenge.json (lib.rs:29). Consumed by services/banzai-api/src/onboarding/service.js + store.js and website/components/banzai/BanzaiOnboardingMode.tsx / lib/banzaiOnboardingClient.ts. This is the operator ENROLLMENT/candidate-registry path, orthogonal to the 9-step validation journey.",
        "evidence": "engines/banzai-onboarding/src/lib.rs:29,255-364; services/banzai-api/src/onboarding/service.js; website/components/banzai/BanzaiOnboardingMode.tsx",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "The cluster brief grouped OriginVerificationReceipt with JourneyReceipt/EvidenceBundle, but in code it lives in a SEPARATE onboarding subsystem with its own Postgres persistence (see persistence finding). It is not part of validate.js."
      },
      {
        "item": "Certification Readiness surfacing (READY/BLOCKED, never CERTIFIED)",
        "current_state": "Rendered in BanzaiValidationMode.tsx: the certification step detail shows 'Prontidão de Certificação: READY|BLOCKED, Estado de Certificação: NOT_CERTIFIED' with the ADR-068 §4.10 disclaimer (BanzaiValidationMode.tsx:476-480); the context panel + Resumo repeat certificationReadiness / certificationStatus (BanzaiValidationMode.tsx:530-533,691-694). Derived in the hook from journeyReceipt.certification_readiness or the cert step receipt result.certification.readiness (validationJourney.tsx:536-541); certificationStatus is the literal 'NOT_CERTIFIED' (validationJourney.tsx:259,575). Rust is the source (verdict.rs:250,280).",
        "evidence": "website/components/banzai/validationJourney.tsx:258-259,536-541,575; website/components/banzai/BanzaiValidationMode.tsx:476-480,530-533,691-694",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "Validation UI surface (Fase 0 selection + workspace + Resultados)",
        "current_state": "website/components/banzai/BanzaiValidationMode.tsx renders the whole surface: ValidationContextSetup (Fase 0 operator+implementation selectors from the fetched closed registry, BanzaiValidationMode.tsx:97-203), ValidationStepNav (9-step spine sidebar, :205-239), ValidationHeader (static metadata + overall badge + Reiniciar/Alterar alvo, :253-303), ValidationWorkspace (active-step detail, receipt origin grid, reason/evidence, contextual action buttons incl. 'Executar jornada completa' / 'Executar esta etapa' / 'Explicar este resultado', :335-486), ValidationContextPanel (progresso/próxima acção/bloqueios/endpoint/evidência, :511-598), and the single Resultados area with in-area sub-views resumo|receipts|relatorios|artefactos|traces|evidence (:600-819). Status color maps ST_DOT/ST_BADGE/ST_LEFT for the 5 StepStatus values (:37-59).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:37-59,97-819",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "This is the richest reusable surface for a per-implementation Validação/Evidência view. It is entirely operator/implementation-scoped already (reads session.operator/implementation). Wired into the shell via BanzaiAgent.tsx / banzaiUi.tsx."
      },
      {
        "item": "Same-origin client (banzaiValidateClient.ts) + deep-link/registry model (banzaiValidation.ts)",
        "current_state": "banzaiValidateClient.ts: fetchRegistry/fetchOptions (GET, 15s timeout), validateStepRequest/validateJourneyRequest (POST, 90s timeout), all same-origin under /banzai/validate/*; ids re-checked with isClosedId; status 0 => 'unavailable' (banzaiValidateClient.ts:14-157). banzaiValidation.ts defines the closed id shape CLOSED_ID regex + isClosedId (banzaiValidation.ts:149-152), mapCatalogueToOperators (pure display mapper, banzaiValidation.ts:110-145), ValidationOperator/ValidationImplementation types (:59-85), VALIDATION_WORKFLOWS + VALIDATION_STEP_IDS closed allowlists (:174-216), workbenchDeepLink helpers + WORKFLOW_LABEL_PT (:225-252). Also retains a legacy hardcoded VALIDATION_TARGETS operator-zero map (:34-44) used by deep-link resolveTarget.",
        "evidence": "website/lib/banzaiValidateClient.ts:14-157; website/lib/banzaiValidation.ts:34-44,110-152,174-252",
        "reuse_or_build": "REUSE_ASIS"
      },
      {
        "item": "session.rs states — the OLDER guided journey evidence model (M2.11A, engines/banzai-operator-journey)",
        "current_state": "engines/banzai-operator-journey/src/session.rs is a DIFFERENT, older 7-step guided journey (steps: guia, manifest, conformidade, trust, federacao, evidence_bundle, traces). STATUSES = not_started/visited/in_progress/requires_input/ready_to_validate/validating/valid/invalid/warning/blocked/incomplete/not_applicable/demo_only/evidence_ready (session.rs:38-53); status_label() gives PT labels (session.rs:56-74). Deliberately EXCLUDES certified/approved/licensed (session.rs:37,937-947). Separates JOURNEY progress (navigation) from EVIDENCE progress (weighted, only a real engine verdict moves it; weights sum to 100, guia=0) (session.rs:76-90,467-504). evaluate_session() emits overall_state, dual progress, per-step subchecks, blockers, warnings, evidence_items, next_recommended_action, can_generate_bundle/report, and session_scope='browser_memory_only' (session.rs:423-575). derive_status() encodes anti-inflation: prereq missing=>blocked, unvalidated artifact=>ready_to_validate, only engine_run pass=>evidence_ready (session.rs:278-319). Wired via services/banzai-api/src/journey.js + website/lib/banzaOperatorJourney.ts.",
        "evidence": "engines/banzai-operator-journey/src/session.rs:38-90,278-319,423-575; services/banzai-api/src/journey.js:1-14; website/lib/banzaOperatorJourney.ts:1-56",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "IMPORTANT: two journeys coexist. session.rs is the pre-ADR-068 browser-local guided journey (upload/paste, now the developer DRAFT tool). The endpoint-originated 9-step journey (validate.js) is the current OFFICIAL path and does NOT use session.rs. A per-implementation surface should build on validate.js, not session.rs, unless the draft tool is in scope."
      },
      {
        "item": "Persistence / resume of validation runs",
        "current_state": "The endpoint-originated journey has NO persistence and NO resume: useValidationSession stores everything in React useState (results, journeyReceipt, runningAll) and clears it on selection change/cancel/reset (validationJourney.tsx:287-289,326-330,467-473). validate.js is stateless per request (no DB, no store). The OLDER guided journey is explicitly session_scope='browser_memory_only' (session.rs:573). The ONLY persistence in the cluster is the ONBOARDING subsystem: services/banzai-api/src/onboarding/store.js writes six private Postgres tables (email_challenges, candidates, onboarding_audit, etc.) storing only HMAC digests/opaque ids/states/timestamps/JSON receipts — never a validation run (store.js:1-6). So validation runs are ephemeral; only candidate-onboarding state is durable.",
        "evidence": "website/components/banzai/validationJourney.tsx:287-330,467-473; engines/banzai-operator-journey/src/session.rs:573; services/banzai-api/src/onboarding/store.js:1-59",
        "reuse_or_build": "BUILD_NEW",
        "notes": "If M2.19G.4 needs saved/resumable per-implementation validation runs, there is nothing to reuse — it must be built. The onboarding store pattern (parameterised SQL, HMAC-only, ADR-042 boundary) is the closest reusable template; per project memory a new persisted table implies CHANGE_GOVERNED (new ADR + repo-guards range)."
      },
      {
        "item": "Jobs / queue (concurrency.js) — scope",
        "current_state": "services/banzai-api/src/concurrency.js (createInferenceQueue / createGate) is the async runtime queue for MODEL INFERENCE ONLY (pipeline Tier 5, the /ask path): bounded concurrency (default 1), priority pending queue, in-flight de-dup, queue+inference timeouts, cooperative cancel, health counters (concurrency.js:1-23,48-282). It explicitly guards only the model step and is NOT referenced by validate.js — confirmed no import (validate.js has zero queue references). Validation steps therefore run synchronously, unqueued, one after another in the request. The only backpressure on /validate/* is the per-IP rateLimiter in server.js (429 + retry_after_ms).",
        "evidence": "services/banzai-api/src/concurrency.js:1-23,48-282; services/banzai-api/src/server.js:505-511,539-545",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "There is no jobs/queue for validation. If per-implementation validation needs async/background execution or concurrency limits, concurrency.js is a reusable pattern (priority queue, dedup, cancel, counters) but is not currently applied to /validate/*."
      },
      {
        "item": "Fetcher boundary (how artifacts are obtained)",
        "current_state": "validate.js uses createFetcherClient (services/banzai-api/src/fetcherClient.js) -> banza-fetcher; runTechnicalStep passes ONLY registry-resolved canonical_origin + expected_host + path (derived by stripping origin via pathOf) + JSON_MEDIA_ALLOWLIST — never a caller URL (validate.js:19,68-71,230-239). Each fetch response contributes evidence_refs as `${url}#${sha256}` and a protocol_fetch_count (validate.js:253-254,337). This is the SSRF-hardened boundary that makes every receipt origin-bound.",
        "evidence": "services/banzai-api/src/validate.js:19,68-71,230-254; services/banzai-api/src/fetcherClient.js",
        "reuse_or_build": "REUSE_ASIS"
      }
    ]
  },
  {
    "area": "Cluster RUNTIME TRUTH + DOC PARITY (§24) — how the BanzAI UI sources the model/provider label, the banzai-api /health contract, whether a runtime-truth endpoint exists, and reference/docs parity. All labels are HARDCODED in the UI; /health carries the truth but is internal-only and never consumed by the browser.",
    "findings": [
      {
        "item": "BADGES array — hardcoded provider/mode labels in the BanzAI shell",
        "current_state": "A frozen const array of six literal Portuguese strings: \"Motor por omissão: Qwen local\", \"Inferência local (on-host)\", \"Sem chamadas externas\", \"Estado por resposta\", \"Não normativo\", \"Pré-produção do protocolo\". Purely static; no runtime input. Rendered verbatim in the shell via BADGES.map at BanzaiAgent.tsx:686. A unit test (banzai-agent.test.ts:76-78) even ASSERTS these never say mock/demo/provider — locking the copy to 'Qwen local' regardless of the actual provider.",
        "evidence": "website/components/banzai/banzai-agent.ts:183; rendered website/components/banzai/BanzaiAgent.tsx:686; asserted website/components/banzai/banzai-agent.test.ts:76-78",
        "reuse_or_build": "BUILD_NEW",
        "notes": "This is the primary §24 offender: the model name 'Qwen local' is a build-time literal that must become derived from runtime truth (/health or /ask telemetry)."
      },
      {
        "item": "Shell footer status bar — second hardcoded provider line + always-green dot",
        "current_state": "A fixed footer chip in the BanzAI sidebar renders the literal string \"Motor por omissão: Qwen local (on-host) · sem chamadas externas · estado por resposta\" next to an unconditionally-green status dot (className bg-ok on line 418). Neither the text nor the dot colour reflects any live provider/health state — a mock or degraded backend would still show 'Qwen local' with a green light.",
        "evidence": "website/components/banzai/BanzaiAgent.tsx:418-419",
        "reuse_or_build": "BUILD_NEW",
        "notes": "Duplicate of the BADGES claim, in a different component; both must be driven from the same derived source."
      },
      {
        "item": "Public Estado page — hardcoded 'Qwen local activo' runtime status",
        "current_state": "The public /estado status page is a fully static Next server component (metadata at line 6; plain const arrays from line 16). One status row hardcodes value: \"Interface única do protocolo · Qwen local activo · inferência local on-host · sem chamadas externas · estado por resposta · não normativo · pré-produção\" with tone: \"ok\". Prose lower on the page repeats \"o Qwen local está activo e corre on-host, sem chamadas externas\". Nothing is fetched — it asserts runtime truth at build time.",
        "evidence": "website/app/estado/page.tsx:26 (status row); website/app/estado/page.tsx:202-203 (prose); static component confirmed website/app/estado/page.tsx:6,16-24",
        "reuse_or_build": "BUILD_NEW",
        "notes": "Highest-visibility parity gap: a page literally titled 'Estado' claims 'Qwen local activo' as a static string, with no link to /health. If the deploy provider differed, this page would silently lie."
      },
      {
        "item": "BanzAI page intro + Roteiro page — provider baked into narrative copy",
        "current_state": "website/app/banzai/page.tsx:20 intro prose asserts the agent answers 'através de inferência local (Qwen, on-host), sem chamadas a modelos externos'. website/app/roteiro/page.tsx:31 asserts 'pergunta com inferência local on-host'. Both are static page copy, not derived.",
        "evidence": "website/app/banzai/page.tsx:20; website/app/roteiro/page.tsx:31",
        "reuse_or_build": "BUILD_NEW",
        "notes": "Prose-level hardcoding; lower priority than the status chips but same parity risk. banzai/page.tsx:6 comment also states the same."
      },
      {
        "item": "Per-answer status string — branch is runtime-derived but the model NAME is hardcoded",
        "current_state": "mapAskResponse builds the per-answer status line the shell renders (BanzaiAgent.tsx:570-571). Which branch fires IS runtime-derived from /ask telemetry (localCalled=o.local_model_called, degraded, cachedLocal, postValidation, grounded). But the literal model name 'Qwen local' is concatenated into two branches: \"Gerado por Qwen local · chamadas externas: 0 · …\" (line 368) and \"Resposta em cache (Qwen local) · …\" (line 373). So even the one runtime-aware label in the shell hardcodes the provider name — a different provider would still print 'Qwen local'.",
        "evidence": "website/components/home/banzaiKb.ts:363-381 (esp. 368, 373); telemetry mapping banzaiKb.ts:418-423; rendered BanzaiAgent.tsx:570-571",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "This is the closest thing to a derived label; §24 should have it read the model name from response telemetry (o.model_name / o.local_model_name) instead of the literal."
      },
      {
        "item": "/health contract — the runtime-truth payload (exists, complete)",
        "current_state": "GET /health returns the full runtime truth: status, app, mode (=provider.name), llm_provider (=provider.name), engine_state (mock|local_qwen|external_hosted via engineStateSteady), external_model_called (provider.externalCallsMade>0), inference_location (local|external|none), local_inference{location, enabled=BANZAI_LOCAL_INFERENCE_ENABLED, benchmark_approved=BANZAI_BENCHMARK_APPROVED, default_effective, warmed, concurrency}, authoritative, guardrails, answer_mode_default, usage, onboarding. This is exactly the data the UI labels should derive from.",
        "evidence": "services/banzai-api/src/server.js:122-157 (health body); engineStateSteady services/banzai-api/src/server.js:76-80; route registered services/banzai-api/src/server.js:573",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "The truth exists server-side. §24 gap is that it is not reachable from the browser (see next finding)."
      },
      {
        "item": "/health is INTERNAL-ONLY — no public runtime-truth endpoint reachable by the browser",
        "current_state": "There is NO publicly reachable runtime-truth endpoint. The banzai-api catch-all deliberately does not advertise /health, /sources, /index ('operator-internal … must not be advertised on any publicly reachable response'). nginx proxies ONLY /banzai/ask, /banzai/validate/{step,journey,registry,options}, /banzai/onboarding/* to the backend — there is no /banzai/health or /version location. So /health can only be hit on the internal Docker network (banzai-api:8091/health), not from banza.network.",
        "evidence": "services/banzai-api/src/server.js:616-620 (catch-all comment: /health,/sources,/index internal, not advertised); infra/banza-network/nginx/conf.d/banza.conf:55-131 (only ask/validate/onboarding proxied; no health/version location)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "For §24 to derive labels from /health, either a public read-only health/version route must be added to nginx + the catch-all, OR labels must be derived purely from the /ask response telemetry (which IS already public)."
      },
      {
        "item": "UI never fetches /health — labels have no live input today",
        "current_state": "No website code fetches /health. The only browser fetches are: /banzai/ask (banzaiKb.ts:199), /banzai/validate/* (banzaiValidateClient.ts:37,97), /banzai/onboarding/* (banzaiOnboardingClient.ts:24,44), and local .wasm module loads (website/lib/wasm/*). The single /health reference in the UI is a documentation string only (DEV_ENDPOINTS list, banzai-agent.ts:305), not an actual call.",
        "evidence": "grep of website fetch() calls: website/components/home/banzaiKb.ts:199 (ASK_URL); website/lib/banzaiValidateClient.ts:37,97; website/lib/banzaiOnboardingClient.ts:24,44; doc-only ref website/components/banzai/banzai-agent.ts:305",
        "reuse_or_build": "BUILD_NEW",
        "notes": "Confirms the hardcoded labels are the ONLY provider signal the UI shows; there is currently no wire from runtime to the badges."
      },
      {
        "item": "/ask response DOES carry per-request runtime truth — the already-public derivable source",
        "current_state": "The public POST /ask (the only publicly proxied answer route) returns safe runtime telemetry: provider, inference_location, engine_state, external_model_called, local_model_name, model_called, degraded, fallback_reason (server.js ~263-315). mapAskResponse already parses engine_state→engine, external_model_called→externalModelCalled, local_model_called→localModelCalled, degraded, status (banzaiKb.ts:418-423). This is a public, per-answer source of truth the badges could derive from without exposing /health.",
        "evidence": "services/banzai-api/src/server.js:263-315 (ask response fields incl. inference_location:305, external_model_called:306, local_model_name:315); mapping website/components/home/banzaiKb.ts:418-423",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Cleanest §24 path: drive the shell's provider/mode chips from the last /ask response (engine + externalModelCalled + model_name) instead of static BADGES; no new endpoint or nginx change needed."
      },
      {
        "item": "Provider config + engine_state source of truth (ADR-044)",
        "current_state": "provider.js is the authority: ALLOWED_PROVIDERS = mock|deepseek|qwen|local_qwen (line 30); REAL_DEFAULTS.local_qwen = { apiBase http://llama-local:8080/v1, model qwen3-4b, local:true } (line 41); createProvider defaults to mock (lines 458-460); isOnHost classifies local/external by resolved DESTINATION not provider name (lines 88-105). engineStateSteady maps provider.name→mock|local_qwen|external_hosted (server.js:76-80). local_inference.enabled/benchmark_approved come from BANZAI_LOCAL_INFERENCE_ENABLED / BANZAI_BENCHMARK_APPROVED env (server.js:30-31).",
        "evidence": "services/banzai-api/src/provider.js:30,38-42,88-105,458-460; services/banzai-api/src/server.js:30-31,76-80",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Any derived label must map from these exact values (engine_state / model name qwen3-4b), not invent its own vocabulary."
      },
      {
        "item": "Deploy truth vs. hardcoded assumption — compose default is 'mock', live provider is env-selected",
        "current_state": "compose.yml sets LLM_PROVIDER default to \"mock\" (line 9), LLM_MODEL empty default (line 12 → falls back to qwen3-4b), BANZAI_LOCAL_INFERENCE_ENABLED default false (line 40), BANZAI_BENCHMARK_APPROVED default false (line 41). The live local_qwen provider is selected only by the VPS runtime .env (uncommitted, per ADR-044/045 controlled deployment). So the committed default runtime is mock, while every UI string asserts 'Qwen local' unconditionally — the exact divergence §24 must close.",
        "evidence": "infra/banza-network/compose.yml:9,12,40-41; deployment-via-.env noted docs/banzai/BANZAI_PROTOCOL_AGENT.md:57",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Because the provider is genuinely env/deploy-driven, static UI labels are structurally wrong, not just stale. Deriving from runtime is the only correct fix."
      },
      {
        "item": "Reference chapter (BANZA_REFERENCIA.md) — says local Qwen, NOT mock (in parity with assumed runtime)",
        "current_state": "The BanzAI section asserts local Qwen throughout, consistent with local_qwen (never 'mock'): 'inferência local (Qwen, on-host)' in the components table (line 294); the operational section states 'O BanzAI corre com inferência local (Qwen, on-host) … external_model_called = false, chamadas externas = 0 … A activação seguiu configuração controlada no servidor' (line 2413); pipeline text 'o Qwen produz uma única síntese' / 'uma única síntese pelo Qwen' (lines 2423-2440); plus 134, 176, 553, 1083, 1827, 2312, 2736, 2770, 2823, 3037. All static prose — it matches the assumed live provider but is not derived and would not track a provider change.",
        "evidence": "website/content/BANZA_REFERENCIA.md:294,2413,2415,2423,2428,2438,2440 (+ 134,176,553,1083,1827,2312,2736,2770,2823,3037)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Doc parity is currently CORRECT for local_qwen. §24 concern is that this is prose asserting runtime state; it should agree with whatever the runtime-truth source reports."
      },
      {
        "item": "docs/banzai/* — provider docs state local_qwen effective (parity OK, static)",
        "current_state": "README.md:17 'Default engine (effective): local_qwen — on-host Qwen3-4B-GGUF via llama.cpp'; README.md:19 'External model calls = 0'. BANZAI_PROTOCOL_AGENT.md:48 same 'Default engine (effective) local_qwen', :57 'deployment via the runtime .env (ADR-044/045; benchmark-gated)'. LOCAL_INFERENCE_RUNTIME.md documents engine_state values mock|degraded|local_qwen and 'no powered-by-Qwen branding' (line 50). Consistent with local_qwen, all static.",
        "evidence": "docs/banzai/README.md:17,19-20; docs/banzai/BANZAI_PROTOCOL_AGENT.md:48,52-53,57; docs/banzai/LOCAL_INFERENCE_RUNTIME.md:14,44,96",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "These reference docs already frame local_qwen as effective-by-deploy and mock/degraded as fallbacks — a good vocabulary for the derived UI labels to match."
      },
      {
        "item": "Non-rendered code comments/copy that also hardcode the provider (doc-parity sweep)",
        "current_state": "Several source comments/copy strings assert 'local Qwen' framing (not rendered, but part of the parity surface): banzai-agent.ts:7-11 boundary comment; BanzaiAgent.tsx:7; HomeAsk.tsx:8; banzaiKb.ts:4; DecisionsExplorer.tsx:10 ('local on-host inference (ADR-044/048)'). validationJourney.tsx:12 asserts 'qwen_calls/external_model_calls are 0 by construction'.",
        "evidence": "website/components/banzai/banzai-agent.ts:7-11; website/components/banzai/BanzaiAgent.tsx:7; website/components/home/HomeAsk.tsx:8; website/components/home/banzaiKb.ts:4; website/components/decisoes/DecisionsExplorer.tsx:10; website/components/banzai/validationJourney.tsx:12",
        "reuse_or_build": "N/A",
        "notes": "Comments only; listed for completeness so §24 can decide whether to soften them to 'the configured local engine' when the rendered labels become derived."
      }
    ]
  },
  {
    "area": "Cluster GOVERNANCE — ADRs + vocabulary/interface guards affected by M2.19G.4 (routes-per-level + copy changes)",
    "findings": [
      {
        "item": "ADR-067 D-067-02 — single /banzai route, validation is a MODE (query params), NOT a route",
        "current_state": "Mandates exactly ONE human-operator interface and ONE route, /banzai. Validation is a NATIVE MODE entered as /banzai?mode=validation&target=operator-zero&workflow=full — explicitly 'not a separate application or route'. D-067-05 fixes query-param state (mode/target/workflow/step) against closed allowlists; that IS the sanctioned addressing mechanism. This is THE primary governance blocker for any 'routes-per-level' that means new route pages/folders under /banzai.",
        "evidence": "decisions/adr/ADR-067-...md:36-42 (D-067-02), :54-58 (D-067-05)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "If M2.19G.4 routes-per-level = distinct URL routes for the operator interface itself, it CONTRADICTS D-067-02 and needs a superseding ADR (new ADR-070). If per-level is expressed as closed query params / closed slugs within the one shell, it stays within D-067-05 and needs NO ADR. Level pages OUTSIDE the operator interface (e.g. under /certificacao, /registo-tecnico) are informational, not the 'human-operator interface', so ADR-067 does not govern them."
      },
      {
        "item": "ADR-068 — does it forbid URL-addressable targets? (endpoint-originated validation; closed registry; operator→implementation; deep-link safety)",
        "current_state": "Forbids USER-SUPPLIED / arbitrary URLs as validation TARGETS or artifact sources only: 'No pasted content, uploaded file... user-entered URL... may enter the official journey' (core rule), §4.4 'The interface never fetches a user-supplied URL', §4.7 'Arbitrary URLs are prohibited'. It does NOT forbid a page/route from being URL-addressable. Targets are resolved from the CLOSED Technical Registry (§4.6) as operator_id+implementation_id, and the operator→implementation model (§4.2/4.3) means a target is 'an operator AND one of its published implementations'. §4.1 fixes the human label 'Validar operador'. Consequences (:126-128) lock a single Resultados area, no duplicate/orphan/non-actionable tabs.",
        "evidence": "decisions/adr/ADR-068-...md:40-46 (core rule), :57 (§4.1 label), :64-83 (§4.2/4.3/4.6 operator/impl+closed registry), :72-73/:86-90 (§4.4/4.7 no user URL), :126-128 (nav consequences)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "KEY: 'no URL-addressable targets' is a misread — ADR-068 bans free-form fetch URLs, not addressable routes. Closed-slug/query-param addressing per level is compatible. If M2.19G.4 changes the 'Validar operador' label or the single-Resultados/no-orphan-tab structure it must reconcile §4.1 and the :126-128 consequences (and their guards). A pure additive routes-per-level that keeps the closed-registry + no-user-URL contract is REUSE_EXTEND, no superseding ADR."
      },
      {
        "item": "ADR-065 — BANZA Technical Registry (canonical name/nature)",
        "current_state": "The registry is canonically named 'BANZA Technical Registry' (L2): single public, append-mostly, root-verifiable index of L2 artifacts (profiles, CertificationRecords, revocations). D-065-03: registry ≠ L3 scheme participant directory — listed ≠ admitted ≠ authorised. D-065-07: baseline empty/honest (production_certificates=false, /operators=[]). Rust-owned, immutable records. The owning public page is /registo-tecnico.",
        "evidence": "decisions/adr/ADR-065-...md:25 (name/nature), :33 (D-065-03 boundary), :37 (D-065-07 empty baseline)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Copy changes must preserve the exact string 'BANZA Technical Registry', the closed states, the not-a-scheme-directory boundary, and the honest-empty state — all hard-locked by check-technical-registry-page. Renaming the registry or adding per-level 'certified' framing would need an ADR. Additive per-level presentation of the same facts does not."
      },
      {
        "item": "ADR-069 — Simple & Secure Operator Onboarding (private Candidate Registry)",
        "current_state": "Onboarding is a BanzAI-HOSTED SERVICE, explicitly NOT a protocol rule. Passwordless email-OTP only. §2: private Candidate Registry (no public listing) vs the public read-only Technical Registry; a candidacy is published to the Technical Registry only when existing technical policy deems eligible; publication is technical state, NOT scheme admission/licence/authorisation/entity certification. §3: origin proof via one .well-known method, then the SAME nine-step ADR-068 journey (no separate/privileged journey). Rust decides; TS is glue.",
        "evidence": "decisions/adr/ADR-069-...md:39-41 (core rule), :66-73 (§2 private candidate vs public registry), :77-82 (§3 same nine-step journey)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "The onboarding MODE label 'Onboarding de operador' (banzai-agent.ts:79) is NOT locked by any dedicated guard, so that copy is freely changeable. What IS locked (check-operator-onboarding + check-banzai-operator-experience OE9-12) is the security/canonical-options contract, not routing or labels. Adding per-level onboarding copy is fine; introducing a separate/privileged per-level journey would violate §3."
      },
      {
        "item": "ADR-039 — Operator self-publication; registry is an index (copy-sensitive vocabulary)",
        "current_state": "Registry is an INDEX that 'grants nothing' (§3); absence is not a prohibition/sanction (§4); BANZA does not authorise/certify/approve operators, does not issue licences (§5). Machine-verifiable conformance is relative to a protocol_version and scoped to declared capabilities — 'never a permanent status... not a status conferred on an operator' (§2).",
        "evidence": "decisions/adr/ADR-039-...md:82-83 (conformance not a conferred status), :85-108 (§3 index grants nothing), :111-135 (§4 absence)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Constrains per-level COPY: level pages must not imply a level is a granted/permanent status or that listing = approval/authorisation. No routing impact. No ADR needed if copy keeps the index/self-publication framing; the forbidden-framing list in check-technical-registry-page enforces the vocabulary side."
      },
      {
        "item": "ADR-044 — BanzAI Local Qwen Inference Runtime",
        "current_state": "Governs the local language layer (Qwen3-4B via llama.cpp): internal-only, Rust owns all safety-critical control, model is non-normative, cannot certify/approve/license/govern. No route, navigation, per-level, or public-copy surface.",
        "evidence": "decisions/adr/ADR-044-...md:33-43 (decision), :60-72 (what the model must never do)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Entirely orthogonal to routes-per-level + copy changes. UNAFFECTED by M2.19G.4."
      },
      {
        "item": "GUARD check-banzai-single-interface (make banzai-single-interface-check)",
        "current_state": "HARD gate on ADR-067. Assertions: (1) no website/app/banzai/validar folder; (2) website/app/banzai/ has NO route subfolders and NO files other than page.tsx; (3) no 'banzai/validar' in middleware/next.config/app (incl. comments); (4) no link/import to /banzai/validar or ValidationWorkbench; (5) no 'BanzAI Web' brand on active surfaces; (6) no 'Validation Workbench' product name; (7) not in sitemap; (8) VALIDATION_STEP_IDS = exactly the 9 canonical ids; (10) VALIDATION_TARGETS = exactly one key 'operator-zero'; (11) page imports parseBanzaiState; (12) workbenchDeepLink returns /banzai?mode=validation.",
        "evidence": "tools/check-banzai-single-interface.sh:56-77 (assertions 1-2, the subfolder ban), :130-166 (steps + single target), :168-180 (deep-link)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "THE decisive blocker. Assertion 2 (lines 64-77) FAILS the build if /banzai gains ANY route subfolder — so routes-per-level UNDER /banzai is impossible without (a) a superseding ADR of ADR-067 D-067-02 AND (b) editing this guard. If per-level is done via closed query params in the one page.tsx, this guard is satisfied as-is (REUSE_ASIS). Routes-per-level OUTSIDE /banzai are not touched by this guard."
      },
      {
        "item": "GUARD check-banzai-operator-validation-mode-check (operator-validation labels)",
        "current_state": "Locks the literal validation-mode copy (ADR-068 §4.1): MODES validation entry name = 'Validar operador'; VALIDATION_COPY.modeLabel = 'Validar operador'; VALIDATION_COPY.header = 'Validação técnica de implementação'; and BanzaiAgent.tsx renders MODES.map.",
        "evidence": "tools/check-banzai-operator-validation-mode-check.sh:36-46 (label assertions), :50-52 (renders MODES)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Any copy change to the validation mode label/header (e.g. per-level renaming) requires editing this guard's exact-string assertions AND, since §4.1 is an ADR clause, a note/superseding decision. Current MODES: banzai-agent.ts:75 'Validar operador'."
      },
      {
        "item": "GUARD check-banzai-operator-experience (onboarding + validation canonical-options)",
        "current_state": "OE1-OE13: no hardcoded operator/impl registry const in TS (fetched from Rust /banzai/validate/registry + /validate/options); retired 'last_known_state' field forbidden; onboarding validates version/profile/environment against CANONICAL_OPTIONS (fail-closed invalid_option); onboarding UI uses fetchOptions + human labels CANDIDATE_STATE_LABEL/ORIGIN_STATE_LABEL; operator list built only via mapCatalogueToOperators. Comment (line 5) names both 'Validar operador' and 'Onboarding de operador' surfaces.",
        "evidence": "tools/check-banzai-operator-experience.sh:40-110 (OE1-OE13)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Does NOT assert routes or the mode-name literals — it asserts the Rust-sourced data contract. Routes-per-level + copy changes are compatible AS LONG AS the option/registry sources stay Rust-fetched and no static operator const is (re)introduced. If per-level introduces a new option set it must flow through the same Rust registry endpoints (extend, not bypass)."
      },
      {
        "item": "GUARD check-technical-registry-page (technical-registry naming)",
        "current_state": "Locks /registo-tecnico: must contain literal 'BANZA Technical Registry'; root-verifiable framing; L2 scoping; the six closed states NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED; 'directório de participantes' distinction + listed≠admission≠authorisation; honest empty/pre-produção state; footer+sitemap links. NEGATION-AWARE forbidden-framing list (BANZA CA, operator certificate, BanzAI Web, Validation Workbench, /banzai/validar, four/five layers, BanzAI-as-a-layer, L0-L4 as certification tiers, BNA authorisation, Operador Zero called simulador).",
        "evidence": "tools/check-technical-registry-page.sh:30-41 (forbidden list), :55-79 (required content), :90-92 (footer+sitemap)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "CRITICAL for per-level copy: forbidden entry 'L0-L4 as certification tiers' (line 38) will FAIL any page copy that presents L0-L4 as certification niveis/tiers even as a positive claim. Routes/copy that name levels as certification tiers need this guard's forbidden-list reconciled (and likely an ADR clarifying level vocabulary). Adding new links/sections is otherwise fine."
      },
      {
        "item": "GUARD check-operator-onboarding (onboarding security contract)",
        "current_state": "Enforces ADR-069 security invariants: Rust engine + vendored WASM present; well-known path parity Rust↔JS; no committed secrets (pepper/Resend empty defaults, no re_ key in git); dark-by-default (BANZAI_ONBOARDING_ENABLED:-0); hashes-only schema (otp_hash/session_hash/challenge_hash, no plaintext columns); same-origin /banzai/onboarding/ nginx proxy; __Host- + HttpOnly + SameSite=Strict cookie.",
        "evidence": "tools/check-operator-onboarding.sh:33-104 (invariants 1-7)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Purely security/persistence — no route-per-level or copy assertions except the fixed /banzai/onboarding/ same-origin proxy path. UNAFFECTED by copy changes and by routes-per-level unless the onboarding endpoint path itself moves (then invariant 6 must change)."
      },
      {
        "item": "GUARD check-banzai-no-orphan-tabs (no-orphan-tabs)",
        "current_state": "Every renderPanel() case in BanzaiAgent.tsx must correspond to a sidebar TABS key (guia/rfc/programadores/resultados + 'assistente'); no orphan/retired-analyser panel (trust/simb/manifest/conformidade/conformance/evidence/traces/receipts) may be a renderable case.",
        "evidence": "tools/check-banzai-no-orphan-tabs-check.sh:31-52",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "If routes-per-level adds a new renderable panel/tab, it MUST be added to both TABS and renderPanel or this guard fails. Adding a new sidebar tab + its panel in lockstep passes without ADR (it enforces symmetry, not a fixed tab set). Introducing a per-level panel whose id collides with the retired-analyser blocklist (line 51) would fail."
      },
      {
        "item": "RELATED GUARDS also touched by routes/nav changes (single-results-area, no-arbitrary-url, closed-target-registry, workbench-navigation-orchestration)",
        "current_state": "single-results-area: exactly ONE 'resultados' sidebar group + in-area RESULTS_VIEWS sub-views (not sidebar entries). no-arbitrary-url: browser sends only closed operator_id+implementation_id via isClosedId slug regex (never a URL/scheme/path); fetcher builds from registry-resolved canonical_origin+expected_host+path. closed-target-registry: Rust production_registry seeds exactly one operator (operator-zero) + operator-zero-ref-impl; UI builds list via mapCatalogueToOperators, no fictional operators. workbench-navigation-orchestration: MODES ask='Perguntar ao BanzAI' first, validation present; TABS groups recursos+resultados only (removed assistant/journey/secondary/primary); order Modos→journey divider→Recursos.",
        "evidence": "tools/check-banzai-single-results-area-check.sh:27-44; tools/check-banzai-no-arbitrary-url-check.sh:31-72; tools/check-banzai-closed-target-registry-check.sh:33-66; tools/check-banzai-workbench-navigation-orchestration.sh:38-85",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "no-arbitrary-url + closed-target-registry confirm the ADR-068 answer at guard level: level targets must be CLOSED slugs, never user URLs — routes-per-level must keep closed addressing. workbench-navigation-orchestration hard-codes the two-group model + Modos ordering, so a per-level nav restructure would need this guard reconciled. single-results-area forbids promoting per-level results to separate sidebar entries. MODES currently has THREE modes incl. onboarding (banzai-agent.ts:72/75/79) though this guard only asserts ask+validation."
      },
      {
        "item": "next_free_adr",
        "current_state": "Highest existing ADR is ADR-069 (decisions/adr/ADR-069-simple-secure-operator-onboarding.md). No ADR-070+ exists. next_free_adr = ADR-070. Consistent with memory (next_free_adr=ADR-070). Note repo-guards range in engines/banza-repo-guards/src/lib.rs must be bumped whenever a new ADR is added.",
        "evidence": "decisions/adr/ (ls: highest = ADR-069); confirmed no ADR-070 file present",
        "reuse_or_build": "N/A",
        "notes": "A superseding ADR for routes-per-level (if it contradicts ADR-067 D-067-02's single-route mandate) or for per-level certification vocabulary would be ADR-070."
      }
    ]
  },
  {
    "area": "CURRENT BanzAI UI surfaces + copy inventory (website/components/banzai/*) — real current-state documentation for M2.19G.4",
    "findings": [
      {
        "item": "Sidebar MODE label \"Validar operador\" (§25 primary CTA — CHANGE)",
        "current_state": "MODES[1] renders the primary sidebar mode button label as \"Validar operador\" (icon \"medal\"). The comment at :74 acknowledges the human-facing feature is \"Validar operador\" while the technical object is a specific implementation. This is a PRIMARY sidebar label shown to every user.",
        "evidence": "website/components/banzai/banzai-agent.ts:71-80 (MODES array; :75 name: \"Validar operador\")",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Also re-used verbatim as VALIDATION_COPY.modeLabel (:115) and in the empty-state prose \"Abra Validar operador\" (BanzaiValidationMode.tsx:668) and the onboarding CTA \"Ir para Validar operador\" (BanzaiOnboardingMode.tsx:459-461). Changing the label means updating all three call sites."
      },
      {
        "item": "Sidebar MODE label \"Onboarding de operador\" (§25 primary CTA — CHANGE)",
        "current_state": "MODES[2] renders the third sidebar mode button as \"Onboarding de operador\" (icon \"route\"). PRIMARY sidebar label.",
        "evidence": "website/components/banzai/banzai-agent.ts:76-79 (MODES[2] name: \"Onboarding de operador\")",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Duplicated as ONBOARDING_COPY.modeLabel (:133) AND ONBOARDING_COPY.header (:135), and rendered as the mode header via C.header (BanzaiOnboardingMode.tsx:154). Three call sites to keep in sync."
      },
      {
        "item": "Onboarding path card title \"Submeter novo operador\" (§25 — CHANGE)",
        "current_state": "ONBOARDING_COPY.paths.submit.title = \"Submeter novo operador\", desc = \"Criar uma candidatura e declarar a implementação e a sua origem canónica.\" Rendered as the middle (bordo-highlighted) path card AND reused as the section label above the add-operator form.",
        "evidence": "website/components/banzai/banzai-agent.ts:142; rendered at BanzaiOnboardingMode.tsx:178 (path card) and :292 (form section label C.paths.submit.title)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Sibling path titles: paths.published.title = \"Consultar operador publicado\" (:141, links to /registo-tecnico), paths.recover.title = \"Continuar candidatura\" (:143). The \"Continuar candidatura\" title also carries the flagged \"candidatura\" vocabulary."
      },
      {
        "item": "Onboarding origin CTA \"Emitir desafio de origem\" (§25 primary CTA — CHANGE)",
        "current_state": "The origin-proof primary action button on each implementation row reads \"Emitir desafio de origem\" (hardcoded string, not from ONBOARDING_COPY). After issuing, a second button uses C.origin.verifyCta = \"Verificar origem\" (:162).",
        "evidence": "website/components/banzai/BanzaiOnboardingMode.tsx:443 (hardcoded \"Emitir desafio de origem\"); verify CTA at :444 via C.origin.verifyCta (banzai-agent.ts:162)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "\"Emitir desafio de origem\" is hardcoded inline, NOT in the copy constants file — a redesign must edit the JSX directly. The onboarding origin block copy (title/intro/verifyCta/verified) lives in ONBOARDING_COPY.origin (banzai-agent.ts:158-164)."
      },
      {
        "item": "\"candidatura\" vocabulary across onboarding copy + JSX (§25 — CHANGE)",
        "current_state": "The word \"candidatura\"/\"candidaturas\" is the pervasive user-facing noun for an onboarding record. Copy constants: intro \"Registe uma candidatura…\" (:136), boundary \"Uma candidatura não é um operador publicado…\" (:138), recover desc (:143), sessionNotice \"…Registo de Candidaturas privado\" (:166). JSX: section label \"As suas candidaturas\" (:280), empty state \"Ainda não tem candidaturas. Crie uma abaixo.\" (:284), error \"Não foi possível criar a candidatura.\" (:267), primary CTA \"Criar candidatura\" (:300).",
        "evidence": "website/components/banzai/banzai-agent.ts:136,138,143,166; website/components/banzai/BanzaiOnboardingMode.tsx:267,280,284,300",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "\"candidato\" as a user-facing word does NOT appear — only the internal type name Candidate / candidate_id and the code comment \"A candidate is never a published operator\" (:77). \"aprovado\" does NOT appear as a positive state label anywhere; only negated boundary forms exist (\"não aprova\", banzai-agent.ts:43,138)."
      },
      {
        "item": "Backend state enum labels incl. \"ORIGIN_PENDING\" (§25 flags ORIGIN_PENDING as primary label)",
        "current_state": "Raw backend enums are NEVER shown bare — each is mapped to a human PT label via labelFor(). CANDIDATE_STATE_LABEL maps ORIGIN_PENDING → \"Origem por verificar\" (:27); the candidate state badge renders labelFor(CANDIDATE_STATE_LABEL, candidate.state) (:346). ORIGIN_STATE_LABEL maps ORIGIN_PENDING → \"Origem por verificar\", ORIGIN_CHALLENGE_ISSUED → \"Desafio de origem emitido\", ORIGIN_VERIFIED → \"Origem verificada\", ORIGIN_FAILED → \"Verificação de origem falhou\" (:36-41); the impl row badge renders labelFor(ORIGIN_STATE_LABEL, impl.origin_verification_state) (:429). VALIDATION_STATE_LABEL maps NOT_STARTED/VALIDATING/VALIDATION_COMPLETED/BLOCKED (:42-47), rendered at :437.",
        "evidence": "website/components/banzai/BanzaiOnboardingMode.tsx:23-51 (three label maps + labelFor); rendered at :346, :429, :437",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "IMPORTANT NUANCE for §25: the raw \"ORIGIN_PENDING\" token is a backend enum KEY (technical, KEEP) and is never displayed bare — the user already sees the PT string \"Origem por verificar\". If §25 wants a different primary label, the change target is the map VALUE at :27/:37, not the enum key. Unknown values fall through verbatim (labelFor, :48-51) — a genuinely unmapped enum COULD leak raw."
      },
      {
        "item": "Validation step status shown as bare status CODE alongside PT label (bare status display)",
        "current_state": "In the active-step detail badge the status is rendered as \"{st.status} · {STATUS_LABEL_PT[st.status]}\" — i.e. the RAW code (VERIFIED/PENDING/FAILED/BLOCKED/NOT_EVALUATED) is shown bare next to its PT gloss. In the Relatórios sub-view the status chip shows only the bare code \"{rs.status}\" (:749) with no PT gloss.",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:431 ({st.status} · {STATUS_LABEL_PT[st.status]}); :748-749 (bare {rs.status}); STATUS_LABEL_PT defined at website/components/banzai/validationJourney.tsx:156-162 (Não avaliado/Pendente/Verificado/Falhou/Bloqueado)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "NOTE re §25 \"bare PASS\": the validation-mode step vocabulary is VERIFIED/FAILED/BLOCKED — NOT \"PASS\". There is no bare \"PASS\" in the validation OR onboarding surfaces. Bare \"PASS\" as a user-facing word appears only elsewhere: BanzaiAgent.tsx:678 (\"PASS é evidência verificável…\") and AUTHORITY_COPY.passIsEvidence \"PASS é evidência técnica, não certificado.\" (banzai-agent.ts:190) — both boundary statements, not step verdicts."
      },
      {
        "item": "VALIDATION_COPY block — header/intro/entities/hints/resultPhrase",
        "current_state": "modeLabel \"Validar operador\" (:115); header \"Validação técnica de implementação\" (:116, more precise than the sidebar label); intro \"Seleccione um operador e uma das suas implementações publicadas…\" (:117-118); entities \"O operador é a entidade responsável. A implementação é o sistema técnico avaliado.\" (:119); onlyOperatorHint \"Operador disponível para demonstração: Operador Zero\" (:120); originNote \"…O Rust decide; a IA nunca decide. A Prontidão de Certificação não é um Registo de Certificação.\" (:121-122); resultPhrase(impl,operator,profile,version,environment) template (:124-125).",
        "evidence": "website/components/banzai/banzai-agent.ts:114-126; rendered in BanzaiValidationMode.tsx:107-109 (header/intro/entities), :151 (onlyOperatorHint), :483 (originNote), :682-688 (resultPhrase)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "header \"Validação técnica de implementação\" is ALSO shown in the compact ValidationHeader (BanzaiValidationMode.tsx:271). onlyOperatorHint names \"Operador Zero\" (the demo operator) — the only operator-name mention here."
      },
      {
        "item": "ONBOARDING_COPY block — intro/boundary/scope/email/otp/origin/sessionNotice",
        "current_state": "intro (:136, candidatura vocab), boundary (:137-138, \"Uma candidatura não é um operador publicado…\"), scope \"Âmbito inicial: Angola (AOA)…\" (:139), email {label \"Email institucional\", placeholder \"operador@exemplo.ao\", cta \"Enviar código de acesso\", hint} (:145-150), otp {label \"Código de acesso\", cta \"Confirmar código\", resend \"Reenviar código\", hint} (:151-157), origin {title \"Prova de controlo da origem canónica\", intro, verifyCta \"Verificar origem\", verified} (:158-164), sessionNotice (:166).",
        "evidence": "website/components/banzai/banzai-agent.ts:132-167; rendered in BanzaiOnboardingMode.tsx:154-156 (header/intro/boundary), :187/:303 (scope), :192-201 (email), :209-219 (otp), :410/:420 (origin msgs), :276 (sessionNotice)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "email/otp form copy is passwordless-auth UX; boundary paragraph is the neutrality/no-authority disclaimer (\"não movimenta fundos, não concede autorização regulatória e não admite em nenhum scheme\") — likely KEEP the neutrality guarantees even if wording changes."
      },
      {
        "item": "Onboarding add-operator + add-implementation form field copy (JSX-hardcoded)",
        "current_state": "Add-operator form: inputs \"Nome do operador\" / \"Nome institucional (opcional)\" (:294-295), CTA \"Criar candidatura\" (:300). Add-implementation form: \"Nome da implementação\" (:361), \"Domínio canónico (ex.: op.exemplo.ao)\" (:362), selects \"Versão do protocolo…\"/\"Perfil…\"/\"Ambiente…\" (:366-375, options from Rust registry), CTA \"Adicionar implementação\" (:381-383), errors \"Domínio inválido.\"/\"Versão/perfil/ambiente têm de ser um valor canónico suportado.\" (:337-339). Candidate card helper line \"Um operador; cada implementação declara a sua própria versão, perfil e ambiente e prova a sua própria origem.\" (:349).",
        "evidence": "website/components/banzai/BanzaiOnboardingMode.tsx:294-303 (operator form), :360-383 (implementation form)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "All these strings are hardcoded inline in the JSX (NOT in banzai-agent.ts) — a redesign editing copy must touch the component, not just the constants file."
      },
      {
        "item": "Onboarding auth/session + navigation micro-copy (JSX-hardcoded)",
        "current_state": "\"A carregar…\" (:168), info \"Código enviado. Verifique o seu email.\" (:114), error strings for rate-limit/delivery/invalid (:115-121, :132-138), \"Sessão iniciada como {email}\" (:273), \"Terminar sessão\" (:274), \"Actualizar\" (:281), \"Voltar\" (:201), publish hint \"Publicar em: {url}\" (:452), origin verify feedback \"Não foi possível obter o documento no domínio…\"/\"A origem ainda não confere…\" (:421-422), post-verify CTA \"Ir para Validar operador\" (:460).",
        "evidence": "website/components/banzai/BanzaiOnboardingMode.tsx:114-121,132-138,168,201,273-281,421-422,452,460",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "\"Ir para Validar operador\" (:460) transitively depends on the MODES \"Validar operador\" rename. Error/log strings (rate_limited etc.) are user-facing PT, not raw enums — mostly KEEP semantics."
      },
      {
        "item": "Validation Fase 0 setup copy (BanzaiValidationMode.tsx)",
        "current_state": "Section chip \"Fase 0 · contexto\" (:105), selector labels \"1 · Operador\" (:112) / \"2 · Implementação\" (:156), loading \"A carregar operadores do registo técnico…\" (:115), empty/error states (:120-123), KV keys per operator (\"estado de publicação\",\"implementações\",\"registo técnico\", :143-145) and per implementation (\"versão\",\"ambiente\",\"perfil\",\"versão do protocolo\",\"origem canónica\",\"estado no registo\",\"elegível\", :176-181), footer hints (:196-198).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:97-203 (ValidationContextSetup)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "\"Fase 0\" appears BOTH here (\"Fase 0 · contexto\") and in onboarding (\"Fase 0 · onboarding\", BanzaiOnboardingMode.tsx:152) — two different modes both label themselves Fase 0. KV keys are field labels (mostly KEEP)."
      },
      {
        "item": "Validation compact header controls + reset confirmation dialog",
        "current_state": "Header shows VALIDATION_COPY.header (:271), implementation display_name or \"Seleccione uma implementação\" (:272), overall status badge via STATUS_LABEL_PT (:276-279), \"Alterar alvo\" button (:282), \"Reiniciar sessão\" button (:286). confirmReset() window.confirm text: \"Reiniciar a sessão de validação? Isto limpa apenas o estado efémero desta jornada…\" (:258-260). Static metadata grid keys: operador/implementação/ambiente/perfil/versão do protocolo/jornada (:293-298).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:253-303 (ValidationHeader)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "\"Alterar alvo\"/\"Reiniciar sessão\" are session controls. The confirm() copy is a native browser dialog string."
      },
      {
        "item": "Validation workspace step-detail action buttons",
        "current_state": "State-dependent primary/ghost/muted buttons: \"A executar…\"/\"Cancelar\" (:367-369); journey done: \"Ver resumo\"/\"Ver Resultados\"/\"Exportar JourneyReceipt\"/\"Executar novamente\" (:376-379); blocked: \"Ver bloqueio\"/\"Consultar documentação\"/\"Executar novamente\" (:386-389); receipt: \"Ver receipt\"/\"Executar novamente\" (:396-398); start: \"Executar jornada completa\"/\"Executar primeira etapa\" (:405-406); mid: \"Executar esta etapa\"/\"Executar a partir daqui\" (:412-413); ghost \"Explicar este resultado\" (:357-360). Step chip \"Etapa {num} · motor {engine}\" (:425).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:334-437 (ValidationWorkspace)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Certification block (:476-479): \"Prontidão de Certificação: {readiness}. Estado de Certificação: NOT_CERTIFIED. …nunca devolve CERTIFIED (ADR-068 §4.10)\" — honest technical state, KEEP the NOT_CERTIFIED guarantee."
      },
      {
        "item": "Validation right context panel (ValidationContextPanel) section copy",
        "current_state": "Sections: \"PROGRESSO\" with \"{evaluated}/{total} avaliadas\" + progressLabel + \"Prontidão de Certificação\"/\"Estado de Certificação\" (:518-534); \"PRÓXIMA ACÇÃO\" (:537-549); \"ENDPOINT SELECCIONADO\" KVs (:552-561); \"BLOQUEIOS ({n})\" with \"Abrir etapa →\" (:564-583); \"EVIDÊNCIA DA ETAPA ({n})\" (:585-595).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:511-597 (ValidationContextPanel)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "Contextual telemetry copy; mostly technical field labels. \"Prontidão de Certificação\"/\"Estado de Certificação\" appear here AND in workspace AND in Resultados resumo (:692-693) — consistent vocabulary to preserve."
      },
      {
        "item": "Validation Resultados area (title + sub-views + empty state)",
        "current_state": "ResultsSubView tabs RESULTS_VIEWS: Resumo/Receipts/Relatórios/Artefactos/Traces/Evidence Bundle (:62-70). H2 \"Resultados\" + subtitle \"Uma única área para o resultado da validação de operador…\" (:641-642). Empty state prose \"…Abra Validar operador, seleccione um operador e uma implementação…\" (:668). Resumo shows resultPhrase (:682-688). Evidence note \"Evidência técnica verificável, obtida do endpoint público. Não é certificado nem aprovação.\" (:810). Bottom link \"Explicar estes conceitos no BanzAI →\" (:814-816).",
        "evidence": "website/components/banzai/BanzaiValidationMode.tsx:61-70,620-818 (ValidationResultsPanel)",
        "reuse_or_build": "CHANGE_GOVERNED",
        "notes": "Empty-state \"Validar operador\" (:668) and subtitle \"validação de operador\" (:642) transitively depend on the mode rename. Sub-view names Receipts/Traces/Evidence Bundle are English technical terms kept as-is."
      },
      {
        "item": "Top-level BANZAI_AGENT shell copy (subtitle/boundary/hero/placeholder)",
        "current_state": "name \"BanzAI\" (:33), subtitle \"Interface interactiva do protocolo · consulta, valida e orienta\" (:35), assistantIntro (:37-38), heroTitle/heroText (:39-41), boundary (:42-43, long neutrality paragraph \"…não aprova, não certifica, não licencia, não publica operadores, não movimenta fundos…\"), agentBoundaryTop \"guia · invoca ferramentas · explica · não decide\" (:44), shortPhrase \"BanzAI guia; os motores verificam; a evidência prova; a governança decide.\" (:45), assistantPlaceholder (:46-47).",
        "evidence": "website/components/banzai/banzai-agent.ts:32-48 (BANZAI_AGENT)",
        "reuse_or_build": "REUSE_EXTEND",
        "notes": "This is the shared shell chrome (ask mode). Boundary paragraph is the core neutrality guarantee — KEEP substance. Not specifically flagged by §25 but adjacent to the surfaces being restyled."
      },
      {
        "item": "Nav/tab structure: WbTab/WbMode types, TAB_META, TABS, MODES icons",
        "current_state": "WbTab = assistente|guia|rfc|programadores|resultados (:17-22); WbMode = ask|validation|onboarding (:27). TAB_META names: Perguntar ao BanzAI/Guia/Referência/Programadores/Resultados (:85-91). TABS groups: resultados (group \"resultados\"); guia/rfc/programadores (group \"recursos\") (:96-101). MODES icons: chat/medal/route (:71-80).",
        "evidence": "website/components/banzai/banzai-agent.ts:17-101",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "The Recursos nav labels (Guia/Referência/Programadores) and Resultados are NOT flagged by §25 — structural, keep. Tab KEYS are declared stable (comment :83-84) so panel wiring keeps working; a redesign should change display names not keys."
      },
      {
        "item": "BADGES status chips array",
        "current_state": "BADGES = [\"Motor por omissão: Qwen local\", \"Inferência local (on-host)\", \"Sem chamadas externas\", \"Estado por resposta\", \"Não normativo\", \"Pré-produção do protocolo\"].",
        "evidence": "website/components/banzai/banzai-agent.ts:183",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Technical/status badges on the shell; not flagged by §25. \"Pré-produção do protocolo\" and \"Não normativo\" are honesty/boundary markers to preserve."
      },
      {
        "item": "AUTHORITY_COPY + FORBIDDEN_PHRASES (boundary guarantees, unit-tested)",
        "current_state": "AUTHORITY_COPY: noCertify \"BanzAI não certifica, não aprova e não emite certificados.\", runsTools, caDecides, passIsEvidence \"PASS é evidência técnica, não certificado.\", preProduction (:186-193). FORBIDDEN_PHRASES lists claims that must NEVER appear (\"operador certificado\", \"certificação automática\", \"BANZA CA\", etc.) (:196-234).",
        "evidence": "website/components/banzai/banzai-agent.ts:186-234",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "These are neutrality invariants asserted by banzai-agent.test.ts (e.g. :91 checks passIsEvidence contains \"não certificado\"). Any copy redesign must keep AUTHORITY_COPY present and avoid FORBIDDEN_PHRASES — the word \"PASS\" here is a boundary statement (KEEP), not a step verdict."
      },
      {
        "item": "DRAFT_COPY (developer draft tool, non-authoritative)",
        "current_state": "title \"Validar rascunho\", subtitle (\"…nunca devolve VERIFIED nem Prontidão de Certificação\"), banner \"Rascunho local · não publicado · não produz evidência oficial\", resultLabel \"DRAFT_VALIDATION_RESULT\".",
        "evidence": "website/components/banzai/banzai-agent.ts:171-177 (DRAFT_COPY)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "resultLabel \"DRAFT_VALIDATION_RESULT\" is a technical/log token (KEEP). banner/subtitle are non-authoritative disclaimers to preserve. Not flagged by §25."
      },
      {
        "item": "banzaiUi.tsx contains NO user-facing copy",
        "current_state": "banzaiUi.tsx exports only the Ico line-icon component (PATHS icon set incl. chat/medal/route/shield/coins used by validation & onboarding) and the CARD tailwind class. No labels, no strings shown to users.",
        "evidence": "website/components/banzai/banzaiUi.tsx:1-53 (icons + CARD constant only)",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Nothing to change here for copy. Relevant only because both modes import Ico/CARD from it — a redesign that adds icons (e.g. a renamed CTA) would extend PATHS/IconKey here."
      },
      {
        "item": "STEP_META / validation step titles (validationJourney.tsx)",
        "current_state": "The 9 journey steps: 1 Discovery, 2 Manifest, 3 Keys, 4 Conformidade, 5 Interoperabilidade, 6 Confiança, 7 Federação, 8 Evidence Bundle, 9 Prontidão de certificação; each with a Rust engine name (banza-target-registry, banza-operator-manifest, banza-trust, banza-conformance, banza-l2-readiness, banza-l3-readiness, banza-evidence-bundle). STEP_META is derived from STEPS and consumed by BanzaiValidationMode via STEP_META/STEP_ICON.",
        "evidence": "website/components/banzai/validationJourney.tsx:39-120 (STEPS/STEP_META); STATUS_LABEL_PT at :156-162",
        "reuse_or_build": "REUSE_ASIS",
        "notes": "Step titles mix EN (Discovery/Manifest/Keys) and PT (Conformidade/Confiança/Federação). engine strings are technical identifiers surfaced in UI (\"motor {engine}\") — KEEP. Documented here because BanzaiValidationMode.tsx imports STEP_META/STATUS_LABEL_PT from this file (not a target file but load-bearing for the validation surface)."
      }
    ]
  }
]
```
