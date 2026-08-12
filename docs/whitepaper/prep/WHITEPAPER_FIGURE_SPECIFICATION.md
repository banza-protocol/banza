# BANZA Whitepaper v1.0 — Figure Specification

Four original monochrome figures + the Home hero CTA wireframe + the page wireframe. Discipline inspired by
foundational protocol papers (restrained, mechanism-first) **without copying any Bitcoin figure**.

## Shared visual discipline (all four figures)

- Black on white (single ink). No gradients, shadows, 3D, icons-as-decoration, screenshots, mockups, hero
  illustrations, decorative backgrounds, or colour as a semantic dependency.
- Simple rectangles, thin rules (~0.75pt), direct arrows, one idea per figure, readable in < 30 s.
- **Vector** (SVG source → embedded in PDF). Identical geometry in EN and PT; **only labels are localised**.
- Each figure has: number, title, caption, alt text, EN + PT label sets, and a grayscale print test.
- Fits within the page text column; caption ≤ 2 lines.

---

## Figure 1 — Bilateral integrations vs a common protocol  (Page 3)

Two panels, same four operators, contrasting the O(n²) mesh with the common-rules model.

```
 (a) Pairwise integrations            (b) Common protocol
      A───B                                A   B
      │ ╳ │                                 \ /
      C───D                          ┌──────────────────┐
   every pair a private contract     │  BANZA public    │
   (n(n-1)/2 closed links)           │  rules · profiles │
                                      └──────────────────┘
                                        A  B  C  D  each implements the same public rules
```

- **Title EN:** Bilateral integrations versus a common protocol · **PT:** Integrações bilaterais versus um protocolo comum.
- **Caption EN:** Pairwise integrations grow as n(n−1)/2 closed contracts; a common protocol lets independent operators implement the same public rules. · **PT:** As integrações par-a-par crescem como n(n−1)/2 contratos fechados; um protocolo comum permite que operadores independentes implementem as mesmas regras públicas.
- **Alt EN:** Left: four operators A–D fully meshed by private links. Right: the same operators each connecting to one shared public rule-set instead of to each other.
- Boundary: BANZA is **not** drawn as a hub that processes transactions — it is the shared *rules*, not a switch.

## Figure 2 — Three-layer architecture  (Page 5)

Three stacked bands + a transversal side rail for BanzAI (NOT a fourth band).

```
      ┌───────────────────────────────────────────┐   ┌────────────┐
  L3  │ Operational Schemes (e.g. Banzami Scheme)  │   │            │
      ├───────────────────────────────────────────┤   │  BanzAI    │
  L2  │ Conformance & Interoperability Certification│  │ transversal│
      ├───────────────────────────────────────────┤   │ interface  │
  L1  │ BANZA Protocol (open, neutral)             │   │ (not a     │
      └───────────────────────────────────────────┘   │  layer)    │
                                                        └────────────┘
```

- **Title EN:** The three-layer architecture · **PT:** A arquitectura em três camadas.
- **Caption EN:** L1 open protocol, L2 per-implementation certification, L3 independent operational schemes; BanzAI is a transversal interface across all three, not a fourth layer or an authority. · **PT:** L1 protocolo aberto, L2 certificação por implementação, L3 schemes operacionais independentes; o BanzAI é uma interface transversal às três camadas, não uma quarta camada nem uma autoridade.
- **Alt EN:** Three stacked layers L1 (protocol), L2 (certification), L3 (operational schemes), with BanzAI drawn as a side rail spanning all three.
- Boundary: BanzAI is a side rail, never a stacked band; L3 names the Banzami Scheme only as the *first intended* scheme.

## Figure 3 — Canonical origin and published artifacts  (Page 6)

Left-to-right flow; the verifier fetches, it does not receive pushed data.

```
 operator ─▶ implementation ─▶ canonical origin (https://…/.well-known/…)
                                     │ publishes
                                     ▼
                    ┌───────── signed artifacts ─────────┐
                    │ Manifest · signed metadata · keys · │
                    │ revocation · endpoints              │
                    └───────────────┬─────────────────────┘
                                     ▼  server-side, SSRF-hardened fetch
                              deterministic engines
```

- **Title EN:** Canonical origin and published artifacts · **PT:** Origem canónica e artefactos publicados.
- **Caption EN:** An implementation publishes signed artifacts from its canonical origin; a hardened server-side fetcher retrieves them for evaluation — never from a caller-supplied URL. · **PT:** Uma implementação publica artefactos assinados a partir da sua origem canónica; um fetcher server-side endurecido obtém-nos para avaliação — nunca a partir de uma URL fornecida pelo chamador.
- **Alt EN:** Operator to implementation to canonical origin, which publishes signed artifacts that a hardened server-side fetcher pulls into the engines.
- Excludes onboarding operationals (no OTP/Candidate Registry/forms).

