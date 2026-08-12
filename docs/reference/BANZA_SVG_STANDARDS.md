# BANZA SVG Standards

**Document ID:** BANZA-SVG-STANDARDS-001  
**Date:** 2026-06-01  
**Status:** Authoritative  
**Authority:** BANZA-SVG-GOVERNANCE-001  
**Applies to:** All SVG files in the BANZA protocol documentation system

---

## Core Principle

SVG diagrams are protocol artifacts. They are governed with the same discipline as contracts, ADRs, and conformance vectors. An SVG that contradicts authoritative documentation is an error. The authoritative documentation wins.

---

## 1. Ownership Model

### Canonical Storage

All protocol SVGs live in the BANZA protocol repository:

```
~/banza/docs/reference/diagrams/
├── protocol/      ← Protocol-layer diagrams (architecture, federation, trust, certification)
├── banzai/        ← BanzAI-specific diagrams (used by /banzai only)
└── badges/        ← Conformance certification badges
```

**No SVG is authored in the BANZA website repository.** The website consumes SVGs; it does not define them.

### Deployment

The BANZA deploy script copies SVGs to the website at deploy time:

```bash
rsync -av "${BANZA_REPO}/docs/reference/diagrams/" \
      "${DEPLOY_HOST}:/srv/banza/src/website/public/diagrams/protocol/"
```

This runs inside `deploy_website()` after the `docs/reference/en/complete.md` rsync. The website `<img>` and `<Image>` components reference `/images/protocol/` paths.

### Ownership chain

Every SVG must have:

| Field | Rule |
|-------|------|
| Single source file | One `.svg` in `docs/reference/diagrams/` |
| Single owning document | One docs/reference/en/complete.md section, ADR, or RFC |
| Single authority source | The specific document that defines the content |
| No duplicates | No edited copies, no manual exports, no website variants |

If two files contain the same diagram, one is wrong. Delete the duplicate. The canonical source is always in the BANZA repo.

---

## 2. File Naming Convention

### Pattern

```
{name}-v{N}.svg
```

Where:
- `{name}` is `kebab-case`, all lowercase, no underscores
- `v{N}` is the major version (integer starting at 1)
- Version increments on any structural change to the diagram
- Minor text corrections do not increment the version

### Examples

```
protocol-hierarchy-v1.svg
trust-hierarchy-v1.svg
federation-overview-v1.svg
certification-levels-v1.svg
inter-operator-payment-flow-v1.svg
service-topology-v1.svg
brl-lifecycle-v1.svg
```

### Name must match the registry

The file name must match the `canonical_name` field in `BANZA_SVG_REGISTRY.md`. Mismatches are rejected by the governance check.

---

## 3. Mandatory Metadata Block

Every SVG must contain this comment block immediately after the `<svg>` opening tag:

```xml
<!--
  id:        SVG-P-NNN
  diagram:   <human-readable diagram name>
  version:   1.0
  source:    <docs/reference/en/complete.md §N | ADR-NNN | RFC-NNNN>
  updated:   YYYY-MM-DD
  author:    BANZA Protocol
  style:     protocol | protocol core | badge
-->
```

| Field | Rule |
|-------|------|
| `id` | Registry ID from `BANZA_SVG_REGISTRY.md`. Required. |
| `diagram` | Human-readable name matching the registry. Required. |
| `version` | Semver string starting at `1.0`. Required. |
| `source` | Authoritative document that defines the content. Required. |
| `updated` | ISO 8601 date of last structural change. Required. |
| `author` | Always `BANZA Protocol`. Required. |
| `style` | One of `protocol`, `protocol core`, or `badge`. Required. |

---

## 4. Visual Styles

BANZA uses two visual styles for SVG diagrams. Both are valid. Style is chosen based on the intended audience and context.

### Style A — Protocol Communication (style: protocol)

Used for: architecture overviews, trust hierarchies, federation flows, certification diagrams, operator-facing documentation.

| Property | Value |
|----------|-------|
| Background | `#FCF6F5` (var --bz-bg) |
| Surface / cards | `#EAE0DF` (var --bz-surface) |
| Border | `#D4C9C7` (var --bz-border) |
| Text primary | `#1A1A1A` (var --bz-text) |
| Text muted | `#6B6265` (var --bz-muted) |
| Accent / primary | `#990011` (var --bz-primary) |
| Accent gradient | `linear-gradient(135deg, #990011, #B11226)` |
| Gold accent | `#C89B3C` (var --bz-gold) |
| Font | `ui-sans-serif, system-ui, -apple-system, sans-serif` |
| Canvas width | 700–960 px (viewBox units) |
| Canvas height | proportional; typical 16:9 or 4:3 |
| Heading size | 16px font-weight 700 |
| Body text | 12–14px |
| Label text | 10–11px |

**Example header section:**
```xml
<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg"
     font-family="ui-sans-serif, system-ui, -apple-system, sans-serif">
  <rect width="800" height="500" fill="#FCF6F5"/>
  <!-- Title bar -->
  <rect x="20" y="16" width="760" height="42" rx="8"
        fill="url(#headerGrad)" filter="url(#sh)"/>
  <text x="400" y="42" text-anchor="middle" fill="white"
        font-size="16" font-weight="700">Diagram Title</text>
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#990011"/>
      <stop offset="100%" style="stop-color:#B11226"/>
    </linearGradient>
    <filter id="sh">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#00000014"/>
    </filter>
  </defs>
</svg>
```

### Style B — Protocol core Technical (style: protocol core)

Used for: protocol protocol core internals, ledger mechanics, trace models, developer reference. Paired with the code-like documentation in `spec/`.

