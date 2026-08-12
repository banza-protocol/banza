# BANZA — Security Event Runbook (BX2.3)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

## How to use

Concrete runbooks for the top event types affecting **the protocol project** (repo, `banza.network`,
deployment bundle, CI, DNS/TLS, secrets). Not for operator production systems. Each runbook follows:
**detection signal → immediate containment → verification → recovery → evidence to capture.** Grade the
event with [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md) and run under
[`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md). Website recovery follows
[`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md) — **website-only; never touch
`banzai-api`, `postgres`, the reverse proxy, or the verification API.**

---

## 1. Suspected website compromise (SEV-1)

- **Detection signal:** unexpected page content/defacement; served asset hash differs from the bundle;
  unexplained deploy; external report about `banza.network`.
- **Immediate containment:** freeze deploys; if content is harmful, serve a known-good page or a static
  maintenance page from the pinned image; do not investigate on the live serving path.
- **Verification:** exec into the website container and `grep`/hash the **served** assets (bypassing CDN
  cache) against the git bundle; diff served HTML/headers vs the fixed image tag; confirm which commit/tag
  is actually live.
- **Recovery:** redeploy the website from the git bundle at a known-good fixed image tag (see
  [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md)); purge CDN cache; re-verify in-container;
  run `make identity-check` and `make regulatory-check`.
- **Evidence to capture:** live-vs-bundle asset hashes, served HTML/header snapshots, the live commit/tag,
  deploy logs, timeline, purge confirmation.

## 2. Leaked secret (SEV-2, or SEV-1 if it enables website/boundary tamper)

- **Detection signal:** secret scanner hit; token/key/credential spotted in repo, CI logs, or a built
  asset; provider alert.
- **Immediate containment:** **rotate first, investigate second.** Revoke/rotate the exposed credential at
  the provider immediately; invalidate sessions/tokens derived from it. Assume it is compromised.
- **Verification:** confirm the old credential no longer authenticates; scan history and built artifacts for
  further copies; check access logs for use of the leaked value during the exposure window.
- **Recovery:** issue a fresh credential via the normal (test-only) path; purge the value from git history
  and CI logs where feasible; add/confirm a scanning rule so the pattern is caught next time.
- **Evidence to capture:** where it leaked, exposure window, rotation confirmation (value **redacted**),
  any observed use, remediation commit. No real production/root keys exist here — any leaked material is
  test-only; rotation still applies.

## 3. WASM / artifact tamper (SEV-1/SEV-2)

- **Detection signal:** shipped `.wasm`/JS chunk hash differs from the reproducible bundle; unexpected
  chunk added; build reproducibility check fails.
- **Immediate containment:** freeze deploys; pin serving to the last verified-good image tag; block the
  suspect artifact from being served.
- **Verification:** rebuild from source and compare hashes to the shipped artifacts; confirm the origin of
  the divergence (build input, dependency, or serving layer); check `rust-rule` / Rust-first constraints
  held.
- **Recovery:** rebuild and redeploy from the pinned reproducible bundle; re-verify served artifact hashes
  in-container; record the dependency/build delta and (planned) SBOM/signing follow-up.
- **Evidence to capture:** expected vs shipped hashes, dependency/build diff, rebuild logs, the tag served
  before and after, timeline.

## 4. Boundary-claim regression — a page wrongly implies BANZA is a PSP/licensed (SEV-1)

- **Detection signal:** `make regulatory-check` fails; a live page/doc states or implies BANZA is a PSP,
  licensed, certified, or externally audited; the mandatory boundary blockquote is missing on a shipped
  doc; external report.
- **Immediate containment:** if live, replace the offending page/copy with a known-good version or take it
  offline; block the deploy carrying the regression.
- **Verification:** run `make regulatory-check` and `make identity-check`; locate the offending text and the
  commit that introduced it; confirm no other page carries the same claim.
- **Recovery:** revert to compliant copy (restore the boundary blockquote / remove the over-claim);
  redeploy website-only from the bundle; re-run both guards until green; purge CDN cache.
- **Evidence to capture:** the exact offending text, introducing commit, guard output before/after, the
  corrected copy, timeline. This event is SEV-1 because the boundary is an absolute integrity guarantee.

## 5. Unexpected `/operators` or `/certificates` content (SEV-1/SEV-2)

- **Detection signal:** `/operators` or `/certificates` returns non-empty/unexpected content when it should
  be empty/controlled; identity guard flags a commercial operator brand; forged-looking certificate content
  served.
- **Immediate containment:** if content is harmful or implies a real conformant operator, take the route to
  its known-good (empty/controlled) state or offline; freeze deploys.
- **Verification:** exec into the container and inspect what the route **actually serves** (bypass CDN);
  diff against the bundle; run `make identity-check` (no commercial operator brand may appear) and confirm
  no real operator is implied; check whether the content leaked infra topology.
- **Recovery:** restore the route to its controlled/empty state from the bundle; redeploy website-only;
  re-verify in-container; purge CDN; confirm guards green.
- **Evidence to capture:** served route body, expected-vs-actual diff, guard output, introducing change,
  timeline. Remember: BANZA does not create operators and does not certify — any content implying otherwise
  is a boundary regression (cross-reference runbook 4).

---

## Cross-cutting rules

- **Website-only deploy discipline.** Every recovery here is website-only. Do **not** touch `banzai-api`,
  `postgres`, the reverse proxy, or the verification API. See
  [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md).
- **Verify what is served, not what is committed.** Always confirm the **live** state in-container,
  bypassing CDN cache, because caching and drift can mask the real served bytes.
- **Boundary-safe comms.** No external message may claim BANZA is production-ready, certified, licensed,
  externally audited, or a PSP. Negated/descriptive forms only.
- **Test-only reality.** No real production keys, no real root key, no real certificate signing, no real
  external provider/model are in play (`llm_calls: 0`); rotation/rebuild steps still apply to test-only
  material.

## Related documents

- [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) · [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md)
- [`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) · [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md)
- [`THREAT_MODEL.md`](THREAT_MODEL.md) · [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md)
