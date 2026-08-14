// Answer caches for BanzAI — the second and third cost-saving tiers.
//
// ExactCache: normalized question + provider + lang + answer mode + corpus hash
// → previously produced answer. SemanticCache: near-duplicate questions found by
// cosine similarity over deterministic lexical vectors (hashed bag-of-words) —
// no model, no network, fully offline. Both are in-process stores with LRU + TTL.
//
// The vectorizer is pluggable: on the VM, the same store logic persists to the
// pgvector table `banzai_answer_cache` (schema 001) once the real embedding
// indexer is configured — the cache key discipline (corpus hash invalidation)
// is identical. Nothing here ever stores secrets or keys — only questions,
// answers and cited source ids.

import crypto from "node:crypto";

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Bind EVERY distinguishing field the pipeline provides — not just the first five. Beyond
// question/provider/lang/mode/sourcesHash this includes repoIndexHash, safetyVersion,
// contractVersion, postValidationPolicy (ADR-036: a policy/contract bump evicts stale-policy
// answers, so a cache hit can only ever return an answer validated under the CURRENT policy) and
// the resolved document/entity identity (so two distinct (entity, document) requests never collide
// on the exact cache). Keys are sorted so insertion order is irrelevant; all values are
// deterministic per request (no timestamps), so the hash is stable.
export function cacheKey(fields) {
  const entries = Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return sha256(JSON.stringify(entries));
}

// Deterministic lexical vector: hash each token into a fixed-dimension bag,
// L2-normalize. Cheap, offline, reproducible — good enough to catch paraphrases
// that share vocabulary; the pgvector/embedding upgrade path keeps the same shape.
export function lexicalVector(normalizedQuestion, dim = 256) {
  const v = new Float64Array(dim);
  for (const tok of String(normalizedQuestion).split(" ").filter((t) => t.length > 2)) {
    const h = crypto.createHash("sha1").update(tok).digest();
    v[h.readUInt32BE(0) % dim] += 1;
  }
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // inputs are L2-normalized
}

class LruStore {
  constructor({ maxEntries = 500, ttlMs = 24 * 60 * 60 * 1000, nowFn = Date.now } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.nowFn = nowFn;
    this.map = new Map(); // insertion order = LRU order
  }
  prune() {
    const now = this.nowFn();
    for (const [k, e] of this.map) if (now - e.at > this.ttlMs) this.map.delete(k);
    while (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value);
  }
}

export class ExactCache extends LruStore {
  constructor(opts) {
    super(opts);
    this.hits = 0;
    this.misses = 0;
  }
  get(keyFields) {
    this.prune();
    const k = cacheKey(keyFields);
    const e = this.map.get(k);
    if (!e) {
      this.misses += 1;
      return null;
    }
    this.map.delete(k); // LRU bump
    this.map.set(k, e);
    this.hits += 1;
    return e.value;
  }
  set(keyFields, value) {
    const k = cacheKey(keyFields);
    this.map.delete(k);
    this.map.set(k, { at: this.nowFn(), value });
    this.prune();
  }
}

export class SemanticCache extends LruStore {
  constructor({ threshold = 0.92, vectorize = lexicalVector, ...opts } = {}) {
    super(opts);
    this.threshold = threshold;
    this.vectorize = vectorize;
    this.hits = 0;
    this.misses = 0;
  }
  // A candidate must match on provider/lang/mode/sourcesHash (a corpus change invalidates semantic
  // hits exactly like exact ones) AND on the post-validation policy + contract version (ADR-036) AND
  // on the resolved document/entity identity — otherwise a >=threshold lexical paraphrase about a
  // DIFFERENT entity could return the wrong entity's validated answer (cross-entity contamination).
  find(fields) {
    const {
      question, provider, lang, mode, sourcesHash,
      contractVersion = null, postValidationPolicy = null, document_id = null, entity_id = null,
    } = fields;
    this.prune();
    const qv = this.vectorize(question);
    let best = null;
    let bestSim = 0;
    for (const e of this.map.values()) {
      if (
        e.provider !== provider || e.lang !== lang || e.mode !== mode || e.sourcesHash !== sourcesHash ||
        e.contractVersion !== contractVersion || e.postValidationPolicy !== postValidationPolicy ||
        e.document_id !== document_id || e.entity_id !== entity_id
      )
        continue;
      const sim = cosine(qv, e.vector);
      if (sim > bestSim) {
        bestSim = sim;
        best = e;
      }
    }
    if (best && bestSim >= this.threshold) {
      this.hits += 1;
      return { value: best.value, similarity: Number(bestSim.toFixed(4)) };
    }
    this.misses += 1;
    return null;
  }
  add(fields, value) {
    const {
      question, provider, lang, mode, sourcesHash,
      contractVersion = null, postValidationPolicy = null, document_id = null, entity_id = null,
    } = fields;
    const k = cacheKey(fields);
    this.map.delete(k);
    this.map.set(k, {
      at: this.nowFn(),
      vector: this.vectorize(question),
      provider,
      lang,
      mode,
      sourcesHash,
      contractVersion,
      postValidationPolicy,
      document_id,
      entity_id,
      value,
    });
    this.prune();
  }
}
