// Run the V2 corpus locally through the SAME transport production uses.
//
// The earlier version threaded the raw forward-context object between turns, which is the shape the
// engine emits and NOT the shape the next turn receives — so it could not have seen the field the
// server was dropping. Journeys are only meaningful when the sanitizer is in the loop.
import { readFileSync, writeFileSync } from "node:fs";
import { harness } from "./test/_pipeline-harness.mjs";
import { canaryProvider } from "./test/_production-canary.mjs";

const src = readFileSync(new URL("./src/server.js", import.meta.url), "utf8");
const slice = src.slice(src.indexOf("const CONVERSATION_CONTEXT_FIELDS"), src.indexOf("const LOCAL_INFERENCE_ENABLED"));
const { sanitizeConversationContext: sanitize } = await import(
  `data:text/javascript,${encodeURIComponent(slice + "\nexport { sanitizeConversationContext };")}`);

const corpus = readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const out = [];
for (const it of corpus) {
  const turns = it.turns || [{ question: it.question }];
  const records = [];
  const c = canaryProvider("MODEL PROSE");
  const h = harness({ provider: c.provider });
  let wire; const history = [];
  for (const t of turns) {
    let r;
    try {
      r = await h.pipeline.answer(t.question, {
        locale: it.locale,
        ...(history.length ? { contextQuestions: history.slice(-2) } : {}),
        ...(wire ? { conversationContext: wire } : {}),
      });
    } catch (e) {
      r = { result: { answer: "", terminal_kind: "operational_failure", error: String(e).slice(0, 120) }, meta: {} };
    }
    const res = r.result || {}, meta = r.meta || {};
    records.push({
      question: t.question, status: 200, latency_ms: 0,
      answer: res.answer ?? null, answer_locale: res.answer_locale ?? null,
      terminal_kind: meta.terminal_kind ?? res.terminal_kind ?? null,
      intent: meta.intent ?? null,
      local_model_called: meta.llm_called ?? null,
      sources: (res.sources || []).map((s) => ({ id: s.id, path: s.path })),
      sources_count: (res.sources || []).length,
      entry_id: res.entry_id ?? null,
      conversation_context_used: meta.conversation_context_used ?? null,
    });
    history.push(t.question);
    if (meta.conversation_context) wire = sanitize(meta.conversation_context);
  }
  out.push({ ...it, turns: undefined, records });
}
writeFileSync(process.argv[3], out.map((o) => JSON.stringify(o)).join("\n") + "\n");
console.error(`local run: ${out.length} items`);
