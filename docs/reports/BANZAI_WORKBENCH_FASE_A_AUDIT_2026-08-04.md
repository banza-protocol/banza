# Fase A — Auditoria de Reconstrução do BanzAI Workbench

> Milestone: reconstrução da superfície de validação de operadores do BanzAI.
> Data: 2026-08-04 · HEAD `598a7e03` · Runtime implantado `356c01ef` (defasado).
> Base: síntese de 8 auditorias de área bem-sucedidas (frontend, backend, engines Rust,
> jornada de 9 passos, segurança §10, dead-code, docs/contratos §2, whitepaper canónico).
> 3 áreas (operator-zero, runtime-state, tests-guards) falharam por erro de infra e são
> cobertas por cruzamento das restantes + reexecução dirigida.
> Natureza: relatório de diagnóstico. Não altera código. Conflitos canónicos são
> **registados** (Anexo A), não silenciados.

---

## 1. Mapa do Sistema

### 1.1 Frontend (`website/`)
Uma única shell cliente sempre montada (`BanzaiAgent`) dentro de um provider de workspace
montado uma vez por `app/banzai/layout.tsx`. Quatro segmentos de rota servidor (global,
operador, implementação) alimentam a mesma sessão via `BanzaiRouteBinder` →
`BanzaiWorkspaceProvider`. Três modos: `ask`, `validation`, `onboarding`.

- Entradas servidor: `website/app/banzai/page.tsx`, `layout.tsx`, `operador/[operatorId]/page.tsx`, `operador/[operatorId]/[implementationId]/page.tsx`
- Shell/modos: `website/components/banzai/BanzaiAgent.tsx`, `BanzaiValidationMode.tsx`, `BanzaiOnboardingMode.tsx`, `ProgramadoresTools.tsx`, `DraftValidationTool.tsx`
- Estado/glue: `website/lib/banzaiState.ts`, `banzaiValidation.ts`, `banzaiValidateClient.ts`, `banzaiOnboardingClient.ts`
- Jornada cliente (SSOT): `website/components/banzai/validationJourney.tsx` (hook `useValidationSession` + catálogo `STEPS`)
- Runtime strip (SSOT vivo): `website/components/reference/BanzaiRuntimeStrip.tsx` — **montado só em `/referencia/banzai`, NÃO na app `/banzai`**

### 1.2 Backend (`services/banzai-api/`)
Serviço Node ESM zero-framework, glue sobre engines Rust/WASM vendorizados (`src/rustkb`,
`src/journeywasm`, `src/onboardingwasm`, `src/validatewasm`).

