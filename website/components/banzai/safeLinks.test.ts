// M2.13D — link-safety allowlist tests (Parts 5/12). Pure functions; no DOM.
import { describe, it, expect } from "vitest";
import { safeHref, urlTransform } from "./safeLinks";

describe("safeHref (BanzAI answer link allowlist)", () => {
  it("allows internal same-origin paths", () => {
    expect(safeHref("/referencia")).toBe("/referencia");
    expect(safeHref("/referencia/operador-zero")).toBe("/referencia/operador-zero");
  });

  it("allows https links to the protocol's own GitHub org and BANZA hosts", () => {
    expect(safeHref("https://github.com/banza-protocol/banza/blob/main/LICENSE")).toBe(
      "https://github.com/banza-protocol/banza/blob/main/LICENSE",
    );
    expect(safeHref("https://banza.network/referencia")).toBe("https://banza.network/referencia");
    expect(safeHref("https://zero.banza.network/")).toBe("https://zero.banza.network/");
  });

  it("refuses dangerous protocols (javascript:, data:, http:) → null", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JavaScript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHref("http://banza.network")).toBeNull();
    expect(safeHref("mailto:x@y.z")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
  });

  it("refuses arbitrary external hosts and other GitHub orgs → null", () => {
    expect(safeHref("https://evil.com/x")).toBeNull();
    expect(safeHref("https://github.com/someone-else/repo")).toBeNull();
    expect(safeHref("https://raw.githubusercontent.com/banza-protocol/banza/main/.env")).toBeNull();
  });

  it("urlTransform returns an empty string for unsafe URLs (react-markdown drops the href)", () => {
    expect(urlTransform("javascript:alert(1)")).toBe("");
    expect(urlTransform("https://github.com/banza-protocol/banza/blob/main/LICENSE")).toBe(
      "https://github.com/banza-protocol/banza/blob/main/LICENSE",
    );
  });
});
