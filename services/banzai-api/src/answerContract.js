// M2.14C — BanzAI Answer Rendering Contract (server side, PRIMARY guarantee).
//
// Every /ask response — deterministic, grounded (local Qwen), governance/protocol vocabulary, origin,
// action-boundary, no_source, cache — passes through `normalizeBanzaiAnswer` before it reaches the
// client. The contract: the answer BODY carries only the answer; sources live only in `sources[]`.
//
// The body must never contain an in-body source line: "Fonte:", "Fontes:", "Fontes citáveis:",
// "Sources:", "Citations:", "Referências:", or a textual list of files/paths. Deterministic entries
// are already authored clean (M2.14C stripped them); the local model is told not to write them and the
// context no longer shows a "Fontes citáveis:" label — but a probabilistic model can still slip, so this
// deterministic layer removes any residual source block and folds real, known references into
// `sources[]` (deduped; unknown ones dropped, never shown). It NEVER removes a source that is already
// present, and never invents one.

import { SOURCES } from "./knowledge.js";

// A source-citation label that must never begin an in-body line.
const LABEL =
  "(?:Fontes?\\s*cit[aá]veis|Fontes?\\s*usad[ao]s|Fontes?|Sources?|Citations?|Refer[eê]ncias?)";
// Optional markdown emphasis wrapping the label word (M2.14C SEC-FIX: the adversarial verifier found
// "**Fontes**:", "_Fontes_:", "## Fontes:" and "(**Fonte**: …)" bypassed the strip when the emphasis
// closed AFTER the word / a heading marker preceded it). `EMPH` matches the closing emphasis run between
// the label and the colon; `#`/`*`/`_` are allowed in the line-start prefix.
const EMPH = "(?:\\*\\*|__|\\*|_)?";
// The label at a line start / after a sentence boundary (or markdown heading/emphasis), then a colon.
const LABEL_AT_START = new RegExp(`(?:^|\\n)[ \\t>*_#\\-]*${LABEL}${EMPH}\\s*:`, "i");
// An inline parenthetical citation: "(Fonte: …)" / "(fontes citáveis: …)" / "(**Fonte**: …)".
const PAREN_CITE = new RegExp(`\\s*\\(${EMPH}(?:${LABEL})${EMPH}\\s*:[^)]*\\)`, "gi");

// Real repo directory prefixes — a slash after one of these is a genuine path, unlike ordinary slashed
// prose ("e/ou", "and/or", "client/server", "24/7", "TCP/IP").
const PATH_PREFIX =
  /\b(?:decisions|docs|engines|services|website|tools|contracts|spec|examples|infra|conformance|apps|\.github)\/[A-Za-z0-9_./*-]+/;

// A segment "looks like" a citation list (so we only strip real source text, never legit prose that
// happens to contain the word "fontes"/"sources"). True when it carries a real file, a real repo path,
// or a doc id — NOT a generic slashed word (M2.14C SEC-FIX: "e/ou", "client/server" must not qualify).
function looksLikeCitations(seg) {
  return (
    /[A-Za-z0-9_./-]+\.(?:md|json|rs|ts|tsx|js|sh|ya?ml|toml)\b/.test(seg) || // a file with an extension
    PATH_PREFIX.test(seg) || // a real repo path (dir-prefixed)
    /\b(?:ADR|RFC)-\d+/.test(seg) || // an ADR/RFC id
    /\b(?:GOVERNANCE|NOTICE|README|CLAUDE|MAINTAINERS|LICENSE|CHANGELOG|CONTRIBUTING|ANNEX)\b/.test(seg) // a bare doc id
  );
}

// Registry index: resolve a mentioned token (path, basename, id, or title fragment) to a known source.
let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  const byPath = new Map();
  const byId = new Map();
  const byBase = new Map();
  for (const src of Object.values(SOURCES)) {
    if (!src || !src.path) continue;
    byPath.set(src.path.toLowerCase(), src);
    if (src.id) byId.set(String(src.id).toLowerCase(), src);
    const base = src.path.replace(/[*/].*$/, "").split("/").pop();
    if (base) byBase.set(base.toLowerCase(), src);
  }
  INDEX = { byPath, byId, byBase };
  return INDEX;
}

