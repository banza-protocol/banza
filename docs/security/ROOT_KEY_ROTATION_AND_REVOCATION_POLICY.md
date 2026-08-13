# BANZA — Root Key Rotation and Revocation Policy (M2.1)

> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This policy defines how a root key is **rotated** or **revoked** under the 2-of-3 model
([`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md)), and the **delegation** model by
which the root authorises narrower operational keys. The through-line: **every** rotation and revocation
is a root action, and every root action needs **two of the three** custodians — never a single one.
BANZA permanece protocolo financeiro aberto; operadores autorizados são entidades separadas que
implementam o protocolo.

## 1. Delegation model

The root does not perform day-to-day signing. Instead, the root (2-of-3) **delegates** to narrower
keys:

| Delegated key | Signs | Held by |
|---|---|---|
| Release-signing key | Software releases / bundles of the open protocol | Operational offline signer |
| BRL-signing key | The BANZA Revocation List (fail-closed) | Operational offline signer |
| Artifact-signing key | Conformance / evidence artifacts | Operational offline signer |

- A delegation is a **root-signed** statement: "root authorises delegated public key K for domain D,
  valid until T." It is signed by **2 of 3** custodians.
- Delegated keys have **narrow scope** and **shorter validity** than the root. They can be rotated
  frequently without a full root ceremony — the root simply signs a new delegation.
- The root itself still signs **only** root metadata, delegations, rotation, revocation and trust
  policy. It never signs payments, operators, licences or funds (see §3 of
  [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md)).

This is consistent with the domain-separated key model in
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md) and the trust path in
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md).

## 2. When to rotate

| Trigger | Action |
|---|---|
| Scheduled root rotation (validity window elapsed) | Plan a 2-of-3 rotation of the affected root key(s) |
| A custodian device is retired/replaced | Rotate that custodian's root key onto the new offline machine |
| A custodian steps down / is replaced | Generate a fresh root key for the incoming custodian; revoke the outgoing one |
| Scheduled delegated-key rotation | Root (2-of-3) signs a new delegation with a fresh delegated public key |

## 3. How to rotate a root key (2-of-3)

1. The three custodians (or the two required by threshold) convene, each on their own offline machine
   ([`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md)).
2. The affected custodian generates a **new** root keypair on their offline machine; exports the new
   **public** key + fingerprint.
3. New root metadata is assembled: the updated root set (new public key replacing the old), threshold
   still 2, refreshed validity bounds.
4. **Two of three** custodians sign the new root metadata. The old public key is marked superseded.
5. The rotation is recorded in the evidence log
   ([`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md)) and the new
   root metadata is published (public material only).

Because the threshold is preserved throughout, rotating one key never drops the root below 2-of-3.

## 4. When to revoke

| Trigger | Urgency |
|---|---|
| A custodian's root key is (suspected) compromised | Emergency |
| A custodian's encrypted USB **and** passphrase are lost together | Emergency |
| A delegated key is (suspected) compromised | Emergency (delegation-level) |
| A custodian is removed for governance reasons | Planned |

## 5. How to revoke (2-of-3)

- **Root-key revocation.** The remaining custodians (still meeting 2-of-3) sign updated root metadata
  that removes the revoked public key from the root set and records the revocation. The revoked key is
  no longer part of any valid 2-of-3. Because one compromised key is below threshold, the root remains
  trustworthy while revocation proceeds.
- **Delegated-key revocation.** The root (2-of-3) signs a revocation of the delegation for the affected
  delegated public key, and — for the BRL-signing delegation — an **emergency BRL** is published under
  a freshly delegated key (consistent with the emergency-revocation path in
  [`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md) §8 and
  [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md) §5).
- **Single custodian cannot revoke.** No individual custodian may unilaterally revoke or rotate any
  key. Revocation and rotation are **root actions**, signed by the root **2-of-3**, never by one
  custodian acting alone.

## 6. Emergency revocation flow

1. Detect / declare the compromise (custodian key or delegated key).
2. Convene the two available uncompromised custodians (2-of-3 still achievable because one key below
   threshold does not compromise the root).
3. Sign updated root metadata removing the compromised key (root case) **or** sign a delegation
   revocation + fresh delegation (delegated case).
4. Publish the updated public root metadata / new delegation; for BRL, publish an emergency BRL.
5. Record the emergency action in the evidence log. Rotate the compromised custodian's key back into
   the root set only after a clean re-key on a clean offline machine.

## 7. Rust-computed guardrails

Rotation/revocation validity is computed **in Rust** by
`engines/banza-root-ceremony :: validate_root_ceremony` (never TypeScript). A rotation/revocation with
fewer than two signatures resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD`; one that claims to sign
payments/operators/licences/funds resolves to `M2_ROOT_CEREMONY_INVALID_SCOPE`; one that contradicts
the open-protocol boundary resolves to `M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY`.

## 8. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| New/old public keys, key IDs, fingerprints, delegations | Private keys, seeds, mnemonics, passphrases |
| Root metadata, threshold policy, revocation records | Encrypted private-key backups, USB images |
| Signatures, ceremony/rotation evidence hash | Recovery material, raw entropy, secret logs |
| Rotation/revocation declarations without secrets | Screenshots with secrets; any material that lets someone sign as a custodian |

## 9. Non-claims

- No real root or delegated key exists in this repository, CI, the website, the server or the Workbench.
- Examples are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- Rotation or revocation does not create an operator, issue a licence, activate federation or move
  funds. BANZA permanece protocolo financeiro aberto.

See: [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md),
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md).
