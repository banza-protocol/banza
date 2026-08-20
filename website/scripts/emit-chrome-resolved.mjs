// Emits the resolved site chrome — every header and footer destination, per edition — as data.
//
// Why this file exists. The chrome used to carry literal hrefs, so a guard could read a pathname
// straight out of `lib/site.ts`. It no longer does: an entry declares a semantic route target and the
// pathname is derived per edition. Guards that kept grepping for the literal were reading a form that
// no longer exists — they reported on reachability while testing nothing. Rather than teach each guard
// to re-implement the derivation (which would let the copy drift from the real one and fail silently),
// the derivation is run once, here, and published as the surface guards read.
//
// The output is derived, never hand-edited. `lib/chromeResolved.test.ts` recomputes it and fails if the
// committed file has drifted, so a stale artifact cannot pass as current.
//
// Usage: node scripts/emit-chrome-resolved.mjs [--check]

import { build } from "esbuild";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outFile = join(root, "lib", "chromeResolved.json");
const bundle = join(root, "node_modules", ".cache", "chrome-resolved.mjs");

await build({
  entryPoints: [join(root, "lib", "site.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundle,
  logLevel: "silent",
});

const site = await import(`${bundle}?t=${process.hrtime.bigint()}`);
rmSync(bundle, { force: true });

const item = (i) => ({
  key: i.key,
  label: i.label,
  href: i.href,
  ...(i.external ? { external: true } : {}),
  ...(i.foreign ? { foreign: true } : {}),
});

const resolved = {
  note: "Derived from lib/site.ts by scripts/emit-chrome-resolved.mjs. Never hand-edit; run the script.",
  editions: Object.fromEntries(
    ["pt", "en"].map((locale) => [
      locale,
      {
        nav: site.navFor(locale).map(item),
        footer: site.footerColumnsFor(locale).map((c) => ({ title: c.title, items: c.items.map(item) })),
      },
    ]),
  ),
};

const text = `${JSON.stringify(resolved, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(outFile, "utf8");
  if (current !== text) {
    process.stderr.write("chrome-resolved: lib/chromeResolved.json is stale — run the emitter.\n");
    process.exit(1);
  }
  process.stdout.write("chrome-resolved: up to date\n");
} else {
  writeFileSync(outFile, text);
  process.stdout.write(`chrome-resolved: wrote ${outFile}\n`);
}
