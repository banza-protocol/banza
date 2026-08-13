# BANZA Public Conformance Package

Protocol version **1.0.0** · package schema **1** · 73 files

This directory is self-contained. It carries the BANZA conformance vectors together with the schemas
and registries they are evaluated against, and nothing else. There is no engine here, no runner, and
no reference implementation — the vectors are **data**, and each states its own expected outcome.

## Verifying the copy

Every file is listed in `package-manifest.json` with its SHA-256. Recompute them and compare: the
digests are those of the published originals, so a match proves this package is the published surface
rather than a retelling of it.

## What is here

| | |
|---|---|
| `conformance/vectors/` | The vectors. Each case carries an id, an input and an expected outcome |
| `conformance/manifests/`, `conformance/capabilities/` | Schemas the manifest vectors validate against |
| `contracts/` | The contracts and registries the vectors draw on, including the reason-code registry |
| `package-manifest.json` | File digests, vector index, and which profile requires which vector file |

## What passing means

Passing the vectors for a profile demonstrates conformance **to what those vectors cover**. It is not
a certification, an admission or an authorisation. Nobody issues anything on the strength of it, and
this package cannot be used to obtain a credential, because none exists.

## What is deliberately absent

- Any BANZA implementation code
- Any runner, harness or test framework
- Any reference to a path outside this directory

If you find a reference here that does not resolve inside this package, that is a defect in the
package and not something for you to work around.
