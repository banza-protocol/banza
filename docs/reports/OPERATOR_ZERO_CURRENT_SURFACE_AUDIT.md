# Operador Zero — Current-Surface Audit (M2.19E/F)

Full machine-readable inventory: `artifacts/m2-19f/operator-zero-current-surface.json`.

**Pre-change state (live + source):** `zero.banza.network` served a full simulator via middleware rewrite
to `/oz` → `OperadorZeroLab.tsx` (9-step local journey, mutable KZ_DEMO ledger, payment/refund/negative
execution, `100/100`/`PASS demo`). Machine endpoints `app/oz/[...artifact]/route.ts` (10 read-only GET
artifacts). Rust sim engine `engines/operator-zero-core` (WASM). Live probe: HTTP 200, no redirect, no
service worker.

**Treatments applied:** `OperadorZeroLab` → DELETE/REWRITE (read-only `OperadorZeroReference`); local
engine/clone/journey → MOVED to the BanzAI Workbench; machine endpoints → KEEP; identity/boundary copy →
REWRITE (reference implementation); old simulator SVGs → REPLACE (SVG-P-088..091). See the realignment
report for the resulting state.
