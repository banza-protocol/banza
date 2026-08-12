# BANZA — Conflict of Interest Policy (Creator == First Operator)

> **Formulação canónica.** O criador do protocolo (Banzami) é também o primeiro operador de um scheme
> baseado no BANZA. Este conflito de interesses é controlado **estruturalmente**: a implementação da Banzami
> é certificada pelo mesmo caminho público que qualquer outra, sem qualquer privilégio próprio, e a
> separação de infraestruturas e de chaves não deixa lugar a uma excepção. A correcção deste controlo não
> depende da boa conduta da Banzami — é verificável por qualquer terceiro.

This policy is the canonical statement of the conflict-of-interest control fixed by **ADR-063** (with
ADR-059 D-059-06 and ADR-060 D-060-05). It states the risk, the controls, the prohibitions, how independent
verification works, and how the controls are enforced.

---

## 1. The risk

Under ADR-043, **Banzami — Tecnologia e Serviços, Lda.** is the creator and initial institutional
maintainer of the open protocol. Under ADR-060, the same company is the **designated operator** of the first
operational scheme (Layer 3). The entity that shapes the protocol and the certification profile is therefore
also the first entity to be measured by them.

The concrete risks are:

- **Self-certification.** Banzami certifying its own implementation on easier terms than others.
- **Reduced profile or private path.** A quieter, weaker or non-public evaluation for Banzami.
- **Shared infrastructure.** A component (DB, key, secret, pipeline) common to protocol/certification and
  the scheme, through which a privilege could pass.
- **Brand collapse.** A reader concluding "BANZA = Banzami = the scheme = authorised", losing both the
  protocol's neutrality and the regulatory boundary (ADR-060, ADR-062).

The policy foreclosing these risks is structural, so that it holds even against the party it constrains.

## 2. The controls

**C1 — Same suite, same engine, same terms (no self-privilege).** Banzami's own implementation is certified
through exactly the **same public, versioned profile**, the **same conformance and interoperability
suites**, the **same Rust engine**, the **same reason codes**, the **same validity window** and the **same
suspension/revocation** as any other implementation (ADR-063 D-063-02, ADR-060 D-060-05). Certification is
of an **implementation**, never of the entity.

**C2 — No bypass; Rust decides.** Every certification verdict is decided by the Rust engine on verifiable
evidence; the local Qwen model explains but never decides, certifies, admits, publishes or changes a state
or a reason code (ADR-037/059). No human may convert a negative conformance result into a positive one
(ADR-038 INV-OTE-008). Rust validates before anything is published.

**C3 — Infrastructure separation.** The five infrastructures (BANZA Protocol, Certification & Registry,
BanzAI, Banzami Scheme, regulated data) are separated across databases, schemas, roles, keys, secrets, logs,
backups, retention, pipelines, monitoring and permissions. No component of one domain reads, writes or grants
a privilege in another (ADR-063 D-063-03; `docs/governance/BANZA_SEPARATION_MATRIX.md`).

**C4 — Key separation.** The eight key domains are never reused across domains; the offline trust root and
its delegated signing keys never reside on serving infrastructure (ADR-063 D-063-04, ADR-028/038). Banzami's
scheme keys (K5/K6) can sign nothing in L1/L2; the protocol and certification keys (K1/K2/K3) can sign
nothing for the scheme.

**C5 — Registry ≠ directory.** The L2 technical registry (implementations, conformance, certification,
revocation) is independent of the L3 Banzami Scheme participant directory; public verification requires no
Banzami account (ADR-060 D-060-06, ADR-063 D-063-06).

**C6 — Same revocation semantics.** Banzami's implementation is subject to the same scope, expiry,
suspension and signed, dated, fail-closed revocation lifecycle as any other; revocation of its own
implementation is never suppressed, delayed or exempted (ADR-063 D-063-05, ADR-038 INV-OTE-005/006).

## 3. Prohibitions

For Banzami's own implementation, and for any future first-party implementation, the following are
**prohibited without exception**:

- **No reduced profile** — no lighter, partial or entity-specific profile.
- **No private certification** — no non-public or off-registry certification (every certification is produced by the same public engine + profile and published to the technical registry).
- **No bypass** — no route that skips the public suites or the Rust engine.
- **No reserved endpoint** — no privileged or hidden API not available to every implementation.
- **No publication without evidence** — nothing is published as certified without the verifiable evidence
  that any party could re-check.
- **No FAIL→PASS override** — no human or configuration may turn a negative result positive.
- **No secret exception** — no undocumented carve-out of any kind.

These prohibitions mirror ADR-060 D-060-05 and are made enforceable by ADR-063.

## 4. Independent verification

The control is only meaningful because it is checkable by outsiders:

- Anyone can re-execute the **public vectors** against Banzami's artifacts and reproduce its
  `conformance_report_hash`; a result that does not reproduce is invalid (ADR-038 INV-OTE-004).
- Anyone can verify Banzami's certification record against **root-signed protocol metadata**, with **no
  Banzami credential, scheme membership or privileged endpoint** required (ADR-063 D-063-06).
- The technical registry (L2) is verifiable **independently of** the scheme directory (L3), so first-party
  status confers nothing in the registry.
- No BANZA-issued artifact about an operator is an input to the trust evaluation (ADR-038 INV-OTE-007), so
  Banzami cannot certify itself into trust by its own statement.

## 5. Enforcement

The controls are enforced in CI and by the identity system:

- **`banza-protocol-scheme-separation-check`** — asserts the L1/L2 protocol + certification surfaces stay
  separated from the L3 scheme (no scheme dependency leaks into protocol/certification surfaces).
- **`banza-banzami-scheme-role-check`** — asserts Banzami appears only in its designated
  institutional/scheme role and never as a self-privileged, exclusive or reduced-profile certification path.
- **`banza-regulatory-state-claim-check`** — asserts no surface presents Banzami as already
  authorised/licensed/approved, keeping the regulatory-state boundary of ADR-062.
- **identity-guard** (`make identity-check`) — keeps payment-operator brands blocked everywhere and confines
  the Banzami name to the allowlisted institutional/scheme surfaces (ADR-043/059..063).

A change that would give Banzami's implementation a reduced profile, a private path, a bypass, a reserved
endpoint, a publication without evidence, a FAIL→PASS override or a secret exception must fail these checks
and must not be merged.

---

## References

- ADR-063 (conflict of interest + infrastructure/key separation), ADR-060 D-060-05 (no self-privilege),
  ADR-059 D-059-06 (separation is an invariant), ADR-062 (regulatory-state + real-money gate)
- ADR-028 (keys never on serving infrastructure), ADR-037 (Rust-first engines), ADR-038 (open trust model
  without CA)
- `docs/governance/BANZA_SEPARATION_MATRIX.md`, `docs/governance/BANZA_RESPONSIBILITY_MATRIX.md`
