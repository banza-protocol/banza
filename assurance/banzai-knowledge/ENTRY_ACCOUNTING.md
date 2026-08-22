# Knowledge-entry accounting

Counts moved twice during this programme. Every movement is accounted for here, because a corpus that
grows without a reason recorded is a corpus nobody can audit.

## 178 → 207 — the declared DOMAIN universe

29 entries, all `domain: true`, all bilingual, each citing a declared external authority.

They exist because the domain layer was reported as closed and was not: of the 50 concepts the mandate
declares, 21 resolved in Portuguese and 23 in English. `hash`, `digital signature`, `nonce`, `state
machine`, `retry`, `timeout`, `serialization` and twenty-two others reached nothing at all.

## 207 → 215 — comparison targets that had no way to be named

Eight entries, added while closing the comparison matrix. Each was a **side of a declared comparison
pair that could not resolve**, so the pair could never be planned.

| semantic id | class | why added | authority | PT | EN | route eligibility |
|---|---|---|---|---|---|---|
| `def-dom-database` | DOMAIN | `ledger vs database` had no right side | NIST-CSRC | ✓ | ✓ | general |
| `def-dom-authorization` | DOMAIN | `authentication vs authorization` had no right side | NIST-CSRC | ✓ | ✓ | general |
| `def-dom-validation` | DOMAIN | `validation vs verification` had neither side | JSON Schema | ✓ | ✓ | general |
| `def-dom-verification` | DOMAIN | `validation vs verification` had neither side | NIST-CSRC | ✓ | ✓ | general |
| `def-dom-accreditation` | DOMAIN | `certification vs accreditation` had no right side | BIS-PFMI | ✓ | ✓ | general |
| `def-protocol` | BANZA_CANONICAL | `protocol vs operational scheme` had no left side | SPEC-OVERVIEW, ADR-002 | ✓ | ✓ | general |
| `def-reference` | BANZA_CANONICAL | `Reference vs normative specification` had no left side | SPEC-OVERVIEW | ✓ | ✓ | general |
| `def-admission` | BANZA_NORMATIVE | `certification vs admission` had no right side | ADR-005, ADR-006 | ✓ | ✓ | general |

All eight are **reader-facing** and reachable as ordinary single-subject questions — none is
comparison-only. Each states its own boundary rather than only its definition: `def-admission` states
that certification confers no admission and admission confers no authorisation; `def-protocol` states
that a protocol confers no status; `def-dom-accreditation` states that BANZA neither accredits nor is
accredited.

## Comparison-target ALIASES are not entries

Nine further terms became reachable as comparison sides without adding any entry, by pointing the bare
noun at the entry that already held the authority — `implementação`, `esquema operacional`,
`certificação`, `admissão`, `referência`, `autorização regulatória`, `motores`, `estado de protocolo`,
`protocolo`.

Those aliases are scoped to comparison sides ONLY. They were first added to the shared critical-subject
table and changed single-subject routing everywhere: "Isso dá admissão automática?" stopped declining
an anaphor with no referent and answered a definition instead. Scoping them is what keeps the corpus
growth free of side effects.

## Totals

| | count |
|---|---|
| original BANZA entries | 178 |
| DOMAIN entries added | 29 |
| comparison-target entries added | 8 |
| **total** | **215** |
| bilingual (PT and EN) | **215 / 215** |
