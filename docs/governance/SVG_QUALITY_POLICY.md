# BANZA SVG Quality Policy

**Status:** active · **Since:** M2.7E (2026-07-18) · **Enforced by:** `make reference-svg-check` +
`make svg-visual-quality-check` (CI job `svg-visual-quality`).

BANZA diagrams are **official protocol documentation artifacts**, not decoration. A diagram that a reader
cannot trust visually is a defect in the specification's presentation. This policy defines what an
official BANZA SVG must be, and which of those rules are machine-enforced.

> **Um SVG oficial do BANZA deve ser legível, verificável e alinhado com o modelo activo do protocolo. Se
> um diagrama precisa de texto excessivo para ser entendido, o problema deve ser resolvido na
> arquitectura da informação, não comprimindo texto dentro do SVG.**

---

## 1. Structure (machine-enforced)

Every official diagram SVG (under `website/public/diagrams/**`, `docs/reference/diagrams/**`,
`docs/diagrams/**`) MUST:

- declare a `viewBox`;
- contain a `<title>` (accessible name) and a `<desc>` (accessible description) wired via
  `role="img" aria-labelledby="…"`;
- be **pure vector** — no `data:` URIs, no base64, no `<image>`, no `xlink:href`, no external/remote URL
  other than the mandatory `xmlns="http://www.w3.org/2000/svg"`;
- be well-formed XML.

**Exemptions.** Status **badges** under `conformance/badges/**` are a distinct artifact class (small
shields, not diagrams): they are exempt from the `<title>`/`<desc>`/`viewBox` diagram rules but MUST
still be pure vector and free of forbidden terms.

## 2. Legibility (part machine-enforced)

- No public diagram may carry meaningful text below **8px** (`font-size`). Machine-enforced: the guard
  fails any `<text>`/group `font-size` under the floor.
- Prefer chips/cards with **at most two short lines**; long explanation belongs in the Reference prose,
  never inside the image.
- No `textLength`-forced compression to cram a long string into a small box; no illegible vertical
  labels except where unavoidable and justified.

## 3. Spacing & layout (visual QA)

- No text may touch or overlap other text; no text may overflow its box; no icon may sit on top of text;
  no block may overlap another block; arrows must not cross text.
- The classic failure this policy exists to prevent: a left-aligned label and a right-anchored
  (`text-anchor="end"`) label sharing a `y` whose rendered extents collide (see the M2.7E repair of
  `banza-protocol-architecture-overview-v1.svg`, the "BanzAI · adjacente" block).
- Overlap/overflow/clipping are verified by **rendering QA** (browser E2E over the Reference chapters),
  documented per phase — the textual guard cannot prove pixel geometry.

## 4. Hierarchy & responsiveness

- Clear title, short subtitle, well-separated groups, few colours per diagram, primary elements larger.
- The diagram must remain comprehensible when scaled down; critical information must never depend on tiny
  text. Pages embed diagrams in an `overflow-x` safe container so they never force horizontal page
  scroll.

## 5. Semantics (machine-enforced, negation-aware)

Every diagram must represent the **active** model of the open financial protocol and must NOT present, as
active architecture, any removed concept. Forbidden **when asserted** (a clear negation — "não
certifica", "sem BANZA CA", "não por aprovação humana" — is allowed, since naming an edge is how the
model states its own boundary):

- `BANZA CA` / certificate authority; `certificado de operador`; `operador certificado`;
  `certificado BANZA`; `certificados de produção`; certification-as-a-flow (`certificação` as a process
  an operator passes); central `aprovação humana` / `operador aprovado` / `operador aceite`;
  `licença BANZA`;
- `Clientes e Comerciantes` / `Utilizadores` as a **main architecture layer**;
- `Banzami`;
- `M2`/`M3` presented as an **operator tool**; `readiness`;
- an `M1–M6` roadmap milestone named `Operador Certificado`.

Use instead: protocolo financeiro aberto; operadores independentes; **BanzAI**; evidência
verificável; manifesto do operador; signed protocol metadata; Trust Engine; chaves delegadas; Public
Protocol Registry; revogação / fail-closed; federação / interoperabilidade; conformidade verificável;
verificação guiada pelo BanzAI. A protocol **roadmap** (M1–M6 as protocol milestones) and "federação
controlada" as the protocol's own trust-gated federation are legitimate active-model terms.

No diagram may suggest that BANZA is a bank, PSP, wallet, or operator.

## 6. Relationship between the two guards

- `make reference-svg-check` — asserts every `/diagrams/**` path referenced by the Reference is actually
  served by `website/public` (no 404s). Existence only.
- `make svg-visual-quality-check` — asserts the structure (§1), legibility floor (§2), pure-vector (§1)
  and semantics (§5) rules above across all official diagram SVGs, with self-tests. It is a best-effort
  text/structure linter; the **visual** guarantees (§3) are the phase's rendering QA.

A diagram SVG with overlapping text, broken layout, stale semantics, or low legibility **fails review**.
