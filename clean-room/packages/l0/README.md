# BANZA L0 — Clean-Room Export Package

**This package is a derived distribution of the BANZA v1.0.0 public normative surface. It is not an
independent specification. The BANZA Normative Manifest remains authoritative.**

**The reference implementation is intentionally excluded.**

Protocol version **1.0.0** · target profile **L0 — Protocol Sandbox** · 23 files

---

## What this is

Everything needed to implement BANZA at profile L0, and nothing else. The file set is the transitive
implementation set for this profile, selected by allowlist — no file is here unless something in the
normative surface requires it, and the reason is recorded against every entry in
`package-manifest.json`.

## Where to start

1. `docs/guides/implement-l0.md` — a map to the set. It states no requirement of its own; every
   obligation names the artifact that imposes it.
2. `contracts/production/normative-manifest.json` — what is normative, and what is not.
3. `contracts/production/conformance-profiles.production.json` — what this profile requires, and what
   it explicitly does **not**.

## Verifying this package

`package-manifest.json` lists every file with its SHA-256. `provenance.json` records the source
commit, the digest of the Normative Manifest, and the digest of the package manifest itself. Two
exports from the same commit are byte-identical; there is no generation timestamp anywhere in the
digested content.

## What is deliberately absent

The reference implementation, the demonstration operator, ADRs, the README, internal reports, the
Whitepaper, the assistant, and all tooling. `package-manifest.json` lists each exclusion with its
reason.

None of that is missing by oversight. If you cannot determine required behaviour from what is here,
that is a **defect in the specification**, not something for you to work around — and recording it is
the point of the exercise. See `clean-room/README.md` in the BANZA repository for the question ledger.

## Licence

`LICENSE` (Apache-2.0) and `NOTICE` apply to the material here. `TRADEMARKS.md` governs the names and
logos, which neither licence grants.
