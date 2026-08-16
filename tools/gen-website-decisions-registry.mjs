// Derive website/lib/decisions.ts from the canonical decision records.
//
// The website needs ADR/RFC metadata at build time without a runtime source. It used to be maintained
// by hand, which is how it came to hold slugs and paths from a previous numbering. It is now derived:
// the tree decides what exists and what each record is called.
//
// "Derived" was, until this file was rewritten, only two thirds true. Three records carried summaries
// and categories written by hand into a file headed "GENERATED — do not edit by hand", and running the
// generator would have replaced them. A file that claims an authority it does not have is worse than
// either honest alternative, because the claim is what stops anyone checking.
//
// Ownership is now explicit and complete:
//
//   IDENTITY   — id, type, slug, title, path, canonical URL, status — read from the record. Never
//                curated: the tree is the only thing that decides what exists.
//   EDITORIAL  — summary and category — derived by default, overridable in
//                decisions/registry-metadata.json when the derived value is wrong for a record.
//
// Two record formats are canonical, and both are parsed exactly — no fuzzy discovery:
//
//   ADR  a `# ADR-NNN — Title` heading
//   RFC  YAML frontmatter (`rfc:`, `title:`, `status:`), which is what the RFCs actually use. The
//        registry previously understood only the heading form, so all six RFCs existed on disk,
//        were mirrored into the site, were counted in the page's own "N RFCs" chip as zero, and
//        could not be reached from the library at all.
//
// Writes website/lib/decisions.ts, or the path in BANZA_DECISIONS_REGISTRY_OUT. That override is what
// lets a CI check GENERATE A CANDIDATE AND COMPARE without touching the tracked file: generators
// write, checks observe.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REPO = "https://github.com/banza-protocol/banza/blob/main";
const OUT = process.env.BANZA_DECISIONS_REGISTRY_OUT || join(ROOT, "website", "lib", "decisions.ts");

const CURATED = JSON.parse(
  readFileSync(join(ROOT, "decisions", "registry-metadata.json"), "utf8"),
);

function die(msg) {
  console.error(`gen-website-decisions-registry: ${msg}`);
  process.exit(1);
}

// Themes follow the logical reading order of the index, so the explorer can group records without a
// hand-maintained field that drifts from the tree.
const THEME = (n) =>
  n <= 8 ? "Identidade e camadas" :
  n <= 10 ? "Autoridade e determinismo" :
  n <= 26 ? "Execução e primitivas financeiras" :
  n <= 32 ? "Confiança e chaves" :
  n <= 40 ? "Conformidade, perfis e registo" :
  "Sistemas de referência e governação";

// The three states the library's filter offers. An RFC declares its own; an ADR in this tree is
// current by construction (the architecture reset left only current records — see ADR-057), so it is
// active unless it ever starts declaring otherwise.
const STATE = { draft: "rascunho", accepted: "activo", active: "activo", superseded: "substituido", withdrawn: "substituido" };

/** The YAML frontmatter block, as a flat map. Deliberately minimal: these are the scalar keys the
 *  registry needs, and anything richer would be a YAML parser this repository does not need. */
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/** First substantive paragraph of a named section, collapsed to one line for a card. */
function paragraphAfter(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return "";
  const rest = text.slice(m.index + m[0].length);
  const para = rest.split(/\n#{1,6} /)[0].split(/\n\s*\n/).find((p) => p.trim());
  return (para || "").replace(/\s+/g, " ").replace(/[*`[\]]/g, "").trim().slice(0, 240);
}

const rows = [];
for (const kind of ["adr", "rfc"]) {
  const dir = join(ROOT, "decisions", kind);
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  } catch { continue; }

  for (const f of files) {
    const body = readFileSync(join(dir, f), "utf8");
    let id, title, status;

    if (kind === "adr") {
      const first = body.split("\n").find((l) => l.startsWith("# ")) || "";
      const m = first.match(/^#\s*(ADR-\d{3,4})\s*[—-]\s*(.+)$/);
      if (!m) die(`decisions/${kind}/${f} has no "# ADR-NNN — Title" heading — the registry cannot derive it`);
      [, id, title] = m;
      status = "activo";
    } else {
      const fm = frontmatter(body);
      if (!fm || !fm.rfc || !fm.title) {
        die(`decisions/${kind}/${f} has no usable frontmatter (rfc + title) — the registry cannot derive it`);
      }
      id = `RFC-${String(fm.rfc).padStart(4, "0")}`;
      title = fm.title;
      const declared = String(fm.status || "").toLowerCase();
      status = STATE[declared];
      if (!status) die(`decisions/${kind}/${f} declares status "${fm.status}", which the registry does not map to a library state`);
    }

    const curated = CURATED.records?.[id] || {};
    const derivedSummary = kind === "adr"
      ? paragraphAfter(body, /\n## .+\n/)
      : paragraphAfter(body, /\n## Summary\s*\n/);
    const summary = curated.summary ?? derivedSummary;
    if (!summary) die(`${id} yields no summary and none is curated — the card would be empty`);

    const category = curated.category
      ?? (kind === "adr" ? THEME(parseInt(id.slice(4), 10)) : "Propostas técnicas");

    rows.push({
      type: kind.toUpperCase(), id, slug: id.toLowerCase(), title: title.trim(), status,
      path: `decisions/${kind}/${f}`, canonicalUrl: `${REPO}/decisions/${kind}/${f}`,
      category, summary,
    });
  }
}

// A category on a record that the curated order does not list is an EDITORIAL decision the generator
// must not make for itself. Appending silently is how a theme reaches the public surface unreviewed;
// omitting it silently is how a record becomes unfilterable. So: fail, and make someone choose.
const order = CURATED.category_order || [];
const used = [...new Set(rows.map((r) => r.category))];
const unlisted = used.filter((c) => !order.includes(c));
if (unlisted.length) {
  die(`category ${JSON.stringify(unlisted)} is used by a record but absent from category_order in decisions/registry-metadata.json`);
}
// Emit only the categories actually in use, in the curated order — so the filter can never offer a
// theme with nothing behind it, and can never omit one that has records.
const categories = order.filter((c) => used.includes(c));

const out = `// GENERATED by tools/gen-website-decisions-registry.mjs — do not edit by hand.
//
// Identity (id, type, slug, title, path, canonicalUrl, status) is read from decisions/{adr,rfc}/.
// Editorial metadata (summary, category) is derived by default and may be overridden per record in
// decisions/registry-metadata.json — that file, not this one, is where curated wording belongs.
// A clean regeneration reproduces this file byte for byte; CI verifies it without rewriting it.
export type DecisionType = "ADR" | "RFC";
export type DecisionStatus = "activo" | "rascunho" | "substituido";
export interface Decision {
  type: DecisionType;
  id: string;
  slug: string;
  title: string;
  status: DecisionStatus;
  path: string;
  canonicalUrl: string;
  category: string;
  summary: string;
}

export const decisions: Decision[] = ${JSON.stringify(rows, null, 2)};

export const decisionCategories: string[] = ${JSON.stringify(categories, null, 2)};

export function getDecision(slug: string): Decision | undefined {
  return decisions.find((d) => d.slug === slug);
}
`;
writeFileSync(OUT, out);
console.log(`website decisions registry: ${rows.length} records (${rows.filter((r) => r.type === "ADR").length} ADR, ${rows.filter((r) => r.type === "RFC").length} RFC) → ${OUT}`);
