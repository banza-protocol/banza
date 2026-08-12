# M2.19G.5D — BanzAI Architecture Audit (Audit-Only)

**Target:** `/Users/fm65/banza/website/content/BANZA_REFERENCIA.md` §12 "BanzAI — Agente do Protocolo" (L2306–2388) — the page at `/referencia/banzai`, treated as the authoritative source of the *intended* design.
**Reconciliation source:** `/Users/fm65/banza/docs/whitepaper/content/{pt,en}.json` §3 (blocks 181/185/189/193, fig-layers 550/551) + §6 (293).
**Governance canon:** `/Users/fm65/banza/docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md` + ADR-041/054/055/067/068/071/072/073/074.
**Runtime ground truth:** `/Users/fm65/banza/services/banzai-api/src/{server.js,pipeline.js,grounded-synthesis.js,validate.js}` + `/Users/fm65/banza/engines/banzai-query-core/src/{route.rs,lib.rs,validate.rs}`.

---

## 1. Executive summary

The user's correction is authoritative for this audit: **BanzAI is the cognitive agent and human interface of BANZA — a mediation layer grounded in the knowledge base and subordinate to the deterministic engines and public sources — not a supercomponent that executes or governs the protocol.** The good news is that §12 already *holds* this architecture: it states the non-authoritative role in one sentence (L2310), carries both intended perspectives (agent-flow and the evidence/engine/model separation), enumerates the boundary in a 10-row authority matrix (L2359–2370), and is backed by a runtime that enforces `authoritative:false` and a mandatory dual validator (ADR-073). The core problem is **dilution, not error**: the correct architecture is spread across five overlapping surfaces (one-sentence definition, prose, 8-bullet boundary list, authority table, diagram alt-text), the same boundary posture is restated four-to-five times, one paragraph (L2338–2340) grammatically over-scopes BanzAI into the engines' resolve/fetch/evidence role, and a handful of runtime details have drifted (a machine-counter name that does not exist, a "single model call" that is really "≤1", the model path presented as unconditional when the default runtime has no model). No hard contradiction exists against the whitepaper; the divergences are terminological (singular "esquema operacional", a named "Qwen", "camadas do ecossistema" vs "camadas institucionais"). The remedy is a later consolidation pass that extracts the canonical model, reconciles vocabulary, collapses to one main diagram plus the existing pipeline figure, separates the components, removes repetition, and refreshes only runtime state — **not** a redesign.

---

## 2. Extracted canonical architecture (from A1)

### 2.0 Canonical role (already normative, verbatim)

> **"O BanzAI é a interface humana única e o orquestrador não autoritativo do BANZA: resolve contexto, consulta fontes públicas, chama motores determinísticos e explica a evidência produzida, sem decidir veredictos, certificações, admissões ou autorizações."** — page L2310.

Corroborated: ADR-054:40 ("primary human-operator working interface"); governance doc:6 ("interface primária … o agente IA nativo do protocolo"); whitepaper `pt.json:193` ("a interface humana transversal às três camadas … nunca decide"). BanzAI is **grounded in the knowledge base** and **subordinate to the deterministic engines and public sources** — it guides, searches, explains, invokes tools; it is not a supercomponent.

**Organizing invariants already fixed on-page / in governance:**
- Four-clause governing phrase (ADR-054:53; governance doc:13): *"BanzAI guia; os motores verificam; a evidência prova; a governança decide."*
- Runtime maxim (page L2316): *"o Rust compreende, encaminha, executa, valida e decide; o modelo local explica uma única vez e nunca decide; a governação aberta evolui as regras."*
- Rule/evidence exclusion (ADR-041:114–117): *"BanzAI orquestra. Os motores calculam. A evidência prova. O output do modelo/IA nunca é evidência por si só."*

The DESIGN INTENT's central phrase — *"BanzAI guia; os motores verificam; a evidência prova"* — is already the page's own invariant (the four-clause form adds *"a governança decide"*).

### 2.1 Perspective (1) — BanzAI as protocol agent (ecosystem flow)

Each element keeps its own function; BanzAI never absorbs the function of the element next to it.

```
Referência BANZA ─▶ BanzAI ─▶ motores Rust/WASM ─▶ evidência ─▶ pares e federação
  (define regras)   (guia/consulta/  (verificam,     (prova; publicada        (verificam a
                     chama tools/     decidem, selam)  pelo operador no          evidência,
                     explica)                          Registo Técnico)          não o agente)
                                          ▲
                    Governação aberta (RFC/ADR/spec/release) evolui as regras
```

| Element | Its function (already stated) | Cite |
|---|---|---|
| Referência BANZA | Defines the rules; source of normative validity | page L2344; whitepaper L181 |
| BanzAI | Guides/searches/explains + *invokes* engines (does not become them) | page L2310, L2318; ADR-041:18–19 |
| Motores Rust/WASM | Verify, decide, seal verdicts | page L2318, L2349; whitepaper L293 |
| Evidência | Proves; produced by engines, published by the operator | page L2340; whitepaper L333, L349 |
| Pares e federação | Verify the *evidence*, reproducibly, without BanzAI | page L2312; whitepaper L357 |
| Governação aberta | Changes the protocol (RFC/ADR/spec/release) | page L2369; ADR-054:53 |

**What BanzAI is NOT here (each already on-page):** NOT the engine that produces the verdict (L2349); NOT the source of evidence (L2344); NOT the component that decides participation (L2351).

### 2.2 Perspective (2) — the cognitive engine in three planes

