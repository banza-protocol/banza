# Implement BANZA L0 from this package

You have been given a frozen package. This page tells you what to do with it. It does **not** teach you
how to implement anything — working that out from the package is the experiment.

---

## What BANZA is

BANZA is an open financial protocol: a specification of the rules an implementation follows so that
independent implementations can interoperate. It is not a bank, a payment service, a wallet or an
operator, and it holds and moves nothing. You are implementing a **specification**, not integrating with
a service.

## What you are implementing

**The L0 profile — Protocol Sandbox.** In one sentence: instantiate the protocol safely in a sandbox —
reachable, with a valid manifest, declaring itself simulated, using integer money.

You are **not** implementing wallets, transfers, a ledger, payment requests, QR, federation or
settlement. Those are higher profiles and are out of scope for this trial. The package tells you
precisely what L0 requires; that list is the authority, not this paragraph.

## Package identity

Verify before you start, and record that you did:

```
trial ID                 banza-v1.0.0-l0-independent-trial-001
protocol version         1.0.0
target profile           L0
package content digest   see TRIAL_MANIFEST.json -> package.content_tree_sha256
```

Recompute the content digest yourself. `TRIAL_MANIFEST.json` states how it is derived; if your value
differs, stop and say so before writing any code.

## Where authority lives

`contracts/production/normative-manifest.json` inside the package lists every artifact that defines a
requirement, each with a digest. **If a rule is not reachable from that manifest, it is not normative.**

There is no hidden document. There is no "ask the authors what it really means". If the package does not
determine something, that is a finding, and saying so is a valuable result — not a failure on your part.

## Where to start

1. `contracts/production/normative-manifest.json` — what binds you
2. `contracts/production/conformance-profiles.production.json` — what L0 requires, exactly
3. `spec/canonicalization.md` — **BCJ/1**, the byte form. Read it first, implement it first
4. the remaining specs and registries the L0 profile names
5. `conformance/vectors/` — the cases you must pass

## First gate: BCJ/1, alone

Implement the canonical byte form and pass every applicable vector **before** anything else. Not "mostly
matching" and not "semantically equivalent": the bytes must be equal, because the bytes are what a
signature is computed over. Two implementations that disagree here disagree about everything downstream.

If BCJ/1 does not pass, the trial stops there and we look at why. That is by design.

## Then the rest of L0

Capability matching, the reason-code vocabulary, and a served operator manifest. The profile registry
names exactly which schemas, specs, registries and vectors apply.

## What you may use

Public standards (the RFCs the package references), your language's documentation and standard library,
generic cryptographic and JSON libraries, package managers, and ordinary development tooling. Use any
language you like — the harness talks to a command-line adapter and an HTTP origin, and cares about
neither your language nor your architecture.

## What you may not use

Anything derived from BANZA's own implementation: the engines, Operator Zero's source, the reference
implementation, private branches, internal audits or reports, or BanzAI as a normative source. Do not go
looking for BANZA source mirrors or cached implementation material online. The full list is in
`ISOLATION_AND_PROHIBITED_SOURCES.md`.

This is not a trust exercise. If you consult one of these, the honest thing is to record it — the result
is still technically useful, and only the word "independent" is lost.

## Asking a question

Ask freely. Record the question in `QUESTION_LEDGER.json` **before** it is answered, in your own words,
and do not edit it afterwards.

You will get one of exactly two answers:

- **"The answer is in artifact X, section Y."**
- **"The public specification does not currently determine this."**

You will never be told what the reference implementation does. That is not us being unhelpful — an
answer drawn from the implementation would silently repair the specification, and then the trial would
be measuring our helpfulness instead of the package.

## Running the tests

```bash
python3 harness/run_trial.py \
  --package <the package directory> \
  --adapter "<your command>" \
  --origin http://localhost:<your port> \
  --out trial-results.json
```

Your adapter is one executable that accepts a subcommand and reads one case from stdin. The contract is
documented at the top of `harness/run_trial.py`. Python 3 with no third-party dependencies is all the
harness needs; your implementation can be in anything.

## Submitting

When you consider the implementation complete, tell us **before** running any comparison. We record the
implementation hash, your dependency lock, toolchain versions, environment, build command, test outputs
and the question ledger. After that the implementation is frozen for this run.

Then, and only then, we compare against the reference implementation. If your implementation and ours
disagree, the specification decides — and if the specification is on your side, **the reference gets
fixed**.

## If the specification is ambiguous

Say so, in the ledger, and pick a reading. Do not guess silently and do not ask us to choose for you. An
ambiguity you surface is one of the most valuable outputs this trial can produce; an ambiguity you paper
over teaches us nothing.
