// ADR-042 — read-only operational TELEMETRY tool. Given the Rust-decided OperationalDecision
// (operational.rs `resolve_operational_metric`), this answers a duration/metric question about the
// validation journey from REAL persisted executions — latest / average / median / p95 / per-step — scoped
// to ONE compatibility tuple (operator, implementation, profile, environment, protocol_version) so
// incompatible runs are never mixed, and to PUBLIC executions only (workspace='public'). Numbers come
// ONLY from SQL aggregates over the durable receipt store (ADR-042); NO model ever produces or edits a
// number. When there are not enough comparable measurements the tool returns ok:false and the pipeline
// serves the Rust-authored honest, request-oriented fallback — never a fabricated value, never the fixed
// topic list.
//
// Claim taxonomy (ADR-042), applied DETERMINISTICALLY here (no model in the loop):
//   SUPPORTED  — a measured value present in the data (the latest observed run's total).
//   DERIVED    — a value computed from measured values (avg / median / p95 / min / max / per-step).
// ESTIMATED / HYPOTHETICAL / UNSUPPORTED never arise on this path (there is no inference and no model).

import * as receipts from "./receipts/index.js";

const STEP_LABEL_PT = Object.freeze({
  discovery: "Discovery",
  manifest: "Manifest",
  keys: "Keys",
  conformance: "Conformidade",
  interoperability: "Interoperabilidade",
  trust: "Confiança",
  federation: "Federação",
  evidence: "Evidence Bundle",
  certification: "Prontidão de certificação",
});

function stepLabel(id) {
  return STEP_LABEL_PT[id] || id;
}

// ms → a human, locale-stable duration string. A genuine 0 (missing/zero) is "—"; a positive sub-millisecond
// value (0 < ms < 1, or one that rounds to 0 ms) is "< 1 ms" — never a misleading "0 ms" (BZO-9). Sub-second
// stays in ms; ≥1 s shows one decimal second.
export function fmtDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const n = Number(ms);
  if (n <= 0) return "—"; // genuine zero / missing (and defensively, any non-positive)
  if (n < 1) return "< 1 ms"; // 0 < ms < 1 → sub-millisecond
  if (n < 1000) {
    const r = Math.round(n);
    return r === 0 ? "< 1 ms" : `${r} ms`; // rounds to 0 but > 0 → still sub-millisecond
  }
  return `${(n / 1000).toFixed(1)} s`;
}

// BZO-9 — the PT label for a non-user fallback sample, by kind. Used only when there is no comparable user
// journey and the aggregate falls back to the available non-user measurements (labelled explicitly, never
// silently passed off as a user journey).
function nonUserSampleLabel(kind) {
  switch (kind) {
    case "SYSTEM_E2E": return "de teste do sistema (campanha de instrumentação)";
    case "BENCHMARK": return "de benchmark";
    case "UNCLASSIFIED": return "não classificada(s)";
    default: return "de teste do sistema"; // MIXED_NON_USER / unknown → conservative honest label
  }
}

// BZO-9 — total excluded count + a machine-readable motivo per non-zero category, for the provenance line.
function excludedSummary(m) {
  const ex = m.excluded || {};
  const total = (ex.system_e2e || 0) + (ex.benchmark || 0) + (ex.reproduction || 0) + (ex.unclassified || 0);
  const parts = [];
  if (ex.system_e2e) parts.push(`${ex.system_e2e} teste-sistema`);
  if (ex.benchmark) parts.push(`${ex.benchmark} benchmark`);
  if (ex.reproduction) parts.push(`${ex.reproduction} reprodução`);
  if (ex.unclassified) parts.push(`${ex.unclassified} não-classificada`);
  return { total, motivo: parts.length ? parts.join(", ") : "nenhuma" };
}

