# banza-conformance-rs (ADR-043, R4)

The Rust BANZA conformance runner. It is the **canonical** path for the scope it has ported; the Python
runner in `tools/banza-conformance/` remains for the not-yet-ported scope.

> **PASS is technical conformance evidence, not production certification.** This runner never emits a
> certificate, never adds an operator, and never activates M2/M3. Production certification depends on
> M2/M3 governance — no operator is certified and no production certificate is active.

## Scope

**Ported (offline, deterministic, no operator, no network, no crypto):**
- conformance-**vector integrity** (structure, ids, levels 0–4);
- financial-**invariant consistency** on the vectors — integer minor units (`INV-LEDGER-PRECISION`),
  double-entry `DEBIT|CREDIT` (`INV-LEDGER-DOUBLE-ENTRY`), settlement identity fields
  (`INV-SETTLE-IDENTITY-FIELDS`), level bounds (`INV-LEVEL-BOUND`);
- schema-compatible **report** generation (with the certification disclaimer);
- **golden parity** over all 61 vectors.

**`NOT_YET_PORTED`** (documented, not faked):
- live-operator HTTP execution (`run.py` health/wallets/transfers/traces/manifest/payment) — needs a
  running operator;
- the full federation runner (`run_fed.py` FED-* suites) — needs a SimB fixture + R5 trust/crypto;
- BRL / certificate / ed25519 verification — **R5** (`banza-trust`).

## Commands

```bash
banza-conformance-rs version         # runner + protocol version
banza-conformance-rs check-vectors   # validate vectors + invariants (offline); exit 1 on any violation
banza-conformance-rs run             # offline vector-integrity report (JSON)
banza-conformance-rs run-fed         # prints not_yet_ported (federation needs a fixture + R5)
banza-conformance-rs report [file]   # validate a report's schema + certification disclaimer
banza-conformance-rs parity          # compare the live vector summary to golden/parity-summary.json
banza-conformance-rs fixture         # describe the embedded offline fixture (vector counts)
```

## Make / CI

```bash
make conformance-rs-check    # check-vectors + report
make conformance-rs-test     # cargo fmt + clippy -D warnings + test
make conformance-rs-parity   # golden parity
```

CI: `.github/workflows/banza-conformance-rs.yml` (fmt/clippy/test + check-vectors + report + parity).

## Parity

`golden/parity-summary.json` is the committed golden: a normalized, timestamp-free summary of the 61
vectors (per-file counts, levels, ids) and the invariant ids the runner checks. `parity` recomputes the
summary from the embedded vectors and asserts equality — a deterministic regression gate. Live-operator
and federation execution parity against the Python runner is out of scope here (they need a running
operator) and is tracked as `NOT_YET_PORTED`.

## Non-goals / safety

No network by default; no `.env`/secrets; no crypto (R5); never claims certification; never mutates
VERSION; deterministic JSON output.
