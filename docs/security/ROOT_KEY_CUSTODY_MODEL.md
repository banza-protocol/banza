# BANZA — Root Key Custody Model

> **A raiz do BANZA estabelece confiança no protocolo financeiro aberto BANZA. Ela não autoriza serviços
> de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não
> movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**

**Authority for:** root cardinality, threshold, custodian independence, offline boundary, backup,
recovery, and the fail-closed gate on a production ceremony.
**Companion:** [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) governs how a root
operation is conducted. [`BANZA_TRUST_ARCHITECTURE.md`](../governance/BANZA_TRUST_ARCHITECTURE.md) states
where the root sits in the trust chain.
**Enforced by:** `engines/banza-root-ceremony :: validate_root_ceremony` (Rust, never TypeScript).

---

## 1. The model

**The BANZA Trust Root is controlled by three independent root signing authorities. A valid
Root-authorised action requires signatures from any two of the three. No single root key can authorise
an action alone.**

```
Custodian A ──holds──▶ root_key_A   (and nothing else)
Custodian B ──holds──▶ root_key_B   (and nothing else)
Custodian C ──holds──▶ root_key_C   (and nothing else)

threshold = 2 of 3
```

Three properties follow, and they are the reason for the choice:

| Property | What it guarantees |
|---|---|
| **Two-party authorization** | No authority acts alone; compromising one key is not enough |
| **One-party failure tolerance** | Losing or isolating one of the three does not block the root; the other two still meet the quorum |
| **No single-party control** | There is no combination in which one party authorises a root action |

Nothing else is introduced to obtain them: no Shamir sharing, no online quorum service, no HSM
coordinator, no threshold-signature cryptosystem. Three keys and a count.

### The threshold counts authorities, not signatures

Two signature entries from the **same** authority are one approval. The validator counts distinct
signing authorities, and a duplicated signature reaches `M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD` exactly
as a single signature does. This is the difference between the rule as written and the rule as
implemented, so it is stated here and tested in `engines/banza-root-ceremony/tests/threshold.rs`.

### Authorization is not hardware

`2-of-3` is the **cryptographic authorization model**. How many secure modules exist, where the devices
live, and how material is transported are **custody controls** — §3 to §6 below. They may change without
redefining the protocol's authority model. The number of devices never determines the threshold.

---

## 2. Core custody invariants

1. **No custodian holds another custodian's key.** Private key material is strictly one per custodian.
2. **No device holds more than one root private key.** Each custodian's offline computer and each
   encrypted backup medium holds **at most one** root private key. No machine, backup or medium anywhere
   concentrates two or three root keys.
3. **Threshold ≥ 2 distinct authorities.** No root action is valid with fewer than two.
4. **Losing one key does not destroy the root.** Two surviving keys still meet the threshold; the lost
   key is rotated.
