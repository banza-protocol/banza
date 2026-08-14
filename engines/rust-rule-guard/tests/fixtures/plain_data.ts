// Pure data + trivial lookup. Mentions "conformance" and "invariant" as prose,
// but has no strong engine marker — must be allowed.
export const decisions = [{ id: "ADR-001", summary: "conformance and invariant policy" }];
export function getDecision(slug: string) { return decisions.find((d) => d.id === slug); }
