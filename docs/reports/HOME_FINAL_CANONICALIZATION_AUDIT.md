# HOME — Final Canonicalization Audit (M2.19G.2 §5)

> Readable companion to `artifacts/m2-19g2/home-current-surface-audit.json`. Every element of the public
> Home was audited element-by-element: its PRE-G2 value, its source file, where its data comes from, the
> treatment applied, and the final value. This is the §5 audit narrative.

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7` (M2.19G.1 finalized + LIVE — PR #228 `c06f7f8` + PR #229 `fffa9f7`)
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — documentation grounded in the working-tree diff. Live/deploy facts are marked **PENDING (finalized at deploy)**.
- **Method:** the "current text" of each element is the PRE-G2 value read from `git show fffa9f7:<path>`; the
  "final text" is the value read from the working tree.

---

## 1. The five canonical bands (target order — §6)

The Home is rebuilt to exactly five bands, in this order:

1. **Header** (global nav, from `website/lib/site.ts`)
2. **Hero** — eyebrow, title, paragraph, 3 indicators, single CTA, conceptual operator≠implementation diagram
3. **Institutional phrase + public status** — "Aberto. Auditável. Verificável." + the honest status bar
4. **"Quem faz parte do protocolo"** — the Technical Registry surface (boundary + registry-derived metrics + the single Operador Zero card)
5. **"Três camadas. Uma interface."** — the three-layer architecture + the BanzAI transversal band
6. **Footer** (from the shared `SiteFooter`)

The PRE-G2 Home had, in order: hero (with the manifest tester and inline institutional phrase) + status bar
→ three-layer → **validation journey** → registry marquee + trailing CTAs + a "Rede em pré-produção" state
line. The journey band is removed; the registry moves above the three-layer band; the manifest tester and
the trailing CTA/state block are gone.

---

## 2. Element-by-element audit

### 2.1 Header / navigation — REWRITE
- **Before:** `navPrimary = [ /operadores "Operadores", /banzai "BanzAI", /o-que-e "Ler a referência" ]`
- **After:** `navPrimary = [ /registo-tecnico "Registo técnico", /banzai "BanzAI", /referencia "Ler a referência" ]`
- **Source / origin:** `website/lib/site.ts` (static route map), rendered by the site header desktop + mobile.
- **Why:** "Operadores" becomes the Technical Registry entry point; "Ler a referência" points **directly** at
  `/referencia` (never `/o-que-e`, no redirect). Exactly three destinations, one label each.

### 2.2 Hero eyebrow — KEEP
- `PROTOCOLO FINANCEIRO ABERTO · v1.0` — unchanged (`website/app/page.tsx`).

### 2.3 Hero title (h1) — REWRITE
- **Before:** "Interoperabilidade financeira em Angola, sem reconstruir integrações técnicas bilaterais."
- **After:** "Regras públicas para uma interoperabilidade financeira verificável."
- The `<h1>` now carries `id="hero-title"` and the hero `<section>` is `aria-labelledby="hero-title"`.

### 2.4 Hero paragraph — REWRITE
- **Before:** "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de
  interoperabilidade e certificação técnica para implementações independentes."
- **After:** "O BANZA é um protocolo financeiro aberto que permite a operadores publicar implementações e os
  respectivos endpoints públicos, demonstrar conformidade e verificar interoperabilidade através de perfis
  versionados e evidência reproduzível."
- This is the **short** definition; the full introductory definition is `/referencia/o-que-e`.

### 2.5 Hero indicators (3) — REWRITE
- **Before:** "Regras públicas e verificáveis" · "Interoperabilidade verificável" · "Confiança técnica por evidência"
- **After:** "Endpoints públicos" · "Motores Rust determinísticos" · "Resultados rastreáveis por evidência"
- Rendered as `<ul aria-label="O que o protocolo oferece">`; each glyph is `aria-hidden`; the hairline
  separators are `aria-hidden`.

### 2.6 Value-proposition (extra serif line) — DELETE
- **Before:** "Implementar uma vez. Demonstrar conformidade. Verificar interoperabilidade. Certificar
  tecnicamente. Interoperar através de um perfil comum."
- **After:** removed, no replacement (`home_value_proposition_extra_blocks=0`).

### 2.7 Manifest-testing form — DELETE
- **Before:** the "TESTAR UM MANIFESTO" island (`website/components/home/ManifestTester.tsx`): a text input
  for an `operator.json`/URL, a "TESTAR" button, a "NO BANZAI" link, five local verdicts and a
  "não certifica" disclaimer.
- **After:** the component file is **deleted** and its import removed from the Home. No textarea / URL / paste /
  upload input remains (`home_manifest_forms=0`, `home_manual_url_inputs=0`).

### 2.8 Hero CTA(s) — MERGE → single CTA
- **Before:** no single hero CTA; primary actions were scattered across the manifest tester and the downstream
  registry/journey sections (multiple buttons, including OZ-preset targets).
- **After:** one hero CTA — **"Validar operador no BanzAI" → `/banzai?mode=validation`** — with no OZ preset,
  target, workflow or query params (`home_primary_ctas=1`).

### 2.9 Hero diagram — REWRITE
- **Before:** an "INTEROPERABILIDADE / ILUSTRATIVO" ring with **four** operator cards (Operador A/B/C/D, each
  tagged "OPERADOR") around a "REGRAS PÚBLICAS" centre, plus "signature valid" / "trust: verified" chips.
- **After:** a "INTEROPERABILIDADE / CONCEPTUAL" diagram that distinguishes operator from implementation —
  two nodes ("Operador A / Implementação A1", "Operador B / Implementação B1"), a centre "Perfil BANZA v1.0 /
  Regras públicas e versionadas", four state chips (manifest verificado, assinatura válida, profile compatível,
  evidence ligada à origem), and the mandatory legend: *"Diagrama conceptual: implementações independentes
  verificam identidade, profiles e evidência através de regras públicas comuns. Não representa participantes
  activos nem pagamentos reais."*
- The badge changes "ILUSTRATIVO" → "CONCEPTUAL"; dropping the 4-operator ring prevents any read as an active
  scheme, a real network, or real payments.

### 2.10 Institutional phrase — REWRITE + MOVE
- **Before:** "Transparente. Auditável. Aberto a todos." (inline in the hero copy column)
- **After:** "Aberto. Auditável. Verificável." — now heads the dedicated "Estado público" band directly above
  the status bar.

### 2.11 Public status bar — REWRITE + derive from live/canonical state
- **Before (`HeroStatusBar.tsx`):** "PROTOCOLO ACTIVO · v1.0" (pulsing green dot) · "última verificação há Ns"
  (a decorative counter that ticks +1s and resets at 240s) · "6 nós em pré-produção" · "0 certificados emitidos".
- **After:** "PROTOCOLO v1.0 · PRÉ-PRODUÇÃO" · "última verificação pública há X" · "1 implementação de
  referência publicada" · "0 certificações técnicas activas".
- **Sources:** line 1 from `protocolStatus.PROTOCOL_VERSION`/`PROTOCOL_PHASE`; line 2 is the elapsed time
  relative to the **real** build timestamp `NEXT_PUBLIC_BANZA_BUILD_TIME` (injected in `next.config.mjs`),
  computed client-side; lines 3–4 from `REGISTRY_SUMMARY`. Forbidden terms removed: "nós",
  "certificados emitidos", "PROTOCOLO ACTIVO" (`home_public_node_counts=0`).

### 2.12 Registry section "Quem faz parte do protocolo" — REWRITE
- **Before (`OperatorRegistry.tsx`):** eyebrow "REGISTO DE OPERADORES · PÚBLICO" (pulsing green dot); a
  horizontal marquee of operator cards; a closing "Nenhum operador está certificado hoje…" line.
- **After:** eyebrow "REGISTO TÉCNICO · PÚBLICO"; title kept; a single boundary paragraph stated once:
  *"O Technical Registry publica operadores, implementações e estados técnicos verificáveis. Nesta secção,
  'fazer parte' significa possuir uma publicação técnica consultável; não significa admissão num scheme,
  certificação activa ou autorização regulatória."* No marquee.

### 2.13 Registry metrics — REWRITE + derive from canonical/live state
- **Before:** "0 Certificados" · "0 Em conformidade" · "00 Operadores registados" (2-digit zero-padded).
- **After:** "{prodCount} operadores de produção publicados" · "1 implementação de referência" (accent) ·
  "0 certificações técnicas activas".
- `prodCount` is the live `GET /operators` length or the `REGISTRY_SUMMARY.productionOperators` (0) fallback;
  the other two come from `REGISTRY_SUMMARY`. No "Certificados" / unscoped "Em conformidade" /
  "Operadores registados" (which counted OZ) / decorative "00". **Operador Zero is never counted as a
  production operator** (`home_operator_zero_production_counts=0`).

### 2.14 Operator cards — REWRITE
- **Before:** a marquee of an Operador Zero card ("… demo, só leitura · não certificado", level "KZ_DEMO")
  plus five empty "Sem operador / registo vazio" placeholders, doubled for the loop.
- **After:** a single Operador Zero card — "Operador Zero" / "Implementação canónica de referência" — showing
  `operator_id=operator-zero`, `implementation_id=operator-zero-ref-impl`, `ambiente=demonstração`,
  `superfície=read-only`, `origem=endpoints públicos`, `fundos reais=desactivados`, `certificação=NOT_CERTIFIED`,
  `validação=disponível no BanzAI`, linking to `https://zero.banza.network/`. Real production operators (if any)
  render from `GET /operators`; if none, the single line "Nenhuma outra implementação está publicada neste
  momento." No empty cards, no carousel, no KZ_DEMO-as-primary, no score/PASS (`home_empty_operator_cards=0`).

