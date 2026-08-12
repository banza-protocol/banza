# examples/

Conceptual, illustrative examples of BANZA protocol flows.

These are **not production code, not SDKs, and not operator implementations**.
They use no real funds and certify nothing. They describe what a flow looks like
at the protocol level — the contracts involved, the invariants that must hold, and
the order of operations — so that a developer building an operator has a concrete
mental model before reading the full contracts.

Normative truth lives in [`spec/`](../spec/), [`contracts/`](../contracts/) and
[`conformance/`](../conformance/). Where an example and a contract disagree,
the contract wins. Using these examples is optional; conformance is determined
exclusively by the specification and the conformance suite.

| Example | Flow | Primary contracts |
|---|---|---|
| [qr-payment](qr-payment/) | Static and dynamic QR payment | `contracts/qr/`, `contracts/openapi/` |
| [payment-link](payment-link/) | Shareable payment request | `contracts/openapi/` |
| [merchant-checkout](merchant-checkout/) | Consumer→merchant settlement | `contracts/openapi/`, invariants |
| [webhook-handler](webhook-handler/) | Verifying signed event webhooks | `contracts/webhooks/`, `contracts/events/` |
