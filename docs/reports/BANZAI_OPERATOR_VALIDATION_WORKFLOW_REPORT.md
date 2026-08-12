# modo de validação do BanzAI (M2.19E/F, ADR-067)

Route `/banzai?mode=validation (native validation mode; superseded the earlier standalone route in M2.19E/F.2)` (component `ValidationWorkbench.tsx`, receipts `lib/operationReceipt.ts`). A human
initiates a 9-step journey — Discovery · Manifest · Keys · Conformance · Interoperability · Trust ·
Federation · Evidence · Certification Readiness — executed by the **Rust WASM validators**
(banza-operator-manifest, banza-conformance L0, banza-trust, banza-simb, banza-l2/l3-readiness,
banza-evidence-bundle). Step 9 is a deterministic readiness aggregation → **NOT_CERTIFIED / PRE_PRODUCTION**
(demo). Every step emits an **OperationReceipt** (operation/request id, engine+version, input/output SHA-256
hashes, reason codes, evidence refs, `qwen_calls:0`, `external_calls:0`) and a final **JourneyReceipt**,
both exportable. Target/workflow come from a closed allowlist (SSRF-safe). Rust decides; Qwen only explains.
