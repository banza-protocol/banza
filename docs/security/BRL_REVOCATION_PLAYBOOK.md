# BANZA — BRL Revocation Playbook (BX2.2)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This playbook describes how a **BANZA Revocation List (BRL)** revocation is decided, signed, and published,
and why the BRL is **fail-closed**. It is part of the TRUST_AND_CRYPTO_CEREMONY track (BX2.2). It is
**planned / test-only**: no production BRL-issuing key exists (the ceremony is milestone **M2**, not
executed — `production_trust_ceremony_not_executed = true`). See
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md) and
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md).

## What the BRL is

The BRL is the signed, dated list of withdrawn operator trust material — compromised or withdrawn
cryptographic/trust artifacts, keyed by the publishing operator_id. It is not a sanction, not a licence
and not a judgment about the entity. It is fetched by conformant engines during federation trust
evaluation. Material on a valid BRL **blocks routing** to the implementation whose published material
it names (INV-FEDEVAL-002 fail-closed: missing/invalid/expired/revoked material yields non-interoperation). The BRL is signed by the **revocation-domain** key (`banza-brl-YYYYMM`), never
by the root or protocol-metadata-signing keys (ADR-038 domain separation).

## Why the BRL is fail-closed

```
fail_closed_documented = true
```

The engine treats a **missing, stale, unsigned, or wrongly-signed BRL as blocking**, not as "allow by
default". This is deliberate:

- A revoked operator on a valid BRL is blocked (INV-FEDEVAL-002).
- A BRL that cannot be fetched or verified is treated as untrusted → routing to peers is **not** permitted
  rather than silently allowed.
- Operators MUST fetch a fresh BRL within its cache window (≤ 6 h, ADR-040); a stale BRL
  (`expires_at < now()`) is not usable (mirrors INV-ROOT-003 for manifests).

Fail-closed means the failure mode is **safe** (deny), never **open** (permit an unverified peer). This is
the residual-owner split recorded in [`RISK_REGISTER.md`](RISK_REGISTER.md) (`R-FED-001`, `R-BRL-001`) and
[`THREAT_MODEL.md`](THREAT_MODEL.md) ("Revoked operator accepted" / "BRL ignored").

## Decision → signing → publication (step list)

1. **Trigger.** A material-withdrawal condition is identified (e.g. key compromise, artifact defect,
   material no longer verifiable). *(Planned process; no live operator material exists to revoke.)*
2. **Decide under governance.** The revocation is authorised through the governance process — BanzAI does
   **not** decide revocations; it may only verify a published BRL.
3. **Draft the BRL body.** Identify the withdrawn material (the publishing operator_id and, in the production entry model, the revoked_ref naming the key/artifact) with the revocation reason/effective time; set
   `issuer` to BANZA and `issuer_key_id` to the current `banza-brl-YYYYMM`.
4. **Sign (revocation-domain key).** Sign the BRL with the **BRL-issuing** key using canonical JSON
   (ADR-038). No other domain key may sign a BRL (INV-ROOT-005; the root itself signs only Key Manifests, INV-ROOT-004). *(Test-only in any rehearsal — no
   production BRL-issuing key exists.)*
5. **Set expiry.** Routine BRL `expires_at` ≤ 6 h; an **emergency** BRL (issuing-key compromise)
   `expires_at` = 1 h.
6. **Publish.** Write the signed BRL to `/federation/revocation-list.json` (public artifact; no private
   key involved).
7. **Verify the endpoint.** Confirm correct `issuer`, correct `issuer_key_id`, valid signature, and
   expected revoked-operator set.
8. **Propagate.** Conformant engines fetch the fresh BRL within the cache window and enforce fail-closed
   blocking of any revoked operator.

## Emergency revocation (BRL-issuing key compromise)

| Step | Action |
|---|---|
| 1 | Rotate the BRL-issuing key (new `banza-brl-YYYYMM`) under the key-management policy |
| 2 | Root re-signs a new Key Manifest containing the new BRL-issuing public key |
| 3 | Publish an **emergency BRL** signed by the new key, `expires_at` = 1 h |
| 4 | Verify endpoints; engines fetch within 1 h and re-establish trust on the new key |

Federation disruption window: 1–6 h (routine) or ~1 h (emergency), per
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) §Phase 7.

## Invariants exercised

| Invariant | Statement |
|---|---|
| INV-FEDEVAL-002 | A revoked operator on a valid BRL MUST block routing (fail-closed) |
| INV-ROOT-005 | Only the BRL-issuing (revocation-domain) key may sign a BRL |
| INV-ROOT-004 | The root signs only Key Manifests — never the BRL directly |
| INV-ROOT-003 (analogue) | A stale BRL (`expires_at < now()`) MUST NOT be used |

## Assurance-track contribution & non-claims

- The fail-closed behaviour and signing/publication flow are documented (`fail_closed_documented = true`),
  which feeds the TRUST_AND_CRYPTO_CEREMONY track. Status is computed **in Rust**
  (`validate_deep_assurance`), never in TypeScript.
- Because no production BRL-issuing key exists, this remains part of the
  `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` (pre-M2) state; a doc claiming a real revocation was published in
  production would be a boundary failure (`DEEP_ASSURANCE_INVALID`).
- No live operator has been revoked; there are no live operators. Publishing this playbook does not
  activate federation and does not make BANZA a PSP.

See: [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md),
[`THREAT_MODEL.md`](THREAT_MODEL.md), [`RISK_REGISTER.md`](RISK_REGISTER.md).
