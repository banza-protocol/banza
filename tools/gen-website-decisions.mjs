// Sync the canonical decision records into the website build context.
//
// The website renders ADRs and RFCs, and its Docker build context is website/, so the documents must
// exist inside it. That is a packaging constraint, not an editorial one — so this is a DERIVATION, not
// a second copy anyone edits. It mirrors decisions/{adr,rfc}/ byte for byte and deletes whatever is no
// longer there; check-website-decisions-parity.sh proves the mirror never drifts.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let copied = 0, removed = 0;
for (const kind of ["adr", "rfc"]) {
  const src = join(ROOT, "decisions", kind);
  const dst = join(ROOT, "website", "content", "decisions", kind);
  if (!existsSync(src)) continue;
  mkdirSync(dst, { recursive: true });
  const want = new Set(readdirSync(src).filter((f) => f.endsWith(".md") && f !== "README.md"));
  for (const f of readdirSync(dst)) {
    if (!want.has(f)) { rmSync(join(dst, f)); removed++; }
  }
  for (const f of want) {
    const bytes = readFileSync(join(src, f));
    const target = join(dst, f);
    const current = existsSync(target) ? readFileSync(target) : null;
    if (!current || !current.equals(bytes)) { writeFileSync(target, bytes); copied++; }
  }
}
console.log(`website decisions mirror: ${copied} written, ${removed} removed`);
