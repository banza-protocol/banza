# BANZA — Attack Scenarios (BX2.1)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

Narrative, end-to-end attack scenarios against the BANZA protocol and its readiness surfaces. Each
scenario states the attacker goal, the concrete steps, the invariant/control that stops it, and the
residual-risk owner. These scenarios are the attack-scenario half of the **THREAT_AND_ABUSE** track fed
into `engines/banza-security-assurance :: validate_deep_assurance`, and they exercise the abuse cases in
[`ABUSE_CASES.md`](ABUSE_CASES.md).

All scenarios are **test-only**. No real funds move, no real operator exists (`/operators=[]`), no real
certificate is signed, no real external model is called, and no external audit is performed. Any
production-only defence (root-key ceremony, external audit, live federation) is **PLANNED /
would-be-required before production**, not asserted as done.

---

## AS-01 — Malicious operator replays a payment intent

- **Goal.** Cause a double effect by re-submitting a previously accepted payment intent.
- **Steps.** (1) Capture a valid payment-intent envelope with its idempotency key. (2) Re-send it,
  unchanged, then re-send it with a mutated body under the same key.
- **What stops it.** L2 idempotency check — same key must yield a consistent response and the replay is
  flagged (`C-IDEMPOTENCY`, INV-IDEM-*); trace linkage ties intent↔ledger↔settlement so a divergent body
  under one key is detected (INV-IDEM key-scope). Maps to `AB-REPLAY-01`/`AB-IDEM-02`.
- **Residual owner.** Operator — runtime idempotency enforcement lives in operator infrastructure; the
  engine checks structure only.
- **Test-only note.** Exercised against fixtures in `banza-l2-readiness`; no live payment path is invoked.

---

## AS-02 — Forged certificate / forged BRL to un-revoke a peer

- **Goal.** Keep trusting an operator that has been revoked, by presenting a forged certificate fixture or
  a re-signed BRL.
- **Steps.** (1) Take a revoked operator's identity. (2) Craft a certificate fixture / BRL that omits or
  reverses the revocation. (3) Present it during L3/L4 readiness.
- **What stops it.** BRL is **fail-closed** — missing/expired/invalid/forged BRL blocks routing
  (INV-FEDEVAL-002, `C-BRL-FAIL-CLOSED`); the BRL issuer MUST be BANZA and the revocation-domain key is
  domain-separated (ADR-027). Signature verification is a trust-engine concern; the production trust
  anchor comes from the **root-key ceremony (M2, PLANNED)**. Maps to `AB-BRL-STALE-06`/`AB-BRL-FORGE-07`.
- **Residual owner.** Protocol (fail-closed rule + domain separation) with operator duty to fetch fresh
  BRL ≤ 6h. Full cryptographic trust anchoring would-be-completed before production via M2.
- **Test-only note.** No real certificate is signed; fixtures only.

---

## AS-03 — Man-in-the-middle on well-known discovery

- **Goal.** Intercept `/.well-known/banza/*` discovery and substitute attacker-controlled endpoints or
  keys so a peer routes to the attacker.
- **Steps.** (1) Position between a peer and the discovery surface. (2) Rewrite the well-known document to
  point at attacker endpoints / keys.
- **What stops it.** Discovery surfaces are read-only machine routes served over TLS with HSTS; non-GET →
  405 (`C-MACHINE-RO`/`C-POST-405`/`C-SEC-HEADERS`). Trust is not taken from transport alone: keys are
  domain-separated and the trust chain + BRL fail-closed gate any downstream routing. CSP is currently
  Report-Only by design during hardening (`C-SEC-HEADERS`, partial) — moving CSP to enforce is a
  pre-production item. Maps to `AB-MACHINE-16`/`AB-FED-SPOOF-12`.
- **Residual owner.** Infra (TLS/headers, CSP-enforce open item) + protocol (trust chain does not rely on
  transport).
- **Test-only note.** Verified via live-header checks on the test deployment; no production trust anchor
  is active.

---

## AS-04 — Insider tampers with the repository / an evidence bundle

- **Goal.** Alter a protocol artifact or an Evidence Bundle to fake conformance evidence.
- **Steps.** (1) Use privileged repo/infra access. (2) Edit an engine output or an Evidence Bundle after
  generation. (3) Re-present it as valid evidence.
