// M2.12E/F/G — host-aware routing for zero.banza.network. Pure-logic tests (no Next runtime),
// following the repo convention. They pin the contract the middleware executes and the guard checks.
import { describe, it, expect } from "vitest";
import { resolveZeroRoute, isZeroHost, normalizeHost, ZERO_ENDPOINTS, ZERO_LAB_ROUTE } from "./zeroSubdomain";

describe("host detection", () => {
  it("recognises the subdomain, with or without a port, case-insensitively", () => {
    expect(isZeroHost("zero.banza.network")).toBe(true);
    expect(isZeroHost("ZERO.banza.network:443")).toBe(true);
    expect(normalizeHost("Zero.Banza.Network:8080")).toBe("zero.banza.network");
  });
  it("does NOT match the apex or look-alikes", () => {
    for (const h of ["banza.network", "www.banza.network", "banzai.banza.network", "notzero.banza.network", "zero.banza.network.evil.com", null, undefined]) {
      expect(isZeroHost(h)).toBe(false);
    }
  });
});

describe("retired apex surface /operador-zero is 410 Gone on every host, never redirected", () => {
  it("410s the page path (html) on the apex and the subdomain", () => {
    expect(resolveZeroRoute("banza.network", "/operador-zero")).toEqual({ type: "gone", format: "html" });
    expect(resolveZeroRoute("zero.banza.network", "/operador-zero")).toEqual({ type: "gone", format: "html" });
  });
  it("410s every retired JSON endpoint (json) on the apex", () => {
    for (const e of ZERO_ENDPOINTS) {
      expect(resolveZeroRoute("banza.network", `/operador-zero/${e}.json`)).toEqual({ type: "gone", format: "json" });
    }
  });
  it("never redirects the retired route to the subdomain", () => {
    for (const p of ["/operador-zero", "/operador-zero/manifest.json", "/operador-zero/ledger/demo.json"]) {
      expect(resolveZeroRoute("banza.network", p).type).toBe("gone");
    }
  });
});

describe("the internal /oz name is not a public URL", () => {
  it("404s /oz and /oz/* on the apex", () => {
    for (const p of ["/oz", "/oz/manifest.json", "/oz/anything"]) {
      expect(resolveZeroRoute("banza.network", p)).toEqual({ type: "notfound" });
    }
  });
  it("lets /oz through on the subdomain (harmless internal alias)", () => {
    expect(resolveZeroRoute("zero.banza.network", "/oz")).toEqual({ type: "next" });
  });
});

describe("apex is otherwise a strict pass-through", () => {
  it("never rewrites or redirects unrelated apex paths", () => {
    for (const p of ["/", "/banzai", "/manifest.json", "/referencia/operador-zero", "/some-chunk.js"]) {
      expect(resolveZeroRoute("banza.network", p)).toEqual({ type: "next" });
    }
  });
});

describe("subdomain surface", () => {
  it("serves the standalone lab at / (rewrite to the internal route)", () => {
    expect(resolveZeroRoute(ZERO_HOSTish(), "/")).toEqual({ type: "rewrite", to: ZERO_LAB_ROUTE });
    expect(ZERO_LAB_ROUTE).toBe("/oz");
  });

  it("maps every demo endpoint onto the internal handler", () => {
    for (const e of ZERO_ENDPOINTS) {
      expect(resolveZeroRoute(ZERO_HOSTish(), `/${e}.json`)).toEqual({ type: "rewrite", to: `${ZERO_LAB_ROUTE}/${e}.json` });
    }
  });

  it("delegates unknown .json to the handler (so it 404s there, never elsewhere)", () => {
    expect(resolveZeroRoute(ZERO_HOSTish(), "/nope.json")).toEqual({ type: "rewrite", to: `${ZERO_LAB_ROUTE}/nope.json` });
  });

  it("sends /banzai to the apex (BanzAI stays on the apex)", () => {
    expect(resolveZeroRoute(ZERO_HOSTish(), "/banzai", "?template=operador-zero&clone=1")).toEqual({
      type: "redirect",
      to: "https://banza.network/banzai?template=operador-zero&clone=1",
    });
  });

  it("passes assets and diagrams through", () => {
    for (const p of ["/diagrams/protocol/operador-zero-validation-target-v2.svg", "/some-chunk.js"]) {
      expect(resolveZeroRoute(ZERO_HOSTish(), p)).toEqual({ type: "next" });
    }
  });
});

// Note: the ZERO_ENDPOINTS vs apex ARTIFACT_ROUTES parity ("no divergence") is asserted by
// make zero-subdomain-routing-check, which reads both source files — the natural place for it, and
// it avoids importing operadorZero.ts (and its generated artifact bundle) into vitest.

// The subdomain host, spelled once so a rename is a single edit.
function ZERO_HOSTish() { return "zero.banza.network"; }
