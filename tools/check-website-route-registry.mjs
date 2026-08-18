// The registry cannot validate its own completeness.
//
// A guard that iterates the registry and checks each entry exists proves only that the registry agrees with
// itself. The failure it must catch is the opposite direction: a page that EXISTS and that nobody declared.
// So discovery here reads the filesystem, and the registry is compared against what discovery found — two
// independent sources, which is the only arrangement in which "undeclared page" is detectable at all.
//
// Modes, because a development branch and a finished milestone need different gates:
//
//   (default)        INTEGRITY     — the registry describes reality. Must be green while EN is being written.
//   --final-parity   PARITY        — integrity PLUS every owed English page exists. Expected RED today.
//   --report         REPORT        — prints the matrix. Exit code still reflects INTEGRITY.
//
// `--report` deliberately does not exit 0 regardless of findings. This project has already shipped one
// evaluator whose default mode printed real problems and then exited 0 for months, and the numbers it
// printed were true while the gate it appeared to be was not.

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "website", "app");

// What discovery MUST find. If the walker breaks, or is pointed at the wrong subtree, or silently returns a
// fragment of the site, these numbers stop matching and the guard fails before it can report consistency.
// Zero routes and zero errors is the shape of a guard that inspected nothing.
const EXPECTED_PT = 31;
// EN grows as Phase 2 lands translations, so a fixed count would have to be edited on every batch and
// would eventually be edited to whatever discovery happened to return — self-validation by attrition.
// A floor is independent of the registry and still kills the failures that matter: zero discovery, a
// walker pointed at the wrong subtree, or the EN tree vanishing. The registry is compared separately.
const MIN_EN = 1;

function pageFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...pageFiles(p));
    else if (e === "page.tsx") out.push(p);
  }
  return out;
}

/** Filesystem path → public pathname. Route groups `(pt)` are organisational and contribute no segment. */
function toPathname(file, base) {
  const rel = file.slice(base.length).replace(/\/page\.tsx$/, "");
  const segs = rel.split("/").filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
  return "/" + segs.join("/");
}

function discover() {
  const ptBase = join(APP, "(pt)");
  const enBase = join(APP, "en");
  const pt = pageFiles(ptBase).map((f) => toPathname(f, ptBase)).sort();
  // The EN subtree's own pathnames already include `/en` because the directory is a real segment.
  const en = pageFiles(enBase)
    .map((f) => "/en" + toPathname(f, enBase).replace(/^\/$/, ""))
    .sort();
  return { pt, en };
}

/** Read the registry out of the TypeScript source, so the guard needs no build step to run. */
function loadRegistry() {
  const src = readFileSync(join(ROOT, "website", "lib", "routeRegistry.ts"), "utf8");
  const body = src.slice(src.indexOf("export const ROUTES"), src.indexOf("/** Policies that OWE"));
  const records = [];
  for (const m of body.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\},\n/g)) {
    const blk = m[0];
    const f = (k) => (blk.match(new RegExp(`${k}:\\s*"([^"]*)"`)) || [])[1];
    records.push({ id: m[1], pt: f("pt"), en: f("en"), kind: f("kind"), policy: f("policy"), aliasTarget: f("aliasTarget") });
  }
  return records;
}

const OWES_EN = new Set(["BILINGUAL", "DYNAMIC_BILINGUAL", "GENERATED_BILINGUAL"]);

