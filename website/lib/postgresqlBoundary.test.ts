import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getReferenceChapter, getReferenceChapters } from "./reference";

// M2.7K — PostgreSQL is a verifiable protocol-state store, not a financial database (ADR-013).
// These are pure assertions over the committed schema, the reference chapter and the public diagrams.
// The authoritative, self-testing enforcement is tools/check-postgres-data-boundary.sh
// (make postgres-data-boundary-check); this suite pins the same boundary at the app/test layer.

const SCHEMA_PATH = join(process.cwd(), "..", "infra", "banza-network", "postgres", "init", "001_schema.sql");
const DIAGRAM_DIR = join(process.cwd(), "public", "diagrams", "protocol");

// Strip SQL line comments so boundary-declaring comments ("NO wallet/ledger/balance/KYC") are not
// counted as schema structure — only real DDL/DML is inspected.
function schemaWithoutComments(): string {
  return readFileSync(SCHEMA_PATH, "utf8")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
}

describe("PostgreSQL data boundary (ADR-013)", () => {
  const FORBIDDEN: [string, RegExp][] = [
    ["balance/wallet_balance", /balance/i],
    ["funds", /\bfunds?\b/i],
    ["money", /\bmoney\b/i],
    ["wallet", /\bwallet\b/i],
    ["ledger", /\bledger\b/i],
    ["payment_transaction", /payment_transaction/i],
    ["transactions", /\btransactions\b/i],
    ["settlement", /settlement/i],
    ["iban", /\biban\b/i],
    ["bank_account", /bank_account/i],
    ["card_number", /card_number/i],
    ["pan", /\bpan\b/i],
    ["cvv", /\bcvv\b/i],
    ["kyc", /\bkyc/i],
    ["aml_customer", /aml_customer/i],
    ["customer_pii", /customer_pii/i],
    ["private_key", /private_key/i],
    ["secret_key", /secret_key/i],
    ["seed_phrase", /seed_phrase/i],
    ["mnemonic", /mnemonic/i],
    ["password", /\bpassword\b/i],
    ["token", /\btoken\b/i],
  ];

  it("the committed schema contains no financial/personal/secret identifier", () => {
    const sql = schemaWithoutComments();
    for (const [label, re] of FORBIDDEN) {
      expect(re.test(sql), `schema must not contain a ${label} identifier`).toBe(false);
    }
  });

  it("keeps legitimate public-artifact identifiers", () => {
    const sql = schemaWithoutComments();
    for (const id of ["issuer_keys", "report_sha256", "key_manifest", "protocol_state", "root_manifest"]) {
      expect(sql.includes(id), `schema should keep ${id}`).toBe(true);
    }
  });

  it("declares segregated, non-superuser service roles", () => {
    const raw = readFileSync(SCHEMA_PATH, "utf8");
    for (const role of ["banza_ro", "banza_gov", "banzai_rw"]) {
      expect(raw).toContain(`CREATE ROLE ${role}`);
    }
    // banzai_rw may write ONLY the agent index tables.
    expect(raw).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON banzai_document, banzai_chunk, banzai_answer_cache TO banzai_rw/);
    expect(raw).not.toMatch(/SUPERUSER/i);
  });

  it("uses pgvector only for the agent index", () => {
    const raw = readFileSync(SCHEMA_PATH, "utf8");
    expect(raw).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(raw).toMatch(/banzai_chunk.*embedding vector\(1024\)/s);
  });
});

describe("PostgreSQL reference chapter (§5)", () => {
  it("renders at /referencia/estado-protocolar", () => {
    const ch = getReferenceChapter("estado-protocolar");
    expect(ch).toBeDefined();
    expect(ch!.num).toBe(5);
    expect(ch!.title).toContain("Estado Protocolar");
  });

  it("carries the canonical boundary statement", () => {
    const ch = getReferenceChapter("estado-protocolar")!;
    expect(ch.content).toContain("estado do protocolo, não valor financeiro");
    expect(ch.content).toContain("nem base de dados de operador");
  });

  it("sits at chapter 05 (after Architecture); FAQ is last (M2.7L IA; renumbered by M2.12B)", () => {
    const chapters = getReferenceChapters();
    expect(getReferenceChapter("estado-protocolar")!.num).toBe(5);
    expect(getReferenceChapter("arquitectura")!.num).toBe(4);
    expect(getReferenceChapter("faq")!.num).toBe(15);
    expect(chapters[chapters.length - 1].slug).toBe("faq");
  });

  it("is discoverable as a Reference chapter (M2.15B removed the Protocolo nav group)", () => {
    const ch = getReferenceChapter("estado-protocolar");
    expect(ch).toBeTruthy();
    expect(getReferenceChapters().some((c) => c.slug === "estado-protocolar")).toBe(true);
  });

  it("embeds the two Estado Protocolar diagrams, all present on disk", () => {
    const ch = getReferenceChapter("estado-protocolar")!;
    for (const svg of [
      "banza-estado-protocolar-modelo-v1.svg",
      "banza-estado-protocolar-temporalidade-v1.svg",
    ]) {
      expect(ch.content).toContain(`/diagrams/protocol/${svg}`);
      expect(existsSync(join(DIAGRAM_DIR, svg)), `${svg} must exist`).toBe(true);
    }
  });
});