- **Plane A — Evidence plane (source of truth, OUTSIDE BanzAI's authority):** the official BANZA knowledge base — Reference, specs, ADRs/RFCs, contracts, schemas, invariants, conformance criteria + results, governance records. Page L2382 names the *"Normativas (vinculativas)"* set explicitly.
- **Plane B — BanzAI cognitive plane (deterministic Rust, INSIDE):** normalize intent (`normalize()` `lib.rs:482`), boundary/authority guards (`route()` `route.rs:7117`), plan retrieval (`retrieve_topk_ids` `lib.rs:641`), select sources (`grounded-synthesis.js:266`), form the **FactualPackage** (`build_factual_package_planned`), verify claims (`validateOutput` `grounded-synthesis.js:136`), verify citations (`pipeline.js:817`), apply the safety gate (`postValidate` → `validate_response` `validate.rs:222`), prepare the grounded answer. All present on page L2318, L2328.
- **Plane C — Language-model plane (ONLY drafts, INSIDE but strictly bounded):** the local model *"explica uma única vez e nunca decide"* (L2316); receives only the FactualPackage + output contract, *"nunca escolhe fontes, resolve entidades nem publica sem os validadores"* (L2328). Model output is not evidence and is not delivered directly.

**Intended flow (already on page L2328 in structure):**
```
utilizador ─▶ motor BanzAI (Plane B) ─▶ evidência BANZA (Plane A) ─▶ rascunho controlado (Plane C, 1 síntese)
           ─▶ verificação (validador factual + validador de pós-resposta, Rust) ─▶ resposta citada
```
The direct flow `utilizador → modelo → resposta` is already rejected by construction: the model is unreachable except through the closed FactualPackage, and unvalidated model text is blocked and never cached (`pipeline.js:843, 871–874`).

### 2.3 The separation ledger — INSIDE vs OUTSIDE BanzAI's authority

**INSIDE (what BanzAI owns / does):** present the single interface (a pure renderer that decides nothing, L2310/L2320); resolve context / normalize intent; consult public sources; orchestrate / *invoke* the engines and the secure Rust fetch (invokes tools but does not become them, L2310; ADR-041:18–19); form the FactualPackage and run the single model synthesis; verify claims + citations and apply the safety gate; explain the evidence produced (L2357); initiate (human-triggered) a validation journey and explain its receipts (L2336); help draft an RFC/ADR proposal, never an active rule (L2352).

**OUTSIDE (what it must NEVER own — each element the DESIGN INTENT named):**

| Element it must not own | Real owner | Cite |
|---|---|---|
| The engines | Rust engines decide; BanzAI *calls* them | page L2318, L2354; whitepaper L293 |
| The verdicts | Rust engines decide and seal | page L2349; whitepaper L293 |
| The receipts | Engines emit + seal OperationReceipt/JourneyReceipt | page L2338; table row 6 |
| The formal evidence | Artefacts + engines; *"output de IA nunca é evidência"* | page L2344; ADR-041:114–117 |
| The publication | The operator publishes to the read-only Registo Técnico | page L2340, L2386; whitepaper L353 |
| Peer trust | Peers verify the evidence independently | page L2353; whitepaper L357 |
| Federation | Federation model; not changed by BanzAI | page L2353; ADR-054:69–73 |
| Governance decisions | Open governance (RFC/ADR/spec/release) | page L2369; ADR-041:87–96 |
| Certification / admission / authorisation | Rust engines (L2 cert); competent authorities outside BANZA | page L2350; table rows 7,8; whitepaper L185 |
| Participation | Demonstrated, not granted | page L2351 |
| Moving funds / payments | The operator, in its own legal framework | page L2355; table row 10 |

**The "no central component" principle** is stated directly (L2357): *"Não existe um centro que decida tudo"* — the exact rebuttal to the "supercomponent" reading the DESIGN INTENT corrects. The runtime enforces it: `authoritative:false` everywhere (`server.js:149,212`), and the post-answer validator blocks any text claiming BanzAI/BANZA certifies, decides, approves, licenses, admits, or authorises (`validate.rs:268–554`).

---

## 3. Whitepaper reconciliation (from A3)

No hard contradiction. BanzAI's core position is aligned verbatim on the load-bearing claim ("transversal às três camadas … não é uma quarta camada nem uma autoridade"). Divergences are terminological/labelling precision, listed most-material first. The whitepaper §3 is the canonical target; the three highest-value edits all land on the §12 page.

| ID | Sev | §12 (page) | Whitepaper | Recommended canonical term |
|---|---|---|---|---|
| **D1** | MEDIUM | L2312 "**o esquema operacional**" (singular, no qualifier) | `pt.json:185`/`550` "**esquemas operacionais independentes**" (plural) | Change §12 to **"os esquemas operacionais independentes"** — the singular brushes against the operator-neutrality invariant. |
| **D2** | MEDIUM | L2359 matrix header "**Modelo local (Qwen)**" | §6 `pt.json:293` "**modelo de linguagem local**" — never names the model; `/banzai/runtime` SSOT deliberately withholds the exact model id | Rename header to **"Modelo local"** (model-agnostic, matches runtime SSOT). Consider a neutral alias for the `qwen_*` counter. |
| **D3** | MEDIUM | L2316 maxim: "o **Rust** … **executa** …" | `pt.json:193`: "o BanzAI … que **orienta e executa** chamando os motores … nunca decide" | Disambiguate "executa": either page maxim → "o BanzAI orienta e executa (chamando os motores)", or reserve "executa/decide" for the engines. Keep one subject per verb. |
| **D4** | MEDIUM | L2312 "três **camadas do ecossistema**", lowercase, unnumbered | `pt.json:181` "três **camadas institucionais** … um **invariante arquitectural**"; numbered L1/L2/L3, capitalized layer names | Adopt **"três camadas institucionais"** + capitalized numbered labels; optionally note the "invariante arquitectural" once. |
| **D5** | LOW | L2310 "**orquestrador não autoritativo**" | `pt.json:193` "**orienta e executa … mas nunca decide**" (never uses "orquestrador"/"não autoritativo") | Acceptable as-is (page qualifies immediately); for strict alignment prefer the whitepaper phrasing, or promote "orquestrador não autoritativo" to canon. |
| **D6** | LOW | L2310 "interface humana **única**" | `pt.json:193` "interface **comum** / **transversal**"; ADR-054 "**primária**" | Prefer **"interface humana primária"** (ADR-054) or "transversal"; "única" can be misread as "the only human surface". |
| **D7** | LOW | L2367 matrix "**(L2)**" | `pt.json:193` "perfis L0–L4 … **não se confundem com as camadas**" | Write **"(Camada 2)"** or add a one-line note that L2 = Camada 2, distinct from conformance profiles L0–L4. |
| **D8** | INFO | "não é uma quarta camada" (L2312) and "não é … autoridade" (L2348) appear separately | `pt.json:193` couples them | Cosmetic co-location only; no action required. |

**Confirmed NON-divergences (cleared):** "camadas vs planos" (both surfaces use only "camadas"; "plano/plane" is analyst/runtime framing, never published — nothing to reconcile); transversal-interface-not-fourth-layer (aligned verbatim); the nine validation-step names (aligned, incl. untranslated "Manifest"/"Evidence Bundle"); operator ≠ entity; "moves no funds"; decision-vs-explanation separation.

**Highest-value fixes:** D1, D2, D4.

---

## 4. Findings (categorized; each with severity + location + recommendation)

### 4a — Internal incoherences (from A2)

**F1 — HIGH (headline, CONFIRMED). Validation prose makes BanzAI resolve the target and fetch artifacts, contradicting the same subsection and the authority matrix.**
- **Location:** `BANZA_REFERENCIA.md:2338`.
- **Defect:** subject "O BanzAI" governs both verbs — *resolve o alvo* and *obtém os artefactos*. This collides with (i) L2336, one paragraph up: the nine steps are *"executadas pelos motores Rust (ADR-067)"*; and (ii) matrix row 5 (L2365): BanzAI = *"Inicia (humano) e explica"*, Motores = *"Obtêm (fetch seguro) e verificam"*. Governance grounding: ADR-068 (registry target → SSRF-hardened banza-fetcher → Rust engines); whitepaper §6 (`en/pt.json:293` "the Rust engines execute and determine all results").
- **Recommendation:** make the engines/journey the actor: *"A validação resolve-se no Registo Técnico … e, em cada etapa, **os motores Rust obtêm** os artefactos através de uma camada segura de fetch — nunca pelo navegador; o BanzAI **inicia (por acção humana) e explica**."*

**F2 — HIGH/MEDIUM (CONFIRMED). Evidence generation is attributed to the BanzAI-subject paragraph, contradicting the page's own "AI output is not evidence".**
- **Location:** `BANZA_REFERENCIA.md:2340` ("Gera evidência técnica verificável…").
- **Defect:** the null subject of "Gera" inherits "O BanzAI" from L2338, reading as *BanzAI generates the evidence* — blurring L2344 (*"a evidência vem dos artefactos e dos motores"*) and ADR-041:114–117.
- **Recommendation:** give "Gera" an explicit non-BanzAI subject: *"**A jornada de validação gera** evidência técnica verificável…"* (or "os motores geram"). Fixing the subject of the L2338–2340 paragraph resolves F1 and F2 at once.

**F3 — MEDIUM (CONFIRMED). "Explaining" is assigned to both BanzAI and the local model.**
- **Locations:** L2310 ("[o BanzAI] … explica a evidência"), L2316 ("o modelo local explica uma única vez"), L2357 ("O BanzAI apresenta, orquestra e explica; o modelo local apenas redige…").
- **Defect:** the verb "explica" flips owner between L2316 and L2357. Model-vs-interface blur (not an authority breach). Note: the whitepaper inherits the same looseness canon-wide, but §12's L2316 vs L2357 juxtaposition is the sharpest instance.
- **Recommendation:** reserve one verb per actor. Keep the model as the one that **explica/redige a síntese** (ADR-055 canon); describe BanzAI consistently as **apresenta / orquestra / disponibiliza** (surfacing, not authoring). e.g. L2357: *"O BanzAI apresenta e orquestra; o modelo local redige a única síntese explicativa."*

**F4 — LOW (watch-item, not a defect). One-frase attributes source-consultation to BanzAI.**
- **Location:** L2310 ("consulta fontes públicas, chama motores determinísticos…").
- **Note:** "chama motores determinísticos" is *explicitly endorsed* by the whitepaper ("orients and executes by calling the deterministic engines", `en/pt.json:193`) — correct orchestration language, not over-scope. "consulta fontes públicas" is looser (engines select; BanzAI is the interface) but stays within the whitepaper framing. No change strictly required; if tightened, *"faz consultar fontes públicas pelos motores"*.

*Cleared as NOT incoherent (A2): maxim L2316 (intentional extended runtime form); table rows 3/8/9/10; the nine-step journey L2336 (no retired "SimB" residue); L2330/L2374 self-describing answer state; repo map L2386.*

### 4b — Repetitions to collapse (from A4)

**Headline: the boundary posture is expressed on five surfaces at once** — one-sentence definition (L2310), flowing prose (L2312–2357), the 8-bullet boundary list (L2346–2355), the 10-row authority matrix (L2359–2370), and the diagram alt-text (L2332). **6 of the 8 boundary bullets have a direct table row.** Only **L2353** ("não altera trust/federação/certificação/registo") is unique to the bullet list.

| Sev | Group | Where it repeats | Single canonical home |
|---|---|---|---|
| HIGH | **8-bullet boundary list vs authority table** | Bullets L2346–2355 ≈ table rows L2361–2370 (6/8 overlap) | **Delete the bullet list; keep the table** (strictly richer — distributes each action across 5 actors, adds the "who DOES it" side). Migrate the one unique bullet L2353 into a table row/residual sentence. |
| HIGH | **G1 "não decide veredictos; motores decidem"** (5×) | prose L2310/L2316/L2318/L2357; bullet L2349; table rows 1,3,6; diagram alt L2332 | **TABLE** (per-action decision matrix). Keep maxim L2316 as the single framing sentence; strip per-action restatements. |
| MED | **G3 "não certifica/admite/autoriza/licencia"** (4×) | L2310; L2340; bullet L2350; table rows 7,8 | **TABLE** (rows 7,8 cleanly separate motores vs competent entities). Keep the promise once at L2310; drop bullet L2350 and the L2340 clause. |
| MED | **G4 "uma única síntese / explica uma vez / nunca decide"** (5×) | maxim L2316; prose L2318/L2328/L2330; table row 2; diagram alt L2332 | **DIAGRAM P-087** carries the step sequence; collapse prose L2318+L2328 to a lead-in, keep the L2330 guarantee. |
| MED | **G5 "zero chamadas externas / 0 chamadas de decisão"** (5×) | L2330; L2338; table row 5; diagram alt; runtime L2374 | **RUNTIME section** (machine-verifiable counters; `GET /banzai/runtime` SSOT). Keep the "por construção" note once in the diagram. |
| MED | **G2 "não é quarta camada / autoridade / fonte normativa"** (3×) | L2310+L2312; bullet L2348; runtime `authoritative:false` L2374 | **PROSE** (opening definition). Drop bullet L2348; keep `authoritative:false` only as the machine-verifiable form. |
| MED | **G6 "não move fundos / não processa pagamentos"** (3×) | bullet L2355; table row 10; prose L2357 | **TABLE** row 10 (uniquely adds "o operador, no seu enquadramento legal"). Drop bullet L2355. |
| MED | **G8 "encaminhador: terminais exactos vs tronco explicativo"** (3×) | prose L2318/L2324–2328; diagram alt L2332 | **DIAGRAM P-087** carries the terminal enumeration; prose keeps a one-line "two-destination" description. |
| LOW | **G7 "validação usa só endpoints públicos; fetch Rust, não o navegador"** (2×) | prose L2338; table row 5 | **PROSE** ("Como uma implementação é validada"); table row keeps a compressed cell. |
| LOW | **G9 "lacuna → RFC/ADR, nunca regra activa"** (3×) | bullet L2352; table row 9; Sources L2384 | Split: **TABLE** row 9 (authority) + **PROSE** L2384 (source-nature nuance). Drop bullet L2352. |
| LOW | **G10 per-answer verifiability restated twice** | runtime L2374 + L2376 | **Collapse to one paragraph** (state is per-answer; `GET /banzai/runtime` is SSOT; route wins on divergence). |

**Cross-document (flag only, outside §12):** four diagrams removed from §12 in the 5C rewrite now live in the parallel BanzAI chapter `docs/reference/pt/completa.md` §11, each duplicating a §12 block — **P-075 responsibility-matrix** = 1:1 twin of the §12 authority table; **P-074 rule-provenance** = §12 "Autoridade e fronteiras" + "Fontes"; **P-073 operator-journey** = §12 nine-step prose; **P-072 native-protocol-agent** = §12 "numa frase"/"Arquitectura". A later pass should decide one canonical BanzAI chapter.

### 4c — Outdated runtime state (from A5, part a)

**F-RT1 — MEDIUM. The "single local-model synthesis" trunk is presented as unconditional, but the default runtime has no model.**
- **Location:** L2318/L2328/L2330 (invoke "uma única síntese pelo modelo local" as *the* operative path).
- **Defect:** process default provider is `mock`, which "never runs the trunk" (`pipeline.js:714-718`); `local_qwen` is opt-in/benchmark-gated (`server.js:26-31`), and `model_available` requires `local_qwen` + `BENCHMARK_APPROVED` + warmed (`server.js:174`). In the default/unconfigured deployment the model path does not execute — grounded questions degrade to model-free emergency grounding (`pipeline.js:720-732`). Not-wrong-but-conditional; the conditionality is unstated. (L2376 "a rota máquina ganha" only partially covers this.)
- **Recommendation:** state the model trunk is conditional; acknowledge mock/degraded/unknown as legitimate runtime states.

**F-RT2 — LOW/precision. "uma única chamada de modelo por explicação" is really "≤1".**
- **Location:** L2330.
- **Defect:** cache hits (exact + semantic), budget-exhausted, breaker-tripped, and mock paths all yield **zero** model calls (`pipeline.js:734-739,748,752,715`). The true invariant is ≤1, not exactly 1.
- **Recommendation:** re-anchor as "≤1, zero on cache/degraded".

**F-RT3 — LOW/citable. The page pins a machine counter name the runtime does not emit.**
- **Location:** L2338 (`qwen_decision_calls = 0`).
- **Defect:** the real receipt fields are `qwen_calls` and `external_model_calls` (`validate.js:203,372`; `verdict.rs:286`; `banzai-api/README.md:68`). `external_model_calls = 0` matches; **`qwen_decision_calls` exists nowhere** in the runtime. Since §12 declares the machine route the SSOT, the page must quote the real identifier.
- **Recommendation:** replace with `qwen_calls` (or the neutral alias from D2).

*Cleared non-issues (A5): `/estado` page is real (`website/app/estado/page.tsx`); "sem rede … no núcleo" (L2318) is correctly scoped (network fetch belongs to the separately-described validation flow, L2338).*

### 4d — Components to formalize (from A5, part b)

Real, security-relevant runtime components that lack a crisp named definition on the page:

| Sev | Component | Page today | Runtime reality | Recommendation |
|---|---|---|---|---|
| MEDIUM | **B1 — the publish gate is a FIVE-stage chain, not "dupla".** | L2328 + table row 3 say validation is "dupla" (two) | (1) factual validator `validateOutput` (`grounded-synthesis.js:136`); (2) **task-completion gate** → `task_incomplete` (`grounded-synthesis.js:170-184`); (3) post-synthesis authority/leak validator checks 1–20 (`pipeline.js:815`); (4) **citation verifier** check 21 (`pipeline.js:816-825`); (5) **final authority guard + deterministic-contradiction backstop** check 22 (`pipeline.js:826-828`) | Name the five stages; the task-completion gate and the deterministic-contradiction backstop especially deserve naming. "Dupla" undercounts. |
| MEDIUM | **B2 — adversarial-input normalization + model-free typo/intent recovery.** | Not on the page | `normalize()` (zero-width/soft-hyphen strip, homoglyph fold, leet de-obfuscation, elongation collapse, spelled-out run-merge; `lib.rs:370-536`); model-free `recoverQuery` with confidence bands (`pipeline.js:376-380`); **dual routing of raw AND typo-corrected question, refusing if EITHER trips a boundary** (`pipeline.js:389`) | Add a named pre-stage in the trunk description. |
| MEDIUM | **B3 — compound-command / doc-ref boundary anti-evasion.** | L2328 collapses to one line ("pré-verificação de fronteira em Rust") | `route()` ordered guard stack: action_boundary, safety_refusal, `compound_command_boundary`/`compound_safety_refusal` (split on conjunctions), `boundary_refusal`, docref resolver that **re-runs the boundary on the doc-ref-stripped remainder**, critical_entry (`route.rs:7117-7262`) | Name the compound-splitting and doc-ref re-check mechanisms. |
| MEDIUM | **B4 — conversational context resolution (`route_with_context`).** | Absent from §12 | Merges a prior USER question on an anaphoric follow-up (`route.rs:7394`), re-checks safety on the resolved query, and **never treats a previous answer as a normative source** (`route.rs:7457-7480`) | Add — it directly reinforces §12's own "output de IA nunca é fonte" posture. |
| LOW | **B5 — runtime SSOT is a versioned schema with a degraded-state model.** | L2374-2376 name only the URL + `authoritative:false` | `schema_version: "banzai-runtime/1"` with `status (ok\|degraded\|unknown)`, `mode (local_qwen\|external_hosted\|mock\|degraded)`, `model_available`, `model_class`, `inference_location`, `external_calls`, `deterministic_engines_available`, `degraded_capabilities` (`server.js:196-214`) | Name the schema version and the honest degraded model. |

### 4e — Production gaps (from A5, part c)

| Sev | Gap | Page today | Reality | Recommendation |
|---|---|---|---|---|
| MEDIUM | **C1 — runtime models DEGRADED/UNKNOWN/MOCK; page shows only the happy path.** | "Estado verificável do runtime" reads as if the model trunk is always live | `status` can be `degraded`/`unknown` (`server.js:181-194`); a first-class model-free "emergency Phase-1 grounding (degraded, sourced)" terminal runs whenever the model is unavailable/rejected/breaker-tripped (`pipeline.js:720-732`). Unless local inference is enabled, benchmark-approved, and warmed, BanzAI answers grounded questions **without any model** | One-line honesty upgrade to L2374-2376 (resolves C1 + F-RT1 + F-RT2 + C3 at once). |
| MEDIUM | **C2 — zero certified operators / zero real implementations, stated only implicitly.** | L2340 names Operador Zero as the only demo implementation | Whitepaper explicit: operational layer "does not operate with real money"; registry "not a list of licensed, approved or certified operators" (`en/pt.json:185,353`); `/operators=[]`, `production_certificates=false` | Add an explicit production-state line: "hoje: zero operadores certificados; a única implementação é o Operador Zero, em demonstração." |
| LOW | **C3 — production resilience machinery shapes headline guarantees but is invisible.** | No mention of queue/budget/breaker/cache | Tier-5 inference queue (`server.js:49-54`), USD budget gate (`pipeline.js:741-748`), auto-rollback breaker (`pipeline.js:751-752`), exact+semantic caches (`pipeline.js:165-166,736-739`) — directly shaping the "one model call / zero external" claims | Mention at least the cache (zero-call path) and breaker (degraded path). |

**Single most impactful fix (A5 cross-cut):** the one-line honesty upgrade to "Estado verificável do runtime" (L2374-2376) — acknowledge the model trunk is conditional and re-anchor "one model call" as "≤1, zero on cache/degraded" — resolves F-RT1, F-RT2, C1, and C3 simultaneously and aligns the prose with what the page's own declared SSOT actually reports.

---

## 5. Single MAIN-diagram spec (from A6) + disposition of the existing `banzai-*.svg`

> **Reconciliation guards baked into the spec so the eventual asset does not create a new incoherence:** (1) "três planos" ≠ "três camadas" — this is the *cognitive* architecture (evidence/engine/model), a different axis from the whitepaper's transversal-band-over-three-institutional-layers view; the title/desc must NOT reuse "quarta camada"/"três camadas" wording. (2) Engines are **invoked, not owned** — draw the engine node *on* the authority boundary (BanzAI calls it and receives *resultados técnicos*; its authority extends into the outside zone). (3) "verificação" is a BanzAI *capability* (facet chip) but the gate *decision* is the deterministic validators' — draw the gate in engine treatment. (4) Central phrase = the 4-clause ADR-054 form. (5) The model rarely runs — the model node label carries "1 chamada quando há fundamento · 0 externas".

**Proposed new asset (produced LATER, not this pass):** `/Users/fm65/banza/website/public/diagrams/protocol/banzai-cognitive-architecture.svg`, **id SVG-P-099** (next free; current registry max SVG-P-098), registered in `docs/reference/BANZA_SVG_REGISTRY.md`.

**Structure (spec target):**
- **Z1 Entrada:** `Utilizador` (pergunta em linguagem natural).
- **Z2 BanzAI · plano cognitivo (não autoritativo · `authoritative:false`):** six left→right facet chips — **intenção · fronteiras · planeamento · recuperação · ferramentas · verificação** (each sub-labelled with the runtime-accurate function).
- **Z3 Três planos / fontes que o BanzAI invoca**, the three distinct connections (each an invoke-out + labelled payload-return):
  - `[Base de conhecimento BANZA]` → **factos e citações** (plano de evidência, fonte de verdade)
  - `[Motores Rust/WASM]` → **resultados técnicos** (node straddles the authority boundary)
  - `[Modelo de linguagem local]` → **rascunho explicativo** (candidato — não é evidência, nunca entregue directamente; 1 chamada quando há fundamento, 0 externas)
- **Z4 Verificação e resposta:** `verificação de afirmações e citações` (dupla e obrigatória em Rust — validador factual + validador de pós-resposta, ADR-073; engine treatment) → `resposta fundamentada` (citada, `authoritative:false`).
- **Z5 Fora da autoridade do BanzAI · pertence ao protocolo:** veredictos → recibos → **evidência formal (Evidence Bundle)** → **publicação (Registo Técnico, só-de-leitura)** → pares → federação; **governação aberta** as a full-width base sub-band (RFC/ADR/spec/release evolui as regras).
- **THE AUTHORITY BOUNDARY:** a bold divider between {Z2+Z3} and {Z5}; the engine node sits *on* it. This single line is the diagram's thesis: everything past it is outside BanzAI's authority.
- **Required rejected-path annotation:** `Utilizador ⇢ Modelo ⇢ output`, dashed + struck-through — *"caminho directo rejeitado — o modelo não recebe a pergunta nem entrega a resposta."*
- **Caption / `<desc>`** ends with the principle strip: **"BanzAI guia; os motores verificam; a evidência prova; a governança decide."**
- Non-binding layout: `viewBox="0 0 1280 760"`, reuse P-087's palette (charcoal `#3C4654`/`#2A2E35` = Rust; green `#2E6A4E`/`#1D4A34` = evidence/output; slate `#2E4054` = model; gold `#B98A3E` arrows).

**Guard constraints the eventual SVG-P-099 must obey** (verified against `tools/check-svg-visual-system.sh` + `tools/check-svg-visual-quality.sh`): canonical eyebrow `· PROTOCOLO FINANCEIRO ABERTO`; `<title>`+`<desc>`+`viewBox` with `role="img" aria-labelledby`; canonical dated footer; font floor ≥ 8px (no `font-size` 0–7, no `textLength` compression); **no bare `certificação`/`readiness`/`prontidão de certificação`** (guard is negation-aware — keep L2/certification vocabulary out of this diagram entirely, it belongs to P-073); no commercial operator brand (also blocks "Banzami" in comments/metadata via `identity-check`); no retired terms (`BANZA CA`, `operador certificado`, `BanzAI Workbench/Chat`, `/banzai/chat`, `sistema adjacente`, `licença BANZA`, bare `aprovação humana`, etc.); pure self-contained vector (no raster/base64/external href); register the SVG-P-099 row. Every proposed N/E label is already guard-clean.

**Disposition of the five existing `banzai-*.svg`:**

| SVG | Disposition | Rationale |
|---|---|---|
| **NEW SVG-P-099** *cognitive-architecture* | **PRIMARY main diagram** — embed near top of §12 ("Arquitectura canónica", L2314). *Produced later, not this pass.* | The consolidated diagram the DESIGN INTENT targets; absorbs perspective-(1) downstream (engines→evidence→registry→peers→federation→governance). |
| **SVG-P-087** *single-answer-pipeline* | **KEEP as the SECONDARY figure** — stays embedded under "Como uma solicitação é processada" (L2332). | Current (v2.1, ADR-073-aware, the just-re-embedded file); its `<title>`/`<desc>` and the §12 alt-text both carry the dual validator — it *illustrates* the prose rather than duplicating it. It is the runtime zoom-in of P-099's model+verification portion and carries the "most answers = 0 model calls" nuance P-099 abstracts. |
| **SVG-P-073** *operator-journey* | **Keep on disk; NOT part of the main diagram; recommend NOT embedding in §12.** | Distinct axis (L2 validation journey); §12 L2336 already lists the nine steps in prose — embedding would re-add a prose-duplicating figure. Stays in `completa.md` §11. |
| **SVG-P-072** *native-protocol-agent* | **RETIRE from §12 (already out); superseded by SVG-P-099.** Candidate to retire from `completa.md` §11 once §12 is canonical. Keep file archived. | P-099's outside-authority zone subsumes P-072's ecosystem chain. R5 also flags its "used on the homepage" registry claim as **stale/unverified** — no live website source references `banzai-native-protocol-agent.svg`. |
| **SVG-P-074** *rule-provenance* | **RETIRE from §12 (already out); keep archived.** | 1:1 duplicate of §12 "Autoridade e fronteiras" + "Fontes"; covered by P-099's authority boundary + the §12 authority table. |
| **SVG-P-075** *responsibility-matrix* | **RETIRE from §12 (already out); keep archived.** | The "orphaned visual twin" of the 10-row §12 authority table; 5C already chose the table — keep that decision. |

**Net target:** §12 ends with exactly two figures — **SVG-P-099 (primary, cognitive architecture) + SVG-P-087 (secondary, runtime pipeline detail)**. The other three stay archived (files retained per registry; no live §12 embed). P-073 remains the standalone validation-journey visual in `completa.md` §11.

---

## 6. Proposed consolidation plan (ordered — for a FUTURE implementation pass, NOT executed here)

1. **Extract & fix the load-bearing incoherence first.** Rewrite the L2338–2340 paragraph so the engines/journey are the grammatical actor (F1) and evidence generation is attributed to the journey/engines (F2), re-aligning the prose with L2336 and matrix row 5. This one edit removes both HIGH internal incoherences.
2. **Reconcile vocabulary with the whitepaper.** Land D1 ("esquemas operacionais independentes"), D2 (drop "Qwen" from the matrix header → "Modelo local"), D4 ("camadas institucionais" + numbered/capitalized labels); apply D3/D6/D7 for consistency; resolve the "explica" verb-ownership blur (F3) — reserve "explica/redige" for the model, "apresenta/orquestra" for BanzAI.
3. **Consolidate to one main diagram.** Produce SVG-P-099 to the §5 spec (obeying all SVG guards), embed it at the top of "Arquitectura canónica" (L2314), and keep SVG-P-087 as the secondary runtime-pipeline figure. Retire the §12 embeds of P-072/074/075 (already out) and do not add P-073.
4. **Separate the components — formalize what the runtime actually does.** Name the five-stage publish gate (B1), the adversarial-input normalization + model-free typo/intent recovery pre-stage (B2), the compound-command/doc-ref anti-evasion guard stack (B3), conversational context resolution that never treats a prior answer as normative (B4), and the versioned runtime SSOT schema + degraded-state model (B5).
5. **Remove repetitions.** Delete the 8-bullet boundary list; keep the authority table as the single home for per-action decisions, migrating the one unique bullet (L2353). Assign each concept exactly one home per the §4b map (decisions → TABLE; positioning → opening PROSE; pipeline/terminals → DIAGRAM P-087; by-construction counters + runtime state → RUNTIME section; fetch mechanics + source-nature → PROSE). Collapse the two runtime paragraphs (L2374/L2376) into one.
6. **Update ONLY runtime state (no new architecture).** Apply the honest-runtime upgrade to "Estado verificável do runtime": model trunk is conditional (mock/degraded/unknown are legitimate states; emergency grounding is a real terminal); "one model call" → "≤1, zero on cache/degraded" (F-RT1, F-RT2, C1, C3); replace `qwen_decision_calls` with the real `qwen_calls` identifier (F-RT3); add the explicit production-state line (zero certified operators; Operador Zero the only demo implementation, C2).
7. **Make the page the canonical cognitive-engine guide.** Decide one canonical BanzAI chapter (resolve the §12 ↔ `completa.md` §11 parallel-chapter duplication), keep §12 as the single authoritative guide to the cognitive-engine implementation, and ensure the whitepaper §3 remains the upstream authority for any prose whose canonical home is positioning/definition.

**Sequencing note:** steps 1–2 are content-only and low-risk; step 3 requires the new asset + registry row + `make svg-visual-system-check`/`svg-visual-quality-check`/`reference-svg` to pass; steps 4–7 are the substantive consolidation. Reindexing/WASM/`banzai-api` rebuild applies only if any ADR set is touched (this pass touches none). None of this changes the architecture — it extracts, reconciles, consolidates, separates, de-duplicates, and refreshes state around the architecture the page already intends.

---

**AUDIT ONLY — awaiting approval before any implementation.**

---

# 7. Completeness-critic corrections (folded in — adversarial pass)

Verified against source. Findings below fold into the report; the two runtime/registry claims that cited files outside the corpus both check out (`qwen_calls`/`external_model_calls` are the real fields — `validate.js:202-203,371-372`, `README.md:68`; registry max is genuinely `SVG-P-098`, so `SVG-P-099` is next-free), but the verification surfaced scope gaps the report missed.

---

# COMPLETENESS CRITIC — gaps & corrections (prioritized)

**Overall: the report is substantially sound and faithful to the audit-only + no-substitution intent.** §6 is clearly deferred ("NOT executed here"), the whitepaper reconciliation is real and correctly ranked, and the runtime findings I could verify are accurate. The corrections below are fold-ins, not a teardown. Two of them (P1, P2) matter because the report itself slightly re-commits the very error it audits.

### P1 — The report re-absorbs the engines into BanzAI (the supercomponent error, softened). **HIGH.**
§2.2 labels the deterministic Rust steps "**BanzAI cognitive plane (… INSIDE)**", and §2.3's INSIDE ledger lists "**form the FactualPackage**", "**verify claims + citations and apply the safety gate**", "**invoke … the secure Rust fetch**" as things **BanzAI owns/does**. But the page's own authority table contradicts this: routing = *Motores Decidem* (row 1), validate-before-publish = *Motores Decidem / BanzAI "—"* (row 3), validation fetch = *Motores Obtêm / BanzAI inicia+explica* (row 5); and the FactualPackage is built by Rust (`build_factual_package_planned`, delegated to Rust per READ 3/4), not by BanzAI. Attributing engine-decided steps to "BanzAI's authority/ownership" is F1/F2 reappearing **inside the report's own model** — and the proposed flagship diagram literally names a "BanzAI cognitive plane" containing the engines. **Fix:** reframe consistently — BanzAI *orchestrates / invokes / presents / explains*; the engines *perform and decide* even the in-pipeline cognitive steps. Keep "decide / verify / ground / build-package / fetch" attributed to the engines, never to BanzAI's ownership, in §2.2, §2.3, and the SVG-P-099 spec.

### P2 — The strongest anti-supercomponent invariant is under-weighted: optionality / openness. **HIGH.**
All three canon reads state it — machine consumers reach the public interfaces **directly, without BanzAI** (§12 L2312/L2320), "não é uma quarta camada nem uma autoridade … os consumidores automáticos acedem directamente" (whitepaper `pt.json:193`), and ADR-054:63-67/146-150 "BanzAI is not a central gatekeeper for integrations." That the protocol is fully verifiable **independent of the human interface** is arguably the decisive rebuttal to "supercomponent," yet the report surfaces it only as one passing INSIDE bullet ("pure renderer"). **Fix:** (a) promote it to a named canonical invariant in §2.0 ("optional / non-mandatory / protocol works without BanzAI"), and (b) add an explicit guard to the consolidation plan that the L2312 independence sentence **must be preserved** — the aggressive bullet-deletion/collapse in G2 currently risks dropping it.

### P3 — F-RT3 is correct but under-scoped. **MEDIUM.**
Confirmed: runtime emits `qwen_calls` + `external_model_calls`; the page's `qwen_decision_calls` exists nowhere in the runtime. But the report pins only **L2338**. The invented identifier actually appears **three times**: L2338 (§12) **and L1827, L1839 (§9 Operador Zero)**. A faithful fix touches all three. Also: "decision calls" was a conceptual gloss — in validation mode `qwen_calls = 0` entirely — so the fix should drop the "decision" qualifier, not rename a single site.

### P4 — Repetition census misses an in-file twin outside §12. **MEDIUM.**
§4b scopes duplication to §12 and to the §12 ↔ `completa.md` §11 parallel chapter, but the boundary posture is **also restated in §9 Operador Zero**: L1827 "o operador publica · o BanzAI obtém · o Rust verifica … o Qwen apenas explica" + the by-construction counter check (L1839) — the same "0 model/decision calls + receipt" content as §12 L2338. Any counter-rename (P3) and any "single canonical home" decision must account for the §9 twin; the report currently treats §12 as if it were the only in-file home of this posture.

### P5 — The new flagship diagram is the one element that leans toward substitution, not consolidation. **MEDIUM.**
Commissioning net-new **SVG-P-099** as the **PRIMARY** figure (demoting P-087, superseding P-072/074/075) is design work that "absorbs perspective-(1)" — closer to redesign than to consolidating existing material, which sits in tension with the no-substitution intent. The ID is fine (verified: SVG-P-098 is current max), but the recommendation should (a) be labeled clearly **optional / net-new**, (b) offer the **conservative fallback** (re-embed an existing asset — e.g. P-072 for the ecosystem view — or keep P-087 + trimmed prose, adding no new asset), and (c) inherit the P1 correction so the diagram's "cognitive plane" does not visually encode BanzAI-as-container-of-engines.

### P6 — Headline overclaim: "dilution, not error." **LOW.**
The body honestly lists genuine errors — F-RT3 (invented field name), F1/F2 (real grammatical over-scope, not mere repetition), B1 ("dupla" undercounts a 5-stage gate). Soften the executive summary to "dilution plus a few small factual/grammatical errors" so the framing matches the findings.

### P7 — One whitepaper nuance not reconciled. **LOW/optional.**
READ 2 stresses the three determinations are "structurally independent — state does not propagate in either direction" (certification ⊬ admission ⊬ authorisation; `pt.json:189`). §12 lists the actions (rows 7/8, bullet L2350) but never states the non-propagation directionality. Optional one-line note; pairs naturally with D7.

**Not gaps (confirmed sound):** 7-subsection page coverage is complete; the whitepaper divergence set (D1–D8) is real and correctly prioritized; audit-only discipline is respected; the verified runtime findings (five-stage gate B1, normalization B2, compound/docref B3, `route_with_context` B4, schema B5, F-RT1/F-RT2) are all grounded in the corpus.
