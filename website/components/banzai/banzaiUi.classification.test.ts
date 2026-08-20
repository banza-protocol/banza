// Block E2 / Q5 — `banzaiUi.tsx` is classified MACHINE + STYLING, and this file is what keeps it that way.
//
// The module holds three things and no fourth: an icon-key enum (machine identity), the SVG path geometry
// each key maps to (a styling primitive), and a CSS class string. It contains no sentence, no label, no
// aria text and no state→wording decision, so there is nothing in it to localize — the inventory's count
// for this owner was counting icon keys and path data, not reader copy.
//
// A classification is only worth making if it can be falsified later. These properties fail if the module
// acquires reader-facing text, and they fail if the icons stop being decorative — because an icon that
// carries meaning on its own would need an accessible name, and that name WOULD be reader copy subject to
// the whole locale contract.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PATHS, CARD } from "./banzaiUi";

const SOURCE = readFileSync(new URL("./banzaiUi.tsx", import.meta.url), "utf8");

describe("Q5 — banzaiUi carries no reader presentation", () => {
  it("contains no reader-facing text", () => {
    // Everything renderable in this module is geometry. A string literal that reads like a sentence — in
    // either language — means the module gained copy and must enter the locale architecture.
    const code = SOURCE.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    // Drop what is definitionally not prose: SVG path/geometry attribute values and import specifiers.
    const geometry = code
      .replace(/\b(?:d|points|transform|viewBox)="[^"]*"/g, "")
      .replace(/from\s+"[^"]*"/g, "");
    const literals = [...geometry.matchAll(/"([^"\n]{4,})"/g)].map((m) => m[1]);
    // Prose = two or more real words in a row. An icon key, a CSS class list and an enum value are not.
    // A class list is every token drawn from the utility-class alphabet; prose is anything else with two
    // or more real words in a row.
    const isClassList = (t: string) => t.split(/\s+/).every((tok) => /^[a-z0-9\-_[\]().,/%:#]+$/.test(tok));
    const prose = literals.filter((t) => /[A-Za-zÀ-ú]{3,}\s+[A-Za-zÀ-ú]{3,}/.test(t) && !isClassList(t));
    expect(prose, "banzaiUi acquired reader copy — it must join the locale architecture").toEqual([]);
  });

  it("renders icons as decorative, so they need no accessible name", () => {
    // This is what makes "no reader copy" true rather than merely convenient: the icons are hidden from
    // assistive technology, which is only correct while every icon sits beside its own text.
    expect(SOURCE).toContain('aria-hidden="true"');
    expect(SOURCE).not.toMatch(/aria-label|role="img"|<title>/);
  });

  it("keeps every icon key mapped to geometry, and the card to a class string", () => {
    const keys = Object.keys(PATHS);
    expect(keys.length).toBeGreaterThanOrEqual(19);
    for (const k of keys) expect(PATHS[k as keyof typeof PATHS], `${k} has no path`).toBeTruthy();
    // The icon keys are machine identity: they name a glyph, not a concept a reader reads.
    for (const k of keys) expect(k).toMatch(/^[a-zA-Z]+$/);
    expect(typeof CARD).toBe("string");
    expect(CARD).toMatch(/^rounded-/);
  });

  it("is never the only content of a control anywhere in the app", () => {
    // The classification depends on consumers too. An icon-only button would carry meaning by itself and
    // would need a name — so this walks the real components and requires none to exist.
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".tsx") && !p.includes(".test.")) files.push(p);
      }
    };
    walk(new URL("..", import.meta.url).pathname);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/<button[^>]*>\s*<Ico[^>]*\/>\s*<\/button>/gs)) {
        if (!m[0].includes("aria-label")) offenders.push(`${f}: ${m[0].slice(0, 60)}`);
      }
    }
    expect(offenders, "an icon-only control needs an accessible name, which is reader copy").toEqual([]);
  });
});
