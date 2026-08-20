// The canonical nine-step validation spine (ADR-034 §21), as data.
//
// This lives on its own because the order is a FACT about the protocol's validation journey, not a
// property of the module that executes it. It used to be exported from validate.js, and importing it from
// there meant importing everything validate.js needs — the receipt store, and through it a PostgreSQL
// driver. A module that only wants to know which step comes after "conformance" was made to depend on a
// database client, and the cost was invisible until a clean checkout without that driver installed could
// not run the behavioural suite at all.
//
// So the constant sits where anything may read it, and validate.js re-exports it to keep its own callers
// unchanged. The order is the single source; nothing redefines it.
export const STEP_ORDER = [
  "discovery",
  "manifest",
  "keys",
  "conformance",
  "interoperability",
  "trust",
  "federation",
  "evidence",
  "certification",
];
