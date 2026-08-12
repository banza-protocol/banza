import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// M2.19G.4 (ADR-070) — navigable contexts in the single BanzAI interface. These source-level assertions
// track the safety-load-bearing shape of the new route segments and the always-mounted workspace: the
// segments are CLOSED slugs resolved server-side (never a caller-supplied URL), the single session is
// mounted once in the shared layout, and the navigation contexts are never conflated with the three
// architectural layers or the L0–L4 certification tiers (D-070-05). Behavioural URL-state parsing is
// covered by banzaiState.test.ts.
const root = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

describe("M2.19G.4 — navigable contexts are closed, server-resolved route segments (ADR-070)", () => {
  it("mounts the single always-mounted workspace ONCE in the shared /banzai layout", () => {
    const layout = read("app/banzai/layout.tsx");
    expect(layout).toContain("BanzaiWorkspaceProvider");
    // The persistent shell + session live in the provider, not per-page (survives context navigation).
    const provider = read("components/banzai/BanzaiWorkspaceProvider.tsx");
    expect(provider).toContain("BanzaiAgent");
    expect(provider).toContain("applyRouteState");
  });

  it("the global page and both segment pages resolve state via parseBanzaiState + render the binder", () => {
    for (const p of [
      "app/banzai/page.tsx",
      "app/banzai/operador/[operatorId]/page.tsx",
      "app/banzai/operador/[operatorId]/[implementationId]/page.tsx",
    ]) {
      const src = read(p);
      expect(src).toContain("parseBanzaiState");
      expect(src).toContain("BanzaiRouteBinder");
    }
  });

  it("both segment pages shape-validate the closed slug SERVER-SIDE and notFound() on a bad shape (no URL)", () => {
    const op = read("app/banzai/operador/[operatorId]/page.tsx");
    expect(op).toContain("isClosedId");
    expect(op).toContain("notFound");
    expect(op).toMatch(/if \(!isClosedId\(operatorId\)\)\s*notFound\(\)/);

    const impl = read("app/banzai/operador/[operatorId]/[implementationId]/page.tsx");
    expect(impl).toContain("isClosedId(operatorId)");
    expect(impl).toContain("isClosedId(implementationId)");
    expect(impl).toContain("notFound");
  });

  it("the segment pages are noindex (app contexts, not content) and canonicalise to /banzai", () => {
    for (const p of [
      "app/banzai/operador/[operatorId]/page.tsx",
      "app/banzai/operador/[operatorId]/[implementationId]/page.tsx",
    ]) {
      const src = read(p);
      expect(src).toContain('canonical: "/banzai"');
      expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    }
  });

  it("the context trail uses 'contexto' and never conflates contexts with layers/tiers (D-070-05)", () => {
    const agent = read("components/banzai/BanzaiAgent.tsx");
    expect(agent).toContain("BanzaiContextTrail");
    expect(agent).toContain("CONTEXTO");
    // No "camada"/"3 camadas"/"nível de certificação" framing on the navigation trail.
    const trailRegion = agent.slice(agent.indexOf("function BanzaiContextTrail"), agent.indexOf("export function BanzaiAgent"));
    expect(trailRegion).not.toMatch(/\bcamadas?\b/i);
    expect(trailRegion).not.toMatch(/n[íi]vel de certifica/i);
  });

  it("the shell reflects runtime truth: the engine label is derived, not a hardcoded claim (F5)", () => {
    const agent = read("components/banzai/BanzaiAgent.tsx");
    expect(agent).toContain("engineInfo");
    expect(agent).toContain("externalModelCalled");
    // The pre-response default is honestly qualified 'por omissão'; a confirmed run says 'confirmado'.
    expect(agent).toContain("por omissão");
    expect(agent).toContain("confirmado nesta resposta");
  });
});
