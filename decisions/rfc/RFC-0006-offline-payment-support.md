---
rfc: 0006
title: Offline Payment Support
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: [0003]
---

## Summary

Define a protocol by which operator-controlled wallet or account implementations
can authorize and complete payment flows in conditions of intermittent or absent
network connectivity, with settlement deferred to the next available online window.
BANZA itself is not a wallet and does not authorize or complete payments.

## Motivation

In markets with unreliable internet connectivity — which includes significant
portions of Banza's target geographies — a payment system that requires
constant network access excludes exactly the users who need it most. Offline
payment support is not a convenience feature; it is an infrastructure requirement
for inclusive financial access.

Relevant precedent:
- Visa's offline payment mode (pre-authorized limits, EMV offline data authentication)
- M-Pesa's USSD fallback
- Square's offline mode (up to 7 days offline authorization)

## Problem statement

Current payment flows require:

1. QR generation → network call to the operator implementation → token created.
2. QR scan → network call to verify token.
3. Payment initiation → network call to reserve funds.
4. Payment confirmation → network call to settle.

Steps 1-4 all require connectivity. A brief network outage at any step fails the
payment. In low-connectivity environments, failure rates become unacceptably high.

Key constraints for offline mode:
- Must not allow double-spending (Consumer pays the same offline token twice).
- Must not allow infinite offline credit (Consumer cannot generate unlimited
  offline tokens).
- Must settle correctly when connectivity is restored.
- Must be auditable post-hoc.

## Proposed solution

### Offline pre-authorization

The consumer device, when online, requests an **offline allowance** from the operator implementation:

```text
pub struct OfflineAllowanceRequest {
    pub consumer_id:    ConsumerId,
    pub wallet_id:      WalletId,
    pub max_amount:     Money,
    pub valid_for_secs: u64,  // how long the allowance is valid offline
    pub max_payments:   u32,  // maximum number of individual payments
}

pub struct OfflineAllowance {
    pub allowance_id:   String,
    pub consumer_id:    ConsumerId,
    pub remaining:      Money,
    pub payments_left:  u32,
    pub expires_at:     DateTime<Utc>,
    pub token:          String,  // cryptographic token for offline use
}
```

The operator implementation may reserve `max_amount` from the consumer's wallet/account immediately. The
consumer device stores the allowance and uses it to authorize offline payments
within the reserved amount.

### Offline payment token (OPT)

An OPT is a signed, bounded payment authorization that can be verified by the
merchant device without a network call:

```json
{
  "opt_version": 1,
  "allowance_id": "...",
  "amount_minor": 5000,
  "currency": "AOA",
  "merchant_id": "...",
  "nonce": "random-single-use",
  "consumer_signature": "ed25519:...",
  "issued_at": "2026-05-28T12:00:00Z",
  "expires_at": "2026-05-28T13:00:00Z"
}
```

The merchant device verifies the consumer's signature against the pre-registered
consumer public key (fetched during the last online sync).

### Deferred settlement

Merchants batch OPTs and submit them on next network reconnection. The operator implementation:
1. Validates each OPT signature and allowance.
2. Checks for double-spend (OPT nonce deduplication).
3. Settles each OPT against the pre-reserved consumer balance.
4. Releases any unused allowance back to the consumer.

### Wallet capability requirement

Wallets must explicitly declare offline payment support via RFC-0003's
`WalletCapabilitySet`. An `offline_payments: true` flag enables OPT issuance.

## Alternatives considered

**USSD fallback**: Existing infrastructure but limited to Angola's specific USSD
platform (Multicaixa/EMIS). Not operator-neutral and requires specific carrier
agreements.

**Store-and-forward (no reservation)**: Merchant accepts payment and reconciles
later. Risk: consumer's balance may be insufficient at settlement time. Introduces
credit risk that an operator implementation should not create or bear.

**Pre-authorization with cryptographic limit enforcement (proposed)**: Funds are
reserved in advance; offline tokens are cryptographically bounded to that
reservation. No credit risk. Auditable. Operator-neutral.

## Compatibility impact

- Adds new optional endpoints: `POST /wallets/{id}/offline-allowance`,
  `POST /offline-payments/settle`.
- Wallets that do not declare `offline_payments: true` are unaffected.
- Existing online payment flows are unchanged.

## Security considerations

- Consumer device must protect the private key used for OPT signing.
- Stolen/lost device scenario: allowance expiry limits exposure. Emergency
  revocation endpoint required (network call when detected).
- Replay attacks: OPT nonces must be single-use; the operator implementation deduplicates globally.
- Merchant cannot forge OPTs — they are signed by the consumer's key.
- Time-based expiry assumes reasonable clock synchronisation. Clock skew tolerance
  (± N seconds) must be defined.

## Operational considerations

- Key rotation policy for consumer signing keys.
- Merchant device key sync interval.
- Maximum offline window before mandatory re-sync.
- Reporting and monitoring for deferred settlement queues.

## Migration concerns

Offline payment support is opt-in for both consumers (must declare allowance)
and merchants (must support OPT verification). No migration for operators that
do not deploy this feature.

## Unresolved questions

- How are consumer public keys distributed to merchant devices in low-connectivity
  environments?
- What is the maximum allowance amount policy? Should it be protocol-defined or
  operator-configured?
- How are clock synchronisation failures handled?
- What is the offline window limit? 24h? 7 days?
- How does the operator implementation handle a consumer who clears their device (loses private key)
  mid-allowance?

---

## Erratum — 2026-07

This RFC previously used wallet-possessive wording ("Banza wallets can authorize and
complete payments") that could imply BANZA operates wallets. For the BANZA v1.0 protocol
boundary, this is corrected: **BANZA is not a wallet and does not authorize or complete
payments.** Wallet or account implementations belong to operators or applications that
implement the protocol. This RFC remains a proposal/discussion; its status is unchanged. Operational verbs in this draft (reserving balances, settling tokens, deduplicating) denote the operator implementation, not BANZA; BANZA does not reserve balances, settle payments, bear credit risk or operate wallets.
