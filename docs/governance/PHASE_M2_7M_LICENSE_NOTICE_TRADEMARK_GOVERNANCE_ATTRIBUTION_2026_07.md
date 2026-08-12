# Phase M2.7M — License, Notice, Trademark and Open Governance Attribution

- **Date:** 2026-07-19
- **Branch:** `feat/m2-7m-license-notice-trademark-governance-attribution-2026-07`
- **Deploy:** website-only.

## Problem observed

The repository stated the Apache-2.0 license but did not record the institutional origin (Banzami),
separate trademark use from the code license, or state — as a present fact — that governance is already
open. `GOVERNANCE.md`, `MAINTAINERS.md` and `TRADEMARKS.md` did not exist; the `NOTICE` was generic.

## Initial license state

`LICENSE` = **Apache License 2.0**, canonical (201-line unmodified template). Documentation stated as
CC BY 4.0 (`docs/governance/licensing.md`).

## Decisions

- **Keep Apache-2.0 canonical and unmodified** — no institutional narrative or custom restriction inside
  the license body (ADR-043).
- **NOTICE** updated: `Copyright © 2026 BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.`; Banzami named as original
  creator and initial institutional maintainer; BANZA stated as an open protocol governed publicly; the
  license grants no trademark rights.
- **TRADEMARKS.md** created: covered marks (BANZA/BanzAI/Banzami), main rule (license ≠ trademark),
  permitted use (nominative reference, forks, "compatible with the BANZA protocol"), use needing
  authorisation, allowed/prohibited phrases, Banzami relationship, contact.
- **GOVERNANCE.md** created: "BANZA governance is open today through the public GitHub repository. It is
  not a future promise." + origin, mechanisms, change flow, who decides, what governance does not do,
  BanzAI/operator/trademark relationships.
- **MAINTAINERS.md** created: institutional origin, active-maintainer model, become/remove criteria,
  Banzami role (not permanent private control).
- **CONTRIBUTING.md** updated: "Open governance" + "Contribution licensing" (Apache-2.0; SPDX where
  conventional) + boundary rules (BanzAI does not create rules; contributing grants no trademark rights).
- **README.md** updated: origin + open-governance-today + Banzami role + trademark note + links to
  LICENSE/NOTICE/TRADEMARKS/GOVERNANCE/MAINTAINERS/CONTRIBUTING; "BANZA is not a bank, PSP, wallet,
  payment operator or financial service provider."
- **ADR-043** created (next number) + website mirror + `/decisoes/adr-043` metadata.
- **Reference** (chapter 10 Governança): "Origem, manutenção e governação aberta" section + 7 FAQ Q&A
  (Banzami origin, control, code use, trademark, contribution ≠ marca, who proposes, BanzAI ≠ rules).
  PT byte-parity mirror synced; banzai-evidence WASM rebuilt.
- **Website**: new `/governanca` (open-governance page) and `/licenca` (license + trademarks page) +
  footer links; the legacy `/governanca → /governacao` redirect removed so the real page serves; the EN
  `/governance` alias repointed to `/governanca`.
- **SPDX**: policy documented in CONTRIBUTING; headers not mass-added (per PARTE 12).

## Guards

- **New** `make license-notice-governance-check` (`tools/check-license-notice-governance.sh`,
  self-testing, CI): presence of the six files, README links, required wording (Banzami origin, open
  governance today, license ≠ trademark, FAQ questions), and blocks closed-control / future-promise /
  license-grants-trademark phrasing.
- **Contamination gate** (`engines/banza-repo-guards`): added a scoped `banzami_attribution_allowed`
  allowance so Banzami **institutional attribution** is permitted on the legal/governance/attribution
  surfaces (NOTICE, GOVERNANCE, TRADEMARKS, MAINTAINERS, CONTRIBUTING, README, ADR-043, reference,
  decisions.ts, the two pages) — while payment-**operator** brands (`multicaixa`, `unitel money`,
  `africell money`, `e-kwanza`, `EMIS`) and the brand stem in filenames/other surfaces stay blocked.
  Operator neutrality is unchanged: Banzami is named as creator/steward, never as a certified operator.

## Tests / build / E2E

- 18 guards green; 164 vitest; `next build` green; `banzai-evidence` engine tests + repo-guards tests
  green.
- Browser E2E: `/governanca` 200 (Banzami origin, "aberta hoje", "não é uma promessa futura", BanzAI ≠
  rules), `/licenca` 200 (Apache-2.0, "não concede direitos de marca"), `/decisoes/adr-043` 200,
  `/referencia/governacao` + FAQ 200, no console errors.

## Services touched / untouched

Website-only. postgres / verification-api / banzai-api / reverse-proxy / DNS / TLS / Cloudflare /
secrets untouched. `/operators=[]`, `production_certificates=false`, provider mock, `llm_calls=0`.

## Mandatory negative confirmations

- The license was **not** closed; Apache-2.0 was **not** modified incompatibly.
- Trademark rights are **not** granted automatically by the license.
- Governance is **not** described as a future promise.
- Banzami is **not** described as permanent private control.
- The protocol remains open; operators are not approved/certified; BANZA is not a PSP/bank/wallet.