// BZO-9 — the observed/comparable/excluded transparency line appended under every telemetry answer.
function countsLine(m) {
  const { total, motivo } = excludedSummary(m);
  const observed = m.observed != null ? m.observed : (m.comparable_execution_count ?? 0);
  const comparable = m.comparable != null ? m.comparable : (m.comparable_execution_count ?? 0);
  return `_Execuções: observadas ${observed} · comparáveis ${comparable} · excluídas ${total} (${motivo})._`;
}

// The public source binding for a telemetry-grounded answer — a citable, read-only pointer to the exact
// execution set that was aggregated (satisfies `groundedPublishable`: a grounded answer must carry public
// sources). NEVER a private workspace.
function telemetrySources(m) {
  const s = m.scope || {};
  const impl = s.implementation_id || "operator-zero-ref-impl";
  const sources = [
    {
      id: `telemetry:${impl}:${s.profile || "-"}:${s.environment || "-"}:${s.protocol_version || "-"}`,
      title: `Telemetria de execuções públicas — ${impl} (${s.profile || "—"}/${s.environment || "—"}/${s.protocol_version || "—"})`,
      path: `/banzai/validate/executions?implementation=${encodeURIComponent(impl)}`,
    },
  ];
  if (m.latest && m.latest.execution_id) {
    sources.push({
      id: m.latest.execution_id,
      title: "Última execução concluída (JourneyReceipt)",
      path: `/banzai/validate/execution?id=${encodeURIComponent(m.latest.execution_id)}`,
    });
  }
  return sources;
}

// The structured claims (each bound to its category) — the ADR-042 taxonomy, deterministic.
function durationClaims(m, decision) {
  const claims = [];
  if (m.latest && m.latest.total_ms != null) {
    claims.push({ claim: "latest_observed_total", category: "SUPPORTED", value_ms: m.latest.total_ms });
  }
  if (m.n > 1) {
    if (m.median_ms != null) claims.push({ claim: "median_total", category: "DERIVED", value_ms: m.median_ms });
    if (m.p95_ms != null) claims.push({ claim: "p95_total", category: "DERIVED", value_ms: m.p95_ms });
    if (m.avg_ms != null) claims.push({ claim: "average_total", category: "DERIVED", value_ms: m.avg_ms });
  }
  if ((decision.subject === "validation_step" || decision.metric === "slowest_step") && Array.isArray(m.per_step)) {
    for (const s of m.per_step) {
      claims.push({ claim: `step_median:${s.step_id}`, category: "DERIVED", value_ms: s.median_ms });
    }
  }
  return claims;
}

// The typed duration object the UI renders (DurationAnswerBlock) — never a markdown table (SafeMarkdown
// drops tables), and the observação/média distinction is STRUCTURAL so one run can never read as an average.
function durationView(m, decision) {
  const s = m.scope || {};
  let measureType;
  if (m.n <= 1) measureType = "observação";
  else if (decision.aggregation === "average") measureType = "média";
  else if (decision.aggregation === "p95") measureType = "percentil";
  else measureType = "mediana";
  return {
    measure_type: measureType,
    comparable_runs: m.comparable_execution_count || m.n || 0,
    profile: s.profile || null,
    environment: s.environment || null,
    protocol_version: s.protocol_version || null,
    implementation_id: s.implementation_id || null,
    latest_ms: m.latest ? m.latest.total_ms : null,
    median_ms: m.n > 1 ? m.median_ms : null,
    p95_ms: m.n > 1 ? m.p95_ms : null,
    avg_ms: m.n > 1 ? m.avg_ms : null,
    min_ms: m.n > 1 ? m.min_ms : null,
    max_ms: m.n > 1 ? m.max_ms : null,
    per_step: (m.per_step || []).map((x) => ({
      step_id: x.step_id, label: stepLabel(x.step_id), median_ms: x.median_ms, max_ms: x.max_ms, n: x.n,
    })),
    observed_from: m.observed_from || null,
    observed_to: m.observed_to || null,
    orchestrator_version: s.orchestrator_version || null,
    reproductions_excluded: m.reproductions_excluded || 0,
    // BZO-9: execution-kind classification + transparency counts, so the UI can label the sample honestly.
    execution_kind: m.execution_kind || (s.execution_kind || null),
    sample_kind: m.sample_kind || null,
    only_non_user_samples: !!m.only_non_user_samples,
    observed_count: m.observed != null ? m.observed : null,
    comparable_count: m.comparable != null ? m.comparable : null,
    excluded_counts: m.excluded || null,
    exclusion_reasons: m.exclusion_reasons || null,
    // §2: the exact statistical method, so the interface can state it and no two paths disagree.
    percentile_method: "percentile_cont — linear interpolation between adjacent ranks",
    aggregation_method: m.aggregation_method || null,
    units: "ms",
  };
}

