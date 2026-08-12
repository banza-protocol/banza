# EN Reference Final Deep Hardening Matrix (2026-07)

**Base:** `main` `156cd2b` · **Phase:** 7S · Final deep content hardening of the public/canonical
reference corpus, with the English reference as primary target. **Result: 0 BLOCKED · 0
MANUAL_REVIEW_REQUIRED in the public documents.**

The English reference systematically **lagged** the Portuguese canonical reference: PT had been
hardened in phases 7P/7Q (M2/M3 qualifiers, "BANZA does not move funds" notes, prudent open-access
wording), while EN retained current-tense reference-operator claims, operational-federation
promises, "BANZA issues certificates", and absolute open-access wording. 7S brings EN up to PT's
prudence level and closes the residual PT/website items.

| Path | Public-facing | Issue found | Action applied | Remaining risk | Institutional-ready |
|---|---|---|---|---|---|
| `docs/reference/en/complete.md` | Yes (GitHub) | **Primary target.** Reference-operator as a current entity (§2 Disappearing-Operator, §3 Core Principles, §8 Operators, §10 Governance, §7 BanzAI); operational federation as current reality ("In production a customer… can pay a merchant", "receives the funds immediately", "unified payment network", "Settlement is executed by open rules"); "BANZA issues certificate/It defines the rules, issues certificates"/"Only BANZA issues certificates"; open-access "Any legal entity may apply"/"Any entity with verifiable conformance"; certification-levels header "What it certifies"; "Certification test vectors"; stale ADR-010 label "Wallet-native identity" | 18 byte-exact edits: reference-operator → "this repository does not contain a reference operator" / "operator implementations" / "any operator" / "no operator implementation controls…"; federation → future/M3-qualified model, "BANZA does not move or hold funds", crediting/funds-availability = operator responsibility, added operator-executes-settlement note (parity with PT L1532); issuance routed to "the BANZA CA … through the applicable governance process, when production certification opens"; open-access → "technically qualified candidate entity may submit … Certification, if applicable, depends on the protocol governance/certification process and does not replace legal/regulatory/banking/KYC/KYB/AML-CFT obligations"; header → "What it evidences"; "Conformance test vectors"; ADR-010 → "Account/Participant Identity Model" (real title) | none | ✅ PASS_WITH_FIX + PASS_WITH_PRUDENCE_HARDENING + PASS_WITH_FUTURE_GOVERNANCE_QUALIFIER |
| `docs/reference/pt/completa.md` | Yes (GitHub, canonical) | Reference-operator as entity (§2 L295, §3 L347, ownership bullet L1953, FAQ L2793); "A liquidação é executada por regras abertas"; "recebe os fundos imediatamente"; "rede de pagamentos unificada"; "Transferências bancárias executadas"; levels header "O que certifica"; artefact "Certificação determinística" | 10 byte-exact edits mirroring EN: reference-operator → "não contém um operador de referência" / "implementações de operador" / "qualquer implementação de referência" / FAQ "se um operador desaparecer"; settlement → "executada pelos operadores … o BANZA não movimenta nem liquida fundos"; funds → operator responsibility + "o BANZA não movimenta nem detém fundos"; "rede de pagamentos unificada" → future/governed federation model; "Transferências bancárias pelos operadores"; "O que evidencia"; "Verificação determinística" | none | ✅ PASS_WITH_FIX + PASS_WITH_PRUDENCE_HARDENING |
| `website/content/BANZA_REFERENCIA.md` | Yes (`/referencia`, `/referencia/completa`) | Mirror of PT (byte-identical except one pre-existing depth-corrected link at L2513) | Same 10 PT edits applied byte-identically; parity preserved (still differs from PT only by the single link-depth line) | none | ✅ PASS_WITH_FIX |
| `conformance/README.md` | Yes (GitHub) | Levels header "What it certifies"; H1 "Conformance & Certification"; "Any operator deploying BANZA in production" | "What it evidences"; H1 → "BANZA Conformance and Certification Governance" (no cross-links to the old anchor; body already separates evidence from certification); "Any operator implementation deploying BANZA-compatible services in production" | none | ✅ PASS_WITH_FIX + PASS_WITH_PRUDENCE_HARDENING |
| `contracts/README.md` | Yes (GitHub) | "the authoritative source for conformance **and certification testing**" (wraps L27-28) | "the authoritative source for conformance **testing and certification-governance review**" | none | ✅ PASS_WITH_FIX |
| `spec/overview.md` | Yes (GitHub) | Verify-only. Already prudent (v1.0, pre-production, boundary note "does not operate wallets, move funds, settle funds…", future-qualified CA/federation, implementation-declared latency) | No change required | none | ✅ PASS |

## Accepted remaining occurrences (classified, not fixes)

| Occurrence | File(s) | Classification |
|---|---|---|
| "this repository does not contain a reference operator" | EN L119, PT/web L295 | OK_NEGATED |
| "There is no reference operator in this repository." | conformance/README L74 | OK_NEGATED |
| "BanzAI must not claim … that BanzAI certifies alone" | EN L898 | OK_NEGATED |
| "ADR-004 — Reference operator" / "ADR-004 \| Papel do operador de referência" | EN L1456, PT/web L1931 | OK_HISTORICAL_ADR_WITH_BOUNDARY_NOTE (ADR title reference) |
| `reference-operator.yaml` (contracts/openapi filename) | EN L1016 | CANONICAL_FILENAME_ACCEPTED (real file; renaming a contract is out of scope) |
| "aprovações discricionárias" (technically-scoped + legal caveats) | PT/web L17, L903, L2823 | OK_FUTURE_GOVERNANCE (7P/7Q prudence; each bounded by "ao nível técnico" + "não substitui obrigações legais/regulatórias/governação") |
| "the BANZA CA issues …" (future/M2-M3/"when production certification opens") | EN L562, L1363, L1393, L1401 | OK_FUTURE_GOVERNANCE |
| Forbidden-old-paths list (`docs/adr`, `docs/rfc`, `docs/protocol`, …) | docs/governance/REPOSITORY_STRUCTURE.md L47-50 | OK_NEGATED (purity-check documentation of what must NOT reappear) |

## Notes

- **Agent workflow was a cross-check only, not the source of truth.** A parallel read-only mapping
  workflow ran one agent per document; it confirmed the table headers and a few federation phrases
  but **missed** the core reference-operator-as-entity residues and several operational-federation
  claims (EN L119/L133/L552/L684/L952/L1256-1258/L1399/L1451; PT L295/L347/L1472/L1601/L1953/L2793).
  Direct reading was the authoritative map, per the phase rule (don't trust prior reports).
- **The claims sweep tooling was itself validated.** An initial cross-doc sweep silently returned
  zero because the shell is `zsh` (no word-splitting of unquoted `$DOCS`) and `grep` is `ugrep`; the
  sweep was re-run with a proper zsh array and known-present strings to prove it works before
  trusting "0 hits" — consistent with "checks passaram" not counting as review.
- **Pre-existing out-of-scope broken links (7, not touched by 7S):** the 5 changed docs have 0
  broken relative links. Seven pre-existing broken links (relative-depth bugs from the 7E/7H
  restructure) remain in `spec/invariants.md`, `spec/README.md`, `spec/federation/FEDERATION_TRUST_MODEL.md`,
  `docs/governance/README.md`, `docs/reference/getting-started.md`. They are outside the 7S file set
  and are flagged for a separate `fix(docs)` PR.