function sourceKey(s) {
  return `${(s && (s.path || s.id) ? String(s.path || s.id) : JSON.stringify(s)).toLowerCase()}`;
}

// Best-effort: pull KNOWN sources out of a stripped citation segment. Unknown tokens are dropped.
function extractKnownSources(seg) {
  const { byPath, byId, byBase } = index();
  const found = [];
  const seen = new Set();
  const add = (src) => {
    if (!src) return;
    const k = sourceKey(src);
    if (seen.has(k)) return;
    seen.add(k);
    found.push({ id: src.id, title: src.title, path: src.path });
  };
  // ids like ADR-002 / RFC-0006
  for (const m of seg.matchAll(/\b(?:ADR|RFC)-\d+/gi)) add(byId.get(m[0].toLowerCase()));
  // bare doc ids
  for (const id of ["GOVERNANCE", "NOTICE", "README", "CLAUDE", "MAINTAINERS", "LICENSE", "CHANGELOG", "CONTRIBUTING", "ANNEX"]) {
    if (new RegExp(`\\b${id}\\b`).test(seg)) add(byId.get(id.toLowerCase()));
  }
  // file basenames / paths
  for (const m of seg.matchAll(/[A-Za-z0-9_./-]+\.(?:md|json|rs|ts|tsx|js|sh|ya?ml|toml)\b/g)) {
    const tok = m[0].toLowerCase();
    add(byPath.get(tok) || byBase.get(tok.split("/").pop()));
  }
  return found;
}

// M2.14C-FIX1 (Part 3/4) — CONSISTENT entity emphasis. The M2.14C pass bolded only the FIRST occurrence
// of each term, so a canonical entity appeared bold once and plain thereafter ("Banzami … BANZA …
// BanzAI …" with only the first of each in bold). This layer bolds EVERY textual occurrence of the
// canonical ecosystem entities and normalizes their spelling to the canonical form — while never
// touching text inside code / inline code / existing **bold** / markdown links / URLs, and never
// touching paths / domains / packages / doc-ids (banza.network, banzai-api, engines/banzai-api-kb,
// BANZA.md, ADR-006). Common words (protocolo, operador, pagamento, …) are deliberately NOT entities.
// Protected regions (kept verbatim — never emphasised inside): fenced code, double- & single-backtick
// inline code, existing **bold**, inline links/images, full reference links/images, reference
// definitions, autolinks, and bare URLs. Ordered so the greediest/most-specific alternative wins.
// Wrapped in ONE capture group so String.split keeps the delimiters (odd indices).
const PROTECTED = new RegExp(
  "(" +
    [
      "```[\\s\\S]*?```", // fenced code block
      "``[\\s\\S]*?``", // double-backtick inline code
      "`[^`]*`", // single-backtick inline code
      "\\*\\*[^*]+\\*\\*", // existing bold
      "!?\\[[^\\]]*\\]\\([^)]*\\)", // inline link / image
      "!?\\[[^\\]]*\\]\\[[^\\]]*\\]", // full reference link / image
      "\\[[^\\]]*\\]:", // reference-link definition (label:)
      "<https?://[^>]*>", // autolink
      "https?://\\S+", // bare URL
    ].join("|") +
    ")",
  "g",
);

