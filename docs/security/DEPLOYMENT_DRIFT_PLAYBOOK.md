# BANZA — Deployment Drift Playbook (BX2.3)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

## Purpose and scope

**Deployment drift** is any divergence between the **git bundle** — `infra/banza-network` with **fixed
image tags** — and what is **actually served** at `banza.network`. Because the bundle is the single source
of truth (bootstrap + `docker compose` with pinned tags), the served state must match it byte-for-byte.
This playbook detects drift and corrects it safely.

**Scope:** the **public website only**. It never covers operator production systems (BANZA moves no funds
and processes no transactions). Detecting drift is not a production, audit, certification or licence claim —
it is internal deploy hygiene.

## Golden rule — website-only deploy discipline

> Correct drift by redeploying the **website** from the bundle at a **fixed image tag**.
> **Never** touch `banzai-api`, `postgres`, the reverse proxy, or the verification API as part of a drift
> fix. Those services are out of scope for website drift correction.

## Drift classes

| Class | What drifts | How it happens |
|---|---|---|
| **Header drift** | Security/response headers differ from the bundle (e.g. missing/altered `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, cache headers) | Manual edit at proxy/CDN; a config not reflected back into the bundle |
| **WASM/chunk drift** | Served `.wasm`/JS/asset hashes differ from the pinned image | Out-of-band build; CDN serving a stale or substituted chunk |
| **DNS/proxy drift** | DNS record, proxy mode, or TLS mode diverges from the documented topology | Record/proxy toggled manually; cert/mode misset |
| **Container/tag drift** | The running image tag ≠ the tag pinned in the bundle | Manual `docker` action; an unpinned or retagged deploy |

## Detection

Run these checks periodically and on every incident. **Always verify the served bytes, not just the
committed files** — caching and manual changes can mask reality.

### Header drift

- Fetch headers from the edge (`curl -sI https://banza.network/`) and compare to the bundle's expected
  header set.
- Then confirm at the **origin**, inside the container, to distinguish a CDN-layer override from an
  origin change:

```
docker compose exec <website-service> curl -sI http://localhost:<port>/
```

### WASM/chunk drift (bypass CDN cache)

- Hash the served assets **inside the container** so the CDN cache cannot hide a substitution:

```
docker compose exec <website-service> \
  sh -c 'for f in $(find <web-root> -name "*.wasm" -o -name "*.js"); do sha256sum "$f"; done' | sort
```

- Compare the hashes to those produced by the pinned image / reproducible bundle. Any mismatch is
  WASM/chunk drift (also see runbook 3 in [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md)).
- `grep` served HTML in-container for the expected chunk filenames to confirm the page references the
  bundle's assets and nothing extra:

```
docker compose exec <website-service> grep -rE '\.(wasm|js)"' <web-root>/index.html
```

### DNS/proxy drift

- Confirm DNS resolves to the expected origin and the proxy/TLS mode matches the documented topology
  (Cloudflare proxied + Full, origin cert on the VM). Compare against the recorded cutover topology.
- Check the TLS cert served is the expected origin cert and not expired/mis-scoped.

### Container/tag drift

- Confirm the running image tags equal the pinned tags in the bundle:

```
docker compose images
```

- Any tag that is not the pinned one — or a `:latest`/floating tag — is container/tag drift.

## Correction

1. **Freeze** ad-hoc changes; stop manual edits at proxy/CDN/container.
2. **Reconcile source of truth:** if the *intended* change is legitimate, land it in the **bundle**
   (`infra/banza-network`) and cut a new fixed image tag — never leave the running state ahead of the repo.
3. **Rollback via retagged image:** if the drift is unwanted, redeploy the website from the bundle at the
   last **known-good fixed image tag** (rollback = deploy the previous pinned tag). Website-only.
4. **Purge CDN cache** so the edge serves the corrected origin bytes.
5. **Re-verify in-container** (headers + asset hashes) and confirm the running tag equals the pinned tag.
6. **Run guards:** `make identity-check` and `make regulatory-check` must be green before declaring the
   deploy clean.

## Post-correction verification checklist

- [ ] Running image tag == pinned tag in `infra/banza-network`.
- [ ] In-container served asset hashes == bundle/reproducible-build hashes.
- [ ] Served security headers match the bundle's expected set (edge **and** origin).
- [ ] DNS/proxy/TLS topology matches the documented cutover record.
- [ ] `/operators` and `/certificates` serve their controlled/expected state (empty by design).
- [ ] CDN cache purged; edge now serves corrected bytes.
- [ ] `make identity-check` and `make regulatory-check` pass.
- [ ] `banzai-api`, `postgres`, reverse proxy, verification API were **not** touched.
- [ ] Timeline + before/after hashes/headers captured as evidence.

## Evidence to capture

Live-vs-bundle header snapshots, live-vs-bundle asset hashes, running-vs-pinned tags, DNS/TLS state, the
CDN purge confirmation, guard output, and the reconciliation commit (if the change was legitimised into the
bundle). These records feed [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) post-mortems and the
audit-evidence inputs consumed by the Rust assurance engine
(`engines/banza-security-assurance :: validate_deep_assurance`).

## Related documents

- [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md) — event-specific containment/recovery.
- [`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) — `OPS-DRIFT-001`, `OPS-DNS-001`, `OPS-WASM-001`.
- [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) · [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md)
