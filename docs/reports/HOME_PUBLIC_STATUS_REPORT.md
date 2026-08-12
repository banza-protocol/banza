# HOME — Public Status Report (M2.19G.2 §13)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary files:** `website/components/home/HeroStatusBar.tsx`, `website/lib/protocolStatus.ts`,
  `website/next.config.mjs`, `website/app/page.tsx`

---

## 1. The honest, sourced status bar

Every value on the status bar is now sourced — none is decorative or browser-seeded. The bar sits in the
"Estado público" band, directly under the institutional phrase "Aberto. Auditável. Verificável.".

| # | Final text | Source |
|---|---|---|
| 1 | `PROTOCOLO v1.0 · PRÉ-PRODUÇÃO` | `protocolStatus.PROTOCOL_VERSION` (`"1.0"`) + `PROTOCOL_PHASE` (`"PRÉ-PRODUÇÃO"`) |
| 2 | `última verificação pública há X` | elapsed relative to the **real** build timestamp `LAST_VERIFIED_AT` = `process.env.NEXT_PUBLIC_BANZA_BUILD_TIME`, computed client-side (`relTime`) |
| 3 | `1 implementação de referência publicada` | `REGISTRY_SUMMARY.referenceImplementations` (1) |
| 4 | `0 certificações técnicas activas` | `REGISTRY_SUMMARY.activeCertifications` (0) |

## 2. New single-source status module

`website/lib/protocolStatus.ts` (new) is the single truth for public status/registry facts:

- `PROTOCOL_VERSION = "1.0"`, `PROTOCOL_PHASE = "PRÉ-PRODUÇÃO"`.
- `LAST_VERIFIED_AT = process.env.NEXT_PUBLIC_BANZA_BUILD_TIME ?? "1970-01-01T00:00:00.000Z"` — the real
  build/deploy moment.
- `REGISTRY_SUMMARY = { productionOperators: 0, referenceImplementations: 1, activeCertifications: 0 }`.

`website/next.config.mjs` injects the real timestamp at build:
`env: { NEXT_PUBLIC_BANZA_BUILD_TIME: new Date().toISOString() }`.

## 3. Real-timestamp rendering (no hydration lie)

`HeroStatusBar` bases the elapsed label on the real timestamp: before mount it renders the base value so SSR
and the first client paint agree; after mount it refreshes from `Date.now()` each minute (still a real elapsed
time). The elapsed span uses `suppressHydrationWarning` because the client refines the value.

## 4. What was removed (PRE-G2 → after)

| Before (`fffa9f7`) | After |
|---|---|
| `PROTOCOLO ACTIVO · v1.0` (pulsing green dot) | `PROTOCOLO v1.0 · PRÉ-PRODUÇÃO` |
| `última verificação há Ns` (counter +1s, resets at 240s) | `última verificação pública há X` (from the real build timestamp) |
| `6 nós em pré-produção` | **removed** |
| `0 certificados emitidos` | `0 certificações técnicas activas` (and `1 implementação de referência publicada` added) |

Forbidden terminology removed: `nós`, `certificados emitidos`, `PROTOCOLO ACTIVO`; not introduced: `membros`,
`rede activa`, `participantes conectados`.

## 5. §42 metrics carried here

`home_public_node_counts=0` — **source-verified** (no node/member counts; no "certificados emitidos").

## 6. Guards / tests

- `website/lib/m2_19g2-home.test.ts` §13 guards the honest, sourced status bar (the four sourced lines; no
  node/member counts; no "certificados emitidos"; no "PROTOCOLO ACTIVO").

## 7. PENDING (finalized at deploy)

- The rendered "há X" value and the real `NEXT_PUBLIC_BANZA_BUILD_TIME` at deploy · PR number · merge commit ·
  deploy image digests · status-bar screenshots · browser matrix · request-ids · cache/CDN state ·
  service-worker state (none) · rollback confirmation.