// Ordered most-specific first. `ci` = case-insensitive match that EMITS the canonical spelling (fixes
// drift); otherwise the matched text is wrapped as-is (preserves plurals like "ADRs").
const CANONICAL_ENTITIES = [
  { canon: "Financial Action Boundary", pat: "financial action boundary", ci: true },
  { canon: "Action Boundary", pat: "action boundary", ci: true },
  { canon: "Apache License 2.0", pat: "apache license 2\\.0", ci: true },
  { canon: "Operador Zero", pat: "operador zero", ci: true },
  { canon: "Trust Root", pat: "trust root", ci: true },
  { canon: "KZ_DEMO", pat: "kz_demo", ci: true },
  { canon: "Banzami", pat: "banzami", ci: true },
  { canon: "BanzAI", pat: "banzai", ci: true },
  { canon: "BANZA", pat: "banza", ci: true },
  { canon: "Qwen", pat: "qwen", ci: true },
  // M2.14C-FIX2 — technology / stack proper nouns (Rust-first accurate). Most-specific first:
  // "Rust-first" before "Rust"; "Next.js"/"Node.js" carry their dot as part of the pattern.
  { canon: "Rust-first", pat: "rust-first", ci: true },
  { canon: "Rust", pat: "rust", ci: true },
  { canon: "WebAssembly", pat: "webassembly", ci: true },
  { canon: "WASM", pat: "wasm", ci: true },
  { canon: "TypeScript", pat: "typescript", ci: true },
  { canon: "JavaScript", pat: "javascript", ci: true },
  { canon: "Next.js", pat: "next\\.js", ci: true },
  { canon: "Node.js", pat: "node\\.js", ci: true },
  { canon: "React", pat: "react", ci: true },
  { canon: "PostgreSQL", pat: "postgresql", ci: true },
  { canon: "pgvector", pat: "pgvector", ci: true },
  { canon: "nginx", pat: "nginx", ci: true },
  { canon: "Docker", pat: "docker", ci: true },
  { canon: "JSON", pat: "json", ci: true },
  { canon: "Bash", pat: "bash", ci: true },
  { canon: "PASS", pat: "PASS", ci: false },
  { canon: "ADR", pat: "ADRs?", ci: false },
  { canon: "RFC", pat: "RFCs?", ci: false },
];

// A match is bolded only when delimited by "safe" characters: not a word char, not "@", and not a
// markdown-structural char (* ` [ ] ( ) < > ~) — so an entity glued to a link/code/bold/stray asterisk
// is left plain (SAFE: under-bold, never corrupt) — nor sitting inside a "word./-…" run (so paths,
// domains, packages and doc-ids like banza.network, banzai-api, engines/banzai-api-kb, BANZA.md, ADR-006
// are skipped). A trailing sentence period ("do BANZA.") still matches (period not followed by a word).
const NB = "\\w@*`\\[\\]()<>~";
const BEFORE = `(?<![${NB}])(?<!\\w[./-])`;
const AFTER = `(?![${NB}])(?![./-]\\w)`;

// Two combined SINGLE-pass replacers (built once). A single global `replace` consumes each match and
// advances past it, so a broader entity ("Financial Action Boundary") is never re-scanned by a narrower
// one ("Action Boundary") — this is what prevents self-nesting like "**Financial **Action Boundary****".
const CI = CANONICAL_ENTITIES.filter((e) => e.ci);
const NC = CANONICAL_ENTITIES.filter((e) => !e.ci);
const CI_RE = new RegExp(`${BEFORE}(?:${CI.map((e) => e.pat).join("|")})${AFTER}`, "gi");
const NC_RE = new RegExp(`${BEFORE}(?:${NC.map((e) => e.pat).join("|")})${AFTER}`, "g");
const CI_TESTS = CI.map((e) => ({ canon: e.canon, re: new RegExp(`^(?:${e.pat})$`, "i") }));
const ciCanon = (m) => {
  for (const t of CI_TESTS) if (t.re.test(m)) return t.canon;
  return m;
};

