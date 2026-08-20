import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { navFor, footerColumnsFor } from "./site";

// `lib/chromeResolved.json` is the resolved site chrome — every header and footer destination, in both
// editions — published as data so guards can read the pathname a reader actually gets instead of grepping
// `lib/site.ts` for a literal href the locale-aware chrome no longer writes.
//
// A derived file is only worth reading while it is current, and a stale one is worse than none: it reads
// as evidence. So the emitter is re-run here in --check mode and the committed file must match it byte for
// byte. Editing the JSON by hand, or changing the chrome without re-running the emitter, fails here.

const root = join(__dirname, "..");
const resolved = JSON.parse(readFileSync(join(root, "lib", "chromeResolved.json"), "utf8"));

describe("resolved site chrome — derived, current, and complete", () => {
  it("matches what the emitter produces from the live chrome", () => {
    // Throws (non-zero exit) when the committed artifact has drifted from lib/site.ts.
    const out = execFileSync("node", ["scripts/emit-chrome-resolved.mjs", "--check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(out).toContain("up to date");
  });

  it("publishes both editions of every destination", () => {
    for (const locale of ["pt", "en"] as const) {
      const edition = resolved.editions[locale];
      expect(edition.nav.map((i: { href: string }) => i.href)).toEqual(navFor(locale).map((i) => i.href));
      expect(edition.footer.map((c: { title: string }) => c.title)).toEqual(
        footerColumnsFor(locale).map((c) => c.title),
      );
      const items = edition.footer.flatMap((c: { items: { href: string }[] }) => c.items);
      expect(items.map((i: { href: string }) => i.href)).toEqual(
        footerColumnsFor(locale).flatMap((c) => c.items.map((i) => i.href)),
      );
    }
  });

  it("carries no link that fell back to the other edition's pathname", () => {
    // `foreign` marks a destination with no route in this edition, which would otherwise be published as
    // a working link to the wrong language. It must never appear in the artifact guards read.
    const all = Object.values(resolved.editions).flatMap((e) => {
      const edition = e as { nav: unknown[]; footer: { items: unknown[] }[] };
      return [...edition.nav, ...edition.footer.flatMap((c) => c.items)];
    }) as { key: string; href: string; foreign?: boolean }[];
    expect(all.filter((i) => i.foreign).map((i) => `${i.key} → ${i.href}`)).toEqual([]);
  });
});
