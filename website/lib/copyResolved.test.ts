import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_COPY } from "@/components/banzai/agentPresentation";
import { VALIDATION_SURFACE_COPY } from "@/components/banzai/validationPresentation";

// `lib/copyResolved.json` is the reader-facing BanzAI copy — every catalogue id in both editions —
// published as data so guards can assert a sentence without grepping a component that no longer contains
// it. A stale derived file is worse than none, because it reads as evidence: the emitter is re-run here in
// --check mode and the committed file must match byte for byte.

const root = join(__dirname, "..");
const resolved = JSON.parse(readFileSync(join(root, "lib", "copyResolved.json"), "utf8"));

describe("resolved BanzAI copy — derived, current, and bilingual", () => {
  it("matches what the emitter produces from the live catalogues", () => {
    const out = execFileSync("node", ["scripts/emit-copy-resolved.mjs", "--check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(out).toContain("up to date");
  });

  it("publishes every id of every catalogue it claims to cover", () => {
    expect(Object.keys(resolved.catalogues).sort()).toEqual([
      "agent",
      "decisions",
      "onboarding",
      "progress",
      "suggestions",
      "validation",
    ]);
    expect(Object.keys(resolved.catalogues.agent.entries).sort()).toEqual(Object.keys(AGENT_COPY).sort());
    expect(Object.keys(resolved.catalogues.validation.entries).sort()).toEqual(
      Object.keys(VALIDATION_SURFACE_COPY).sort(),
    );
  });

  it("carries both editions of every entry", () => {
    for (const [name, catalogue] of Object.entries(resolved.catalogues) as [
      string,
      { entries: Record<string, { pt: string; en: string }> },
    ][]) {
      for (const [id, value] of Object.entries(catalogue.entries)) {
        expect(typeof value.pt, `${name}/${id} has no Portuguese`).toBe("string");
        expect(typeof value.en, `${name}/${id} has no English`).toBe("string");
      }
    }
  });
});
