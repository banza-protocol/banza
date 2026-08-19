import { describe, it, expect, vi, afterEach } from "vitest";
import { banzaiKb, mapAskResponse, safeSourceHref, buildTransparency, type KbAnswer } from "./banzaiKb";
import { realizeSuggestions } from "@/components/banzai/suggestions";

// The mapper now returns SEMANTIC suggestion selections; a test that wants to read the sentences names
// the edition it is reading, exactly as a presentation owner would.
const ptFollowUps = (r: KbAnswer): string[] => realizeSuggestions(r.followUpSelections ?? [], "pt");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("mapAskResponse (banzai-api /ask → KbAnswer)", () => {
  it("labels a real Qwen-generated answer 'Gerado por Qwen local' (per-answer proof)", () => {
    const r = mapAskResponse({
      answer: "BANZA é um protocolo aberto e neutro (ADR-001).",
      grounded: true,
      local_model_called: true,
      sources: [{ id: "ADR-001", title: "Open protocol", path: "decisions/adr/ADR-001.md" }],
      sources_count: 1,
      latency_ms: 8700,
      engine_state: "local_qwen",
      external_model_called: false,
      meta: {},
    });
    expect(r.kind).toBe("answer");
    expect(r.localModelCalled).toBe(true);
    expect(r.status).toMatch(/Gerado por Qwen local/);
    expect(r.status).toMatch(/chamadas externas: 0/);
    expect(r.status).toMatch(/8\.7s/);
    expect(r.cites).toEqual(["ADR-001"]);
    expect(r.externalModelCalled).toBe(false);
  });

  it("labels a deterministic answer 'Resposta determinística' (NOT Qwen) when the model was not called", () => {
    const r = mapAskResponse({
      answer: "Não. BANZA é o protocolo, não um operador.",
      grounded: true,
      local_model_called: false,
      sources: [{ id: "ADR-001", title: "Operator separation", path: "p" }, { id: "ANNEX", title: "annex", path: "p" }],
      sources_count: 2,
      engine_state: "local_qwen",
      meta: { deterministic: true },
    });
    expect(r.localModelCalled).toBe(false);
    expect(r.status).toMatch(/Resposta determinística/);
    expect(r.status).not.toMatch(/Qwen/);
  });

  it("labels a CACHE HIT 'Resposta em cache (Qwen local)' — never a live generation (M2.8F honesty)", () => {
    // Backend served a previously Qwen-generated answer from cache: no NEW model call this request,
    // so local_model_called MUST be false and the label must not claim a live Qwen generation.
    const r = mapAskResponse({
      answer: "Consulta a BRL via endpoint público (SPEC).",
      grounded: true,
      local_model_called: false,
      cached_local: true,
      cache: "exact",
      sources: [{ id: "SPEC", title: "t", path: "p" }],
      sources_count: 1,
      engine_state: "local_qwen",
      meta: { cache: "exact", llm_called: false },
    });
    expect(r.localModelCalled).toBe(false);
    expect(r.status).toMatch(/em cache \(Qwen local\)/);
    expect(r.status).toMatch(/sem nova chamada/);
    expect(r.status).not.toMatch(/Gerado por Qwen local/);
  });

  it("labels a post-validation replacement honestly (model called but output substituted)", () => {
    const r = mapAskResponse({
      answer: "Resposta determinística a partir das fontes (ADR-001).",
      grounded: true,
      local_model_called: false,
      fallback_reason: "post_validation_forbidden_claim",
      sources: [{ id: "ADR-001", title: "t", path: "p" }],
      sources_count: 1,
      engine_state: "local_qwen",
      meta: { llm_called: true },
    });
    expect(r.localModelCalled).toBe(false);
    expect(r.status).toMatch(/substituída pela validação/);
    expect(r.status).not.toMatch(/Gerado por Qwen local/);
  });

  it("labels a no-source answer 'Evidência insuficiente' (no model call)", () => {
    const r = mapAskResponse({ answer: "Não encontrei fonte suficiente.", grounded: false, sources: [], engine_state: "local_qwen", meta: {} });
    expect(r.kind).toBe("uncertain");
    expect(r.status).toMatch(/Evidência insuficiente/);
    expect(r.status).not.toMatch(/Qwen/);
    expect(r.links).toEqual([]);
  });

  it("labels a degraded fallback 'Fallback seguro' with a limits note", () => {
    const r = mapAskResponse({
      answer: "resposta determinística a partir das fontes",
      grounded: true,
      local_model_called: false,
      sources: [{ id: "ADR-001", title: "t", path: "p" }],
      engine_state: "degraded",
      meta: { degraded: true },
    });
    expect(r.degraded).toBe(true);
    expect(r.status).toMatch(/Fallback seguro/);
    expect(r.limits?.[0]).toMatch(/degradado/i);
  });

  // M2.18B.6 — the degraded label must state the REAL cause, never a blanket "Qwen indisponível".
  it("labels each degraded fallback_reason faithfully — and never 'Qwen indisponível'", () => {
    const cases: Array<[string, RegExp, RegExp]> = [
      ["local_inference_unavailable", /modelo indisponível/, /indisponível/],
      ["local_inference_timeout", /tempo limite/, /tempo limite/],
      ["synthesis_capacity_tripped", /capacidade temporariamente ocupada/, /capacidade/],
      ["synthesis_output_unvalidated", /resposta não validada/, /validação factual/],
      ["intent_deferred", /determinística a partir das fontes/, /determinística/],
    ];
    for (const [reason, statusRe, limitRe] of cases) {
      const r = mapAskResponse({
        answer: "resposta determinística a partir das fontes",
        grounded: true,
        local_model_called: false,
        sources: [{ id: "ADR-001", title: "t", path: "p" }],
        engine_state: "degraded",
        fallback_reason: reason,
        meta: { degraded: true, fallback_reason: reason },
      });
      expect(r.degraded).toBe(true);
      expect(r.status).toMatch(statusRe);
      expect(r.status).not.toMatch(/Qwen indisponível/);
      expect(r.limits?.[0]).toMatch(limitRe);
    }
  });

  it("a normal grounded Qwen answer is NEVER labelled degraded (regression: como federar um operador?)", () => {
    const r = mapAskResponse({
      answer: "No BANZA, a participação é demonstrada por evidência verificável (ADR-025).",
      grounded: true,
      local_model_called: true,
      external_model_called: false,
      sources: [{ id: "ADR-025", title: "Federation", path: "p" }],
      engine_state: "local_qwen",
      latency_ms: 32000,
      meta: {},
    });
    expect(r.degraded).toBe(false);
    expect(r.status).toMatch(/Gerado por Qwen local/);
    expect(r.status).not.toMatch(/indisponível/);
  });

  it("strips any <think> reasoning from the rendered text (defence-in-depth)", () => {
    const r = mapAskResponse({ answer: "<think>segredo interno</think>Resposta final (ADR-001).", grounded: true, sources: [], meta: {} });
    expect(r.text).toBe("Resposta final (ADR-001).");
    expect(r.text).not.toMatch(/think|segredo/i);
  });

  // ── M2.13D — answer formatting / citation UX ──────────────────────────────────────────────────
  it("strips a trailing 'Fonte:/Fontes:' citation line from the body when a source block exists (Part 7)", () => {
    const r = mapAskResponse({
      answer: "O BANZA é licenciado sob a Apache License 2.0. Fonte: LICENSE, NOTICE.",
      grounded: true,
      sources: [{ id: "LICENSE", title: "Apache-2.0", path: "LICENSE" }],
      meta: {},
    });
    expect(r.text).toBe("O BANZA é licenciado sob a Apache License 2.0.");
    expect(r.text).not.toMatch(/Fonte/i);
  });

  it("keeps the body intact when there is NO source block (fallback text may cite inline)", () => {
    const r = mapAskResponse({ answer: "Sem fontes. Fonte: X.", grounded: false, sources: [], meta: {} });
    expect(r.text).toMatch(/Fonte: X\./);
  });

  it("builds rich, clickable sources with category, repo and a safe GitHub href (Parts 5/6)", () => {
    const r = mapAskResponse({
      answer: "resposta",
      grounded: true,
      sources: [
        { id: "LICENSE", title: "Apache-2.0", path: "LICENSE" },
        { id: "banza:operator-zero", title: "Cargo.toml", path: "engines/operator-zero-core/Cargo.toml", repo: "banza-protocol/banza", category: "operator-zero" },
      ],
      meta: {},
    });
    expect(r.sources).toHaveLength(2);
    // This asserted `category: "reference"` — the defect, written down as an expectation. A source the
    // backend did not classify must stay unclassified here; the card then says FONTE/SOURCE. Attaching the
    // canonical Reference's label to whatever arrived without metadata is what Block 5B removed.
    expect(r.sources[0]).toMatchObject({ id: "LICENSE", category: "", kind: "", repo: "banza-protocol/banza" });
    expect(r.sources[0].href).toBe("https://github.com/banza-protocol/banza/blob/main/LICENSE");
    expect(r.sources[1]).toMatchObject({ category: "operator-zero" });
    expect(r.sources[1].href).toBe("https://github.com/banza-protocol/banza/blob/main/engines/operator-zero-core/Cargo.toml");
  });

  it("never links a sensitive/excluded path or the retired /operador-zero route (Parts 5/12)", () => {
    expect(safeSourceHref(".env", "banza-protocol/banza")).toBeNull();
    expect(safeSourceHref("infra/keys/id_ed25519", "banza-protocol/banza")).toBeNull();
    expect(safeSourceHref("secrets/trust-root.pem", "banza-protocol/banza")).toBeNull();
    expect(safeSourceHref("website/app/operador-zero/page.tsx", "banza-protocol/banza")).toBeNull();
    expect(safeSourceHref("engines/banzai-api-kb/pkg/banzai_api_kb_bg.wasm", "banza-protocol/banza")).toBeNull();
    // A globbed registry path links to the directory (tree), never a guessed file.
    expect(safeSourceHref("decisions/adr/ADR-001-*.md", "banza-protocol/banza")).toBe("https://github.com/banza-protocol/banza/tree/main/decisions/adr");
    // Honors the source's declared repo. Post-consolidation (ADR-036) the monorepo is the only live
    // BanzAI source — there is no separate banza-protocol/banzai repo to link to.
    expect(safeSourceHref("engines/banzai-trace/", "banza-protocol/banza")).toBe("https://github.com/banza-protocol/banza/tree/main/engines/banzai-trace");
  });
});