// A short calendar date (UTC) from a timestamp, for the observed-period line. Locale-stable.
function shortDate(ts) {
  if (!ts) return null;
  const iso = (ts instanceof Date ? ts.toISOString() : String(ts));
  return iso.slice(0, 10); // YYYY-MM-DD
}

// §2 provenance/method line — always shown under a telemetry answer: sample size, observed period,
// statistical method, unit, and the reproductions-excluded note (transparency, never a silent drop).
function provenanceLine(m) {
  const from = shortDate(m.observed_from), to = shortDate(m.observed_to);
  const period = from && to ? (from === to ? from : `${from} → ${to}`) : "—";
  const repro = (m.reproductions_excluded || 0) > 0
    ? ` ${m.reproductions_excluded} reprodução(ões) excluída(s) da agregação.`
    : "";
  return (
    `_Método: **n = ${m.comparable_execution_count}**, período **${period}**; mediana e percentil 95 por ` +
    `interpolação linear (\`percentile_cont\`); unidade ms; instrumentação \`${(m.scope && m.scope.orchestrator_version) || "—"}\`.` +
    `${repro}_`
  );
}

// Deterministic PT markdown — bold-rich, no tables, no "Fonte:" in body (sources travel in sources[]).
// Numbers are taken VERBATIM from the SQL aggregates in `m`; nothing is inferred. BZO-9: when the only
// available measurements are non-user (SYSTEM_E2E / benchmark / unclassified), the answer OPENS with an
// explicit honest clause and every answer appends the observed/comparable/excluded transparency line.
function renderDuration(m, decision) {
  const s = m.scope || {};
  const scopeLine =
    `_Âmbito: implementação \`${s.implementation_id || "—"}\`, perfil **${s.profile || "—"}**, ` +
    `ambiente **${s.environment || "—"}**, protocolo **${s.protocol_version || "—"}** — execuções públicas concluídas._`;

  // BZO-9 honest opener when there is NO comparable user journey and we fell back to non-user samples.
  const onlyNonUser = !!m.only_non_user_samples;
  const N = m.comparable_execution_count;
  const honest = onlyNonUser
    ? `Não há jornadas de utilizador comparáveis; as únicas medições disponíveis são **${N}** ` +
      `execução(ões) ${nonUserSampleLabel(m.sample_kind)} — `
    : "";

  // Step-scoped answers (slowest / per-step)
  if (decision.metric === "slowest_step" && Array.isArray(m.per_step) && m.per_step.length) {
    const slowest = [...m.per_step].sort((a, b) => (b.median_ms || 0) - (a.median_ms || 0))[0];
    return [
      `${honest}A etapa mais lenta da jornada de validação é **${stepLabel(slowest.step_id)}**, com uma duração ` +
        `mediana de **${fmtDuration(slowest.median_ms)}** (máximo **${fmtDuration(slowest.max_ms)}**), ` +
        `sobre **${m.comparable_execution_count}** execução(ões) ${onlyNonUser ? "medida(s)" : "comparável(is)"}.`,
      "",
      scopeLine,
      provenanceLine(m),
      countsLine(m),
    ].join("\n");
  }
  if (decision.subject === "validation_step" && Array.isArray(m.per_step) && m.per_step.length) {
    const rows = m.per_step
      .map((x) => `- **${stepLabel(x.step_id)}**: mediana **${fmtDuration(x.median_ms)}** (máx. ${fmtDuration(x.max_ms)})`)
      .join("\n");
    return [
      `${honest}Duração **por etapa** da jornada de validação, sobre **${m.comparable_execution_count}** ` +
        `execução(ões) ${onlyNonUser ? "medida(s)" : "comparável(is)"}:`,
      "",
      rows,
      "",
      scopeLine,
      provenanceLine(m),
      countsLine(m),
    ].join("\n");
  }

  // Journey-total answers
  if (m.n <= 1) {
    const single = onlyNonUser
      ? `${honest}a única medição disponível demorou **${fmtDuration(m.latest && m.latest.total_ms)}** — ` +
        `uma observação individual, não uma duração média de jornadas de utilizador.`
      : `A **única** execução pública concluída comparável demorou **${fmtDuration(m.latest && m.latest.total_ms)}**. ` +
        `Isto é **uma observação individual**, não uma duração média geral — uma medição representativa exige ` +
        `mais execuções comparáveis.`;
    return [single, "", scopeLine, provenanceLine(m), countsLine(m)].join("\n");
  }
  const multi = onlyNonUser
    ? `${honest}a **mediana** destas medições foi **${fmtDuration(m.median_ms)}** e o **percentil 95** foi ` +
      `**${fmtDuration(m.p95_ms)}**. A **última** demorou **${fmtDuration(m.latest && m.latest.total_ms)}**.`
    : `Nas **${m.comparable_execution_count}** execuções públicas comparáveis, a **mediana** da jornada completa ` +
      `foi **${fmtDuration(m.median_ms)}** e o **percentil 95** foi **${fmtDuration(m.p95_ms)}**. A **última** ` +
      `execução demorou **${fmtDuration(m.latest && m.latest.total_ms)}**.`;
  return [multi, "", scopeLine, provenanceLine(m), countsLine(m)].join("\n");
}

