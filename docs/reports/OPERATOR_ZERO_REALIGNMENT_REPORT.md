# Operador Zero — Realignment to Read-Only Reference Implementation (M2.19E/F, ADR-067)

Operador Zero is now the **canonical read-only reference implementation**: it EXPOSES identity, manifest,
capabilities, endpoints, metadata, keys, reports, evidence and certification status, and executes nothing.
All human-initiated validation moved to the modo de validação do BanzAI. Removed (logic, not just controls): the
9-step local journey, mutable KZ_DEMO ledger, payment/refund/negative-flow execution, `100/100`/`PASS demo`,
and the local execution engine imports. Kept read-only: the 10 machine artifacts (GET 200 / write 405 /
unknown 404). Metrics: simulation_entrypoints=0, mutable_ledger=0, local_workflows=0,
score_approval_confusions=0. Guards: operator-zero-read-only-surface, zero-subdomain-design (rewritten),
operator-zero-standalone-surface + realistic-journey (repointed). ADR-067.
