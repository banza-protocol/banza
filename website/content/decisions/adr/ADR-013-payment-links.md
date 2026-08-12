# ADR-013 — Payment Links: Shareable URL Commerce Primitive

**Status:** Accepted  
**Date:** 2026-05-13

---

## Context

Angola's informal commerce operates largely through WhatsApp groups, Instagram stories, and direct messages. Merchants list products, buyers respond, and payment is settled via mobile money or cash. There is no universal checkout flow.

The protocol must define a zero-friction payment primitive that operators can implement, one that:

1. Works without the merchant having a website or app.
2. Works for the customer in any browser, without installing an app.
3. Does not require real-time presence of both parties (unlike QR scanning).
4. Can carry a fixed amount (invoice) or be open (donation/tip).

---

## Decision

**Implement a Payment Links domain as a first-class primitive.**

A payment link is a shareable URL whose path carries the slug (for example, `https://<operator-domain>/pay/{slug}`), backed by a `payment_links` record. A merchant creates a link, shares it anywhere, and the customer opens it in a browser to pay.

**Slug format:** First 12 hex characters of a UUID v4 `simple` string.

**Two link types:** fixed-amount (amount locked at creation) and open (customer enters amount).

**Resolution:** Opening a payment link resolves the slug to a payment session, against which the customer completes payment. The protocol defines the link semantics — slug, type, and the session it resolves to — not the consumer-facing page. Each operator renders and serves that page itself, in whatever technology it chooses, and may present a QR code alongside the link so mobile users can complete payment in an operator app.

---

## Rationale

### Why a slug and not a full UUID?

A 12-character hex slug (`a3f7c2d19b40`) is:
- Human-readable in a preview pane before clicking.
- Short enough to type if copy-paste fails.
- Unique enough at expected scale (2^48 space; collision at 1M links ≈ 0.01%).

A full UUID would work but is visually hostile in a WhatsApp message.

### Why not QR-only?

QR codes require a camera scan, which is not possible when sharing a link in text. Payment links degrade gracefully: a customer who cannot scan can type the URL or click the link.

---

## Consequences

**Positive:**
- Zero friction for merchants: one API call creates a shareable link.
- Customers need no app — any browser suffices.
- Works in all async channels (WhatsApp, SMS, email, QR).
- Open links unlock use cases (donations, tips) that fixed-amount links cannot serve.

**Negative:**
- Open links require the payer to have a registered account with an operator — anonymous payment is not supported in V1.
- Slug enumeration is theoretically possible; rate limiting and monitoring are required controls.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Full UUID in URL | Too long for comfortable sharing in chat |
| QR-only payment | Does not work in text channels; requires camera |
| Redirect to existing merchant website | Most merchants have no website |
