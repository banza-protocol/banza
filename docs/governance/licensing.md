# Licensing

**This document is the licensing policy of the BANZA repository.** It states the policy in its own
voice; it does not derive it from any other document.

Authority runs in one direction:

```
LICENSE · NOTICE · TRADEMARKS.md      the legal instruments — these govern
  ↓
this document                         the policy they express, in one place
  ↓
README and other documentation        cite this document; they are not its source
```

Where this document and a legal instrument disagree, **the instrument governs**. Where a specific file
carries its own licence marker, **that marker governs that file**. Nothing here is legal advice.

## Code, contracts and specifications — Apache License 2.0

Source code, protocol contracts, schemas, specifications and conformance material in this repository are
licensed under the **Apache License, Version 2.0**.

- Full, unmodified licence text: [`LICENSE`](../../LICENSE)
- Copyright and attribution: [`NOTICE`](../../NOTICE)

The root `LICENSE` carries the **standard, unmodified Apache-2.0 terms**, so automated licence detection
recognises it. Its "APPENDIX: How to apply the Apache License to your work" boilerplate copyright line is
completed with the actual owner — `Copyright 2026 BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.` — exactly as that
appendix instructs. That fills a template placeholder; it alters no licence term.

Apache-2.0 includes an express **patent grant** (§3). Nothing in this repository requires prior
authorisation to build an independent implementation of the protocol.

## Documentation — Creative Commons CC BY 4.0

Public documentation in this repository is published under **Creative Commons Attribution 4.0
International (CC BY 4.0)**.

**Status of this term, stated plainly.** Unlike Apache-2.0, this licence has **no instrument at the
repository root** — there is no `LICENSE-docs` file and no per-file marker on most documents. The term is
declared by this policy and repeated in the README.

That is a real gap, and it is recorded here rather than concealed: a reader relying on the documentation
licence is relying on a policy statement, not on a licence text carried with the work. **Adding an
instrument is a governance action** — it grants or clarifies rights — and belongs to the process in
[`GOVERNANCE.md`](../../GOVERNANCE.md), not to an editorial pass. Until that happens, this section is the
authoritative statement of the term.

Two artifact classes are explicitly **not** documentation for this purpose, and remain Apache-2.0:
`contracts/**` and `spec/**` — they are part of the implementable surface, not explanatory material.

## Trademarks are separate from the right to implement

Neither licence grants rights to the **BANZA**, **BanzAI** or **Banzami** names or logos. Those are
governed by [`TRADEMARKS.md`](../../TRADEMARKS.md), which permits describing a conformant implementation
as an *"Independent implementation of the BANZA protocol"*.

The right to implement the protocol and the right to use the marks are distinct, and neither implies the
other.

## Summary

| Artifact | Licence | Instrument |
|---|---|---|
| Source code, `engines/`, `services/`, `tools/`, `website/` | Apache-2.0 | [`LICENSE`](../../LICENSE) |
| `contracts/`, `spec/`, `conformance/` | Apache-2.0 | [`LICENSE`](../../LICENSE) |
| Copyright and attribution | — | [`NOTICE`](../../NOTICE) |
| Public documentation (`docs/`, README and similar) | CC BY 4.0 | **this policy** — no root instrument yet; see above |
| Names and logos | not licensed | [`TRADEMARKS.md`](../../TRADEMARKS.md) |
