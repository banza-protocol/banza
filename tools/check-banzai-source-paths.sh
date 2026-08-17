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
#   RESOLVE   Every path in the registry exists (globs must match at least one file).
#   SHAPE     A path is a path. No parenthetical label, no trailing prose, no whitespace — those are how
#             a display string ends up in the field a link is built from.
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

for (const [key, src] of Object.entries(SOURCES)) {
  const p = src && src.path;
  if (typeof p !== "string" || !p) {
    problems.push(`${key}: no path`);
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
