// ADR-042 correction 1 — the PersistenceBadge must state the HONEST durable-archive verdict of a
// full-journey run. The engine result is independent of storage: the badge only claims durable/
// consultable/comparable/reproducible when persistence is PERSISTED, and it NEVER shows an archive
// reference for a non-persisted (pending/failed/disabled) run. Rendered with react-dom/server (no DOM).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersistenceBadge } from "@/components/banzai/BanzaiValidationMode";
import type { PersistenceInfo } from "@/lib/banzaiValidateClient";

const html = (p: PersistenceInfo, onRetry?: () => void, retrying?: boolean) =>
  renderToStaticMarkup(createElement(PersistenceBadge, { p, onRetry, retrying }));

const persisted: PersistenceInfo = {
  status: "PERSISTED", execution_id: "exec_abc123", durable: true, consultable: true, comparable: true, reproducible: true,
};
const pending: PersistenceInfo = {
  status: "RESULT_AVAILABLE_NOT_PERSISTED", detail: "PENDING", execution_id: "exec_pend", durable: false, consultable: false, comparable: false, reproducible: false, retryable: true,
};
const failed: PersistenceInfo = {
  status: "RESULT_AVAILABLE_NOT_PERSISTED", detail: "FAILED", execution_id: "exec_fail", durable: false, consultable: false, comparable: false, reproducible: false, retryable: true,
};
const disabled: PersistenceInfo = {
  status: "DISABLED", execution_id: null, durable: false, consultable: false, comparable: false, reproducible: false,
};

describe("PersistenceBadge — honest durable-archive verdict", () => {
  it("PERSISTED shows the archive reference and the durable wording", () => {
    const out = html(persisted);
    expect(out).toContain("Persistido");
    expect(out).toContain("arquivo: exec_abc123");
    expect(out).not.toContain("sem referência de arquivo");
    expect(out).toContain('data-persistence="PERSISTED"');
  });

  it("PENDING never shows an archive reference and states the pending cause", () => {
    const out = html(pending);
    expect(out).toContain("persistência pendente");
    expect(out).toContain("sem referência de arquivo");
    // The pending id must NOT be presented as an archive reference.
    expect(out).not.toContain("arquivo: exec_pend");
  });

  it("FAILED never shows an archive reference and states the failure honestly", () => {
    const out = html(failed);
    expect(out).toContain("não persistido");
    expect(out).toContain("sem referência de arquivo");
    expect(out).not.toContain("arquivo: exec_fail");
  });

  it("DISABLED states the archive is off and shows no reference", () => {
    const out = html(disabled);
    expect(out).toContain("Arquivo desativado");
    expect(out).toContain("sem referência de arquivo");
  });

  it("offers a persistence re-check only when not persisted, retryable, and given a handler", () => {
    expect(html(pending, () => {})).toContain("Reconfirmar persistência");
    // No retry affordance when already persisted…
    expect(html(persisted, () => {})).not.toContain("Reconfirmar persistência");
    // …nor when no handler is provided.
    expect(html(pending)).not.toContain("Reconfirmar persistência");
    // The retry never re-runs the engine — its label reflects a re-check while in flight.
    expect(html(pending, () => {}, true)).toContain("A reconfirmar…");
  });
});