### 2.15 Registry-section CTA + trailing state line — MERGE
- **Before:** three trailing CTAs ("Ler a referência" → `/o-que-e`, "Ver operadores" → `/operadores`,
  "Começar a implementar" → `/banzai`) and a centred mono state line "Especificação pública v1.0 · Rede em
  pré-produção · Sem evidência de operador indexada".
- **After:** a single section CTA — **"Consultar o Technical Registry" → `/registo-tecnico`**. The "Rede…"
  state line is removed; its facts now live in the honest status bar and the registry metrics.

### 2.16 Three-layer section "Três camadas. Uma interface." — REWRITE
- Kept as the **last** main narrative band. Eyebrow and title unchanged.
- **Intro:** now "O BANZA separa as regras do protocolo, a certificação técnica e a operação de um scheme.
  O BanzAI é a interface transversal de consulta e validação; não constitui uma quarta camada."
- **L1 "BANZA · Protocolo":** rewritten to lead with the public, versioned rules (perfis, contratos, schemas,
  identidade, discovery, metadata assinada, trust, revogação, federação); explicitly not a bank/PSP/wallet/
  operator; moves no funds. (The registry is no longer named as L1's primary function.)
- **L2 "Certificação de Conformidade e Interoperabilidade":** rewritten — evaluates specific implementations
  against public, versioned profiles; **the Rust engines determine the results**; technical states may be
  published to the Technical Registry; **not** a licence, scheme admission or regulatory authorisation.
- **L3 renamed "Banzami Operational Scheme":** first scheme expected to adopt BANZA; designated operator:
  Banzami; regulatory preparation in progress; real payments off.
- **BanzAI transversal band:** rewritten — "Os motores Rust executam e determinam os veredictos; o Qwen apenas
  explica. O BanzAI não é uma camada nem uma autoridade." (removes the earlier "o Rust … encaminha …" phrasing).

### 2.17 Validation-journey section "PERCURSO DE VALIDAÇÃO" — DELETE
- The whole band — eyebrow, "Da descoberta à prontidão para certificação." title, the Discovery→…→Certification
  Readiness chips, the "DEPOIS, SE CERTIFICADA:" Certification Record / Technical Registry chips, the explainer
  and both CTAs — is **removed**, with no summarized replacement. The Home narrative ends after "Três camadas.
  Uma interface." (`home_validation_journey_sections=0`).

### 2.18 Footer — REWRITE
- **Before:** four columns (BanzAI / Protocolo / Implementação / Contacto); version line "Banza · v1.0 · 2026".
- **After:** three groups — **Protocolo** (O que é o BANZA → `/referencia/o-que-e`, Arquitectura → `/arquitectura`,
  Referência → `/referencia`, Estado → `/estado`) · **Implementar e validar** (Programadores, Technical Registry →
  `/registo-tecnico`, BanzAI, Operador Zero → `zero.banza.network`) · **Governança** (Decisões, Segurança →
  `/confianca`, Licença, GitHub). Institutional/version line → "BANZA v1.0 · protocolo financeiro aberto ·
  pré-produção". Added the boundary note "O BANZA não movimenta fundos nem concede autorização regulatória."
  (the two prior neutrality lines are kept). Added a GitHub footer icon; footer links use positional React keys.
- The footer "O que é o BANZA" link points at the canonical `/referencia/o-que-e` — not the removed standalone
  `/o-que-e`.

### 2.19 Metadata / canonical / OG / JSON-LD — REWRITE
- **Before:** the Home exported only `{ alternates: { canonical: "/" } }`; title/description came from the
  layout template `"%s · BANZA"`.
- **After:** the Home sets an absolute title — "BANZA — Protocolo financeiro aberto para interoperabilidade
  verificável" — a description ("O BANZA define regras públicas, perfis versionados e mecanismos verificáveis
  para operadores publicarem implementações e demonstrarem conformidade e interoperabilidade."), and canonical `/`.
- OG and JSON-LD are inherited from the **root layout** (`app/layout.tsx`) and were **not** modified by G2.
- The removed `/o-que-e` page (which carried `canonical: "/o-que-e"`) no longer emits any metadata / canonical /
  OG / JSON-LD.

---

## 3. Route consolidation

| Route | Before | After |
|---|---|---|
| `/o-que-e` | real page + canonical + sitemap + guard-allowlist entry | **deleted**; no page, no redirect/rewrite/alias whose source is `/o-que-e`; removed from sitemap and from the repo-guards allowlist; expected **404** |
| `/referencia/o-que-e` | reference chapter 1, already canonical, already cited by BanzAI | the **single** canonical introductory definition; target of the reference nav/footer links, the `/porque-existe` cross-link, and the retargeted legacy redirects |
| `/o-que-e-o-banza` | → `/o-que-e` | → `/referencia/o-que-e` |
| `/introduction` (EN) | → `/o-que-e` | → `/referencia/o-que-e` |

---

## 4. §42 metrics — source-verified vs. pending

All **structural** metrics are source-verified against the working-tree diff (`home_primary_ctas=1`,
`home_manifest_forms=0`, `home_manual_url_inputs=0`, `home_value_proposition_extra_blocks=0`,
`home_public_node_counts=0`, `home_operator_zero_production_counts=0`, `home_empty_operator_cards=0`,
`home_validation_journey_sections=0`, `home_section_order_failures=0`, `legacy_o_que_e_route_files=0`,
`legacy_o_que_e_redirects=0`, `legacy_o_que_e_rewrites=0`, `legacy_o_que_e_sitemap_entries=0`,
`legacy_o_que_e_service_worker_entries=0` — the site ships no service worker — `canonical_o_que_e_sources=1`,
`duplicated_banza_introductory_definitions=0`, `banzai_legacy_o_que_e_sources=0`).

The **live-surface** metrics — `broken_public_links=0`, `accessibility_blockers=0`, `mobile_blockers=0`,
`unexpected_public_fallbacks=0` — are **PENDING (finalized at deploy)** and are confirmed by the parent via
the public-edge crawl + browser + AT pass.

---

## 5. Findings (recorded for accuracy; test/website files were not edited by this task)

- **OF-1 — RESOLVED (by the implementer, in parallel).** The website test fixtures that previously asserted the
  PRE-G2 nav/home have been converged to the G2 contract, and a dedicated G2 test was added:
  - `website/lib/m2_15b-global-navigation.test.ts` now asserts the header is `[/registo-tecnico,/banzai,/referencia]`
    and that `navPrimary` contains **zero** items with href `/o-que-e`.
  - `website/lib/m2_16-home.test.ts` and `website/lib/m2_17-homepage.test.ts` updated (m2_17 now asserts the Home
    does **not** contain `href="/o-que-e"`).
  - `website/lib/m2_17a-footer-navigation.test.ts` asserts the three footer groups
    `["Protocolo","Implementar e validar","Governança"]`.
  - **New** `website/lib/m2_19g2-home.test.ts` covers §6/§7/§9/§10/§12/§13/§14–19/§20–24/§26/§27/§28/§32,
    including that `app/o-que-e/page.tsx` does not exist and the `/o-que-e` route is unlinked and absent from
    the sitemap.
  - `website/components/SiteNav.tsx` now renders "Registo técnico" (key `registo`) and the `/referencia` CTA.
- **OF-2 (cosmetic, still open):** `website/README.md:67` still lists `/o-que-e` in a human top-level route
  inventory. Out of scope here (website file); flagged for a README sweep.

Neither finding changes the shipped-surface metrics.