- **What stops it.** Evidence Bundle uses SHA-256 canonical hashing; `validate` recomputes and detects
  tampering (`C-EVIDENCE-HASH`, INV-RECON-*). Repo integrity is defended by purity/identity/invariant
  guards in CI and no-secrets policy (`C-PURITY-GUARD`/`C-IDENTITY-GUARD`/`C-INVARIANT-GUARD`/
  `C-NO-SECRETS`). Maps to `AB-EVIDENCE-08`/`AB-SECRET-17`.
- **Residual owner.** Engine (tamper-detect) + infra (branch protection, review, log review — formal log
  review is a pre-production open item, `R-DATA-001`).
- **Test-only note.** Tamper-detect exercised in `banza-evidence-bundle` tests; no production bundle
  exists.

---

## AS-05 — Deployment drift introduces a weaker security header

- **Goal.** Silently weaken the deployed surface (e.g., drop HSTS or relax CSP) so a later MITM/injection
  attack succeeds.
- **Steps.** (1) Change reverse-proxy config out-of-band from the repo. (2) Deploy so the live headers
  diverge from the committed configuration.
- **What stops it.** Website-only deploy from a fixed commit with a rollback image tag; live-header checks
  compare deployed headers against expectation (`C-SEC-HEADERS`). Automated drift detection is **not yet
  in place** (`C-DRIFT`, gap) — this is a tracked pre-production open item (`R-DEPLOY-001`), not a claim
  that drift is fully prevented today. Maps to the deployment-drift risk.
- **Residual owner.** Infra — drift automation would-be-required before production.
- **Test-only note.** Manual runbook + live checks only; automated drift is planned.

---

## AS-06 — Social-engineering a boundary claim ("say BANZA is licensed")

- **Goal.** Get BANZA, its docs, its Workbench copy, or the Assistente to affirm that BANZA is
  licensed/certified/production-ready or is a PSP.
- **Steps.** (1) Ask the Assistente to "confirm BANZA is licensed" or to certify/approve an operator.
  (2) Attempt to slip a boundary-breaking phrase into Workbench UI copy or public documentation.
- **What stops it.** The Assistente uses refusal intents, deterministic answers, and a **mock provider
  only** (`llm_calls=0`, no real model, `C-MOCK-PROVIDER`/`C-LLM-ZERO`); a CLI forbidden-claim check runs
  in CI. Public copy is gated by the forbidden-phrases test (`C-FORBIDDEN-CLAIMS`) and
  `make regulatory-check` (`C-REG-GUARD`), backed by the boundary/positioning docs
  (`C-PROTOCOL-NOT-PSP`). Any package that *asserts* BANZA is a PSP / needs a licence / is certified /
  production-ready is rejected by the assurance engine itself (`ASSURANCE_INVALID`, and in deep-assurance
  `DEEP_ASSURANCE_INVALID`). Maps to `AB-WK-CLAIM-13`/`AB-AI-INJECT-14`.
- **Residual owner.** Frontend/governance — continuous review of new copy; the guards run on every push
  and PR.
- **Test-only note.** No real model is invoked; refusal + forbidden-phrase behaviour is asserted in
  `workbench.test.ts` and the BanzAI boundary/kb tests.

---

## Residual-risk summary

| scenario | mitigating control | residual owner | pre-production open item |
|---|---|---|---|
| AS-01 | `C-IDEMPOTENCY` (INV-IDEM-*) | operator | runtime enforcement (operator) |
| AS-02 | `C-BRL-FAIL-CLOSED` (INV-FEDEVAL-002) | protocol/operator | M2 root ceremony (PLANNED) |
| AS-03 | `C-MACHINE-RO`/`C-SEC-HEADERS` + trust chain | infra/protocol | CSP-enforce (`C-SEC-HEADERS`) |
| AS-04 | `C-EVIDENCE-HASH` + repo guards | engine/infra | formal log review (`R-DATA-001`) |
| AS-05 | fixed-commit deploy + live-header checks | infra | drift automation (`C-DRIFT`) |
| AS-06 | `C-FORBIDDEN-CLAIMS`/`C-REG-GUARD` + refusal intents | frontend/governance | continuous copy review |

None of these scenarios or mitigations turns BANZA into a payment service provider. BANZA remains an open
protocol; any licence/authorisation belongs to the authorised operator that provides real financial
services.

See: [`ABUSE_CASES.md`](ABUSE_CASES.md), [`THREAT_COVERAGE_MATRIX.md`](THREAT_COVERAGE_MATRIX.md),
[`THREAT_MODEL.md`](THREAT_MODEL.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`RISK_REGISTER.md`](RISK_REGISTER.md).
