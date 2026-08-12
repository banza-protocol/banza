// M2.18B.6 — a tiny, neutral JSON extractor: pull the first balanced JSON object/array out of a model
// completion (handles code fences / stray prose around it). Used by the single grounded synthesis pass.

export function extractJson(text) {
  if (!text) return "";
  let t = String(text).trim();
  // Strip a leading ```json / ``` fence and a trailing fence.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i >= 0 && j > i) return t.slice(i, j + 1);
  return t;
}
