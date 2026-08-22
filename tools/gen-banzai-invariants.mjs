// GENERATOR — the invariant registry, in the two forms the engine and the runtime each need.
//
// `contracts/invariants.json` is the authority. Nothing here restates it: the Rust side gets only what
// it needs to RECOGNISE an invariant by id, and the runtime side gets the record it needs to SERVE it.
// Both are derived, both are regenerated, neither is hand-edited.
//
// The normalized `key` exists because the query normalizer strips hyphens — "INV-LEDGER-003" reaches the
// router as "inv ledger 003". Matching the raw id would silently never fire, which is the kind of gate
// that opens and has nothing behind it.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const reg = JSON.parse(readFileSync(join(ROOT, "contracts/invariants.json"), "utf8"));

const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const all = reg.invariants.map((i) => ({
  id: i.id,
  key: norm(i.id),
  family: i.family,
  severity: i.severity,
  title: i.title,
  statement: i.statement,
  source: i.source,
}));

// Longest key first: "inv fed ledger 001" must win over "inv fed" if a shorter id ever exists.
all.sort((a, b) => b.key.length - a.key.length || a.id.localeCompare(b.id));

// FAMILIES, derived the same way. A member is reachable by its own id; the family question — "quais
// são as invariantes de QR?" — is a different unit in the universe and had no resolver at all, so it
// fell through to lexical retrieval and was answered with the protocol summary.
//
// The family label is the id minus its numeric member suffix. MON-001 has no family shape and is a
// standalone invariant, so it contributes no family — the same degenerate case the universe generator
// already refuses to emit a family unit for.
const families = new Map();
for (const i of all) {
  const parts = i.id.split("-");
  if (!/^\d+$/.test(parts[parts.length - 1])) continue;
  const fam = parts.slice(0, -1).join("-");
  if (fam.toLowerCase() === i.id.toLowerCase()) continue;
  if (!families.has(fam)) families.set(fam, []);
  families.get(fam).push(i.id);
}
// ONE bilingual label per family, declared here rather than grown as a phrase table.
//
// The family set itself comes from the registry — this only says what each family is CALLED in the two
// reader locales, because "INV-ROOT" is spelled "raiz" by a Portuguese reader and the id-derived alias
// ("root") would never match. It is the same kind of declared vocabulary as the profile registry: a
// fixed, protocol-defined set, not an open list of phrasings. A family with no entry here still
// resolves by its id-derived alias.
const FAMILY_LABELS = {
  "INV-LEDGER": ["ledger", "razao"],
  "INV-WALLET": ["wallet", "carteira", "carteiras"],
  "INV-QR": ["qr"],
  "INV-ROOT": ["root", "raiz"],
  "INV-FED": ["fed", "federacao", "federation"],
  "INV-FEDEVAL": ["fedeval", "avaliacao de federacao", "federation evaluation", "federation-evaluation"],
  "INV-OTE": ["ote", "open trust evaluation", "avaliacao de confianca aberta"],
  "INV-COLLECTION": ["collection", "cobranca", "coleta"],
  "INV-STL": ["stl", "settlement", "liquidacao"],
  "INV-IDEM": ["idem", "idempotencia", "idempotency"],
  "INV-TRACE": ["trace", "rastreio"],
  "INV-EVENT": ["event", "evento", "eventos"],
  "INV-IDENT": ["ident", "identidade", "identity"],
  "MON": ["mon", "monetario", "monetary"],
};

const familyRows = [...families].map(([fam, members]) => ({
  family: fam,
  key: norm(fam),
  members,
  aliases: [...new Set([
    norm(fam),
    norm(fam.replace(/^INV-/, "")),
    ...(FAMILY_LABELS[fam] || []).map(norm),
  ])].filter(Boolean).sort((a, b) => b.length - a.length),
})).sort((a, b) => b.key.length - a.key.length);

writeFileSync(
  join(ROOT, "engines/banzai-query-core/src/invariants.json"),
  JSON.stringify({ _generated_by: "tools/gen-banzai-invariants.mjs",
                   invariants: all.map(({ id, key, severity }) => ({ id, key, severity })),
                   families: familyRows }, null, 2) + "\n",
);
writeFileSync(
  join(ROOT, "services/banzai-api/src/invariantFacts.generated.json"),
  JSON.stringify({ _generated_by: "tools/gen-banzai-invariants.mjs",
                   canonical_source: reg.canonical_source, facts: all, families: familyRows }, null, 2) + "\n",
);
console.log(`  invariants: ${all.length} (critical: ${all.filter((i) => i.severity === "critical").length})  families: ${familyRows.length}`);
console.log(`  wrote engines/banzai-query-core/src/invariants.json`);
console.log(`  wrote services/banzai-api/src/invariantFacts.generated.json`);