function main() {
  const mode = process.argv.includes("--final-parity") ? "parity" : process.argv.includes("--report") ? "report" : "integrity";
  const { pt, en } = discover();
  const reg = loadRegistry();
  const problems = [];

  // ── Non-vacuity, before anything else can claim consistency ────────────────────────────────────
  if (pt.length !== EXPECTED_PT) problems.push(`VACUOUS_DISCOVERY: found ${pt.length} PT routes, expected ${EXPECTED_PT}`);
  if (en.length < MIN_EN) problems.push(`VACUOUS_DISCOVERY: found ${en.length} EN routes, expected at least ${MIN_EN}`);

  const byPt = new Map(reg.map((r) => [r.pt, r]));
  const byEn = new Map(reg.filter((r) => r.en).map((r) => [r.en, r]));

  // ── Discovery → registry: the direction that catches an undeclared page ────────────────────────
  for (const p of pt) if (!byPt.has(p)) problems.push(`UNREGISTERED_PUBLIC_ROUTE: ${p}`);
  for (const p of en) if (!byEn.has(p)) problems.push(`UNREGISTERED_EN_ROUTE: ${p}`);

  // ── Registry → discovery: a declared implementation that is not there ──────────────────────────
  const ptSet = new Set(pt);
  const enSet = new Set(en);
  const ids = new Set();
  const paths = new Set();
  for (const r of reg) {
    if (!ptSet.has(r.pt)) problems.push(`REGISTERED_PT_ROUTE_MISSING: ${r.id} → ${r.pt}`);
    if (r.en && !enSet.has(r.en)) problems.push(`EN_DECLARED_IMPLEMENTED_BUT_ABSENT: ${r.id} → ${r.en}`);
    if (ids.has(r.id)) problems.push(`DUPLICATE_SEMANTIC_ID: ${r.id}`);
    ids.add(r.id);
    if (paths.has(r.pt)) problems.push(`DUPLICATE_PATHNAME: ${r.pt}`);
    paths.add(r.pt);
    if (r.kind === "LEGACY_ALIAS") {
      if (!r.aliasTarget) problems.push(`ALIAS_WITHOUT_TARGET: ${r.id}`);
      // A Reference chapter target is generated, so its existence is proven by the chapter pattern, not by
      // a page file. Anything else must resolve to a real discovered route.
      else if (!r.aliasTarget.startsWith("/referencia/") && !ptSet.has(r.aliasTarget))
        problems.push(`ALIAS_TARGET_MISSING: ${r.id} → ${r.aliasTarget}`);
    }
    if (r.kind === "DOCUMENT_LOCALE_SURFACE" && r.en)
      problems.push(`DOCUMENT_LOCALE_SURFACE_MUST_NOT_HAVE_SITE_COUNTERPART: ${r.id}`);
  }

  const owed = reg.filter((r) => OWES_EN.has(r.policy));
  const missing = owed.filter((r) => !r.en);

  const summary = {
    discovered_pt: pt.length,
    discovered_en: en.length,
    registered_semantic: reg.length,
    aliases: reg.filter((r) => r.kind === "LEGACY_ALIAS").length,
    dynamic_patterns: reg.filter((r) => r.kind === "DYNAMIC_PAGE").length,
    generated_patterns: reg.filter((r) => r.kind === "GENERATED_PAGE").length,
    special_document_locale: reg.filter((r) => r.kind === "DOCUMENT_LOCALE_SURFACE").length,
    declared_bilingual: owed.length,
    implemented_en: owed.length - missing.length,
    missing_en: missing.length,
    intentional_pt_only: reg.filter((r) => r.policy === "INTENTIONAL_PT_ONLY").length,
  };

  console.log("== website-route-registry ==");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(26)} ${v}`);
  if (mode === "report") {
    console.log("\n  id                              pt                                    en          kind");
    for (const r of [...reg].sort((a, b) => a.id.localeCompare(b.id)))
      console.log(`  ${r.id.padEnd(31)} ${r.pt.padEnd(37)} ${(r.en || "—").padEnd(11)} ${r.kind}`);
  }
  if (missing.length) console.log(`\n  missing EN (${missing.length}): ${missing.map((r) => r.id).sort().join(", ")}`);

  if (problems.length) {
    console.log(`\n  ${problems.length} problem(s):`);
    for (const p of problems) console.log(`    ${p}`);
    console.log("website-route-registry: FAILED");
    process.exit(1);
  }
  if (mode === "parity" && missing.length) {
    console.log(`\n  FINAL PARITY: ${missing.length} declared bilingual route(s) have no EN implementation`);
    console.log("website-route-registry: FAILED (final parity)");
    process.exit(1);
  }
  console.log(`website-route-registry: OK (${mode})`);
}

main();