// M2.14C-FIX2 — slash-separated ENTITY lists ("Banzami/BANZA/BanzAI", "ADR/RFC", "Rust/WASM",
// "TypeScript/React/Next.js") must bold EACH segment. The single-entity pass deliberately skips a token
// adjacent to "/word" (the path guard), so these lists came out plain. A run qualifies here only when
// EVERY slash-segment is a canonical entity — so real paths / domains / doc-ids ("engines/banzai-api-kb",
// "banza.network", "ADR-006", "/operador-zero") never match (one non-entity segment disqualifies it).
const ENTITY_ALT = CANONICAL_ENTITIES.map((e) => e.pat).join("|");
const SLASH_RUN = new RegExp(
  `${BEFORE}(?:${ENTITY_ALT})(?:\\s*/\\s*(?:${ENTITY_ALT}))+${AFTER}`,
  "gi",
);
const ALL_TESTS = CANONICAL_ENTITIES.map((e) => ({
  canon: e.canon,
  ci: e.ci,
  re: new RegExp(`^(?:${e.pat})$`, e.ci ? "i" : ""),
}));
function matchEntity(t) {
  for (const e of ALL_TESTS) if (e.re.test(t)) return e;
  return null;
}
// All-or-nothing: bold each segment ONLY when EVERY slash-segment is a canonical entity (checked with
// the EXACT-case per-segment test). The SLASH_RUN regex is case-insensitive ('gi'), so it can
// over-qualify a run whose case-sensitive segment (PASS / ADRs? / RFCs?) appears lowercase — e.g.
// "rust/pass". Re-checking each segment case-correctly and leaving the WHOLE run untouched on any miss
// keeps the contract ("a mixed run stays untouched") and matches how a standalone lowercase "pass"/"adr"
// is (not) bolded.
function boldSlashRun(run) {
  const segs = run.split("/");
  const out = [];
  for (const seg of segs) {
    const t = seg.trim();
    const e = matchEntity(t);
    if (!e) return run; // one non-entity segment → leave the whole run untouched
    out.push(seg.replace(t, `**${e.ci ? e.canon : t}**`));
  }
  return out.join("/");
}

function normalizeEntityEmphasis(md) {
  if (!md) return md;
  const parts = md.split(PROTECTED);
  for (let i = 0; i < parts.length; i += 2) {
    // Even indices are plain (transformable); odd indices are protected spans, kept as-is.
    let seg = parts[i];
    if (!seg) continue;
    // Standalone entities first (the path guard leaves slash-joined ones untouched)…
    seg = seg.replace(CI_RE, (m) => `**${ciCanon(m)}**`);
    seg = seg.replace(NC_RE, (m) => `**${m}**`);
    // …then the slash-joined entity LISTS the single pass skipped.
    seg = seg.replace(SLASH_RUN, (m) => boldSlashRun(m));
    parts[i] = seg;
  }
  // Belt-and-suspenders: a wrapped entity abutting a protected **bold** across a split boundary can glue
  // two "**" into a "****" run; collapse any 4+ asterisk run into two separated bold delimiters so the
  // body NEVER carries "****". (Legitimate bold-italic "***" is preserved inside PROTECTED, untouched.)
  return parts.join("").replace(/\*{4,}/g, "** **");
}

/**
 * Normalize any BanzAI answer to the global rendering contract.
 * @param {string} answer  the raw answer body from any response path
 * @param {Array}  sources the structured sources[] already attached (may be empty)
 * @returns {{answer: string, sources: Array, removed_inbody_sources: boolean}}
 */
