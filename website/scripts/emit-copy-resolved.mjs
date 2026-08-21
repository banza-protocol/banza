// Emits the reader-facing BanzAI copy — every catalogue id, realized in both editions — as data.
//
// Why this file exists. The BanzAI surfaces used to hold their strings as Portuguese literals inside the
// modules and components that render them, so a guard could assert a sentence by grepping the component.
// Block E2 moved that copy into bilingual catalogues: a component now names an id and the string is
// realized per edition. Guards that kept grepping for the sentence were looking at a file that no longer
// contains it — they reported on copy while testing nothing.
//
// So the catalogues are evaluated once, here, and published as the surface guards read. Nothing
// re-implements the realization, because a second copy of it would drift and fail silently.
//
// The output is derived, never hand-edited. `lib/copyResolved.test.ts` recomputes it and fails if the
// committed file has drifted, so a stale artifact cannot pass as current.
//
// Usage: node scripts/emit-copy-resolved.mjs [--check]

import { build } from "esbuild";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outFile = join(root, "lib", "copyResolved.json");

// Each catalogue: the module that owns it, and the accessor pair that lists and realizes its ids.
const CATALOGUES = [
  { name: "agent", entry: "components/banzai/agentPresentation.ts", table: "AGENT_COPY" },
  { name: "validation", entry: "components/banzai/validationPresentation.ts", table: "VALIDATION_SURFACE_COPY" },
  { name: "onboarding", entry: "components/banzai/onboardingPresentation.ts", table: "ONBOARDING_SURFACE_COPY" },
  { name: "progress", entry: "components/banzai/progressPresentation.ts", table: "PROGRESS_COPY" },
  { name: "suggestions", entry: "components/banzai/suggestions.ts", table: "SUGGESTION_COPY" },
  { name: "decisions", entry: "components/decisoes/decisionsPresentation.ts", table: "DECISIONS_COPY" },
  { name: "askStatus", entry: "components/home/askStatusPresentation.ts", table: "ASK_STATUS_COPY" },
];

const catalogues = {};

// The glossary is a table of RECORDS rather than a flat id→text map, so it is flattened into the same
// shape: one entry per field a reader sees. Guards then ask the glossary the same way they ask every other
// catalogue, instead of each one re-parsing the term array.
const GLOSSARY = { name: "glossary", entry: "lib/glossaryTerms.ts", table: "GLOSSARY_TERMS" };
for (const c of CATALOGUES) {
  const bundle = join(root, "node_modules", ".cache", `copy-${c.name}.mjs`);
  await build({
    entryPoints: [join(root, c.entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    logLevel: "silent",
  });
  const mod = await import(`${bundle}?t=${process.hrtime.bigint()}`);
  rmSync(bundle, { force: true });

  // The catalogue table is read directly rather than through the accessor, because some ids are
  // templates that refuse to realize without their parameters. Publishing the template is also the more
  // useful surface for a guard: it is the sentence the catalogue actually owns, placeholders included.
  const table = mod[c.table];
  if (!table) throw new Error(`copy-resolved: ${c.entry} does not export ${c.table}`);
  const entries = {};
  for (const [id, value] of Object.entries(table)) {
    entries[id] = { pt: value.pt, en: value.en };
  }
  catalogues[c.name] = { module: c.entry, table: c.table, entries };
}

{
  const bundle = join(root, "node_modules", ".cache", "copy-glossary.mjs");
  await build({
    entryPoints: [join(root, GLOSSARY.entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    logLevel: "silent",
  });
  const mod = await import(`${bundle}?t=${process.hrtime.bigint()}`);
  rmSync(bundle, { force: true });
  const entries = {};
  for (const term of mod[GLOSSARY.table]) {
    for (const field of ["name", "short", "long", "hrefLabel", "notToConfuse"]) {
      const v = term[field];
      if (v && typeof v === "object" && typeof v.pt === "string") {
        entries[`${term.key}.${field}`] = { pt: v.pt, en: v.en };
      }
    }
  }
  catalogues[GLOSSARY.name] = { module: GLOSSARY.entry, table: GLOSSARY.table, entries };
}

const text = `${JSON.stringify(
  { note: "Derived by scripts/emit-copy-resolved.mjs. Never hand-edit; run the script.", catalogues },
  null,
  2,
)}\n`;

if (process.argv.includes("--check")) {
  if (readFileSync(outFile, "utf8") !== text) {
    process.stderr.write("copy-resolved: lib/copyResolved.json is stale — run the emitter.\n");
    process.exit(1);
  }
  process.stdout.write("copy-resolved: up to date\n");
} else {
  writeFileSync(outFile, text);
  process.stdout.write(`copy-resolved: wrote ${outFile}\n`);
}
