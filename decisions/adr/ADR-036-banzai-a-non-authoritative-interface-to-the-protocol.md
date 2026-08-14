# ADR-036 — BanzAI: a non-authoritative interface to the protocol

## Context

BANZA is a specification. Reading a specification well takes expertise most people arriving at a
financial interoperability protocol do not have, and the questions they actually need answered —
*does my implementation conform?*, *what does this profile require?*, *why is my manifest rejected?* —
are answerable mechanically from artifacts the protocol already publishes.

The risk in building such an interface is not that it is hard. It is that it becomes a second source of
truth: an assistant that answers confidently about the protocol acquires, in practice, the authority to
define it. A reader who trusts the answer over the specification has been given a worse protocol with
extra steps.

## Decision

**BanzAI is the primary human-operator interface to BANZA, and it is optional, transversal and
non-authoritative.** It executes protocol rules; it is **not a normative source**; it never defines them
and never determines conformance.

The boundary in one line: **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

Machine-to-machine access does not depend on it. The protocol's APIs, contracts, vectors and evidence
are consumed directly; **BanzAI is not mandatory for M2M integration**, and no conformance path routes
through it.

Four constraints make that true rather than aspirational:

1. **Deterministic engines decide; the model only explains.** Every verdict, status, profile evaluation
   and validation outcome is computed by Rust engines over published artifacts. The language model
   receives a closed factual package and produces prose from it. It never decides.
2. **Answers are validated before publication.** A post-synthesis validator checks every claim and
   citation against the factual package. Unvalidated model text is never shown.
3. **Sources are public.** Retrieval draws on the published corpus. Assistant instructions, internal
   tooling and repository engineering material are excluded at a single choke point applied both at
   retrieval and at presentation.
4. **The action boundary is deterministic.** BanzAI answers and explains. It does not move funds, does
   not certify, does not admit, does not authorise, and refuses such requests without consulting the
   model.

BanzAI runs from this repository, as a thin service over the official engines (ADR-038). A **inferência
local** (local inference) is off by default; enabling it changes how an answer is *worded*, never what it *says*.

## Rationale

BANZA needs the interface because a protocol nobody can interrogate is a protocol nobody adopts, and
because the questions worth answering are already decidable from published artifacts — so answering
them adds reach without adding authority.

BANZA needs the constraints because the failure mode is silent. An assistant that is wrong about a
threshold, a profile requirement or a conformance verdict does not fail loudly; it produces a
confident sentence, and the reader acts on it. Determinism at the decision points, validation before
publication and a public-only corpus are what keep a helpful surface from becoming an unaccountable one.

Local inference is off by default because a protocol must be understandable without it. If the model is
unavailable, answers degrade to deterministic composition — narrower, still correct.

## Alternatives considered

**No interface at all.** The specification stands alone, which is already required and is tested by the
delete-the-reference exercise. Rejected as a *product* decision rather than a correctness one: the
specification remains sufficient, and BanzAI remains optional.

**Let the model answer directly from documents.** Far simpler, and it fails the only constraint that
matters: the model would be deciding. Verdicts would vary between runs and could not be reproduced by a
third party, which is the opposite of what a conformance protocol is for.

**Make BanzAI authoritative for conformance.** Tempting, because it holds the engines. Rejected because
it inverts the dependency: conformance is determined by public vectors any implementer can run, and a
result that requires BanzAI to obtain is not independently verifiable.

## Consequences

- BanzAI can be removed entirely without affecting what BANZA is, what conforms, or how anything is
  verified. That is the test of its non-authority, and it must keep passing.
- Every BanzAI answer is reproducible at its decision points, because those points are deterministic
  code over published artifacts rather than model output.
- The interface costs real engineering: a validated publication path, a source policy, a boundary, and
  their tests. That cost is the price of not becoming a second source of truth.
- Model wording may vary between runs. Verdicts, statuses and citations may not.

---

## Normative authority

The decision above is explanatory, and BanzAI is explicitly outside the normative surface. Nothing here
binds an implementation. What binds one is the normative surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
