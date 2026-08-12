# M2 Readiness Handoff (2026-07)

> **This document does NOT activate M2.** It is a handoff to begin M2 **planning / preflight** only.
> No operator is created, no certificate is issued, `production_certificates` stays `false`,
> `/operators` stays `[]`, and BanzAI stays in mock. Production activation requires the explicit human
> decisions and legal/regulatory gates listed below.

## Final protocol state (at handoff)

| Item | Value |
|---|---|
| Protocol | BANZA **v1.0** |
| `VERSION` | `1.0.0` |
| `main` at handoff | the 7W merge commit (successor of `57fd980`) |
| Repository architecture | protocol-only: `spec/ contracts/ conformance/ decisions/ docs/ examples/ website/ services/ infra/ tools/ assets/ .github/` (no `apps/`, no root `BANZA_*.md`, no `docs/protocol|adr|rfc`) |
| Broken relative links | 0 |
| Public docs | README / SECURITY / governance / getting-started / spec / reference (PT+EN) / conformance / contracts — institutional, pre-production (7S–7W) |
| Website | pre-production, honest; public-surface hardened (7W) |
| GitHub | default branch `main`; description "Open protocol for financial interoperability and conformance."; topics protocol-first; README raw/API correct |

## Machine-route state (must remain until M2/M3 gates are met)

| Route | Expected |
|---|---|
| `GET /operators` | `200 []` |
| `GET /certificates` | `200` · `production_certificates=false` |
| `GET /.well-known/banza/root.json` | `200 JSON` |
| `GET /.well-known/banza/key-manifest.json` | `200 JSON` (specified location; no production manifest yet) |
| `GET /federation/revocation-list.json` | `200 JSON` |
| `GET /conformance/evidence` | `200 JSON` |
| `POST` (read-only endpoints) | `405` |
| BanzAI | provider `mock`, `llm_calls=0` |

## What M2 MAY begin (planning / preflight — read-only, no production activation)

- Design the **candidate-operator application process** and the candidate-operator profile.
- Define the **conformance-evidence package** (what evidence is collected, its format and provenance).
- Define the **governance workflow** for human review of submitted evidence (roles, quorum, SLAs).
- Define the **production-certificate policy** (issuance criteria, lifetime, revocation, key domains).
- Prepare an **empty public registry** and publish the **public, deterministic, auditable criteria**.
- Prepare **read-only runbooks** and **evidence templates**.
- Prepare the **legal/regulatory checklist** (BNA/regulatory posture, banking, KYC/KYB, AML/CFT) —
  as preparation, not authorization.
- Plan (not execute) the **root-key ceremony (M2)** and the M3 first-operator path.

## What M2 may NOT yet do (hard gate — requires explicit human decision + legal/regulatory clearance)

- Add a real operator to `/operators`.
- Issue any certificate; set `production_certificates=true`.
- Declare federation active; run production federation.
- Process real payments; move, hold or settle real funds.
- Assume or assert regulatory approval / banking authorization.
- Activate a real LLM (DeepSeek/Qwen) as a decision-maker (BanzAI stays mock/explanatory).
- Change `/operators=[]` or switch `/certificates` to a production posture.

## Mandatory gates before any M2→production step

1. **M2 — Production Trust:** successful offline root-key ceremony; production Key Manifest + BRL
   published at the specified canonical locations under the approved custody model.
2. **M3 — First Operator:** a candidate implementation passes the applicable conformance level, submits
   verifiable evidence, and completes the governance/certification review — as a separate governance step.
3. **Legal/regulatory clearance:** the applicable legal, regulatory, banking, KYC/KYB and AML/CFT
   obligations are satisfied **outside** the protocol; BANZA certification is technical and does not
   substitute these.
4. **Human sign-off:** an explicit, recorded human decision authorizes each production activation
   (registry entry, signed protocol metadata signing, federation activation).

## Evidence required for M2 planning

- A written candidate-operator profile + application flow (draft).
- A conformance-evidence template and validation checklist.
- A governance review procedure (roles, quorum, audit trail).
- A production-certificate policy draft (criteria, lifetime, revocation).
- A legal/regulatory readiness checklist (jurisdiction-specific).
- A root-key ceremony plan and custody model (already specified; to be scheduled, not executed here).

## Legal / regulatory risks to surface for human decision

- Whether/when to engage the BNA and under what regulatory framing (supervisory authority, not an
  operational provider).
- Banking/settlement arrangements and their legal ownership (operator responsibility, outside BANZA).
- KYC/KYB and AML/CFT obligations per jurisdiction (operator responsibility, outside BANZA).
- Signing production protocol metadata as a governance act with legal weight (who signs, under what authority).
- Data-protection and privacy obligations for any registry or evidence handling.

## Points requiring explicit human decision

- Approving the M2 root-key ceremony date and custody constitution.
- Approving the production-certificate policy and the governance quorum.
- Approving the first candidate → certified transition (M3).
- Any change to `/operators`, `/certificates`, or federation status.
- Any activation of a real LLM provider for BanzAI.

## Verdict

The public surface is coherent and honest for pre-production. **M2 may start as planning / preflight.
It must NOT activate production.** All production steps remain behind the M2/M3 gates, legal/regulatory
clearance, and explicit human sign-off above.
