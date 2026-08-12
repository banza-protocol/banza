import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// M2.19G.6 (ADR-075) — BanzAI monorepo consolidation and PERMANENT REMOVAL of the separate repository.
// Supersedes the M2.19G.5C "frozen archive" framing: the separate `banza-protocol/banzai` repo is being
// permanently deleted, so active surfaces must (a) name services/banzai-api (+ engines/banzai-*) as the
// canonical, sole active BanzAI source, (b) NOT present the old repo as an archive/frozen/historical/
// legacy source, (c) NOT link to a repository that will be deleted, and (d) never frame the old repo as
// the canonical/authoritative core or the runtime as a "mock façade". Vitest counterpart to
// tools/check-banzai-canonical-architecture-framing.sh.

const repoRoot = join(__dirname, "..", "..");
const raw = (p: string) => readFileSync(join(repoRoot, p), "utf8");

const FILES = [
  "services/banzai-api/README.md",
  "docs/governance/BANZAI_COMPONENT_BOUNDARY_2026_07.md",
  "services/banzai-api/src/knowledge.js",
  "website/content/BANZA_REFERENCIA.md",
  "website/lib/site.ts",
  "CLAUDE.md",
  "README.md",
  "docs/reference/pt/completa.md",
  "docs/reference/en/complete.md",
  "docs/guides/conformance.md",
];

// The runtime must never be framed as a mock/demonstration façade.
const FRAMING = /mock façade|mock facade|mock\/demonstration façade|mock\/demonstration facade|demonstration façade|demonstration facade/i;
// The old repo must never be framed as the canonical/authoritative core or a source of truth.
const NEG = /não|nao|nunca|never|\bnot\b|\bsem\b|não existe|no separate|sole active|apenas|only/i;
const FWD = /banza-protocol\/banzai[^.]{0,70}(canónic|canonic|authoritative|is the core|is the canonical|deterministic core|fonte de verdade|source of truth)/i;
const REV = /(canónic|canonic|authoritative|deterministic core|fonte de verdade|source of truth)[^.]{0,25}banza-protocol\/banzai/i;
// A markdown/plain link to a repository that will be deleted must not appear on active surfaces.
const OLD_REPO_LINK = /banza-protocol\/banzai\)/;
// "archive / frozen / historical / legacy" framing OF THE OLD REPO must be gone from active surfaces.
const ARCHIVE_FRAMING = /banza-protocol\/banzai[^.\n]{0,80}(frozen|archive|arquivo|congelad|historical|hist[óo]rico|legacy|legad)/i;

describe("M2.19G.6 — BanzAI is consolidated; the separate repo is removed, not archived", () => {
  for (const f of FILES) {
    it(`${f} carries no 'mock/demonstration façade' framing`, () => {
      expect(raw(f)).not.toMatch(FRAMING);
    });
    it(`${f} never frames banza-protocol/banzai as the canonical/authoritative core`, () => {
      const offending = raw(f)
        .split("\n")
        .filter((l) => (FWD.test(l) || REV.test(l)) && !NEG.test(l));
      expect(offending).toEqual([]);
    });
    it(`${f} does not link to the to-be-deleted banza-protocol/banzai repository`, () => {
      const offending = raw(f).split("\n").filter((l) => OLD_REPO_LINK.test(l));
      expect(offending).toEqual([]);
    });
    it(`${f} does not frame banza-protocol/banzai as an archive/frozen/historical source`, () => {
      const offending = raw(f).split("\n").filter((l) => ARCHIVE_FRAMING.test(l));
      expect(offending).toEqual([]);
    });
  }

  it("README names services/banzai-api as the canonical runtime and BANZA as the sole active source", () => {
    const r = raw("README.md");
    expect(r).toMatch(/services\/banzai-api/);
    expect(r).toMatch(/canonical runtime|is the canonical runtime|canonical, this repo/i);
    expect(r).toMatch(/active BanzAI (development|source)|sole active BanzAI source/i);
  });

  it("services/banzai-api/README names itself the canonical runtime and the sole active source", () => {
    const r = raw("services/banzai-api/README.md");
    expect(r).toMatch(/canonical BanzAI runtime|is the canonical runtime/i);
    expect(r).toMatch(/sole active BanzAI source|no separate BanzAI repository/i);
  });

  it("COMPONENT_BOUNDARY names services/banzai-api as the canonical runtime; BANZA the only active source", () => {
    const b = raw("docs/governance/BANZAI_COMPONENT_BOUNDARY_2026_07.md");
    expect(b).toMatch(/services\/banzai-api/);
    expect(b).toMatch(/is the canonical runtime/i);
    expect(b).toMatch(/no separate BanzAI repository|active BanzAI development lives entirely|this monorepo only/i);
    expect(b).not.toMatch(/frozen historical archive/i);
  });
});