describe("banzaiKb (same-origin /banzai/ask)", () => {
  it("POSTs the question to /banzai/ask and maps a real answer", async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answer: "ok (ADR-001)", grounded: true, sources: [{ id: "ADR-001", title: "t", path: "p" }], engine_state: "local_qwen", external_model_called: false, meta: {} }),
    }));
    vi.stubGlobal("fetch", spy);
    const r = await banzaiKb("O que é BANZA?");
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/banzai/ask");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).question).toBe("O que é BANZA?");
    expect(r.text).toContain("ok");
    expect(r.kind).toBe("answer");
    expect(r.externalModelCalled).toBe(false);
  });

  it("sends recent chat history as context so the backend can resolve follow-ups (M2.8H)", async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answer: "exemplo (SCHEMA-OP-MANIFEST)", grounded: true, local_model_called: true, conversation_context_used: true, sources: [{ id: "SCHEMA-OP-MANIFEST", title: "t", path: "p" }], sources_count: 1, engine_state: "local_qwen", meta: {} }),
    }));
    vi.stubGlobal("fetch", spy);
    const r = await banzaiKb("me dá um exemplo aqui", [
      { role: "user", text: "me dá um exemplo de manifesto" },
      { role: "ai", text: "..." },
    ]);
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(Array.isArray(body.context)).toBe(true);
    expect(body.context.some((t: { role: string }) => t.role === "user")).toBe(true);
    expect(r.contextUsed).toBe(true);
    expect(r.status).toMatch(/com contexto/);
  });

  it("forwards the SAFE uploaded-artifacts summary (names/sizes only) — never a raw file body (M2.9C)", async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ answer: "ok", grounded: true, sources: [], meta: {}, uploaded_artifacts_used: true, uploaded_artifacts_count: 1 }) }));
    vi.stubGlobal("fetch", spy);
    const r = await banzaiKb("o que faço agora?", [], {
      current_step: "manifest",
      uploaded_artifacts_summary: [{ step: "manifest", file_name: "operator.json", size: 1234 }],
    });
    const body = JSON.parse(String((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(Array.isArray(body.uploaded_artifacts_summary)).toBe(true);
    expect(body.uploaded_artifacts_summary[0]).toEqual({ step: "manifest", file_name: "operator.json", size: 1234 });
    expect(body.current_step).toBe("manifest");
    // the raw file body is never a field in the request
    expect(JSON.stringify(body)).not.toContain("rawJson");
    expect(r.uploadedArtifactsUsed).toBe(true);
    expect(r.uploadedArtifactsCount).toBe(1);
  });

  it("omits the upload summary when nothing was uploaded", async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ answer: "ok", grounded: true, sources: [], meta: {} }) }));
    vi.stubGlobal("fetch", spy);
    await banzaiKb("o que é BANZA?", [], { current_step: "guia" });
    const body = JSON.parse(String((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.uploaded_artifacts_summary).toBeUndefined();
  });

  it("omits context when there is no history (plain single-turn request)", async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ answer: "ok", grounded: true, sources: [], meta: {} }) }));
    vi.stubGlobal("fetch", spy);
    await banzaiKb("o que é BANZA?");
    const body = JSON.parse(String((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.context).toBeUndefined();
  });

  it("returns kind 'unavailable' (not 'uncertain') on a non-ok response — outage ≠ insufficient evidence", async () => {
    // M2.14E — a 503 is professional backpressure ("muitos pedidos"), not a generic outage. It stays
    // kind 'unavailable' (not 'uncertain'), carries no cites, and NEVER exposes "one request at a time".
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    const r = await banzaiKb("teste");
    expect(r.kind).toBe("unavailable");
    expect(r.text).toMatch(/muitos pedidos/i);
    expect(r.text).not.toMatch(/um pedido de cada vez|inferência corre localmente/i);
    expect(r.cites).toEqual([]);
  });

  it("M2.14E — maps 429/503/504 to distinct professional messages; none exposes internal architecture", async () => {
    const forbidden = /um pedido de cada vez|infer[êe]ncia corre localmente|one request at a time|worker|semaphore|llama/i;
    for (const [status, re] of [[429, /muitos pedidos em pouco tempo/i], [503, /muitos pedidos neste momento/i], [504, /demorou mais do que o esperado/i]] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status, json: async () => ({}) })));
      const r = await banzaiKb("teste");
      expect(r.kind).toBe("unavailable");
      expect(r.text).toMatch(re);
      expect(r.text).not.toMatch(forbidden);
    }
  });

  it("M2.14E — prefers the backend public_message when the body carries one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ public_message: "Mensagem do servidor sobre carga." }) })));
    const r = await banzaiKb("teste");
    expect(r.text).toBe("Mensagem do servidor sobre carga.");
  });

  it("returns kind 'unavailable' on a network error (never throws, no stack trace)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const r = await banzaiKb("teste");
    expect(r.kind).toBe("unavailable");
    expect(r.text).toMatch(/indispon/i);
    expect(r.cites).toEqual([]);
  });

  // ── M2.9A operational suggestions ──────────────────────────────────────────
  it("a grounded operational answer carries the backend intent + contextual suggestions (M2.9A)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answer: "1) implementar 2) manifest (GETTING-STARTED)", grounded: true, intent: "operator_onboarding", local_model_called: true, sources: [{ id: "GETTING-STARTED", title: "t", path: "docs/reference/getting-started.md" }], sources_count: 1, engine_state: "local_qwen", meta: {} }),
    })));
    const r = await banzaiKb("onde começo com o meu operador?");
    expect(r.operationalIntent).toBe("operator_onboarding");
    expect(Array.isArray(r.followUpSelections)).toBe(true);
    expect(ptFollowUps(r).length).toBeGreaterThan(0);
    // Suggestions are QUESTIONS, never normative claims (no certify/approve/license assertions).
    for (const f of ptFollowUps(r)) {
      expect(f).not.toMatch(/certific|aprova|licenc|garant/i);
    }
  });

  it("a non-grounded (insufficient) answer offers no operational suggestions (M2.9A)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answer: "não encontrei", grounded: false, intent: "no_source", sources: [], meta: {} }),
    })));
    const r = await banzaiKb("qual é a cotação do dólar amanhã?");
    expect(r.followUpSelections).toBeUndefined();
  });
});

