// A NEW TypeScript engine — must be blocked by ADR-038.
export function scoreEntry(q: string, doc: string): number {
  const toks = tokenize(q);
  return toks.filter((t) => doc.includes(t)).length;
}
function tokenize(s: string) { return s.split(/\s+/); }
