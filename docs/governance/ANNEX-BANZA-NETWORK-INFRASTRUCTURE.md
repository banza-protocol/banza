# ANNEX — BANZA Network Infrastructure

**Type:** formal infrastructure annex · **Status:** approved design · **Scope:** BANZA protocol + BanzAI only

## 1. Purpose of this annex
This annex formally describes the **dedicated infrastructure** that hosts the BANZA protocol and
BanzAI. It exists so that the operation of BANZA/BanzAI does **not** depend on memory, ad-hoc
commands, local knowledge of one machine, or informal instructions. It is the authoritative,
reproducible description of *what* the infrastructure is and *why*. The source of truth for the
deployable artifacts is `infra/banza-network/`.

## 2. Neutrality principle — BANZA is a protocol, not an operator
BANZA is an **open protocol**. It is not an operator, not a wallet, not a payment processor. It does
not hold balances, keep accounts, or run KYC/KYB, and it contains no commercial logic of any
operator. This infrastructure hosts **only** the protocol's public surface and BanzAI. It must be
buildable, understandable and operable **without** any knowledge of, or dependency on, any specific
operator. Examples use **Operator A / Operator B / Operator C**, never a commercial name.

## 3. Separation: BANZA/BanzAI vs operators
| Belongs to the protocol (this infrastructure) | Belongs to operators (elsewhere, never here) |
|---|---|
| Institutional site, documentation | Wallets, balances, accounts |
| Public verification routes, registry | Payment processing, settlement of an operator |
| Signed public artifacts (manifests, certificates, BRL, evidence) | KYC/KYB, customer data |
| BanzAI (knowledge system) | Operator business/commercial logic |

Protocol infrastructure and operator infrastructure **never share a host**.

## 4. Why a dedicated VM
Hosting the protocol as a guest on an operator-owned host couples the protocol's availability and
trust boundary to that operator — contradicting the neutrality invariant (*BANZA never depends on
any operator*). A **dedicated VM** removes that coupling: the protocol's uptime, TLS, network and
data are its own. See **ADR-033**.

## 5. Why a dedicated PostgreSQL
The protocol must durably store and serve **public, signed artifacts** (manifests, registry,
certificates, revocation list, conformance evidence hashes) and index its documentation for BanzAI.
A **dedicated PostgreSQL** (with `pgvector`) gives the protocol self-contained, auditable storage
with segregated roles, never shared with an operator. See **ADR-034**.

## 6. Why not Supabase/Firebase/managed backend
A managed external backend would make the protocol **operationally dependent** on a third party and
would blur the protocol/operator boundary. BANZA runs its **own** PostgreSQL inside the VM's
internal network. External, encrypted backups may exist as a **recovery mechanism only** — never as
an operational runtime dependency. See **ADR-034**.

## 7. Architecture components
| Component | Role |
|---|---|
| **Cloudflare** | DNS + proxy (Full-strict), edge TLS, WAF, cache; machine routes cache-bypassed |
| **nginx** (reverse proxy) | Single public entry (80/443); TLS via Origin Certificate; routing |
| **website** | Institutional site (`banza.network`) and `/referencia` |
| **docs** | Documentation surface (`docs.banza.network`), served from the site/docs build |
| **verification-api** | Serves canonical machine routes as JSON from PostgreSQL (read-only) |
| **BanzAI API** | RAG agent (local Qwen); reached same-origin via the apex `/banzai/ask` (the `banzai.banza.network` subdomain is retired → 301 to `/banzai`); explains, cites; non-authoritative |
| **BanzAI indexer** | Indexes protocol docs (reference, ADRs, RFCs, contracts) into `pgvector` |
| **PostgreSQL + pgvector** | Dedicated DB; public artifacts, audit, BanzAI index; **never exposed** |
| **backups** | `age`-encrypted, off-VM; recovery only |
| **logs** | Rotated; no secrets |

## 8. Logical topology
```
Internet → Cloudflare (proxy, Full-strict) → nginx (:80/:443, Origin Cert)
   ├── /              , /referencia        → website
   ├── docs.*                              → docs
   ├── banzai.*                            → BanzAI API ─┐
   └── machine routes (apex, JSON)         → verification-api ─┤
                                                              ├→ PostgreSQL + pgvector
                            BanzAI indexer ───────────────────┘   (network banza-data, internal-only)
   networks: banza-edge (proxy↔apps)   ·   banza-data (apps↔postgres, isolated)
```

## 9. Domains and public routes
| Surface | Domain / path |
|---|---|
| Institutional site | `banza.network` |
| Redirect | `www.banza.network` → apex |
| Documentation | `docs.banza.network` |
| BanzAI | apex `banza.network/banzai` (backend same-origin via `/banzai/ask`; `banzai.banza.network` retired → 301 to `/banzai`) |
| Canonical machine routes | always on the apex `banza.network` |

## 10. Canonical machine routes
Served on the apex as `application/json`, **never** redirected to HTML, cache-bypassed:
`/.well-known/banza/root.json`, `/.well-known/banza/key-manifest.json`, `/operators`,
`/federation/revocation-list.json`, `/conformance/evidence`. See **ADR-031**. (The former
`/certificates` route was removed in M2.19B / ADR-058 — the open trust model issues nothing to
operators; the canonical evidence route is `/conformance/evidence`.)