// M2.18 — PUBLIC-SOURCE POLICY (presentation half; the retrieval half is in lib.rs). A JS mirror of
// engines/banzai-query-core/src/source_policy.rs, the ONE authority. It is deliberately PATH-based, not
// category-based: this is an OPEN protocol repo and the M2.13B repo-wide knowledge feature cites across
// every content category (code, docs, guards/CI, license, website, Operador-Zero, reports) as
// maintainer-transparent sources — excluding a category would regress that. A source is INTERNAL —
// never shown in a public answer's sources[], whatever the (all-true) index public_safe says — only
// when its PATH is a file that is not protocol knowledge:
//   • assistant-instruction files: CLAUDE.md, CLAUDE_BASE.md (instructions to the agent, not docs),
//   • the rust-first legacy allowlist (an internal migration ledger),
//   • persistent assistant memory,
//   • any dotenv / secret-bearing file.
// This removes CLAUDE.md — an `implementation`-tagged, public_safe:true file that scores for ADR-002
// queries — from the answer to "me fala sobre a ADR 002", without touching legitimately-cited sources.
// Kept as a pure JS mirror (not a WASM call) so this choke point stays synchronously testable with no
// model/WASM load-order coupling; a node test asserts parity. If the two diverge, Rust is authoritative.
export function isPublicSource(src) {
  if (!src) return false;
  // Normalize before matching (M2.18 SEC-FIX, adversarial), in lockstep with the Rust authority
  // engines/banzai-query-core/src/source_policy.rs internal_by_path: backslashes → '/', drop any
  // ?query/#fragment, strip a leading './' and a trailing '/', match case-INSENSITIVELY. Otherwise
  // CLAUDE.MD / claude.md / docs\CLAUDE.md / CLAUDE.md?x=1 / docs/CLAUDE.md/ would leak.
  let path = String(src.path || "").trim().replace(/\\/g, "/");
  const cut = path.search(/[?#]/);
  if (cut >= 0) path = path.slice(0, cut);
  path = path.trim().replace(/^\.\//, "").replace(/\/+$/, "");
  if (!path) {
    // No provenance path — citable only if the id is a known public doc form (ADR/RFC); por omissão,
    // não citável (fecho por omissão). The authoritative policy lives in Rust (source_policy.rs).
    const id = String(src.id || "").trim();
    return /^(?:ADR|RFC)-?\d+/i.test(id) || /^(?:ADR|RFC)-INDEX$/i.test(id);
  }
  const lower = path.toLowerCase();
  if (lower === "claude.md" || lower.endsWith("/claude.md")) return false;
  if (lower.includes("claude_base")) return false;
  if (lower.includes("rust-first-legacy-allowlist")) return false;
  if (lower.startsWith("memory/") || lower.includes("/memory/")) return false;
  if (lower.includes(".env")) return false;
  return true;
}

export function normalizeBanzaiAnswer(answer, sources) {
  let body = String(answer == null ? "" : answer);
  const out = Array.isArray(sources) ? sources.filter(Boolean).slice() : [];
  let removed = false;

  // 1. Strip a trailing source BLOCK: from the FIRST citation label (line-start) to the end — but only
  //    when the tail actually looks like citations (never nuke legitimate prose).
  const m = body.match(LABEL_AT_START);
  if (m) {
    const nlOffset = m[0].startsWith("\n") ? 1 : 0;
    const idx = m.index + nlOffset;
    const tail = body.slice(idx);
    if (looksLikeCitations(tail)) {
      for (const src of extractKnownSources(tail)) out.push(src);
      body = body.slice(0, idx).trimEnd();
      removed = true;
    }
  }

  // 2. Strip inline parenthetical citations "(Fonte: …)".
  if (PAREN_CITE.test(body)) {
    PAREN_CITE.lastIndex = 0;
    for (const pm of body.matchAll(PAREN_CITE)) {
      if (looksLikeCitations(pm[0])) for (const src of extractKnownSources(pm[0])) out.push(src);
    }
    const cleaned = body.replace(PAREN_CITE, (mm) => (looksLikeCitations(mm) ? "" : mm));
    if (cleaned !== body) {
      body = cleaned;
      removed = true;
    }
  }

  // 3. Tidy whitespace left by removals.
  body = body.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // 3b. Apply consistent canonical-entity emphasis so every occurrence — not just the first — is bold
  //     and correctly spelled (M2.14C-FIX1).
  body = normalizeEntityEmphasis(body);

  // 4. Deduplicate sources[] by path/id, preserving order (existing first). M2.18 — and drop any
  //    INTERNAL source (CLAUDE.md and other governance/CI/infra/report/operator-zero files) here, the
  //    single presentation choke point every /ask path passes through. This is the guarantee that no
  //    internal file is ever cited, regardless of which retrieval path (curated, doc- or repo-
  //    enrichment) surfaced it.
  const seen = new Set();
  const deduped = [];
  for (const src of out) {
    if (!isPublicSource(src)) continue;
    const k = sourceKey(src);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(src);
  }

  return { answer: body, sources: deduped, removed_inbody_sources: removed };
}

// Test/guard helper — true if a body still carries an in-body source label followed by citations.
export function hasInBodySources(answer) {
  const body = String(answer == null ? "" : answer);
  const m = body.match(LABEL_AT_START);
  if (m) {
    const tail = body.slice(m.index);
    if (looksLikeCitations(tail)) return true;
  }
  PAREN_CITE.lastIndex = 0;
  for (const pm of body.matchAll(PAREN_CITE)) {
    if (looksLikeCitations(pm[0])) return true;
  }
  return false;
}