## Figure 4 — Deterministic validation and evidence  (Page 8)

Three visually separated zones: **execution** (Rust) → **publication** (registry) with **explanation** (BanzAI) shown as a distinct, non-deciding branch off the results.

```
 inputs (artifacts, hashes)
        │
        ▼
 ┌───────────────────────────┐     results + reason codes
 │ Rust engines (9 steps)     │ ───────────────┬───────────────▶ receipts + Evidence Bundle
 │ discovery…certification     │                │                        │
 │ EXECUTE + DECIDE            │                │                        ▼
 └───────────────────────────┘                │                 Technical Registry (publication)
        │ results                              ▼
        └──────────────────────────▶ BanzAI / Qwen — EXPLAINS only (never decides/publishes)
```

- **Title EN:** Deterministic validation and evidence · **PT:** Validação determinística e evidência.
- **Caption EN:** Rust engines execute the nine steps and determine the results; receipts and the Evidence Bundle bind results to inputs, hashes and engine versions; publication is separate; BanzAI only explains. · **PT:** Os motores Rust executam os nove passos e determinam os resultados; os receipts e o Evidence Bundle ligam os resultados às entradas, hashes e versões dos motores; a publicação é separada; o BanzAI apenas explica.
- **Alt EN:** Inputs enter the Rust engines which decide and emit results; results become receipts and an Evidence Bundle and are separately published to the Technical Registry; a distinct branch shows BanzAI explaining, not deciding.
- Boundary: execution, publication and explanation are drawn as three separate zones; the explanation branch never feeds back into the decision.

---

## Hero CTA wireframe (Home) — additive, no redesign

Everything in the approved hero is preserved. The **only** change is one secondary outlined CTA next to the
existing primary CTA (`website/app/page.tsx`, the `<div data-rise>` at ~line 111 that currently holds the
single primary `<Link href="/banzai?mode=validation">`).

```
DESKTOP (two CTAs on one line; primary first)
┌──────────────────────────────────────────────────────────────┐
│  eyebrow: PROTOCOLO FINANCEIRO ABERTO · v1.0        [concentric │
│  H1  Protocolo aberto e / verificável de /          ring        │
│      interoperabilidade financeira.                 ILUSTRATIVO │
│  paragraph …                                        illustration│
│  ● indicator  ● indicator  ● indicator              — unchanged]│
│  ┌───────────────────────────────┐  ┌────────────────────────┐ │
│  │▓ Validar operador no BanzAI →▓│  │  Ler o Whitepaper       │ │
│  │  (PRIMARY — burgundy, exact)  │  │  (SECONDARY — outlined) │ │
│  └───────────────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

MOBILE (stacked; primary first, full width)
  [▓ Validar operador no BanzAI → ▓]   (primary, burgundy)
  [   Ler o Whitepaper            ]    (secondary, outlined)
```

- Primary: `Validar operador no BanzAI` → `/banzai?mode=validation` — **unchanged** (same burgundy gradient,
  same shield icon, same label, same destination, stays primary).
- Secondary (new): `Ler o Whitepaper` → `/whitepaper` — outlined/neutral (transparent fill, 1px burgundy
  border, burgundy text), **same height** as primary, consistent typography, optional small document/book
  icon only if coherent, accessible focus state, discreet hover, adequate contrast. Opens the bilingual
  entry page (not a PDF, not the PT-only page).
- Desktop: both on one line, primary left, secondary right, moderate gap; illustration, indicators and hero
  height unchanged. Mobile: stacked, primary first, spacing between, no overflow, no clipped text.
- Never: a third CTA, a promo banner, animation, two equal-weight solid burgundy buttons, or any change to
  the eyebrow/title/paragraph/italics/indicators/illustration/background/colours/header/footer/sections or
  the header "Ler a referência" CTA.
- **Companion requirement:** create `website/app/whitepaper/page.tsx` and add `/whitepaper` to `sitemap.ts`
  before/with this CTA — otherwise it 404s.
- Visual acceptance (Gate B): screenshots at wide-desktop/laptop/tablet/mobile/narrow-mobile with
  `hero_title_changes=0`, `hero_paragraph_changes=0`, `hero_illustration_changes=0`, `primary_cta_changes=0`,
  `secondary_whitepaper_ctas=1`, `home_redesigns=0`.

## Page wireframe (single-column, ten A4 pages)

```
┌───────────────────────────────┐   one column · balanced margins
│ running header (short title)   │   academic body face, discreet headings
│                                │   consistent captions · numbered pages
│  ……… body text ………            │   monochrome · figures within the column
│  [ Figure n ]                  │   references legible on Page 10
│  caption                       │
│ page n / 10                    │
└───────────────────────────────┘
```
