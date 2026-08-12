# contracts/webhooks/

Canonical webhook delivery specifications for the BANZA protocol.

## Files

| File | Purpose |
|---|---|
| `signature.json` | Canonical signing algorithm, header format, verification steps, test vectors |
| `envelope.schema.json` | JSON Schema for the webhook event envelope |

## The canonical header name

```
Banza-Signature
```

This is the protocol-level constant. Every SDK MUST use this exact name. Case-insensitive lookup is acceptable on receipt; canonical form uses title case as written above.


## Quick reference

```
Banza-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256>

signed_payload = "<unix_seconds>.<raw_body_bytes>"
digest         = HMAC-SHA256(key=webhook_secret_utf8, msg=signed_payload_utf8)
v1             = lowercase_hex(digest)
tolerance      = 300 seconds
comparison     = constant-time
```

For full algorithm and test vectors: `signature.json`.  
For event type registry: `contracts/events/webhook-types.json`.