// ── M2.11D (QA-4): a refusal is not a failure to find sources ────────────────
// The UI has a `RECUSA FUNDAMENTADA` badge and nothing ever set `kind: "refusal"`, so a refused
// prompt injection displayed "EVIDÊNCIA INSUFICIENTE" — the wrong statement about what happened.
// The backend already distinguished them; only the mapping was missing.
describe("M2.11D — a deliberate refusal maps to kind: refusal", () => {
  const base = {
    answer: "Não encontrei uma fonte específica para esse pedido.",
    sources: [],
    grounded: false,
    external_model_called: false,
    local_model_called: false,
  };

  it("a safety refusal is a refusal, not missing evidence", () => {
    for (const payload of [
      { ...base, intent: "safety_refusal" },
      { ...base, fallback_reason: "safety_refusal" },
    ]) {
      const a = mapAskResponse(payload as never);
      expect(a.kind).toBe("refusal");
    }
  });

  it("a genuine no-source answer stays uncertain", () => {
    const a = mapAskResponse({ ...base, intent: "no_source" } as never);
    expect(a.kind).toBe("uncertain");
  });

  it("a grounded answer is unaffected", () => {
    const a = mapAskResponse({
      ...base,
      grounded: true,
      intent: "governance_reference",
      sources: [{ id: "ADR-001", title: "x" }],
    } as never);
    expect(a.kind).toBe("answer");
  });
});

