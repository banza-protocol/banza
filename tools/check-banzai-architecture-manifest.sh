#!/usr/bin/env bash
# check-banzai-architecture-manifest.sh — M2.19G.5F FINAL CLOSURE
#
# The canonical BanzAI architecture manifest (website/content/banzai/architecture-manifest.json) is the
# structured consistency contract behind Referência §12 ("12. BanzAI — Agente do Protocolo",
# /referencia/banzai). This guard proves two things:
#
#   A. Manifest ↔ §12 parity — the manifest agrees with the human-canonical chapter (canonical phrase,
#      the two complementary diagrams — external position (SVG-P-100) + internal cognitive engine
#      (SVG-P-101) — the prose authority boundary — §12 no longer carries an
#      authority table; the 9-row authority_matrix stays in the manifest as machine-readable data —
#      the 3 provenance levels, "protocol works without the BanzAI"). If prose and manifest drift, this fails.
#
#   B. The four §3 terminology invariants across the active surfaces:
#        - banzai_primary_transversal_interface_present
#        - banzai_mandatory_interface_claims == 0
#        - protocol_works_without_banzai_present
#        - direct_public_interfaces_present
#
# No jq (repo has none); structural assertions use `node -e`, which is always available here.
set -u
cd "$(dirname "$0")/.." || exit 2

MANIFEST="website/content/banzai/architecture-manifest.json"
REF="website/content/BANZA_REFERENCIA.md"
REFLIB="website/lib/reference.ts"

st=0
ok()  { echo "  OK: $1"; }
fl()  { echo "  FAIL: $1" >&2; st=1; }

echo "== A. manifest structure + parity =="

# A0. manifest parses and carries the required top-level keys.
node -e '
  const m = require("./'"$MANIFEST"'");
  const need = ["schema_version","architecture_version","last_reviewed","canonical_phrase","planes",
    "invariants","diagrams","authority_matrix","provenance_levels","repo_relations","runtime",
    "official_links","forbidden_strings","adrs","protocol_works_without_banzai"];
  const miss = need.filter(k => !(k in m));
  if (miss.length) { console.error("missing keys: " + miss.join(", ")); process.exit(1); }
  if (m.schema_version !== "banzai-architecture/1") { console.error("bad schema_version"); process.exit(1); }
  if (m.planes.length !== 5) { console.error("planes must be 5, got " + m.planes.length); process.exit(1); }
  if (m.diagrams.length !== 2) { console.error("diagrams must be 2, got " + m.diagrams.length); process.exit(1); }
  if (m.authority_matrix.rows.length !== 9) { console.error("authority rows must be 9"); process.exit(1); }
  if (m.provenance_levels.length !== 3) { console.error("provenance levels must be 3"); process.exit(1); }
  if (!/interface humana primária e transversal/.test(m.canonical_phrase.primary_pt)) { console.error("canonical primary phrase not in primary/transversal form"); process.exit(1); }
' 2>/tmp/mani.err && ok "manifest parses (5 planes · 2 diagrams · 9 authority rows · 3 provenance levels)" \
  || { fl "manifest structure invalid: $(cat /tmp/mani.err)"; }

# A1. the manifest canonical primary phrase appears verbatim in §12.
PRIMARY="$(node -e 'process.stdout.write(require("./'"$MANIFEST"'").canonical_phrase.primary_pt)')"
grep -qF "$PRIMARY" "$REF" && ok "manifest primary phrase is present verbatim in §12" \
  || fl "manifest primary phrase must appear verbatim in §12"

# A2. every manifest diagram exists (served + canonical trees) — the external-position figure
#     (SVG-P-100) and the cognitive-engine figure (SVG-P-101); §12 embeds both served paths.
while IFS='|' read -r served canonical; do
  [ -f "website/public${served}" ] && ok "served diagram exists: ${served}" || fl "served diagram missing: website/public${served}"
  [ -f "$canonical" ] && ok "canonical diagram exists: ${canonical}" || fl "canonical diagram missing: ${canonical}"
  # the chapter must embed the served path
  grep -qF "$served" "$REF" && ok "§12 embeds ${served}" || fl "§12 must embed ${served}"