// Factory (mirrors createLiveArtifactTool). `deps.readDurationMetrics` is injectable so tests are hermetic.
export function createTelemetryTool(env = process.env, { readDurationMetrics } = {}) {
  const read = readDurationMetrics || ((filters) => receipts.readDurationMetrics(filters, env));

  // ToolRequest: the Rust OperationalDecision. ToolResult:
  //   { ok:true, observation, duration, claims, answer_markdown, sources }
  // | { ok:false, error:{code} }  (pipeline serves the Rust honest fallback)
  async function getDuration(decision) {
    const d = decision || {};
    // Public scope only; default operator is the sole public operator (Operador Zero). Never client-supplied.
    const filters = {
      operator_id: "operator-zero",
      implementation_id: d.implementation_id || null,
      profile: d.profile || null,
      environment: d.environment || null,
      protocol_version: d.protocol_version || null,
    };
    let m;
    try {
      m = await read(filters);
    } catch (e) {
      return { ok: false, error: { code: "TELEMETRY_ERROR", message: String((e && e.message) || e) } };
    }
    if (!m || m.receipts_disabled) {
      return { ok: false, error: { code: "RECEIPTS_DISABLED", message: "O registo de execuções não está activo neste ambiente." } };
    }
    if (m.error) {
      return { ok: false, error: { code: "TELEMETRY_UNAVAILABLE", message: "A telemetria de execuções não está disponível de momento." } };
    }
    if (!m.n || m.comparable_execution_count < 1 || !m.latest) {
      return { ok: false, error: { code: "INSUFFICIENT_MEASUREMENTS", message: "Ainda não há execuções públicas comparáveis suficientes." } };
    }
    return {
      ok: true,
      observation: { ...m, comparable_n: m.comparable_execution_count, units: "ms" },
      duration: durationView(m, d),
      claims: durationClaims(m, d),
      answer_markdown: renderDuration(m, d),
      sources: telemetrySources(m),
    };
  }

  return { getDuration };
}