// ── Increment 9 (§24) — the per-answer transparency projection is read from the envelope ──────────────
describe("buildTransparency (§24) — envelope → KbTransparency (present when produced, absent otherwise)", () => {
  it("surfaces observability + scope_resolution fields verbatim when the envelope carries them", () => {
    const t = buildTransparency(
      {
        engine_state: "local_qwen",
        index_version: "idx-42",
        validation_status: "passed",
        answer_type: "how_it_works",
        question_family: "get_requirement",
        latency_ms: 8700,
        observability: {
          intent: "grounded",
          sub_intents: ["manifest"],
          tool_plan: ["LIVE_ARTIFACT_FETCH"],
          tool_outcomes: { LIVE_ARTIFACT_FETCH: "ok" },
          tool_durations: { LIVE_ARTIFACT_FETCH: 340 },
          total_duration_ms: 8700,
          model_called: true,
          confidence: "high",
          claim_verification: { ok: true, errors: 0 },
          citation_verification: { ok: true, errors: 0 },
          calculations: { count: 3, aggregation_method: "percentile_cont", sample_size: 12 },
          scope: { profile: "L0", environment: "sandbox", protocol_version: "1.0" },
          entities: { entity_id: "operator-zero", entity_type: "operator" },
        },
        scope_resolution: {
          entity_id: "operator-zero",
          entity_type: "operator",
          entity_display: "Operador Zero",
          authority_kind: "origin_bound",
          canonical_origin: "https://zero.banza.network",
          artifact_sha256: "abc123",
          artifact_observed_at: "2026-08-06T10:00:00Z",
        },
      },
      [{ id: "ADR-001", title: "t", path: "p", repo: "banza-protocol/banza", category: "decision", kind: "adr", href: null }],
      { degraded: false, fallbackReason: "", grounded: true, refused: false, terminalKind: "", isInsufficientMeasurements: false, contextualFallbackKind: null },
    );
    expect(t).toBeDefined();
    expect(t!.engine).toBe("local_qwen");
    expect(t!.runtimeVersion).toBe("idx-42");
    expect(t!.validationStatus).toBe("passed");
    expect(t!.answerType).toBe("how_it_works");
    expect(t!.questionFamily).toBe("get_requirement");
    expect(t!.modelCalled).toBe(true);
    expect(t!.confidenceBand).toBe("high");
    expect(t!.entity).toEqual({ id: "operator-zero", type: "operator", display: "Operador Zero", operatorId: null, implementationId: null });
    expect(t!.scope).toEqual({ profile: "L0", environment: "sandbox", protocolVersion: "1.0", protocolScope: null, artifactType: null });
    expect(t!.tools).toEqual([{ kind: "LIVE_ARTIFACT_FETCH", outcome: "ok", durationMs: 340 }]);
    expect(t!.observedAt).toBe("2026-08-06T10:00:00Z");
    expect(t!.sha256).toBe("abc123");
    expect(t!.canonicalOrigin).toBe("https://zero.banza.network");
    expect(t!.calculation).toEqual({ method: "percentile_cont", sampleSize: 12, count: 3, period: null });
    expect(t!.claimVerification).toEqual({ ok: true, errors: 0 });
    expect(t!.limitations).toEqual([]); // a clean grounded answer carries no limitation
  });

  it("OMITS fields the engine did not produce (no fabrication) — a minimal envelope", () => {
    const t = buildTransparency(
      { engine_state: "local_qwen", observability: { intent: "grounded" } },
      [],
      { degraded: false, fallbackReason: "", grounded: true, refused: false, terminalKind: "", isInsufficientMeasurements: false, contextualFallbackKind: null },
    );
    expect(t).toBeDefined();
    expect(t!.entity).toBeNull();
    expect(t!.scope).toBeNull();
    expect(t!.tools).toEqual([]);
    expect(t!.observedAt).toBeNull();
    expect(t!.calculation).toBeNull();
    expect(t!.authority).toBeNull();
    expect(t!.sourceCount).toBe(0);
  });

  it("emits an honest limitations line for a degraded answer", () => {
    const t = buildTransparency(
      { engine_state: "degraded", observability: { intent: "grounded" } },
      [],
      { degraded: true, fallbackReason: "local_inference_unavailable", grounded: true, refused: false, terminalKind: "", isInsufficientMeasurements: false, contextualFallbackKind: null },
    );
    expect(t!.limitations.some((l) => /degradado/i.test(l))).toBe(true);
  });

  it("returns undefined for a content-free (outage-shaped) envelope", () => {
    const t = buildTransparency({}, [], { degraded: false, fallbackReason: "", grounded: true, refused: false, terminalKind: "", isInsufficientMeasurements: false, contextualFallbackKind: null });
    // grounded:true with no other signal still yields no transparency-worthy content → undefined.
    expect(t).toBeUndefined();
  });

  it("carries the transparency projection through mapAskResponse onto the KbAnswer", () => {
    const r = mapAskResponse({
      answer: "BANZA é um protocolo aberto (ADR-001).",
      grounded: true,
      engine_state: "local_qwen",
      sources: [{ id: "ADR-001", title: "t", path: "decisions/adr/ADR-001.md" }],
      sources_count: 1,
      observability: { intent: "grounded", confidence: "high", model_called: false },
      meta: {},
    });
    expect(r.transparency).toBeDefined();
    expect(r.transparency!.engine).toBe("local_qwen");
    expect(r.transparency!.confidenceBand).toBe("high");
    expect(r.transparency!.sourceCount).toBe(1);
  });
});

