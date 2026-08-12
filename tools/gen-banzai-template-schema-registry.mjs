#!/usr/bin/env node
// M2.18B.7 DFN-7 — the template-schema registry generator.
//
// Drives the ENGINE's own schema validator (WASM `validate_against_schema_json`) over every catalogue
// TEMPLATE, against its REAL canonical schema file, and records per template: schema id + path + version +
// checksum, the required fields, and the validation verdict. This is the artefact the production readiness
// guard asserts (every template validates; no invented fields; checksum recorded). Deterministic, no model.
//
// Usage:  node tools/gen-banzai-template-schema-registry.mjs         (write)
//         node tools/gen-banzai-template-schema-registry.mjs --check  (fail on drift)

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "services/banzai-api/"));
const kb = require("./src/rustkb/banzai_api_kb.js");
const OUT = join(ROOT, "artifacts/m2-18b7/template-schema-registry.json");

function fnv1a(s) {
  let h = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s)) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

const templates = JSON.parse(kb.catalogue_templates_json());
if (!Array.isArray(templates) || templates.length === 0) {
  console.error("template-schema-registry: no catalogue templates from the engine");
  process.exit(1);
}

const rows = [];
let allValid = true;
for (const t of templates) {
  const schemaRaw = readFileSync(join(ROOT, t.schema_path), "utf8");
  const schema = JSON.parse(schemaRaw);
  const verdict = JSON.parse(kb.validate_against_schema_json(t.body_json, JSON.stringify(schema)));
  if (!verdict.ok) allValid = false;
  const schemaRequired = Array.isArray(schema.required) ? [...schema.required].sort() : [];
  rows.push({
    subject: t.subject,
    schema_id: t.schema_id,
    schema_path: t.schema_path,
    schema_declared_id: schema.$id || "",
    schema_version: schema._spec_version || schema.version || "",
    schema_checksum: fnv1a(schemaRaw),
    additional_properties_closed: schema.additionalProperties === false,
    schema_required: schemaRequired,
    claimed_required: [...t.required_fields].sort(),
    body_validates: verdict.ok,
    validation_errors: verdict.errors || [],
  });
}
rows.sort((a, b) => a.subject.localeCompare(b.subject));

const registry = {
  _meta: {
    milestone: "M2.18B.7 DFN-7",
    generator: "tools/gen-banzai-template-schema-registry.mjs",
    principle:
      "Every published template is a deterministic instance validated against its REAL canonical schema by the engine's own validator — no invented fields, schema checksum recorded, output tied to the FactualPackage, no second Qwen call.",
  },
  total_templates: rows.length,
  all_valid: allValid,
  templates: rows,
  checksum: fnv1a(rows.map((r) => `${r.subject}:${r.schema_checksum}:${r.body_validates}`).join("|")),
};

const json = JSON.stringify(registry, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    console.error("template-schema-registry: artefact missing — run the generator");
    process.exit(1);
  }
  if (current !== json) {
    console.error("template-schema-registry: STALE — regenerate with node tools/gen-banzai-template-schema-registry.mjs");
    process.exit(1);
  }
  if (!registry.all_valid) {
    console.error("template-schema-registry: a template does NOT validate against its schema");
    process.exit(1);
  }
  console.log(`template-schema-registry current: ${rows.length} templates, all_valid=${allValid}`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${OUT}: ${rows.length} templates, all_valid=${allValid}`);
  for (const r of rows) console.log(`  ${r.subject}: ${r.schema_id} valid=${r.body_validates} checksum=${r.schema_checksum}`);
}
