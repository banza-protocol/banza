# BANZA Whitepaper v1.0 — Charter

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


Editorial charter for the official BANZA Whitepaper. It fixes scope, identity, structure and publication
conditions **before** the canonical English draft is written. Nothing in this charter is normative for the
protocol; the protocol's normative sources are the versioned BANZA Reference, profiles, schemas, contracts
and RFCs. This charter is a **Gate Editorial A** artifact and requires explicit human approval before
drafting begins.

Program: **WP1-FINAL** · Branch `docs/banza-whitepaper-v1-0` · Base `d912f51` · Rollback tag
`rollback-pre-banza-whitepaper-v1-0` · Independent of M2.19 (this program never edits M2.19 execution
state, milestones, engines, the Technical Registry, operator-validation behaviour, or the Home design
beyond one approved secondary hero CTA).

---

## 1. Purpose

Prepare, review and publish a **foundational, citable** document that explains what BANZA is, the problem
it addresses, its system model, three-layer architecture, security boundaries and evidence model — in a
form on which **future scientific articles** can be built. It is deliberately **not** the normative
specification, an implementation/deployment manual, a certification report, a regulatory filing, a business
plan, an investor deck, or a Banzami brochure.

## 2. Audience

Protocol engineers and architects; operators evaluating BANZA; conformance/interoperability reviewers;
researchers in financial interoperability, verifiable systems and trust; and technically literate
institutional readers. International, drafted English-first, with a full Portuguese edition (the Portuguese edition is the canonical version; see §5).

## 3. Central thesis

> **EN (official translation):** BANZA creates a common language through which independent financial operators can
> interoperate using public rules, demonstrable conformance and verifiable evidence, without relying on
> closed technical integrations between each pair of operators.

> **PT (canonical):** O BANZA cria uma linguagem comum para que operadores financeiros independentes
> interoperem através de regras públicas, conformidade demonstrável e evidência verificável, sem depender
> de integrações técnicas fechadas entre cada par de operadores.

Depth comes from explaining the **mechanism**, not from adjectives. Every material claim is backed by a
definition, a mechanism, a canonical BANZA source, a primary external reference, reproducible evidence, or
a stated limitation (see the Claim–Evidence Matrix).

## 4. Contributions (scoped to demonstrable mechanisms — §11)

1. Separation of open protocol (L1), technical certification (L2) and operational schemes (L3).
2. Evaluation of a specific **implementation**, not absolute certification of an entity.
3. Artifacts published from a **canonical origin**.
4. Deterministic validation against public **profiles** and **versions**.
5. **Evidence** and **receipts** bound to inputs and engine versions.
6. Separation of deterministic **decision** (Rust) from AI-assisted **explanation** (Qwen/BanzAI).
7. Verifiable publication of technical states (Technical Registry).
8. Independent validation without depending on the hosted interface.
9. Versioned, extensible governance.
10. A reproducible reference implementation.

No superlatives (first/only/revolutionary/trustless/guaranteed/regulator-approved/production-proven/etc.).

## 5. Identity (binding — see the Author & Affiliation Record)

- **Title (EN, official translation):** *BANZA: An Open Protocol for Financial Interoperability* — Whitepaper v1.0, Official English Translation.
- **Title (PT, canonical):** *BANZA: Protocolo Aberto de Interoperabilidade Financeira* — Whitepaper v1.0, Edição canónica (Português).
- **Authors (locked order):** 1) Fidel R. Monteiro (Fidel Rodrigues Monteiro) · 2) Jesus R. Monteiro (Jesus Rodrigues Monteiro).
- **Relationship:** Co-founders of Banzami / Cofundadores da Banzami. (No equal-contribution/joint-first/corresponding-author notes without express decision.)
- **Affiliation & publisher:** Banzami — **BANZAMI – Tecnologia e Serviços, Lda.** (canonical casing; one form throughout).
- BANZA is presented as *an open financial interoperability protocol* — never a payment network/system, banking/settlement network, digital currency, blockchain protocol, or financial/payment operator.

## 6. Language rule (binding)

Portuguese is the **canonical** edition; English is an **official, integral, structurally equivalent**
translation. Neither is "published" until both editions (source, web page, PDF), both sets of metadata,
both hashes, the manifest, the version history and the citation forms exist **simultaneously**. The
canonical-prevalence declarations (EN/PT, §3 of the program) appear in both editions. The translation
never summarises, adds, removes, softens, reorders, or diverges. PT uses the institutional terminology
already adopted by BANZA (consistent European Portuguese, no PT-BR/AO drift).

## 7. Nature & non-normativity

Foundational · architectural · scientific-technical · **non-normative** · citable · versioned · relatively
stable · public · bilingual. The paper avoids MUST/SHALL/REQUIRED as its own normative language except when
describing or quoting a Reference rule. It carries the scope declaration (program §4) in both languages.

## 8. Exact structure — ten A4 pages per edition

One column, academic typography, monochrome. The ten pages include cover, abstract, figures, conclusion and
references (no separate TOC page, no annexes, no supplementary pages, no bilingual combined PDF). Page plan
is fixed in the Detailed Outline:

