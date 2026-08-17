#!/usr/bin/env bash
# The vendored query WASM is the artifact built from the current Rust source and the current index.
#
# The service loads `services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm` synchronously. Rust tests run
# against the source; production runs against that binary. If they disagree, every test can be green
# while the deployed router behaves like an older revision — and this is not hypothetical: during this
# work the entries index was regenerated and the router still selected the old entry until the WASM was
# rebuilt. Twice.
#
# The property is BEHAVIOURAL, not byte equality. `wasm-pack` does not emit a byte-reproducible `.wasm`
# for the same source — measured here: the JS wrappers matched a fresh build exactly while the binary
# differed. A byte comparison would therefore be a guard that is permanently red and gets disabled, which
# is worse than no guard.
#
# So: rebuild from source into a temporary directory, then run BOTH routers over a fixed corpus of
# questions and require identical decisions. That is the property that matters — production must route
# like the source the tests exercise — and it is stable under a non-reproducible compiler.
#
# Observational (PR C): it never installs the rebuilt artifact.
set -uo pipefail
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== banzai-wasm-source-bound =="

CRATE="engines/banzai-api-kb"
VENDORED="services/banzai-api/src/rustkb"

command -v wasm-pack >/dev/null 2>&1 || {
  echo "  SKIP: wasm-pack is not installed, so source-binding cannot be verified here."
  echo "        This check is advisory locally and authoritative where wasm-pack exists."
  echo "banzai-wasm-source-bound: SKIPPED"
  exit 0
}

for f in banzai_api_kb.js banzai_api_kb.d.ts banzai_api_kb_bg.wasm; do
  [ -f "$VENDORED/$f" ] || { echo "  FAIL: $VENDORED/$f is missing"; echo "banzai-wasm-source-bound: FAILED"; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

( cd "$CRATE" && wasm-pack build --target nodejs --out-dir "$tmp/pkg" ) >"$tmp/build.log" 2>&1 || {
  echo "  FAIL: rebuilding the WASM from source failed"
  tail -12 "$tmp/build.log" | sed 's/^/        /'
  echo "banzai-wasm-source-bound: FAILED"
  exit 1
}

# The generated JS wrapper IS reproducible, and it declares the export surface. A wrapper mismatch means
# the API changed without the vendored copy following.
for f in banzai_api_kb.js banzai_api_kb.d.ts; do
  cmp -s "$tmp/pkg/$f" "$VENDORED/$f" || {
    echo "  FAIL: $f differs from a fresh build — the export surface changed and the vendored copy did not"
    echo "banzai-wasm-source-bound: FAILED"; exit 1; }
done
echo "  ok: the generated wrappers match a fresh build (export surface is current)"

# Behaviour: both routers, same questions, same decisions. The corpus is every keyword of every entry in
# the lexical index plus the authority phrasings this check exists to protect — the routing decisions a
# stale binary would silently get wrong.
VENDORED="$VENDORED" FRESH="$tmp/pkg" node --input-type=module -e '
// Absolute file URLs: a bare relative specifier is resolved as a package name by Node.
const { pathToFileURL } = await import("node:url");
const { readFileSync } = await import("node:fs");
const { resolve } = await import("node:path");
const load = (dir) => import(pathToFileURL(resolve(dir, "banzai_api_kb.js")).href);
const vendored = await load(process.env.VENDORED);
const fresh = await load(process.env.FRESH);

const index = JSON.parse(readFileSync("engines/banzai-query-core/src/entries-index.json", "utf8"));
const qs = [
  "quem controla os operadores ?", "Who controls operators?", "quem admite um operador?",
  "quem autoriza um operador?", "quem governa os operadores?", "quem controla a Root?",
  "O que faz o BanzAI quando um operador autoriza um pagamento?",
  ...index.flatMap((e) => e.keywords),
];

const decide = (m, q) => {
  const r = JSON.parse(m.route_question_json(q));
  return `${r.action}|${r.entry_id}|${r.intent}`;
};

const diffs = [];
for (const q of qs) {
  const a = decide(vendored, q), b = decide(fresh, q);
  if (a !== b) diffs.push([q, a, b]);
}
if (diffs.length) {
  console.log(`  FAIL: the shipped router decides differently from a fresh build on ${diffs.length} of ${qs.length} questions`);
  for (const [q, a, b] of diffs.slice(0, 6)) {
    console.log(`        ${JSON.stringify(q.slice(0, 52))}`);
    console.log(`          vendored ${a}`);
    console.log(`          rebuilt  ${b}`);
  }
  console.log();
  console.log("  Production is running an older router than the tests. Rebuild and install it:");
  console.log("      cd engines/banzai-api-kb && wasm-pack build --target nodejs --out-dir /tmp/pkg");
  console.log("      cp /tmp/pkg/banzai_api_kb* services/banzai-api/src/rustkb/");
  process.exit(1);
}
console.log(`  ok: identical routing decisions on ${qs.length} questions — the shipped router is the source`);
' || { echo "banzai-wasm-source-bound: FAILED"; exit 1; }
echo "banzai-wasm-source-bound: OK"
