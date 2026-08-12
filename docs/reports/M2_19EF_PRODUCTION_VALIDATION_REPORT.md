# M2.19E/F — Production Validation Report

**Status:** COMPLETE + LIVE (2026-07-29)
**Branch:** `release/m2-19ef-premium-operator-zero-banzai-validation` · **Base:** `4a07079`

## Build evidence (local, pre-merge)
- tsc clean · vitest (incl. 9 new: banzaiValidation 6, operationReceipt 3) · `next build` — `/oz` 8.85 kB,
  `/banzai?mode=validation (native validation mode; superseded the earlier standalone route in M2.19E/F.2)` 14 kB · banzai-api node tests · cargo (query-core/api-kb/certification) ·
  corpus-integrity (doc-index 658 chunks, ADR-067) · identity · rust-rule · M2.5/M2.6 · SVG guards ·
  full Operador Zero guard family (10) + 3 new guards.

## PR / CI / merge
PR #223 — CI **169 pass / 0 fail** (fixes: repo-guards ADR range 1..=67; M2.9F Validation-Workbench vocabulary allow) → merged `--admin --squash` → main **734517e**.

## Deploy (VPS 82.165.165.97)
`sudo git pull` (repo 734517e) → `docker compose build/up website banzai-api` → `restart reverse-proxy`. Both containers healthy. Digests: website `sha256:3bef7a2c0a922c3dd7c4a3bd005dd54fbed78187c33ebea67332b59906d805d5`; banzai-api `sha256:44c6216fd6d16df79860d0940687db6d87215f5022efc763cf2045d96ac46b09`.

## Public-edge QA
- `GET https://zero.banza.network/` → **HTTP 200, 0 redirects**; Chrome/Safari/Firefox UAs all 200/0-redirect. Present: "Implementação de referência", "Estado técnico", "Validar esta implementação no BanzAI", "NOT_CERTIFIED", "Artefactos públicos". **Absent (0):** "Iniciar simulação", "Executar fluxo", "100/100", "PASS demo", "Clonar no BanzAI".
- `GET https://banza.network/banzai?mode=validation (native validation mode; superseded the earlier standalone route in M2.19E/F.2)?target=operator-zero&workflow=full` → HTTP 200; browser render shows the 9 steps + TARGET operator-zero, DEMO_ONLY true, CERTIFICATION NOT_CERTIFIED, "qwen_calls: 0, external_calls: 0".
- **Full journey executed in production** (clicked "Executar jornada completa"): Discovery → **VERIFIED** (engine `banza-operator-manifest` 0.1.0; reason codes DISCOVERY_OK/OPERATOR_ID_RESOLVED/…; evidence refs operator-zero:/manifest.json etc.; OperationReceipt op_7a72ce91… / req_0f7b8e7c…; duration 257ms; **QWEN_CALLS 0 / EXTERNAL_CALLS 0**; real SHA-256 input/output hashes). Journey receipt: journey_0eb54310…, CERTIFICATION NOT_CERTIFIED, READINESS PRE_PRODUCTION, 9 steps, exportable JSON.

## Verdict
**M2.19E/F = COMPLETE + LIVE.** Rust executes and decides every verdict; Qwen never decides; receipts bind every step; Operador Zero is read-only; production reflects all of it. Rollback: revert 734517e or `git checkout rollback-pre-m2-19ef-operator-zero-realignment`.
