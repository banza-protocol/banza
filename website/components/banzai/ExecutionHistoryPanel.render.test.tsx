// ADR-076 D-076-08 — the Execuções (durable archive) results view. Without a selected implementation
// it must guide the user to Validar operador rather than fetch anything; with no store reachable it must
// fail honestly. Rendered with react-dom/server (no DOM, no effects run) — this proves the no-selection
// guard state, which is reached before any network call.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExecutionHistoryPanel } from "@/components/banzai/BanzaiValidationMode";
import type { ValidationSession } from "@/components/banzai/validationJourney";

const sessionNoTarget = { operatorId: null, implementationId: null, steps: [] } as unknown as ValidationSession;

describe("ExecutionHistoryPanel — durable archive view", () => {
  it("guides to Validar operador when no implementation is selected (no fetch)", () => {
    const out = renderToStaticMarkup(createElement(ExecutionHistoryPanel, { session: sessionNoTarget }));
    expect(out).toContain("Validar operador");
    expect(out).toContain("append-only");
    // The archive toolbar (Comparar/Actualizar) must NOT render without a target.
    expect(out).not.toContain("Comparar (");
  });
});
