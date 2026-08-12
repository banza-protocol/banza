# BANZA — Root Key Ceremony Runbook (BX2.2)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

**TEST-ONLY / DRY-RUN.** This runbook operationalises, as a numbered sequence, the existing
[`ROOT_KEY_CEREMONY_PROCEDURE.md`](ROOT_KEY_CEREMONY_PROCEDURE.md) and
[`ROOT_KEY_CEREMONY_CHECKLIST.md`](ROOT_KEY_CEREMONY_CHECKLIST.md) for a **would-be milestone-M2**
ceremony. It has **not** been executed in production. `production_trust_ceremony_not_executed = true`.
Running these steps against test material is a rehearsal only; it produces **no** production keys and
**no** real signed protocol metadata. The signed record produced by an actual M2 run would use
[`ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md`](ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md).

## How to read this runbook

- Every step below is prefixed **[TEST-ONLY]**.
- The authoritative commands live in the Procedure; this runbook is the ordered checklist wrapper.
- The Witness initials each phase; the Officer executes; neither proceeds on a FAIL (see Procedure §Part VI).

## Phase A — Pre-flight (day before)

1. **[TEST-ONLY]** Confirm ceremony machine has its network interface physically disabled/removed.
2. **[TEST-ONLY]** Prepare and label media: `BANZA_KEYS_A`, `BANZA_KEYS_B`, `BANZA_PUB`, Ceremony USB.
3. **[TEST-ONLY]** Load ceremony software onto the Ceremony USB; record SHA-256 of each file.
4. **[TEST-ONLY]** Print this runbook, the Checklist, and the Record Template.
5. **[TEST-ONLY]** Confirm governance approval of the (dry-run) date and the two participants.

## Phase B — Opening & environment audit

6. **[TEST-ONLY]** Verify identities of Officer and Witness; collect/airplane-mode all mobile devices.
7. **[TEST-ONLY]** Lock the room; confirm no network cable, WiFi disabled in hardware.
8. **[TEST-ONLY]** Mount the Ceremony USB; verify software hashes against the pre-ceremony record —
   PASS required to continue.
9. **[TEST-ONLY]** Record the system clock (UTC). Witness initials.

## Phase C — Air-gapped key generation

10. **[TEST-ONLY]** Determine and read aloud the five key IDs (`CEREMONY_DATE`, `ROOT_KEY_ID`,
    `META_KEY_ID`, `BRL_KEY_ID`, `EVID_KEY_ID`). Confirm **no** ID begins with `test-` *(for a real M2;
    in this dry-run the `test-` prefix is expected and the material stays test-only)*.
11. **[TEST-ONLY]** Generate the **root** ed25519 keypair. Record root public key + fingerprint.
12. **[TEST-ONLY]** Generate the **metadata-signing** keypair. Record fingerprint.
13. **[TEST-ONLY]** Generate the **BRL-issuing** keypair. Record fingerprint.
14. **[TEST-ONLY]** Generate the **conformance** keypair. Record fingerprint. Witness initials.

Domain separation (ADR-038): four keys, four domains, one algorithm (ed25519). The root key will sign the
manifest only. Keys never leave the air-gapped machine except as encrypted archives (ADR-028).

## Phase D — Dual-control signing of the key manifest

15. **[TEST-ONLY]** Construct the Key Manifest body with the four public keys and the frozen `issuer_key_id`
    values; set root validity ≤ 24 months and issuing validity ≤ 6 months (INV-ROOT-006).
16. **[TEST-ONLY]** **Officer signs** the Key Manifest with the **root** key; **Witness observes** the
    command and the output. Record the Key Manifest SHA-256.
17. **[TEST-ONLY]** Construct the **initial BRL** with **0** revoked operators; sign it with the
    **BRL-issuing** key. Record the BRL SHA-256. Witness initials.

## Phase E — Verification

18. **[TEST-ONLY]** Re-load the manifest from memory and re-verify its root signature — PASS required.
19. **[TEST-ONLY]** Re-load the BRL and re-verify its BRL-issuing signature — PASS required.
20. **[TEST-ONLY]** Confirm key-ID format and validity bounds (root ≤ 24 m, issuing ≤ 6 m). Any FAIL →
    stop and follow the Procedure failure path (§Part VI). Witness initials.

## Phase F — Sealing & custody

21. **[TEST-ONLY]** Write private keys, public keys, manifest and BRL to `BANZA_KEYS_A`; verify file
    hashes match in-memory values; encrypt private keys (GPG/AES-256); remove the unencrypted directory.
22. **[TEST-ONLY]** Clone `BANZA_KEYS_A` to `BANZA_KEYS_B`; verify hashes match.
23. **[TEST-ONLY]** Print the paper backup (four fingerprints + manifest SHA-256 + passphrase-stored-
    separately note); Officer and Witness sign it.
24. **[TEST-ONLY]** Move `BANZA_KEYS_A` and `BANZA_KEYS_B` to their secure storage locations. Witness
    initials.

## Phase G — Publication (public artifacts only)

25. **[TEST-ONLY]** Write `key-manifest.json`, `initial-brl.json`, `ceremony-record.json` to `BANZA_PUB`.
26. **[TEST-ONLY]** Grep-verify `BANZA_PUB` contains **zero** files matching `private` before it leaves
    the room.
27. **[TEST-ONLY]** (Would-be, post-room) Publish the manifest at `/.well-known/banza/key-manifest.json`
    and the BRL at `/federation/revocation-list.json`; verify each endpoint's schema and signature.
    **In this dry-run nothing is published to production.**

## Phase H — Record & close

28. **[TEST-ONLY]** Zero ceremony memory; exit; wipe/power off the ceremony machine.
29. **[TEST-ONLY]** Complete and sign the Ceremony Record and the day-of Checklist.
30. **[TEST-ONLY]** Record close time (UTC). For a real M2 only, mark **Milestone M2** complete under
    governance — **this dry-run does not mark M2 complete**.

## What a dry-run of this runbook does and does not do

| Does | Does NOT |
|---|---|
| Rehearse the sequence with test material | Create any production key |
| Validate roles, dual control, verification gates | Sign any real signed protocol metadata |
| Produce a rehearsal record | Publish to production endpoints |
| Feed the TRUST_AND_CRYPTO_CEREMONY track as a documented runbook | Complete milestone M2 |

Because the real ceremony has not run, the trust track remains
`DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` (computed **in Rust** by `validate_deep_assurance`) until M2 is
executed under governance — out of scope for BX2.1–BX2.4.

See: [`TRUST_CEREMONY_PLAN.md`](TRUST_CEREMONY_PLAN.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md),
[`ROOT_KEY_CEREMONY_PROCEDURE.md`](ROOT_KEY_CEREMONY_PROCEDURE.md),
[`ROOT_KEY_CEREMONY_CHECKLIST.md`](ROOT_KEY_CEREMONY_CHECKLIST.md),
[`ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md`](ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md).
