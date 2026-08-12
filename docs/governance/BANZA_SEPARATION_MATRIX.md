# BANZA — Infrastructure & Key Separation Matrix

> **Formulação canónica.** As cinco infraestruturas do BANZA são separadas por construção. Nenhum
> componente de um domínio pode ler, escrever ou conceder um privilégio noutro domínio, e nenhuma chave é
> reutilizada entre domínios. A separação é um invariante arquitectural (ADR-059 D-059-06, ADR-063), não
> uma escolha de apresentação — qualquer terceiro pode verificá-la.

This document is the canonical realisation of **ADR-063** (conflict of interest, infrastructure separation,
key separation) and **ADR-059 D-059-06** (separation is an invariant). It fixes, per infrastructure and per
axis, the concrete separation requirement, and it fixes the eight cryptographic key domains and the
never-reuse rule. It is the reference when deciding where a component, a table, a secret or a key belongs.

Because BANZA's creator (Banzami) is also the first scheme operator (ADR-060), this separation is what makes
the conflict of interest structural: there is no shared component through which a self-privilege could pass.

---

## The five infrastructures

| # | Infrastructure | Layer | Purpose |
|---|----------------|-------|---------|
| **I1** | **BANZA Protocol** | L1 | Public rules, contracts, schemas, APIs, invariants, reason codes, signed protocol metadata, key manifest, technical-registry serving, public verification. Serves signed public artifacts only; holds no private keys and performs no signing (ADR-028). |
| **I2** | **Certification & Registry** | L2 | Conformance + interoperability evaluation (Rust-decided), certification records, and the technical registry of implementations. Certifies an implementation, never an entity. |
| **I3** | **BanzAI** | transversal | The transversal human interface + local Qwen. Orients and executes by calling Rust engines; decides nothing (ADR-054/059). |
| **I4** | **Banzami Scheme** | L3 | Scheme administration, participant directory, sandboxed scheme operations. Distinct from the L2 technical registry. |
| **I5** | **Regulated data** | L3 | Real-participant / real-money / settlement data. **Dormant and fail-closed** until formal regulatory evidence exists (ADR-062); no real funds, wallets, settlement or participants are active. |

---

## Separation matrix

Each cell states the separation requirement for that (infrastructure × axis). "Own" means a dedicated,
non-shared instance/namespace/identity for that infrastructure. No axis may cross a domain boundary.

| Axis | I1 — Protocol (L1) | I2 — Certification & Registry (L2) | I3 — BanzAI | I4 — Banzami Scheme (L3) | I5 — Regulated data (L3) |
|------|--------------------|-------------------------------------|-------------|--------------------------|--------------------------|
| **Database** | Own protocol-state DB (ADR-042); public artifacts + registry serving. No client/financial data. | Own certification/registry DB; conformance evidence, certification records, technical registry. | Own BanzAI DB (sessions, evidence, indices); no protocol write authority. | Own scheme DB; participant directory + scheme state. Never merged with L1/L2 DBs. | Own isolated DB, encrypted at rest; **empty/dormant** until authorisation. Never merged with any other DB. |
| **Schema** | Protocol schema only (metadata, manifests, revocation, registry). No scheme or client tables. | Certification/registry schema only. No scheme-admission or client tables. | BanzAI schema only. No certification-verdict or scheme tables. | Scheme-directory + scheme-operation schema only. No protocol or certification-verdict tables. | Regulated schema, isolated; defined but inert until authorised. |
| **Roles** | Protocol DB roles; least-privilege; no role may reach L2/L3/regulated data. | Certification/registry roles; no role may write protocol metadata or scheme/participant data. | BanzAI service roles; read public artifacts, no write to L1/L2 state. | Scheme-admin/operator roles; no role may reach L1/L2 or regulated data beyond its scope. | Regulated-data roles; separate identities; disabled until authorisation. |
| **Keys** | Protocol Metadata Signing Key (delegated, offline; ADR-028/038). Never used for L2/L3. | Certification Registry Signing Key + Certification Record Signing Key. Never used for L1/L3. | BanzAI Service Keys (transport/session). Never used for signing protocol/certification artifacts. | Banzami Scheme Administrative Key + Operational Keys. Never used for L1/L2. | Future settlement keys, dormant/fail-closed. Never reused from any other domain. |
| **Secrets** | Own secret store/namespace; no shared credentials with any other domain. | Own secret store/namespace. | Own secret store/namespace. | Own secret store/namespace. | Own secret store/namespace; sealed until authorisation. |
| **Logs** | Own log stream; public-artifact serving + verification. No cross-domain log sink. | Own log stream; evaluation + record issuance. No cross-domain sink. | Own log stream; interaction + evidence. No cross-domain sink. | Own log stream; scheme administration. No cross-domain sink. | Own log stream, access-restricted; inert until authorisation. |
| **Backups** | Own backup set + keys; not co-mingled with any other domain. | Own backup set + keys. | Own backup set + keys. | Own backup set + keys. | Own backup set + keys, encrypted; separate custody. |
| **Retention** | Retention per protocol/audit policy; no client-data retention (none exists). | Retention per certification-evidence/audit policy. | Retention per interaction/evidence policy. | Retention per scheme-governance policy. | Retention per applicable regulatory framework; defined but not yet in effect. |
| **Pipelines** | Own build/deploy pipeline for public artifacts; produces/serves signed blobs (signing is offline, ADR-028). | Own pipeline for evaluation + record publication; publishes only after Rust validation. | Own pipeline for the interface + Qwen. Never publishes a certification/scheme decision. | Own pipeline for scheme operations; sandboxed. | Own pipeline, disabled; no real-money path can run until the ADR-062 gate opens. |
| **Monitoring** | Own monitoring/alerting scope. No shared dashboards granting cross-domain access. | Own monitoring/alerting scope. | Own monitoring/alerting scope. | Own monitoring/alerting scope. | Own monitoring/alerting scope; separate access. |
| **Permissions** | Least-privilege; no principal spans domains. No permission grants L2/L3/regulated access from L1. | Least-privilege; no principal spans domains. | Least-privilege; read public artifacts only. | Least-privilege; scheme scope only. | Least-privilege; disabled identities until authorisation. |