5. **Compromising one key does not compromise the root.** One key is below the threshold; the compromised
   key is revoked and rotated
   ([`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md)).

Violating invariant 1 or 2 resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP` in the Rust validator.

---

## 3. Roles and separation of duties

| Role | Holds | Does | Never does |
|---|---|---|---|
| **Custodian A / B / C** | one root private key, offline | Generates their own key; exports the public half and fingerprint; signs root metadata when part of a quorum | Never holds another custodian's key; never places a key on serving infrastructure; never signs alone |
| **Witness** (optional per action) | nothing | Observes that offline conditions held and that only public material was exchanged | Never handles private key material |

The three custodians are **independent** — different people, different locations, different offline
machines. Independence is what makes `2-of-3` meaningful: a single failure (person, device, site) can
neither forge nor destroy the root.

- **Generation is distributed.** No single participant generates all three keys.
- **Signing requires collaboration.** No custodian can unilaterally sign root metadata, a delegation, a
  rotation or a revocation.
- **Custody is separated from serving.** No root key ever lives on serving infrastructure — not the
  website container, not the BanzAI API, not CI, not the reverse proxy (ADR-028 and
  [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md)). Serving infrastructure holds public artifacts
  only.
- **Passphrase separated from media.** A backup passphrase is never stored on the medium it unlocks.

---

## 4. Offline boundary

> **No private key ever touches an online environment.** Keys are generated, stored, backed up and used
> for signing **only** on a machine in offline ceremony mode. Only public keys, fingerprints, signatures
> and hashes ever leave it.

Before any private key is unlocked, the machine must have networking physically and logically
disconnected, sync and communication software stopped, and the offline state verified. If networking is
re-enabled while a private key is unlocked on disk, the key is treated as **potentially exposed**: stop,
and follow the compromise path in the rotation and revocation policy.

Missing offline-preparation evidence resolves to
`M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP`.

---

## 5. Backup

- **One encrypted backup per custodian**, holding that custodian's key and no other.
- **Encryption is mandatory.** A backup medium is never written in the clear.
- **Offline use only.** A backup is mounted only on a machine in offline ceremony mode.
- **Stored apart from its passphrase**, in a secure physical location, labelled with a **non-secret**
  identifier only — never a fingerprint, never a key id that reveals which custodian it belongs to.

Missing backup evidence resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP`.

---

## 6. Recovery

A backup that has never been recovery-tested is **unproven**. Each custodian tests recovery at least
once during the ceremony and periodically thereafter. A recovery test confirms three things and nothing
more:

1. the encrypted backup **decrypts** with the separately stored passphrase;
2. the restored key's **public key and fingerprint match** the recorded value;
3. the restored key can **sign a TEST-ONLY document**, and that signature verifies.

It never signs real root metadata, never authorises an operator, never issues a licence and never moves
funds. **A recovery test proves custody, not authority.**

A missing recovery-test result resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP`.

---

## 7. Ceremony gate (fail-closed)

**No production root-key ceremony may run until all four hold:**

1. this custody model is implemented — three independent authorities, one key each, offline;
2. the custody controls in §3 to §6 are satisfied and evidenced;
3. the ceremony evidence model is complete
   ([`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md));
4. the production ceremony is **explicitly authorised**.

**Current state: no ceremony has run, no production root key exists, and no production root is
published.** The gate is fail-closed: absent evidence is not a pass.

---

## 8. Claims discipline

A custody model is claimed only when it is **implemented and demonstrated**, never because a document
describes it. Specifically:

- no claim of a custody model whose keys have not been generated under it;
- no claim of constituted custodians who have not been constituted;
- no **migration by documentation** — editing a document does not move custody. A different model would
  require the keys, the tested recovery and a re-signed Key Manifest to exist first, and would be a new
  architectural decision rather than a rewording of this one.

---

## 9. What the root signs

The root signs the **Key Manifest** — the root metadata that lists and endorses the delegated signing
keys — and root-level delegation, rotation, revocation and trust policy. It signs nothing else.

The root does **not** sign operators, does **not** authorise payments, does **not** issue licences, does
**not** confer or withdraw status from implementations, and does **not** move funds. A root claiming any
of these resolves to `M2_ROOT_CEREMONY_INVALID_SCOPE`.

---

## 10. Authority map

One primary authority per property. Nothing below is stated in two places as though both decided it.

| Property | Primary authority |
|---|---|
| Root cardinality (three authorities) | this document §1, implemented in `engines/banza-root-ceremony` (`TOTAL_ROOT_KEYS`) |
| Threshold (two of three, distinct signers) | this document §1, implemented in the same engine (`THRESHOLD`, distinct-signer counting) |
| Custodian independence | this document §3 |
| Offline boundary | this document §4, ADR-028 (keys never on serving infrastructure) |
| Backup and recovery | this document §5–§6 |
| Key Manifest authority (what the root signs) | [`BANZA_TRUST_ARCHITECTURE.md`](../governance/BANZA_TRUST_ARCHITECTURE.md), §9 here for scope |
| Ceremony prerequisites and conduct | [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) |
| Ceremony evidence | [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md) |
| Fail-closed gate on a production ceremony | this document §7 |
| Rotation and revocation | [`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md) |
| Delegated key lifecycle | [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md) |
| Production tooling boundary | [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md), stated once |
| Test-only boundary | [`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md) |

The threshold is enforced in code and guarded as a property by `make root-threshold-model-check`, not by
asserting that any of these files exists.
