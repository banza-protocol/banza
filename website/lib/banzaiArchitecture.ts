import { readFileSync } from "node:fs";
import { join } from "node:path";

// Build-time loader for the canonical BanzAI architecture manifest — the structured consistency
// contract that backs Referência §12 (docs/reference/pt/BANZA_REFERENCIA.md, «12. BanzAI — Agente do
// Protocolo», published at /referencia/banzai). The Docker build context is `website/` only, so the
// manifest lives under website/content/banzai/. The markdown chapter stays the human-canonical source;
// this manifest makes its facts machine-checkable, and guards assert the two agree. Pattern mirrors
// whitepaper.ts and reference.ts (readFileSync + JSON.parse — no runtime fetch, no external deps).

const MANIFEST_PATH = join(process.cwd(), "content", "banzai", "architecture-manifest.json");

export type BanzaiPlane = {
  id: string;
  label_pt: string;
  label_en: string;
  summary_pt: string;
};

export type BanzaiDiagram = {
  id: string;
  name: string;
  section_pt: string;
  served_path: string;
  canonical_path: string;
  role: string;
};

export type BanzaiAuthorityMatrix = {
  columns: string[];
  rows: string[][];
};

export type BanzaiProvenanceLevel = {
  id: string;
  label_pt: string;
  binding_pt: string;
  summary_pt: string;
};

export type BanzaiRepoRelation = {
  repo: string;
  role: "canonical" | "historical-archive";
  summary_pt: string;
  qualifier_pt: string;
};

/** One string, realized in each edition. */
export type Localized = { pt: string; en: string };

export type BanzaiRuntimeContract = {
  route: string;
  method: string;
  schema_version: string;
  adr: string;
  produced_by: string;
  consumed_by: string;
  authoritative: boolean;
  fields: string[];
  enums: Record<string, string[]>;
  fetch: {
    origin_env: string;
    origin_default: string;
    revalidate_seconds: number;
    timeout_ms: number;
    on_failure: string;
  };
  labels: {
    provenance_pt: string;
    verified_prefix_pt: string;
    fallback_pt: string;
    fallback_detail_pt: string;
    provenance_en: string;
    verified_prefix_en: string;
    fallback_en: string;
    fallback_detail_en: string;
  };
  rule_pt: string;
  rule_en: string;
  // Reader-facing labels per edition. They live in the manifest rather than in the component so the strip
  // composes no prose of its own — the same reason the Portuguese ones were put here.
  section_label: Localized;
  aria_label: Localized;
  field_labels: Record<string, Localized>;
  value_labels: Record<string, Localized>;
};

export type BanzaiArchitectureManifest = {
  schema_version: string;
  architecture_version: string;
  last_reviewed: string;
  status: string;
  purpose: string;
  reference_chapter: {
    number: number;
    title: string;
    route: string;
    source: string;
    anchor: string;
  };
  canonical_phrase: {
    primary_pt: string;
    primary_en: string;
    full_pt: string;
    full_en: string;
    avoid_isolated_pt: string;
    avoid_note: string;
  };
  protocol_works_without_banzai: {
    pt: string;
    en: string;
    required_present: boolean;
  };
  planes: BanzaiPlane[];
  invariants: string[];
  diagrams: BanzaiDiagram[];
  retired_diagrams: string[];
  authority_matrix: BanzaiAuthorityMatrix;
  provenance_levels: BanzaiProvenanceLevel[];
  repo_relations: BanzaiRepoRelation[];
  runtime: BanzaiRuntimeContract;
  official_links: { label: string; href: string }[];
  terms: { pt: string; en: string; canonical_in_chapter?: string }[];
  forbidden_strings: { value: string; unless?: string; scope?: string }[];
  adrs: { id: string; subject: string }[];
};

let cached: BanzaiArchitectureManifest | null = null;

/** Load and cache the canonical BanzAI architecture manifest. */
export function getBanzaiArchitecture(): BanzaiArchitectureManifest {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as BanzaiArchitectureManifest;
  return cached;
}

/** The canonical primary phrase (PT), the single formulation every surface should echo. */
export function getCanonicalPhrasePt(): string {
  return getBanzaiArchitecture().canonical_phrase.primary_pt;
}

/** The canonical diagrams — external position (SVG-P-100) + cognitive engine (SVG-P-101). */
export function getBanzaiDiagrams(): BanzaiDiagram[] {
  return getBanzaiArchitecture().diagrams;
}

/** The runtime SSOT contract (route, fields, fetch policy, strip labels). */
export function getBanzaiRuntimeContract(): BanzaiRuntimeContract {
  return getBanzaiArchitecture().runtime;
}