// ── Increment 9 (§25) — followUps are CONTEXTUAL per answer (not a fixed list) ────────────────────────
describe("mapAskResponse (§25) — contextual, per-answer follow-up suggestions", () => {
  it("an ENTITY answer offers that entity's manifest/keys/conformance (named)", () => {
    const r = mapAskResponse({
      answer: "O manifesto do Operador Zero declara o perfil L0.",
      grounded: true,
      engine_state: "local_qwen",
      sources: [{ id: "manifest", title: "t", path: "p" }],
      sources_count: 1,
      scope_resolution: { entity_id: "operator-zero", entity_type: "operator", entity_display: "Operador Zero" },
      observability: { intent: "grounded", entities: { entity_id: "operator-zero", entity_type: "operator" } },
      meta: {},
    });
    expect(ptFollowUps(r).join(" ")).toContain("Operador Zero");
    expect(ptFollowUps(r).some((f) => /conformidade/i.test(f))).toBe(true);
  });

  it("a DURATION answer's suggestions differ from an ENTITY answer's (per-answer, not fixed)", () => {
    const durationAnswer = mapAskResponse({
      answer: "A jornada demorou 8,7 s.",
      grounded: true,
      terminal_kind: "operational_duration",
      answer_type: "operational_duration",
      duration: { measure_type: "média", comparable_runs: 3, per_step: [{ step_id: "s1", label: "Manifest", median_ms: 100, max_ms: 120, n: 3 }] },
      sources: [],
      sources_count: 0,
      observability: { intent: "grounded" },
      meta: {},
    });
    const entityAnswer = mapAskResponse({
      answer: "O manifesto do Operador Zero…",
      grounded: true,
      sources: [{ id: "m", title: "t", path: "p" }],
      sources_count: 1,
      scope_resolution: { entity_id: "operator-zero", entity_type: "operator", entity_display: "Operador Zero" },
      observability: { intent: "grounded", entities: { entity_id: "operator-zero" } },
      meta: {},
    });
    expect(ptFollowUps(durationAnswer).some((f) => /por etapa/i.test(f))).toBe(true);
    expect(JSON.stringify(durationAnswer.followUpSelections)).not.toBe(JSON.stringify(entityAnswer.followUpSelections));
  });

  it("a boundary/refusal answer offers ONLY safe reframes (no reframe toward the refused action)", () => {
    const r = mapAskResponse({
      answer: "Não posso ajudar com isso. O BanzAI não movimenta fundos.",
      grounded: false,
      intent: "safety_refusal",
      fallback_reason: "safety_refusal",
      sources: [],
      sources_count: 0,
      observability: { intent: "critical_boundary", boundary_detected: true },
      reasoning_trace: { boundary_detected: true },
      meta: {},
    });
    expect(r.kind).toBe("refusal");
    expect(ptFollowUps(r).length).toBeGreaterThan(0);
    for (const f of ptFollowUps(r)) {
      expect(f).not.toMatch(/transfer|transfe|movimenta|chave privada|private key|apaga|elimina|delete/i);
    }
  });
});

