#!/usr/bin/env bash
# Every source a BanzAI answer can cite points at a file that exists.
#
# Nine entries in the source registry pointed at files that were not there: six ADR filenames that had
# changed, a removed docs directory, and two where a parenthetical label had been written inside the
# `path` field. Each one produced a source card linking nowhere — a citation that cannot be checked,
# which is worse than no citation, because it looks like evidence.
#
# Two properties:
#
#   RESOLVE   Every source RESOLVES somewhere checkable. For a repository source that is a path that
#             exists (globs must match at least one file). For an EXTERNAL authority — NIST, IETF, BIS —
#             there is no file in this repository to point at, and inventing one would be a citation
#             that links to the wrong thing. It resolves to an absolute https URL instead, and must
#             name the publisher that stands behind it.
#   SHAPE     A path is a path. No parenthetical label, no trailing prose, no whitespace — those are how
#             a display string ends up in the field a link is built from. A URL is likewise a URL.
#
# A source that resolves to NEITHER still fails. The domain layer added ten external authorities with a
# `url` and no `path`, and this guard — written when every source was a repository file — had been
# failing on all ten since they landed.
#
# Nothing here is excluded by filename magic: if an entry is unreachable it fails, and the fix is to
# correct the path or remove the entry.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== banzai-source-paths =="

node --input-type=module -e '
import { glob } from "node:fs/promises";
import { existsSync } from "node:fs";

const { SOURCES } = await import("./services/banzai-api/src/knowledge.js");
const problems = [];

// A path is a repository path. Parentheses are legitimate — `website/app/(pt)/oz/` is a Next route
// group. What is never legitimate is WHITESPACE: the two broken entries read
// "tools/check-operator-contamination.sh (make identity-check)", a caption written into the field
// a link is built from, and the space is what gives it away.
const SHAPE = /^\S+$/;

const URL_SHAPE = /^https:\/\/\S+$/;

for (const [key, src] of Object.entries(SOURCES)) {
  const p = src && src.path;
  // An EXTERNAL authority resolves by URL. The bar is not lower: it must be absolute https with no
  // whitespace, and it must name a publisher, so the card says who stands behind the claim.
  if ((typeof p !== "string" || !p) && src && src.class === "domain") {
    const u = src.url;
    if (typeof u !== "string" || !URL_SHAPE.test(u)) {
      problems.push(`${key}: external authority with no absolute https url — ${JSON.stringify(u)}`);
    }
    if (!String(src.publisher || "").trim()) {
      problems.push(`${key}: external authority with no publisher named`);
    }
    continue;
  }
  if (typeof p !== "string" || !p) {
    problems.push(`${key}: no path and not a declared external authority`);
    continue;
  }
  if (!SHAPE.test(p)) {
    problems.push(`${key}: not a path — ${JSON.stringify(p)}. A label belongs in \`title\`, not in the field a link is built from.`);
    continue;
  }
  const bare = p.split("#")[0];
  if (p.includes("*")) {
    let hit = false;
    for await (const _ of glob(bare)) { hit = true; break; }
    if (!hit) problems.push(`${key}: ${p} matches nothing`);
  } else if (!existsSync(bare)) {
    problems.push(`${key}: ${p} does not exist`);
  }
}

// Every source an entry cites must be a registered source, or the card has no path at all.
const { ENTRIES } = await import("./services/banzai-api/src/knowledge.js");
const known = new Set(Object.keys(SOURCES));
for (const e of ENTRIES) {
  for (const s of e.sources || []) {
    const id = s && (s.key || s.id);
    if (id && !known.has(id) && !s.path) problems.push(`${e.id} cites unknown source ${id}`);
  }
}

if (problems.length) {
  console.log();
  for (const p of problems) console.log(`  FAIL: ${p}`);
  console.log();
  console.log("  A citation that links nowhere looks like evidence and cannot be checked. Point it at the");
  console.log("  current file, or drop it.");
  process.exit(1);
}
console.log(`  ok: ${Object.keys(SOURCES).length} registered source paths all resolve, and none carries a label where a path belongs`);
console.log(`  ok: every source cited by an entry is registered`);
'
rc=$?
if [ "$rc" -eq 0 ]; then echo "banzai-source-paths: OK"; else echo "banzai-source-paths: FAILED"; fi
exit "$rc"
