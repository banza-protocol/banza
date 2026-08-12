import { readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { getDecision } from "@/lib/decisions";

// Server-only loader for the full ADR/RFC document body. Reads a byte-for-byte
// snapshot of the canonical document (website/content/decisions/{adr,rfc}/)
// that is copied unmodified from decisions/adr/ and decisions/rfc/. The snapshot exists so
// the content is inside the Docker build context (process.cwd() = website).
//
// The ONLY transformation applied is technical, not editorial: a leading YAML
// frontmatter block (`--- … ---`, used by RFCs) is stripped before rendering,
// because those fields are surfaced as page metadata, not document body. The
// prose, headings, lists, tables, code and language of the original are
// preserved exactly — no translation, summary, paraphrase or terminology change.

const CONTENT_DIR = join(process.cwd(), "content", "decisions");

function stripLeadingFrontmatter(md: string): string {
  // Only a frontmatter block at the very start of the file (RFC YAML). ADRs use
  // `---` as horizontal rules mid-document, so this never touches them.
  const m = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? md.slice(m[0].length).replace(/^\s+/, "") : md;
}

export function getDecisionMarkdown(slug: string): string | null {
  const d = getDecision(slug);
  if (!d) return null;
  const sub = d.type === "ADR" ? "adr" : "rfc";
  const file = basename(d.path);
  try {
    const raw = readFileSync(join(CONTENT_DIR, sub, file), "utf8");
    return stripLeadingFrontmatter(raw);
  } catch {
    return null;
  }
}