| Page | Content | Figure |
|---|---|---|
| 1 | Cover & bibliographic identity | — |
| 2 | Abstract (180–250 w), keywords, problem | — |
| 3 | Motivation, related work, contribution | Fig. 1 |
| 4 | System model (operator/implementation/profile/version/environment/scope/origin/artifacts; compact formal model) | — |
| 5 | Three-layer architecture (L1/L2/L3 + BanzAI transversal) | Fig. 2 |
| 6 | Discovery, identity, canonical origin | Fig. 3 |
| 7 | Deterministic validation (nine steps; Rust decides / Qwen explains) | — |
| 8 | Evidence, receipts, trust, Technical Registry | Fig. 4 |
| 9 | Security, governance, limitations, current state | — |
| 10 | Discussion, conclusion, references, citation | — |

## 9. Editorial budget

EN 3,000–3,600 words (≈4,000 max), 4 figures, 3 equations, 12–18 references. PT integral, also 10 pages.

## 10. Figures (four, monochrome, mechanism-first — see Figure Specification)

Fig. 1 Bilateral integrations vs a common protocol · Fig. 2 Three-layer architecture (+ BanzAI transversal,
not a 4th layer) · Fig. 3 Canonical origin & published artifacts · Fig. 4 Deterministic validation &
evidence. Vector, identical geometry in both languages (only text localised), no gradients/shadows/3D/
color-dependence/screenshots/mockups; **not** copied from the Bitcoin paper.

## 11. Licence

**CC BY 4.0**, reusing the repository's existing stated documentation policy (README + `docs/governance/licensing.md`). The paper cover/colophon carries an explicit CC BY 4.0 marker plus the fixed attribution
string `© 2026 BANZAMI – Tecnologia e Serviços, Lda.` No IP transfer; no public-domain dedication. (Gate-A
decision item — confirm CC BY 4.0.)

## 12. Versioning & publication conditions

Version 1.0; tag `banza-whitepaper-v1.0`. After publication v1.0 is immutable (patch = typo, minor =
material editorial change, major = architectural change). "Published" requires: both sources, both web
pages, both PDFs, both metadata sets, both PDF SHA-256 hashes, the manifest, the version history, the
citation forms, the Home hero CTA live, public-edge QA green, and rollback confirmed. Three human gates (A
Charter, B drafts, C pre-publication) — no auto-approval.

## 13. PDF pipeline decision (Gate-A)

No `typst`/`tectonic`/`latex` is installed today and none is pinned. **Recommendation: Typst**, pinned to a
fixed version and run in a version-locked container (the Rust toolchain is already present; Typst gives
deterministic A4 output, embedded fonts, selectable text, links, equations and vector figures without a
browser-print pipeline). Web (HTML) and PDF are generated from the **same** per-language source; no divergent
hand-maintained copies. Fonts embedded, EN+PT + math coverage, embedding-permitted licence; font files are
never shipped to the public.

## 14. Home hero CTA (no redesign — see CTA wireframe in the Figure Specification)

Preserve the approved hero exactly (eyebrow "PROTOCOLO FINANCEIRO ABERTO · v1.0", 3-line title, paragraph,
italic words, 3 indicators, concentric-ring "ILUSTRATIVO" illustration, two-column composition, background,
colours, header, sections, footer, header "Ler a referência" CTA). Keep the **primary** CTA exactly —
`Validar operador no BanzAI` → `/banzai?mode=validation`. Add **one** secondary, outlined/neutral CTA
`Ler o Whitepaper` → `/whitepaper` beside it (desktop same line, primary first; mobile stacked, primary
first). No third CTA, no promo banner, no animation, no two equal-weight solid burgundy buttons.
**Companion change required:** the `/whitepaper` route + sitemap entry must exist or the CTA is a 404.

## 15. Boundaries reaffirmed

BANZA is not a bank/PSP/wallet/operator; holds no funds; does not settle/license/authorise/admit. Technical
certification is per-implementation and scoped; it is not scheme admission or regulatory authorisation.
BanzAI is a transversal interface, not a layer or authority; Rust decides, Qwen only explains. Operador Zero
is a sandbox reference implementation (read-only, KZ_DEMO, no real funds, NOT_CERTIFIED, not production).
Banzami is the publisher/affiliation/first intended L3 scheme operator (REGULATORY_AUTHORIZATION_IN_PROGRESS,
real money OFF), separate from the BANZA protocol.

## 16. Documented divergences carried into drafting (do not reconcile silently)

See the Source Inventory register. None blocks the central thesis; the paper follows the canonical source in
each case and states the boundary. Key items: the trust-root signing description (follow canonical Model A —
root signs only the Key Manifest, a delegated key signs the revocation list); the canonical Reference
predates the three-layer vocabulary (ground the three-layer model on ADR-059..069 + governance docs, cite
the Reference as the versioned normative implementation spec); obsolete "BANZA CA" strings survive only in
two engine `Cargo.toml` metadata comments and a stale `certificates` table line in the PT Reference — these
are pre-existing, outside WP1's no-touch scope (engines/M2.19 surfaces), and are recorded for a separate
follow-up, not edited here.

## 17. Open Gate-A decisions for the human

1. Approve the Charter, 10-page outline, authorship/affiliation, four figures and the hero CTA.
2. Confirm licence = **CC BY 4.0**.
3. Confirm PDF pipeline = **Typst** (pinned, containerised).
4. Confirm ORCID / corresponding-author: **none** for v1.0 (unless provided).
5. Acknowledge the documented divergences (§16) are handled editorially and not silently reconciled.