| Property | Value |
|----------|-------|
| Background | `#0f0f0f` |
| Text primary | `#e8d5b7` |
| Text muted | `#555555` |
| Accent | `#990011` or `#B11226` |
| Font | `'Courier New', Courier, monospace` |
| Canvas width | 760 px |
| Canvas height | proportional |

### Style C — Badge (style: badge) — RETIRADA

Classe retirada no final transversal sweep: os badges de `conformance/badges/` foram removidos (um
badge lê-se como selo de estatuto; a conformidade demonstra-se por evidência reproduzível). Nenhum
badge é servido. Registado por história:

Compact (200×64 or similar), high-contrast, suitable for embedding in READMEs and operator manifests.

---

## 5. Color Palette Reference

All color values match the BANZA website CSS design tokens in `website/app/globals.css`.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bz-primary` | `#990011` | Accent, primary elements, header gradient start |
| `--bz-primary-dark` | `#7A000E` | Header gradient mid, pressed states |
| Primary gradient end | `#B11226` | Header gradient end |
| `--bz-bg` | `#FCF6F5` | Page background, SVG canvas |
| `--bz-surface` | `#EAE0DF` | Card/box backgrounds |
| `--bz-border` | `#D4C9C7` | Borders, dividers |
| `--bz-text` | `#1A1A1A` | Primary text |
| `--bz-muted` | `#6B6265` | Secondary text, labels |
| `--bz-gold` | `#C89B3C` | Gold accent (certification badges, warnings) |
| Protocol core bg | `#0f0f0f` | Protocol core-style SVG background |
| Protocol core text | `#e8d5b7` | Protocol core-style SVG text |

---

## 6. Canvas Sizes

| Use case | viewBox | Typical aspect |
|----------|---------|----------------|
| Protocol communication diagram | `0 0 800 500` | 16:10 |
| Wide overview (service topology) | `0 0 960 540` | 16:9 |
| Tall flow diagram | `0 0 700 600` | 7:6 |
| Protocol core technical diagram | `0 0 760 {height}` | varies |
| Badge | `0 0 200 64` | compact |

Do not hard-code `width` and `height` attributes on the `<svg>` element. Use `viewBox` only. The website controls display size via CSS.

**Exception:** Protocol core-style SVGs in `~/banza/docs/images/` currently include `width` and `height` attributes. These are acceptable for standalone documentation use but should be omitted in new files.

---

## 7. Accessibility

Every SVG must include:

```xml
<svg ... role="img" aria-labelledby="title-{id} desc-{id}">
  <title id="title-{id}">{diagram human name}</title>
  <desc id="desc-{id}">{one sentence describing what the diagram shows}</desc>
  ...
</svg>
```

Where `{id}` is the registry ID (e.g., `SVG-P-013`). Title and desc IDs must be unique within the document.

Interactive SVGs (none currently defined) must also include keyboard focus management and ARIA roles for interactive elements.

---

## 8. Language Standard

All text in BANZA SVGs is in **English only**.

Portuguese text is contamination. Any Portuguese label, title, subtitle, annotation, or legend is a defect. All UPDATE-classified SVGs with Portuguese text require translation as part of their migration action.

**Prohibited language patterns:**
- Portuguese labels: "Operadores", "Certificação", "Arquitectura", "Planeado"
- Portuguese states: "Activo", "Pendente", "Concluído"
- Portuguese actions: "Verificar", "Enviar", "Receber"

**Correct English equivalents:**
- "Operators", "Certification", "Architecture", "Planned"
- "Active", "Pending", "Completed"
- "Verify", "Send", "Receive"

---

## 9. Brand Rules

### Forbidden operator brand terms

No SVG may contain any operator brand name as a label. The forbidden brand
strings are enumerated in [OPERATOR_NEUTRALITY_TERMINOLOGY.md](../governance/OPERATOR_NEUTRALITY_TERMINOLOGY.md).

The automated `make identity-check` and `identity-guard` CI job enforce this. Any SVG pushed to the BANZA repo containing forbidden terms fails CI.

### Permitted terms

| Term | Usage |
|------|-------|
| `BANZA` | Protocol name — always uppercase |
| `BanzAI` | Native Protocol Agent — always this exact casing |
| `conformant operator` | Generic operator reference |
| `Operator A`, `Operator B`, `Operator C` | Example operators in flow diagrams |
| `Federation Operator` | L3-conformant operator |
| `Infrastructure Operator` | L4-conformant operator |
| `reference operator` | The first conformant operator (lowercase, never capitalized as a brand) |

---

## 10. Versioning Rules

| Change type | Action |
|------------|--------|
| Text correction (typo, translation) | Update `updated` date; version stays |
| Label rename (protocol-aligned change) | Update `updated` date; version stays |
| Layout change, new elements added | Increment version (`v1` → `v2`); update `updated` |
| Architectural change (reflects ADR update) | Increment version; update `source`; update registry |
| Complete rebuild | New version 1 (`v1`); new registry entry for new name |

Old versions are not retained in the repository. The registry records the current version. Version history is in git.

---

## 11. Validation Checklist

Before merging any new or updated SVG:

```
[ ] ID assigned in BANZA_SVG_REGISTRY.md
[ ] Metadata comment block present and complete
[ ] File name matches canonical_name in registry
[ ] version field is correct
[ ] source field references the correct ADR/section
[ ] updated date matches actual change date
[ ] No forbidden brand terms (make identity-check passes)
[ ] No Portuguese text
[ ] All text is English
[ ] Accessibility title and desc elements present
[ ] viewBox set; no hard-coded width/height (new files)
[ ] Color values match design token table above
[ ] Visual style is correct for diagram type (protocol/protocol core/badge)
[ ] Content does not contradict authoritative documentation
```