// ── Block 5B — the card says what the document IS ────────────────────────────────────────────────
//
// Every curated source used to render as REFERÊNCIA: the backend sent no document class and this parser
// turned the missing value into "reference". The label that belongs to the canonical descriptive Reference
// was therefore attached to ADRs, specifications and glossaries alike.
//
// The class now comes from the source registry. This file asserts the two halves the frontend owns: it
// carries the backend's class through untouched, and it never invents one — not from a default, and not
// from a path.

import { sourceKindLabel } from "@/components/banzai/SourceBlock";

describe("source document class", () => {
  it("labels each class in both editions", () => {
    expect(sourceKindLabel("adr", "pt")).toBe("ADR");
    expect(sourceKindLabel("adr", "en")).toBe("ADR");
    expect(sourceKindLabel("spec", "pt")).toBe("ESPECIFICAÇÃO");
    expect(sourceKindLabel("spec", "en")).toBe("SPECIFICATION");
    expect(sourceKindLabel("contract", "pt")).toBe("CONTRATO");
    expect(sourceKindLabel("contract", "en")).toBe("CONTRACT");
  });

  it("keeps REFERÊNCIA for the document that owns it", () => {
    expect(sourceKindLabel("reference", "pt")).toBe("REFERÊNCIA");
    expect(sourceKindLabel("reference", "en")).toBe("REFERENCE");
  });

  it("says FONTE/SOURCE when the class is unknown, never REFERÊNCIA", () => {
    // The defect, stated as the thing that must not happen again.
    for (const unknown of ["", "not-a-class", "banzai-runtime"]) {
      expect(sourceKindLabel(unknown, "pt")).toBe("FONTE");
      expect(sourceKindLabel(unknown, "en")).toBe("SOURCE");
    }
  });

  it("does not classify from the path", () => {
    // Metadata wins. A source whose path looks like an ADR but carries no class is unknown, and one whose
    // path looks like nothing but carries a class is that class. The frontend must not guess either way.
    expect(sourceKindLabel("", "pt")).toBe("FONTE");
    expect(sourceKindLabel("adr", "pt")).toBe("ADR");
  });
});
