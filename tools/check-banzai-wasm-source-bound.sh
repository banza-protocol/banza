#!/usr/bin/env bash
# The vendored query WASM is the artifact built from the current Rust source and the current index.
#
# The service loads `services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm` synchronously. Rust tests run
# against the source; production runs against that binary. If they disagree, every test can be green
# while the deployed router behaves like an older revision — and this is not hypothetical: during this
# work the entries index was regenerated and the router still selected the old entry until the WASM was
# rebuilt. Twice.
#
# Byte equality cannot be the property: `wasm-pack` does not emit a reproducible `.wasm` for the same
# source — measured here, the generated JS wrappers matched a fresh build exactly while the binary
# differed. A byte comparison would be permanently red and would get disabled.
#
# So the binary carries its own origin. `engine_source_fingerprint_json` is computed inside the engine over
# what the artifact EMBEDS (`include_str!` of route.rs and the entries index), and this check recomputes
# the same hash from the files on disk:
#
#   IDENTITY   embedded fingerprint == fingerprint of the current source, across every input the engine
#              declares as semantically relevant. Exact, and it holds for every question rather than the
#              ones a sample happens to cover: a behavioural sample can only say "these N observations
#              agree", while a stale binary could still diverge on question N+1. The first version of this
#              covered route.rs and the index alone, and a change to fuzzy.rs then altered how queries
#              resolve while the guard still called the artifact fresh.
#   BEHAVIOUR  both routers decide identically over a corpus. Kept as a second, independent signal: it
#              catches a toolchain or dependency change that identity alone would not explain.
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

# IDENTITY — the shipped binary reports the source state it was built from.
VENDORED="$VENDORED" node --input-type=module -e '
const { pathToFileURL } = await import("node:url");
const { readFileSync } = await import("node:fs");
const { resolve } = await import("node:path");
const kb = await import(pathToFileURL(resolve(process.env.VENDORED, "banzai_api_kb.js")).href);

if (typeof kb.engine_source_fingerprint_json !== "function") {
  console.log("  FAIL: the vendored WASM predates the source fingerprint — it cannot state its origin.");
  console.log("        Rebuild it: cd engines/banzai-api-kb && wasm-pack build --target nodejs --out-dir /tmp/pkg");
  process.exit(1);
}

// The same FNV-1a the engine uses, six lines, so the two cannot drift apart in definition.
const fnv1a64 = (buf) => {
  let h = 0xcbf29ce484222325n;
  for (const b of buf) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xFFFFFFFFFFFFFFFFn; }
  return h.toString(16).padStart(16, "0");
};

// The input NAMES travel with the hashes, so this needs no second copy of the list: an input added to
// the engine manifest extends this check automatically.
const embedded = JSON.parse(kb.engine_source_fingerprint_json());
if (!Array.isArray(embedded.inputs) || embedded.inputs.length === 0) {
  console.log("  FAIL: the vendored WASM reports no semantic source inputs — it cannot state its origin.");
  process.exit(1);
}

const SRC = "engines/banzai-query-core/src";
const diffs = [];
for (const { name, hash } of embedded.inputs) {
  let onDisk;
  try {
    onDisk = fnv1a64(readFileSync(`${SRC}/${name}`));
  } catch {
    diffs.push([name, hash, "missing on disk"]);
    continue;
  }
  if (onDisk !== hash) diffs.push([name, hash, onDisk]);
}
const indexCount = JSON.parse(readFileSync(`${SRC}/entries-index.json`, "utf8")).length;
if (indexCount !== embedded.entries_count) {
  diffs.push(["entries_count", String(embedded.entries_count), String(indexCount)]);
}

if (diffs.length) {
  console.log("  FAIL: the shipped engine was built from a different source state than the one on disk.");
  for (const [name, was, now] of diffs) console.log(`        ${name}: embedded ${was}, on disk ${now}`);
  console.log();
  console.log("  Production would resolve queries differently from the source the tests exercise.");
  console.log("  Rebuild and install it:");
  console.log("      cd engines/banzai-api-kb && wasm-pack build --target nodejs --out-dir /tmp/pkg");
  console.log("      cp /tmp/pkg/banzai_api_kb* services/banzai-api/src/rustkb/");
  process.exit(1);
}
console.log(`  ok: all ${embedded.inputs.length} semantic source inputs match the files on disk`
  + ` (combined ${embedded.combined}, ${embedded.entries_count} indexed entries)`);
' || { echo "banzai-wasm-source-bound: FAILED"; exit 1; }

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