- HTTP/router: `src/server.js` (health, runtime, ask, sources, index, validate/*, onboarding/*)
- Pipeline `/ask` (Rust-first): `src/pipeline.js`, `src/grounded-synthesis.js`, `src/knowledge.js`, `src/provider.js`, `src/answerContract.js`, `src/concurrency.js`, `src/limits.js`
- Validação endpoint-originated (ADR-068): `src/validate.js`, `src/fetcherClient.js`, `src/validatewasm/` (7 cópias próprias: conformance, evidence_bundle, l2_readiness, l3_readiness, operator_manifest, target_registry, trust)
- Onboarding (ADR-069): `src/onboarding/*` (env-gated OFF por `BANZAI_ONBOARDING_ENABLED`)
- Infra: `Dockerfile` (`ENV LLM_PROVIDER=mock`, `BANZAI_MODE=demo`), `infra/banza-network/compose.yml`, `nginx/conf.d/banza.conf`

### 1.3 Engines Rust (`engines/`)
Os 9 passos da jornada canónica (endpoint-originated, ADR-068) têm engine determinístico
real ligado:

| Passo | Engine responsável | Estado |
|---|---|---|
| 1 Discovery | `banza-target-registry` | ligado |
| 2 Manifest | `banza-operator-manifest` | ligado |
| 3 Keys | `banza-trust` | ligado (partilha com passo 6) |
| 4 Conformance | `banza-conformance` | ligado |
| 5 Interoperability | `banza-l2-readiness` | ligado |
| 6 Trust | `banza-trust` | ligado (partilha com passo 3) |
| 7 Federation | `banza-l3-readiness` | ligado |
| 8 Evidence Bundle | `banza-evidence-bundle` | ligado |
| 9 Certification Readiness | `banza-target-registry` (agregação) | ligado — **NÃO usa `banza-certification`** |

- Fetch seguro (único componente que alcança endpoints de operador): `banza-artifact-fetcher` (serviço `banza-fetcher`)
- Core Q&A: `banzai-query-core` (rlib) + `banzai-api-kb` (superfície WASM)
- Onboarding: `banzai-onboarding`
- Órfãos/legado ao runtime: `banza-certification` (autoridade de Registo de Certificação, sem WASM, não ligada), `banza-reference-trust-model`, `banzai-evidence`, `banza-l1-readiness`, `banza-l4-readiness`, `banza-security-assurance` (WASM), `banza-simb` (WASM)

### 1.4 Duas jornadas coexistentes
- **Modelo A (7 passos, legado, VIVO via `/ask`)**: `engines/banzai-operator-journey` + `services/banzai-api/src/journey.js` — rastreador de navegação/evidência recolhida no browser; vocabulário `guia/manifest/conformidade/trust/federacao/evidence_bundle/traces`; estados `valid/evidence_ready`; pontuação 0-100. **Não executa engines de protocolo.**
- **Modelo B (9 passos, canónico)**: `validate.js` + `validationJourney.tsx` — verdictos Rust origin-bound, recibos com digests. É a jornada autoritativa.

---

## 2. Reconciliação de Premissas

| Premissa do prompt | Realidade verificada | Veredicto |
|---|---|---|
| runtime é genuinamente local_qwen, não mock | Provider **implantado em produção é local_qwen** (`GET /banzai/runtime` → `mode:local_qwen, model_available:true, external_calls:false`), via override de `.env` na VPS. Mas o **default committed do repo é mock** (`Dockerfile:19 ENV LLM_PROVIDER=mock`; `compose.yml ${LLM_PROVIDER:-mock}`; `BANZAI_BENCHMARK_APPROVED=false`). Independentemente do provider, os **verdictos de validação são 100% Rust determinístico** (`qwen_calls=0`, `external_model_calls=0`). | **parcial** — prod=local_qwen, repo-default=mock; núcleo de validação real |
| /referencia/banzai limpo mas BANZA_SVG_REGISTRY.md desatualizado | `/referencia/banzai` usa `BanzaiRuntimeStrip` ativo e limpo. `BANZA_SVG_REGISTRY.md:142,253` estão desatualizados **e factualmente errados** (SVGs vivem neste repo, não em `~/banzai`). Mais 5 docs com refs mortas a `~/banzai` (ADR-075). | **confirmado** (com expansão) |
| UI de 9 passos presente mas contratos de engine parcialmente ausentes | Os 9 passos estão **UI-presentes E engine-backed reais** (mais forte que a premissa). Falta o **contrato versionado da máquina de estados** + campos §4 (`retryable`,`blocked_by`,`started_at`,`completed_at`) + estado `RUNNING`; `banza-certification` está órfã. | **parcial** |
| secure-fetcher existe | `banza-artifact-fetcher` a alto padrão (ADR-068 §19). Único residual: gap SSRF IPv6 NAT64/6to4. | **confirmado** |
| (implícita) Discovery/Keys/Interop/Prontidão sub-modelados; sessão in-browser | Descreve o Modelo A. No Modelo B canónico esses 4 são passos de 1ª classe engine-backed. O problema real é a **coexistência de duas jornadas**. | **falso** |
| (implícita) verdictos mock/hardcoded na validação | Nenhum mock/PASS hardcoded na via de validação. Os tokens "mock" são labels honestos de modo de runtime. | **falso** |

**Conclusão de premissas:** a milestone assume um sistema mais quebrado do que é. Não há
verdictos falsos; os 9 passos são reais e determinísticos; o fetcher é seguro. O trabalho
real é **convergência (2 jornadas→1), camada de contrato de execução, reconstrução de
interface, endurecimento residual, limpeza e resolução dos 11 conflitos canónicos** — não
a construção de motores em falta.

---

## 3. Matriz de Gaps — Jornada de 9 Passos

Todos os passos: estado real, engine ligado, recibo origin-bound. Gaps transversais
(cross-cutting) aplicam-se a todos: falta estado `RUNNING`, campos §4
(`started_at`/`completed_at`/`retryable`/`blocked_by`), política de retry declarada,
invalidação de dependentes, reprodução a partir de artefactos.

| Passo | Estado atual | Gap | Engine | Esforço |
|---|---|---|---|---|
| 1 Discovery | REAL (`registry_validate_discovery_json`+`registry_step_status_json`); 5 estados; digests+recibo | Só transversais | `banza-target-registry` | S |
| 2 Manifest | REAL (`operator_manifest_validate_json` sobre corpo fetch) | Só transversais | `banza-operator-manifest` | S |
| 3 Keys | REAL mas **partilha engine+input+chamada WASM com passo 6** (arm partilhado `keys\|trust`) | Não diferenciado do Trust; falta check dedicado só de material de chave | `banza-trust` | M |
| 4 Conformance | REAL (`conformance_validate_report_json`) | Só transversais | `banza-conformance` | S |
| 5 Interoperability | REAL (`banza-l2-readiness`, ~720 linhas; idempotência/double-entry/settlement) | Só transversais (NÃO sub-modelado) | `banza-l2-readiness` | S |
| 6 Trust | REAL (mecanismo idêntico ao passo 3) | Sobreposição com passo 3 | `banza-trust` | M |
| 7 Federation | REAL (`banza-l3-readiness`, ~763 linhas; par federação/traces cross-operator/BRL) | Só transversais | `banza-l3-readiness` | S |
| 8 Evidence Bundle | REAL (`evidence_bundle_validate_json`; artefactos+SHA-256) | Sem revalidação/reprodução do bundle a partir de digests fixados | `banza-evidence-bundle` | M |
| 9 Certification Readiness | REAL, agregação fail-closed (`registry_certification_readiness_json` → READY/BLOCKED; sempre NOT_CERTIFIED) | (a) usa target-registry, não `banza-certification`; (b) sem comparação entre corridas; (c) recomputa os 8 sempre | `banza-target-registry` | M |

**Capacidades da jornada:** existem `runOne`/`runAll`/`runFrom`/`cancel`/`reset` (5/9).
**Faltam:** from-first-unverified automático, invalidação de dependentes, reprodução a
partir de artefactos fixados, comparação entre corridas.

**Estados canónicos:** canon exige 6 `{NOT_EVALUATED,RUNNING,VERIFIED,PENDING,FAILED,BLOCKED}`;
impl TS tem 5 (sem `RUNNING`); contrato de recibo tem 4. `RUNNING` não existe em lado nenhum;
`NOT_EVALUATED` ausente dos enums de contrato.

---

## 4. Postura de Segurança (§10)

Forte. `banza-artifact-fetcher` implementa todos os controlos §10.1 (HTTPS-only, host
pinned da registry, port allowlist [443], resolve-once+validate-all+pinned IPs, sem
redirects, timeout connect+total, size cap streamed, media-type allowlist, rejeita
Content-Encoding não-identity, TLS rustls+webpki sem flags danger, reason codes tipados,
logs sem segredos, rede isolada). Onboarding §10.2 (ADR-069): OTP HMAC-SHA256(pepper)
constant-time single-use, sessões ≥256-bit opacas, cookie `__Host-` HttpOnly+Secure+
SameSite=Strict, CSRF Origin allowlist, rate-limits Rust, fail-closed sem pepper. §10.3:
validação é read+compute puro (0 model calls), sem auto-publish, sem mutação via GET,
isolamento por owner_email.

**Achados residuais (defesa em profundidade):**
1. **[MÉDIO] Gap SSRF IPv6 transição** — `policy.rs classify_v6` não desembrulha NAT64 `64:ff9b::/96` (+RFC8215 `64:ff9b:1::/48`) nem 6to4 `2002::/16`, que embutem IPv4 arbitrário. Fix: extrair o IPv4 embutido e correr `classify_v4`; adicionar `192.88.99.0/24`.
2. **[BAIXO] Rate-limit confia em `CF-Connecting-IP`** — seguro só se o ingress da origem estiver firewalled às gamas Cloudflare. Confirmar/forçar.
3. **[BAIXO] OTP attempt-counter read-modify-write** — usar `attempts=attempts+1` + `WHERE verified_at IS NULL RETURNING`.
4. **[BAIXO] Onboarding writes sem idempotency keys/locking** — double-submit pode duplicar candidatos.
5. **[BAIXO] `Dockerfile` ignora lockfile** — trocar `npm install` por `npm ci`.
6. **[MÉDIO] `/runtime.commit` não deriva de git** — passthrough manual de `.env`; runtime `356c01ef` defasa de HEAD `598a7e03`.

---

## 5. Auditoria de Privilégios do Operador Zero (OZ)

OZ é o **único** alvo resolúvel pela registry Rust fechada (`operator-zero` /
`operator-zero-ref-impl`, origem `https://zero.banza.network`); qualquer outro id →
`target_not_resolved` (404). Nenhum caminho de runtime adiciona alvos de validação.

- `certification_status` sempre `NOT_CERTIFIED`, `certified:false` — sem auto-publish.
- **[a corrigir]** OZ é seed hardcoded no cliente: `banzaiState.ts` semeia `initialOperatorId="operator-zero"` numa visita `/banzai` limpa, contradizendo o comentário "nenhum operador — nem OZ — está hardcoded". Mitigado só porque a sessão re-resolve contra a registry fetch.
- **[a corrigir]** `operadorZeroStatus.ts:104` rotula o engine do passo 9 como `banza-certification`, mas o engine vivo é `banza-target-registry`.
- OZ como alvo de validação (não engine de verdicto) está correto e alinhado com ADR-052/053.
- **Nenhum** branch especial / bypass de assinatura / bypass de origem / bypass de trust / fixture injetada no resultado / PASS automático / publicação automática encontrado.

---

## 6. Dead-Code / Órfãos

**WASM órfão (ALTO):** 7 de 13 módulos em `website/lib/wasm/` sem consumidor de runtime
(só importados pelo próprio `*.test.ts`): `banza_l1/l2/l3/l4_readiness`,
`banza_security_assurance` (~389KB, o maior, fora de qualquer allowlist), `banza_simb`,
`operator_zero_core`. ~1.79MB. `l2`/`l3` duplicam as cópias vivas do servidor em
`src/validatewasm/`.

**Engines Rust órfãos ao runtime:** `banza-certification` (autoridade de Registo de
Certificação — referenciada por contratos/ADR-064/065/066, **não é dead-code, é
autoridade futura não-ligada**), `banza-reference-trust-model`, `banzai-evidence`
(substituído por query-core+api-kb), `banza-l1-readiness`, `banza-l4-readiness`.

**Módulos TS mortos:** `operadorZeroJourney.ts` (só teste), `operadorZeroClone.ts` +
`operadorZeroEngine.ts` (cadeia só-teste), maioria dos exports de `banzaOperatorJourney.ts`
(só `scanUpload` usado por `DraftValidationTool.tsx`), constantes mortas em `banzai-agent.ts`.

**Estado hardcoded (frontend):** BADGES estáticos em `BanzaiAgent.tsx` ("Sem chamadas
externas", "Motor por omissão: Qwen local") mostrados como pills verdes independentemente
do runtime observado; linha "Pré-produção..." hardcoded.

**Estado hardcoded (backend):** `knowledge.js` ENTRIES baked: "/operators vazio",
"production_certificates:false", verdicto de OZ "9/9, 6/6, 0 blockers" — renderizado como
facto, desacoplado de leitura viva.

**Docs com links mortos a `~/banzai`:** `BANZAI_RELEASE_QA_GATE.md:62-63`,
`BANZA_SVG_REGISTRY.md:142,253`, `OPERATOR_NEUTRALITY_TERMINOLOGY.md:4,40`,
`CLAUDE_BASE.md:6`, `PHASE_R10_...md:4,115`, `CLAUDE.md:12,202`.

---

## 7. Plano de Construção (Fases B–F) — resumo

- **Fase B — Contratos + Backend:** versionar a máquina de estados da jornada em `contracts/`; estender o schema de recibo (§4 fields); decidir estados canónicos (6); persistência durável de recibos (Postgres ADR-042); derivar `BANZA_COMMIT` de git; `npm ci`; diferenciar Keys/Trust; substituir claims baked de `knowledge.js`.
- **Fase C — Interface:** nav recolhível; coluna direita → drawer contextual; grupo JORNADA gated em `session.ready`; reutilizar `BanzaiRuntimeStrip` na app `/banzai`; remover seed OZ default; ordenação mobile; expor from-first-unverified/invalidação/comparação.
- **Fase D — E2E/Segurança:** fix SSRF IPv6; firewall CF-IP; OTP counter; idempotency onboarding; E2E reprodução/invalidação/comparação; garantia ADR-073 com provider real.
- **Fase E — Cleanup:** remover 7 WASM órfãos + wrappers + testes; reconciliar ADR-074 D-074-03; remover TS morto; decidir engines Rust órfãos; corrigir claims baked.
- **Fase F — Docs:** reescrever os 6 docs `~/banzai`; labels canónicos PT/EN dos 9 passos; spec normativa em `spec/`; ADR consolidador que regista/resolve os 11 conflitos.

O plano detalhado por workstream está no Anexo D.

---

## Anexo A — Registo de Conflitos Canónicos (§2 — registar, não silenciar)

Divergências contrato-vs-contrato / spec-vs-engine / doc-vs-doc reais. **Nenhum invariante
financeiro é enfraquecido.** Resolução proposta por decisão governada (ADR consolidador),
não por patch silencioso.

1. **Hierarquia de autoridade invertida.** `BANZA_REFERENCIA.md` ("O Que É Normativo") coloca Reference-em-prosa em #1 e `contracts/` em #4 — contradiz protocol-first (ADR-005 / CLAUDE.md "nasce primeiro no BANZA Protocol") e a própria Reference EN (`complete.md:898` "the binding artifact is the contract, spec or invariant"). **Resolução proposta:** ADR fixa contratos/schemas/invariantes no topo; prosa da Reference é explicativa, não normativa quando diverge.
2. **Assimetria PT/EN da Reference sobre autoridade.** A tabela N1-N5 e a lista ordenada existem só no PT; o EN lista tudo como co-normativo. **Resolução:** harmonizar EN à hierarquia reconciliada.
3. **Tabela N1-N5 "Hierarquia Normativa" (`BANZA_REFERENCIA.md:2088`) OMITE `contracts/` e `conformance/`** e coloca N2 Invariantes acima de N3 ADRs. **Resolução:** incluir contratos/conformance no topo.
4. **Divergência de forma de recibo.** O recibo demo vivo (`website/lib/operationReceipt.ts`) usa `certification_readiness:'PRE_PRODUCTION'` (fora do enum), `external_calls` (contrato exige `external_model_calls`) e `demo_only` (proibido por `additionalProperties:false`) — **não valida** contra `journey-receipt.production.schema.json` de que é nominalmente instância. **Resolução:** separar claramente schema demo vs produção OU alinhar o recibo demo ao contrato.
5. **Vocabulário de estados de passo em três lugares** (canon 6 / impl 5 / contrato 4). **Resolução:** unificar no modelo de 6.
6. **Duas jornadas vivas com vocabulários conflituantes** (Modelo A 7-passos via `/ask` vs Modelo B 9-passos canónico). Nomes divergem (`conformidade` vs `conformance`, `federacao` vs `federation`, `traces` vs `certification`). **Resolução proposta:** Modelo B = única autoridade de verdicto de 9 passos; Modelo A reenquadrado como *orientação da jornada global* (§3.1) sem estados que imitem verdictos, vocabulário unificado. **← decisão arquitetural mais vetável.**
7. **Atribuição de engine inconsistente para o passo 9.** `interoperability-certification.yaml` + `operadorZeroStatus.ts:104` atribuem a `banza-certification`; o engine vivo é `banza-target-registry` (agregação, alinhado com §5.9 "agregador determinístico"). **Resolução:** passo 9 = agregação de readiness (target-registry); `banza-certification` permanece autoridade separada (Registo de Certificação), fora da jornada de *prontidão*; corrigir atribuições.
8. **ADR-067 conflaciona duas máquinas de estado** (ciclo de vida do certificado ADR-066 vs status por-passo). **Resolução:** separar os dois vocabulários no ADR consolidador.
9. **ADR-074 D-074-03 justifica retenção de `banzaSimb.ts`+`banzaL{1..4}Readiness.ts`** como "usados pela draft tool" — mas `DraftValidationTool.tsx` não importa nenhum. **Resolução:** largar a cláusula e remover, ou ligar de facto.
10. **Tensão de autoridade de execução no passo 9.** `BANZAI_NINE_STEP_JOURNEY_REPORT.md:23` (vivo) diz "agregação TS sem engine"; ADR-068/OpenAPI dizem "Rust decide cada verdicto". **Resolução:** clarificar que agregação TS de verdictos já-decididos-em-Rust não é "decidir"; ou mover a agregação para Rust.
11. **`CLAUDE.md:12,202` ainda mapeia BanzAI para `~/banzai` separado** — contradiz ADR-075/041/054. **Resolução:** atualizar para monorepo.

---

## Anexo B — Baseline de Métricas §17 (hoje)

- Passos com engine Rust real ligado: **9/9**.
- Verdictos mock/hardcoded na via de validação: **0** (`qwen_calls=0`, `external_model_calls=0`).
- Modelo de estados: **incompleto** — contrato 4/6, impl 5/6, `RUNNING`=0; `NOT_EVALUATED` ausente dos enums.
- Campos §4 do objeto de estado no recibo: **~13/17** (faltam `started_at`,`completed_at`,`retryable`,`blocked_by`; digests só scalar).
- Capacidades da jornada: **5/9**.
- Recibos persistentes/auditáveis: **0** (efémeros no corpo HTTP).
- Alvos de operador resolúveis em runtime: **1** (só OZ).
- Contrato versionado da máquina de estados: **ausente**.
- Spec normativa em `spec/` para a jornada L2: **ausente**.
- Controlos secure-fetch §10.1: **todos PASS exceto gap SSRF IPv6 NAT64/6to4 (médio)**.
- `/runtime.commit` reflete HEAD: **NÃO** (`356c01ef` vs `598a7e03`).
- Provider LLM: **prod=local_qwen (override .env); repo-default=mock**.
- WASM órfão em `website/lib/wasm/`: **7/13 (~1.79MB)**.
- Docs a referir `~/banzai` removido: **6 ficheiros**.
- `banza-certification` ligada ao runtime: **NÃO** (autoridade futura).
- Onboarding (ADR-069) ativo em produção: **NÃO** (env-gated OFF).

---

## Anexo C — Contradição a confirmar na VPS

O agente de auditoria (a ler o repo) concluiu provider `mock`; o `GET /banzai/runtime` vivo
devolve `local_qwen`. Reconciliação: o `.env` de produção sobrepõe `LLM_PROVIDER=local_qwen`
(M2.8D-ACTIVATION), enquanto o **default committed** é `mock`. A confirmar por SSH em Fase B
(ler `/srv/banza-protocol/runtime/.env`), e a resolver como gap de reprodutibilidade
(repo-default ≠ prod).

---

## Anexo D — Plano de Construção detalhado por workstream

*(Ver a saída estruturada do workflow `wf_4990ff41-b7b`; os workstreams por fase B–F estão
enumerados no corpo do plano e serão convertidos em slices de commit na branch dedicada.)*
