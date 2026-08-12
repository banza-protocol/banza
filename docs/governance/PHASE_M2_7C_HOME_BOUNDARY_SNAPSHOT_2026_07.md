# Phase M2.7C — Home Boundary Snapshot Before Animated Architecture

**Date:** 2026-07-18 · **Branch:** `feat/m2-7c-home-boundary-snapshot-2026-07`
**Type:** `feat(website)` — one compact homepage section (website-only)

## Reason
After M2.7B reduced the home to hero + operator-architecture + footer, a reader lands on the animated
architecture with no one-glance statement of what BANZA *is* and *is not*. M2.7C reintroduces a **single,
compact institutional boundary snapshot** between the hero and the architecture — a bridge, **not**
documentation. The full explanation stays in the Referência Completa.

## Boundary snapshot ≠ long documentation
- Two cards, short bullets, no paragraphs, moderate height; entrance fade via the site's `data-reveal`.
- It does **not** reintroduce any removed M2.7B long section (`02 Estado verificável`, `03 Como funciona`,
  `04 Confiança`, `05 Por onde começar`, `06 BanzAI`, `07 Roteiro`) or the audience cards.

## Home structure (final)
`Hero → Boundary snapshot → connecting microphrase → Operator-architecture (animated) → global SiteFooter`
(verified order on `/`: hero @65 → boundary @1902 → architecture @3314).

## Position & copy
New component `website/components/home/BoundarySnapshot.tsx`, rendered in `website/app/page.tsx`
immediately after `<HeroEstado/>` and before `<OperatorArchitectureSection/>`.
- **Heading:** "O que o BANZA é — e o que não é"; **subtitle:** "Uma fronteira simples para entender o
  protocolo antes de explorar a arquitectura operacional."
- **O BANZA É** (burgundy card): um protocolo financeiro aberto · um conjunto de regras públicas,
  contratos e schemas · uma base para conformidade verificável por máquina · um modelo de trust com
  metadata assinada, registry público e revogação/fail-closed · um caminho para operadores independentes
  interoperarem · um ecossistema apoiado pelo BanzAI Workbench para simular, verificar e gerar evidência.
- **O BANZA NÃO É** (discreet-gold card): Não é banco · Não é PSP · Não é carteira digital · Não é
  operador financeiro · Não aprova operadores · Não certifica operadores · Não emite licença · Não
  processa, liquida, movimenta ou detém fundos · Não substitui obrigações legais, regulatórias e
  operacionais dos operadores.
- **Closing:** "BANZA define o protocolo. Operadores independentes prestam serviços reais quando tiverem
  enquadramento próprio para o fazer."
- **Microphrase before the architecture:** "Com a fronteira clara, o fluxo operacional começa no BanzAI
  Workbench."

## Guard updated
`tools/check-home-minimal.sh` (`make home-minimal-check`, in CI) now: still blocks the removed long
sections / audience cards / removed-model vocabulary; **explicitly allows** the compact boundary heading
and the negative boundary statements; requires the render order hero → boundary → architecture and the
boundary's required copy; and **blocks affirmative mis-positioning** — an active "BANZA é banco/PSP/
carteira/operador" claim fails, while "não é banco / BANZA não é PSP" passes (negation-safe). Self-tests
per the phase spec (long "Como funciona" fails; boundary heading passes; "BANZA não é banco" passes;
"BANZA é PSP" fails; "operador certificado" fails).

## Tests / checks
17 make guards green (incl. `home-minimal-check`, self-tested) · `type-check` · vitest 115/115 ·
`next build`. Browser E2E: order hero → boundary → architecture → footer; single CTA "Começar
implementação" → `/banzai/workbench`; "O BANZA É"/"O BANZA NÃO É" + "protocolo financeiro aberto"/"Não é
banco"/"Não é PSP"/"Não processa, liquida, movimenta ou detém fundos" present; removed long sections
absent; no horizontal overflow at 375px; zero console errors.

## Adversarial review
Simplicity ✓ (home stays short; the section is two compact cards, not documentation). Boundary ✓ (clear
what BANZA is/is not; no bank/PSP/operator mis-positioning — affirmative claim blocked by the guard).
Active model ✓ (no BANZA CA / operator certificate / central approval / certification-as-flow — negations
only). UX ✓ (bridges into the animated architecture; mobile clean; burgundy/gold contrast).

## Confirmações negativas
`/operators=[]`, `production_certificates=false`, provider mock, `llm_calls=0`, no external calls; no
BANZA CA / operador certificado / certificado de operador / aprovação humana central / certificação-como-
fluxo; no CLI/Python/Docker/GitHub-Actions as operator path; no operator created/accepted/approved/
certified; no certificate/licence issued; no real federation/external integration; no payments/settlement/
funds; `.env`/DNS/Cloudflare/TLS/Postgres/secrets untouched; deploy website-only.