**Cross-cutting rules.**

- No principal (human or service) holds permissions in more than one domain by default; any cross-domain
  need is a separate, audited, least-privilege grant, never an implicit one.
- No database, schema, secret store, log sink, backup set or pipeline is shared between two domains.
- Banzami's own certified implementation runs against I1/I2 through the **same** public path as any other
  implementation (ADR-063 D-063-02); it obtains no privileged route into I1/I2 by virtue of also operating I4.
- I5 (regulated data) is dormant and fail-closed: it exists as a defined, isolated domain, but real funds,
  real wallets, real settlement and real participants stay OFF until the regulatory conditions of ADR-062
  are met (state `REGULATORY_AUTHORIZATION_IN_PROGRESS`).

---

## Key-domain table

Eight cryptographic key domains. Each key signs or authenticates within exactly one domain and is **never
reused, re-purposed or copied across domains** (ADR-063 D-063-04). The offline trust root and its delegated
signing keys never reside on serving infrastructure (ADR-028); the root itself signs nothing about any
operator (ADR-038 INV-OTE-009).

| # | Key domain | Layer / infra | What it signs / authenticates | Never-reuse rule |
|---|------------|---------------|-------------------------------|------------------|
| **K1** | **Protocol Metadata Signing Key** | L1 / I1 | Signed protocol metadata, key manifest and revocation entries — a delegated signing key endorsed by the offline threshold trust root (ADR-028/038). | Used only for protocol metadata/revocation. Never signs certification records, scheme or settlement material. |
| **K2** | **Certification Registry Signing Key** | L2 / I2 | The technical registry of implementations (registry entries / registry state). | Used only for the registry. Never signs protocol metadata, individual certification records, scheme or settlement material. |
| **K3** | **Certification Record Signing Key** | L2 / I2 | Individual certification records (per-implementation, evidence-bound, scoped, time-limited). | Used only for certification records. Never signs the registry, protocol metadata, scheme or settlement material. |
| **K4** | **BanzAI Service Keys** | BanzAI / I3 | BanzAI transport/session authentication (the human interface). | Used only for BanzAI service operation. Never signs any protocol, certification, scheme or settlement artifact. |
| **K5** | **Banzami Scheme Administrative Key** | L3 / I4 | Scheme-governance/administrative acts within the Banzami Operational Scheme. | Used only for scheme administration. Never signs L1/L2 artifacts or settlement material. |
| **K6** | **Banzami Scheme Operational Keys** | L3 / I4 | Day-to-day (sandboxed) scheme operational acts. | Used only for scheme operations. Never signs L1/L2 artifacts or settlement material. |
| **K7** | **Operator Implementation Keys** | operator-held (external) | An operator's own implementation identity/manifests, held by the operator outside BANZA (ADR-038). | Held and rotated by each operator; never a BANZA key and never shared with any BANZA domain. |
| **K8** | **Future settlement keys** | L3 / I5 | Real settlement, once (and only if) authorisation exists. | **Dormant/fail-closed** until ADR-062 conditions are met; never derived from or reused from any other domain. |

**Root anchoring (unchanged).** K1 is a delegated key endorsed by the offline, threshold-custody trust root
(ADR-038 D-038-04, INV-OTE-001). The root and all delegated signing keys are produced and used offline and
never touch serving infrastructure (ADR-028). No key in this table may be reused as another; rotation is
per-domain.

---

## References

- ADR-063 (conflict of interest + infrastructure/key separation), ADR-059 D-059-06 (separation is an
  invariant), ADR-060 (Banzami Operational Scheme), ADR-062 (regulatory-state + real-money gate)
- ADR-028 (private keys never on serving infrastructure), ADR-038 (open trust model without CA), ADR-042
  (PostgreSQL as protocol-state store)
- `docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md`, `docs/governance/BANZA_RESPONSIBILITY_MATRIX.md`
