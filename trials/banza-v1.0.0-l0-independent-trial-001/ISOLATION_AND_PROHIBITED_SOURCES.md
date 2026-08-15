# Isolation and prohibited sources

BANZA is not testing whether a team can reinvent cryptography, JSON parsing or HTTP. It is testing
whether the **protocol** is implementable from what is published. The line is drawn accordingly:
everything general is permitted, and everything derived from BANZA's own implementation is not.

---

## Permitted

- The frozen BANZA L0 package
- The public standards it references (RFC 8785 and any other RFC it names)
- Your language's documentation and standard library documentation
- Generic cryptographic libraries
- Generic JSON libraries and parsers
- Package managers and ordinary development tooling
- Operating-system documentation
- Your own notes, tests and scratch code

## Prohibited

- The BANZA engines (`engines/`)
- Operator Zero's source
- The reference implementation, in whole or in part
- Private branches or unpublished BANZA material
- Internal audits, milestone reports or development conversations
- Older copies of the BANZA repository
- Implementation-specific hints from any source
- **BanzAI as a normative source** — it may exist publicly, and it is not the authority here. The
  frozen written package is
- Answers from BANZA authors that are based on the implementation rather than on the package

## Internet policy

The internet is permitted for: RFCs, language documentation, dependency documentation, generic library
documentation.

The internet is **not** to be used to search for: BANZA reference-implementation mirrors, BANZA engine
snippets, historical BANZA source, or cached implementation material from outside the package.

The distinction is the subject, not the medium. Reading RFC 8785 online is expected. Finding somebody's
copy of a BANZA engine and reading how it canonicalizes is not.

## Why this line

An answer taken from the implementation silently repairs the specification. The trial would then measure
how helpful the authors were, which is a question nobody needed answered. The value of this experiment
comes entirely from the possibility that the package is insufficient — and that possibility only exists
if the package is all there is.

## Accidental exposure

If a prohibited source is consulted by accident, record it in the question ledger with what was seen and
when. The technical result remains useful. What is lost is the *independence* claim, and only in
proportion to what was exposed.

Concealing it is the one response that destroys the experiment, because it makes every other result
unverifiable.

## What isolation is not

This is not a security boundary and nobody is being policed. It is a methodological boundary, and it
works only because the team keeps it. That is why exposure is recorded rather than punished.
