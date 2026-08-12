# M2.19G — New Owner Pages

**`/certificacao`, `/registo-tecnico`, `/glossario` — the three canonical owner pages**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`

Gate-0 found that the L2 certification model, the Technical Registry and the glossary had **no real owning
page** — `/certificacao` and `/conformidade` both redirected into a reference chapter that still described
the retired L0–L4 model, the Technical Registry existed only implicitly behind `/operadores`, and there was
no public glossary. M2.19G delivered three real pages and wired them into the footer and sitemap.

---

## 1. `/certificacao` — Conformance & Interoperability Certification (L2)

**File:** `website/app/certificacao/page.tsx` (296 lines) — promoted from a redirect stub into a real page.
**Sources:** ADR-064 (model) · ADR-065 (registry) · ADR-066 (state machine) · ADR-061 (separations).
**Canonical URL:** `/certificacao`.

Presents the L2 model exactly as the architecture defines it: a **per-implementation, evidence-based,
Rust-decided, reproducible, hash-bound, scoped and time-limited** determination against a public, versioned
profile. It certifies an *implementation*, never an entity, and confers no licence, admission or
authorisation. Structure:

- **The three objects (ADR-064):** the yardstick (**Certification Profile** —
  `interoperability-certification-profile`), the subject (**CertifiedImplementation** —
  `implementation_id` + `implementation_hash`; `declared_by` is attribution only, never the subject), and
  the verdict (**Certification Record** — binds implementation ↔ profile by hash, carries the Rust verdict,
  a state + `reason_code`, the scope, the validity window and a `record_hash` over the whole).
- **The binding table (ADR-064 D-064-03):** exactly what a Certification Record binds to
  (`implementation_id`+`implementation_hash`, `operador (declared_by)`, `profile_id`+`profile_version`,
  `protocol_version`, `environment`, `capabilities`·scope, `evidence` hashes, `validity`).
- **The closed state machine (ADR-066):** `NOT_CERTIFIED` (fail-closed default), `CERTIFIED` (the only
  state that reads as valid), `EXPIRED`, `SUSPENDED`, `REVOKED` (terminal — never reactivates; renewal is
  always a new record), `SUPERSEDED`.
- **The three determinations (ADR-061):** certification (L2) ≠ scheme admission (L3) ≠ regulatory
  authorisation — three distinct owners, non-propagating.

No central certifying authority, no public certification tiers, no score, no human step. Rust decides; Qwen
(BanzAI) explains.

---

## 2. `/registo-tecnico` — BANZA Technical Registry

**File:** `website/app/registo-tecnico/page.tsx` (201 lines) — new page.
**Sources:** ADR-065 (registry) · ADR-060 D-060-06 (scheme separation) · ADR-066 (states).
**Canonical URL:** `/registo-tecnico`.

The single public, root-verifiable index of L2 artifacts — implementations, profiles, certification records
and revocations — verifiable by any third party with no account. It is **strictly independent of the L3
scheme participant directory**: being listed is never admission and never authorisation. Structure:

- **The distinctions the registry keeps separate:** Operador (declarant, never the subject) · Implementação
  (the indexed subject, a build by content hash) · Conformidade · Interoperabilidade · Certificação ·
  Demonstração (published reproducible evidence — not itself a certification) · Revogação (signed, dated
  withdrawal via the state machine — a security/trust mechanism, not a licence or sanction) · Substituição.
- **The published certification states** (ADR-066), same closed machine as `/certificacao`.
- **Machine routes** — the verifiable source of registry state.

States the honest current state: **empty** (`/operators` returns `[]`, pre-production), and never presents
Operador Zero as a real participant.

---

## 3. `/glossario` — canonical current-only glossary

**File:** `website/app/glossario/page.tsx` (315 lines) — new page.
**Source:** M2.19G §26, grounded in `artifacts/m2-19g/canonical-concept-matrix.json`.
**Canonical URL:** `/glossario`.

The real owning page for the canonical, **current-only** glossary. Each term carries a short definition, a
full definition, a technical id where one exists, the canonical page that owns it, related terms and a "não
confundir com" line. It defines **only current concepts** — retired framings (a central certifying
authority, per-entity certificates, public certification levels, removed surfaces) are never defined here as
current concepts. Terms are ordered pedagogically: roles → certification chain → determinations → trust →
registry/federation → scheme → receipts (operador, implementação, participante, perfil, capability,
conformidade, interoperabilidade, certificação, admissão, autorização, evidência, confiança, revogação,
registo, federação, esquema, recibo, …).

---

## 4. Footer + sitemap wiring (`website/lib/site.ts`, `website/app/sitemap.ts`)

**Footer (`site.ts`):**

- "Protocolo" column now carries **Registo Técnico** (`/registo-tecnico`), **Certificação técnica**
  (`/certificacao`) and **Glossário** (`/glossario`) alongside the reference entry, operators and the
  verifiable-state panel.
- The "ADRs e RFCs" link was **repointed from `/governacao` (a redirect into the reference chapter) to
  `/decisoes`** (the decisions explorer) — fixing the Gate-0 mis-target.
- The standalone open-governance page was added to the Contacto column as **Governança aberta**
  (`/governanca`), disambiguated from the `/governacao` redirect and the `/referencia/governacao` chapter.
- "Segurança" relabelled **Confiança** (`/confianca`).
- The Operador Zero footer link comment was rewritten to the read-only reference framing (ADR-067); the
  external chromeless `zero.banza.network` destination and structural neutrality controls are unchanged.

**Sitemap (`sitemap.ts`):** the ROUTES list now includes the real editorial entry pages and the three new
owner pages (`/o-que-e`, `/porque-existe`, `/arquitectura`, `/operadores`, `/registo-tecnico`,
`/certificacao`, `/glossario`, `/confianca`, `/federacao`, `/governanca`, `/licenca`, plus `/banzai`,
`/estado`, `/decisoes`, `/referencia`). Redirect aliases (e.g. `/conformidade`, `/governacao`,
`/referencia/racional`) are deliberately excluded; the reference chapters are appended below. This also
resolves the Gate-0 orphan routes (`/operadores`, `/governanca`, `/licenca` were 200 HTML but absent from
the sitemap).

---

## 5. Dedicated guards

Each new page has a dedicated, self-tested guard locking its canonical content, its footer + sitemap
linkage, and the absence of any retired framing as a positive claim (negation-aware):
`tools/check-certification-page.sh`, `tools/check-technical-registry-page.sh`,
`tools/check-glossary-page.sh`. A capstone `tools/check-m2-19g-public-surface-canonical.sh` sweeps the whole
rendered surface for the three-layer vocabulary and the retired-framing absence. Detail in
`M2_19G_GUARD_CONVERGENCE.md`.

## Verdict

The three concepts that Gate-0 found orphaned — the L2 certification model, the Technical Registry and the
glossary — now each have a real, canonical owner page, grounded in the correct ADRs, wired into the footer
and sitemap, with correct canonical URLs. `/certificacao` is no longer a redirect into a stale chapter; the
Technical Registry is presented as distinct from the L3 participant directory; the glossary defines only
current concepts.
