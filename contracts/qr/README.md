# contracts/qr/

Canonical QR payment payload format specification for the BANZA protocol.

## Files

| File | Purpose |
|---|---|
| `payload-format.json` | Canonical QR payload grammar, prefix rules, encoding, HMAC signing for dynamic QR |
| `lifecycle.json` | QR code lifecycle FSM — states, transitions, invariants |

## QR is an interface to a Payment Session (ADR-015)

**Payment Link, QR and Deep Link are interfaces; the Payment Session (a
PaymentIntent, ADR-015) is the financial object.** A QR — static or dynamic — that
presents a Payment Session resolves, when scanned, to that session and credits the
session's destination (which MAY be a segregated Wallet Account, ADR-017) — exactly
like the session's payment link. The QR carries only an opaque session reference,
never an internal account id, and an application never generates a financial QR (the
operator renders it). See [ADR-015](../../decisions/adr/ADR-015-payment-initiation-one-intent-several-surfaces.md)
and [`contracts/payment-sessions/`](../payment-sessions/).

## The two QR types

| Type | Use case | Amount | Reusable | Expiry |
|---|---|---|---|---|
| `STATIC` | Personal @handle, shop counter, campaign/event poster | Payer sets (or session amount) | Yes | None (or session) |
| `DYNAMIC` | Invoice, e-commerce, POS terminal | Pre-set | No (single-use) | Mandatory |

## Payload prefix rule

| Environment | Prefix |
|---|---|
| Sandbox (`simulated=true`) | `BANZA-SBX:` (legacy: `BANZA-SBX:`) |
| Production (`simulated=false`) | `BANZA:` (legacy: `BANZA:`) |

An operator MUST NOT use `BANZA:` (production prefix) in a sandbox environment. This is a certification FAIL.

## Known divergence

The canonical QR payload format is defined in `payload-format.json`. Operators may use a compact production format or a verbose debug format; the canonical format in `payload-format.json` is authoritative.

**The compact format defined in `payload-format.json` is the canonical protocol format.** The verbose debug format is acceptable in sandbox environments only (where `simulated=true`).