## 11. Pre-production state of the routes
In pre-production the machine routes return an honest JSON envelope, e.g.:
```json
{ "status": "pre-production", "pre_production": true, "production_certificates": false,
  "note": "A conformance PASS is technical evidence, not certification. In the open trust model no operator is centrally certified; participation is demonstrated by verifiable evidence, not granted by a central authority.",
  "data": null }
```
They never serve fabricated production data.

## 12. `/operators` is empty until operators publish conformance evidence
The registry route returns an **empty list** while no operator has published conformance evidence. Operator A/B/C exist
**only** in documentation and examples, never in the live registry.

## 13. Key policy
The **root key** is offline and ceremony-controlled; **issuing keys** (M2/M3) also never reside on
this VM. The infrastructure serves **only signed public artifacts** and holds **no private keys** and
performs **no signing**. See **ADR-028**.

## 14. BanzAI: explanatory, not normative
BanzAI is a subordinate **knowledge system**. It explains rules, documents, criteria, gaps and
evidence, and **always cites its sources**. It **does not** define rules, emit certificates, mark an
operator certified, or substitute the authoritative conformance suite; it holds no production keys
and can write only its own document index. *Tools determine the truth; the AI explains it.* See
**ADR-041**.

Real LLM inference is performed by an **external hosted API** — DeepSeek or Qwen, selected via the
`LLM_PROVIDER` allowlist (`mock` | `deepseek` | `qwen`; any other value refuses to start). The VM
**never** runs models locally, stores no model weights, and requires **no GPU**; the provider API key
exists only in the VM's `.env`, never in Git. The model receives only the rigid guardrail system
prompt plus approved documentation excerpts — never secrets, dumps, logs or keys. The deterministic
`mock` provider remains the reference for all automated tests, which make no external calls; real
providers are validated only by a manual, explicitly opt-in smoke test.

**Cost control (the LLM is the last resort).** Every question flows through tiers before any
external call: deterministic answers for the protocol's critical identity/guardrail questions;
an exact answer cache; a semantic near-duplicate cache (durably backed by the pgvector table
`banzai_answer_cache`, invalidated whenever the source corpus changes); a daily/monthly budget
gate on estimated spend; then a **limited** RAG context (few chunks, character-capped) with
per-mode token caps. Past budget, BanzAI keeps answering from deterministic entries and caches
and never calls the external provider. Completions are post-validated — an answer that claims
normative authority is replaced by the deterministic grounded answer. `/ask` is rate-limited per
client, and usage (spend estimates, cache counters) is observable via `/health` without exposing
any secret or content.

## 15. Explicit limits
This infrastructure has **no** wallet, **no** operator ledger, **no** KYC/KYB, **no** payments, **no**
end-user accounts, and **no** commercial operator names. Anything of that nature belongs to an
operator, elsewhere.

## 16. Relationship to ADR-033 … ADR-036
- **ADR-033** dedicated, operator-independent infrastructure
- **ADR-034** dedicated PostgreSQL + encrypted off-VM backups
- **ADR-031** canonical verification routes + pre-production behaviour
- **ADR-028** private keys never on serving infrastructure
- **ADR-041** BanzAI native protocol agent, non-authoritative
- **ADR-035** deploy model (Compose, pinned images, secrets outside Git)
- **ADR-036** DNS/TLS (Cloudflare Full-strict + Origin Certificate)

## 17. Acceptance criteria (infrastructure "ready")
- Dedicated VM, protocol-only; no operator artifacts present.
- SSH key-only, no root/password login; firewall allows only 22/80/443.
- PostgreSQL reachable **only** on the internal Docker network (never host/internet).
- nginx serves the site over TLS (Full-strict + Origin Cert); `www` → apex.
- Machine routes return valid JSON with the pre-production envelope; `/operators` returns `[]`.
- BanzAI answers cite sources and carry the Demo/non-authoritative framing.
- No private keys on the VM; no secrets in Git; `.env` present only on the VM (`chmod 600`).
- Encrypted off-VM backups run and a restore has been tested.
- Origin validated **locally** before any DNS cutover.

## 18. Known risks and mitigation
| Risk | Mitigation |
|---|---|
| Machine route ambiguity | Explicit pre-production JSON envelope; cache-bypass |
| Keys on serving host | Keys offline/ceremony; VM serves signed blobs only (ADR-028) |
| BanzAI treated as authority | Demo framing, source citations, no write to trust/certs |
| DNS cutover prolonging outage | Validate origin locally before cutover |
| Backups as runtime dependency | Backups are recovery-only, off-VM, encrypted |
| Single VM resource limits | Sized VM with swap; monitoring; stateless apps scale out later |

## 19. Portability note
The **server may change; the architecture must be reproducible.** All configuration is code
(`infra/banza-network/` + this annex + the runbook); only secrets, TLS material and data live off
Git. Re-creating the infrastructure on a new VM is a matter of running the documented bootstrap and
compose from the repository — no host-specific knowledge required.