done < <(node -e '
  const d = require("./'"$MANIFEST"'").diagrams;
  for (const x of d) console.log(x.served_path + "|" + x.canonical_path);
')

# A3. §12 now states authority as prose (no authority table). Assert the prose section + its
#     two boundary claims are present (the matrix stays in the manifest as machine-readable data).
grep -qF "### Autoridade e limites" "$REF" && ok "§12 authority section present (prose)" || fl "§12 missing '### Autoridade e limites' section"
grep -qF "orquestrar ferramentas não transfere" "$REF" && ok "§12 authority prose: orchestration does not transfer authority" || fl "§12 must state 'orquestrar ferramentas não transfere'"
grep -qF "não substitui um resultado" "$REF" && ok "§12 authority prose: a BanzAI answer does not replace a result" || fl "§12 must state 'não substitui um resultado'"

# A4. each provenance-level label appears in §12.
while IFS= read -r label; do
  grep -qiF "$label" "$REF" && ok "provenance level present in §12: ${label}" || fl "§12 missing provenance level: ${label}"
done < <(node -e 'for (const p of require("./'"$MANIFEST"'").provenance_levels) console.log(p.label_pt);')

echo "== B. §3 terminology invariants (active surfaces) =="

# Active surfaces scanned for mandatory-interface claims.
SURFACES=("$REF" "$REFLIB" "website/lib/decisions.ts")
while IFS= read -r f; do SURFACES+=("$f"); done < <(find website/app -name 'page.tsx' -type f)
while IFS= read -r f; do SURFACES+=("$f"); done < <(find website/components \( -name '*.tsx' -o -name '*.ts' \) -type f)

# B1. banzai_primary_transversal_interface_present — §12 + the chapter-12 card both carry the form.
{ grep -qi "interface humana primária" "$REF" && grep -qi "transversal" "$REF"; } \
  && ok "banzai_primary_transversal_interface_present (§12)" \
  || fl "§12 must carry 'interface humana primária' + 'transversal'"
{ grep -qi "interface humana primária" "$REFLIB" && grep -qi "transversal" "$REFLIB"; } \
  && ok "banzai_primary_transversal_interface_present (chapter-12 card)" \
  || fl "reference.ts ch.12 card must carry 'interface humana primária' + 'transversal'"

# B2. banzai_mandatory_interface_claims == 0 across active surfaces.
#   A mandatory claim = "sole interface" wording (missing the scoping "humana") or a positive
#   must-pass-through-BanzAI claim. "interface humana única" (scoped to human, paired with transversal)
#   is NOT a mandatory claim and is intentionally retained in ch.1/ch.4.
mand=0
for f in "${SURFACES[@]}"; do
  [ -f "$f" ] || continue
  # "interface única" / "única interface" (missing "humana") — sole-interface claim. Only the
  # human-scoped "interface humana única" (paired with transversal, ch.1/ch.4) is exempt; §12 uses
  # "interface transversal" and never the bare sole-interface form.
  h1=$(grep -niE 'interface única|única interface' "$f" | grep -viE 'humana única' || true)
  # positive must-pass-through claims (drop negated lines).
  h2=$(grep -niE 'ponto de passagem obrigatório|tem de passar pelo banzai|centro por onde tudo tem de passar' "$f" \
        | grep -viE 'nunca|não|nao|nem' || true)
  if [ -n "$h1$h2" ]; then
    fl "mandatory-interface claim in $f:"; printf '%s\n' "$h1" "$h2" | sed '/^$/d' | sed 's/^/      /' >&2
    mand=1
  fi
done
[ "$mand" -eq 0 ] && ok "banzai_mandatory_interface_claims == 0"

# B3. protocol_works_without_banzai_present — §12 and the manifest agree it must be stated.
grep -qiE 'funciona sem o banzai|verificável sem o banzai' "$REF" \
  && ok "protocol_works_without_banzai_present (§12)" \
  || fl "§12 must state the protocol works without the BanzAI"
node -e 'process.exit(require("./'"$MANIFEST"'").protocol_works_without_banzai.required_present === true ? 0 : 1)' \
  && ok "manifest requires the 'works without BanzAI' guarantee" \
  || fl "manifest.protocol_works_without_banzai.required_present must be true"

# B4. direct_public_interfaces_present — §12 shows the public interfaces reachable directly
#     (machine-to-machine), without depending on the BanzAI.
grep -qiE 'consumidores automáticos acedem directamente|sem passar pelo banzai|consumidor automático|acessíveis directamente|independentemente do banzai|integrações máquina-a-máquina' "$REF" \
  && ok "direct_public_interfaces_present (§12)" \
  || fl "§12 must show the public interfaces reachable directly (machine-to-machine)"

if [ "$st" -eq 0 ]; then echo "OK: banzai-architecture-manifest (parity + §3 terminology invariants)"; else echo "banzai-architecture-manifest-check FAILED" >&2; fi
exit $st
