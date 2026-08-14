#!/usr/bin/env bash
# make banzai-upload-copy-check — M2.9C guard (ADR-042), retargeted for M2.19G.1 (ADR-038).
#
# Endpoint-originated model (ADR-038 §4.4/§4.5): the OFFICIAL operator-validation journey takes NO manual
# input — no upload, paste, drag-drop, URL or fixture. Uploading/pasting is permitted ONLY in the
# isolated developer draft tool (DraftValidationTool, "Validar rascunho" under Programadores), whose
# result is labelled DRAFT_VALIDATION_RESULT and carries the permanent banner
# "Rascunho local · não publicado · não produz evidência oficial". This guard fails if:
#   - user-visible copy contains "fixture" (a test term) — identifiers/comments are OK;
#   - the draft tool's "Carregar ficheiro JSON" affordance, permanent banner or DRAFT_VALIDATION_RESULT
#     label is missing;
#   - upload/paste affordances leak into the OFFICIAL validation surface (validationJourney / the in-shell
#     validation UI);
#   - the draft upload has no size limit, or does not run the Rust secret/JSON scan;
#   - the draft tool persists state outside memory (localStorage/sessionStorage/IndexedDB/cookie);
#   - the draft copy claims that uploading/validating certifies/approves/produces official evidence;
#   - the draft tool forwards the raw file body off-host (e.g. to /ask) instead of staying isolated.
#
# Invariant preserved: upload copy is safe + non-authoritative, and manual input is quarantined to the
# draft tool — never the official journey.
#
# Self-testing: exits 2 if its own detectors regress; 1 on a real finding; 0 clean.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

AGENT=website/components/banzai/BanzaiAgent.tsx
AGENTDATA=website/components/banzai/banzai-agent.ts
# M2.19G.1 (ADR-038) — upload/paste live ONLY in the isolated developer draft tool.
DRAFT=website/components/banzai/DraftValidationTool.tsx
# The OFFICIAL validation surface — must stay free of any manual-input affordance.
VJOURNEY=website/components/banzai/validationJourney.tsx
VSHELL=website/components/banzai/BanzaiValidationMode.tsx
WRAP=website/lib/banzaOperatorJourney.ts
ENGINE=engines/banzai-operator-journey/src/lib.rs
WASM=engines/banzai-operator-journey/src/wasm.rs
KB=website/components/home/banzaiKb.ts

# ── Testable detectors (self-tested) ─────────────────────────────────────────
# Fixture as USER-VISIBLE text: inside a <SectionLabel>, a display attribute, or common visible phrases.
# Does NOT match code identifiers (loadManifestFixtures, TRACE_FIXTURES, .fixtures, fixtureKey, …).
public_fixture() {   # reads text on stdin ; 0 if visible "fixture" copy is present
  grep -inE '<SectionLabel>[^<]*fixture|(title|subtitle|placeholder|aria-label)="[^"]*fixture|carregar fixture|usar fixture|fixture demo|demo fixture|fixture[[:space:]]+(válid|inválid|assinad)|use[[:space:]]+fixtures|(escolha|seleccione)[[:space:]]+(uma|um)[[:space:]]+fixture'
}
has_browser_persistence() {   # reads text on stdin ; 0 if a browser/DB persistence API is actually USED
  grep -iE '(localStorage|sessionStorage|indexedDB)[[:space:]]*[.[]|document\.cookie[[:space:]]*=|window\.name[[:space:]]*='
}

selftest() {
  printf '        <button>Carregar fixture válida</button>\n' | public_fixture >/dev/null \
    || { echo "SELFTEST FAIL: public_fixture missed a visible label"; exit 2; }
  printf '  loadManifestFixtures().then((s) => setSet(s));\n' | public_fixture >/dev/null \
    && { echo "SELFTEST FAIL: public_fixture false-positive on an identifier"; exit 2; }
  printf 'const x = localStorage.getItem("k");\n' | has_browser_persistence >/dev/null \
    || { echo "SELFTEST FAIL: persistence detector missed localStorage"; exit 2; }
  printf '// never in localStorage/sessionStorage — memory only\n' | has_browser_persistence >/dev/null \
    && { echo "SELFTEST FAIL: persistence detector false-positive on prose"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-upload-copy-check (M2.9C / ADR-038) =="

# 1. No "fixture" in user-visible BanzAI UI copy — across the shell, its data module, the draft tool and
#    the OFFICIAL validation surface. (Code identifiers/comments are still fine.)
for f in "$AGENT" "$AGENTDATA" "$DRAFT" "$VJOURNEY" "$VSHELL"; do
  [ -f "$f" ] || { fail "$f not found"; continue; }
  hit="$(public_fixture < "$f" || true)"
  [ -z "$hit" ] && ok "$(basename "$f") has no visible 'fixture' copy" \
    || fail "$(basename "$f") contains visible 'fixture' copy: $hit"
done

# 2. Upload/paste live ONLY in the isolated developer draft tool (ADR-038 §4.5), never the official path.
if [ -f "$DRAFT" ]; then
  # The bring-your-own-file affordance stays — but in the draft tool.
  grep -q "Carregar ficheiro JSON" "$DRAFT" && ok "draft tool offers the manual JSON upload affordance (Carregar ficheiro JSON)" \
    || fail "$DRAFT must offer the manual JSON upload affordance (Carregar ficheiro JSON)"
  # The result is explicitly non-authoritative: the DRAFT_VALIDATION_RESULT label + permanent banner.
  grep -q "DRAFT_VALIDATION_RESULT" "$DRAFT" && ok "draft result carries the DRAFT_VALIDATION_RESULT label" \
    || fail "$DRAFT must label its result DRAFT_VALIDATION_RESULT"
  grep -q "DRAFT_COPY.banner" "$DRAFT" && ok "draft tool renders the permanent non-authoritative banner" \
    || fail "$DRAFT must render the permanent draft banner (DRAFT_COPY.banner)"
else
  fail "$DRAFT not found (the isolated developer draft tool is missing)"
fi
# The banner text itself lives in the data module and must be the exact, honest wording.
grep -q "Rascunho local · não publicado · não produz evidência oficial" "$AGENTDATA" \
  && ok "the draft banner reads 'Rascunho local · não publicado · não produz evidência oficial'" \
  || fail "$AGENTDATA DRAFT_COPY.banner must read 'Rascunho local · não publicado · não produz evidência oficial'"
# NO manual-input affordance (upload, paste textarea, or the draft scan) leaks into the OFFICIAL journey.
for f in "$VJOURNEY" "$VSHELL"; do
  [ -f "$f" ] || { fail "$f not found"; continue; }
  if grep -qE 'type="file"|<textarea|scanUpload\(|DRAFT_VALIDATION_RESULT' "$f"; then
    fail "$(basename "$f") exposes a manual-input affordance — the official journey must be endpoint-originated (ADR-038 §4.4)"
  else
    ok "$(basename "$f") has no upload/paste affordance (official journey is endpoint-originated)"
  fi
done

# 3. The draft upload has a size limit and states it is read-only this session + non-authoritative.
if [ -f "$DRAFT" ]; then
  grep -q "UPLOAD_MAX_BYTES" "$DRAFT" && grep -qE "256 \* 1024|262144" "$DRAFT" \
    && ok "draft upload enforces a size limit (256 KB)" \
    || fail "$DRAFT upload must enforce a size limit (UPLOAD_MAX_BYTES = 256 KB)"
  grep -qE "apenas nesta sessão do navegador|lid[oa] apenas nesta sessão|recarregar a página" "$DRAFT" && ok "draft upload states it is read only in this session (reload clears)" \
    || fail "$DRAFT upload must state the file is read only in this browser session"
  grep -qE "não avança a jornada|não produz recibo oficial|nunca devolve VERIFIED" "$DRAFT" \
    && ok "draft result states it does not advance the journey / produce official evidence" \
    || fail "$DRAFT must state its result does not advance the journey nor produce official evidence"
fi

# 4. Secret/JSON scan runs in Rust (engine + wasm binding + wrapper) and the DRAFT tool calls it.
if [ -f "$ENGINE" ]; then
  grep -q "pub fn scan_upload_json" "$ENGINE" && ok "Rust engine exposes scan_upload_json" \
    || fail "$ENGINE must expose scan_upload_json"
  grep -q "SECRET_KEY_MARKERS" "$ENGINE" && grep -qi "private_key" "$ENGINE" \
    && ok "Rust engine scans for secret/private-key markers" \
    || fail "$ENGINE must scan for secret/private-key markers"
fi
[ -f "$WASM" ] && grep -q "journey_scan_upload_json" "$WASM" && ok "wasm binding journey_scan_upload_json present" \
  || fail "$WASM must export journey_scan_upload_json"
[ -f "$WRAP" ] && grep -q "scanUpload" "$WRAP" && grep -q "journey_scan_upload_json" "$WRAP" \
  && ok "TS wrapper scanUpload calls the Rust scan" \
  || fail "$WRAP must expose scanUpload over the Rust scan"
grep -q "scanUpload(" "$DRAFT" && ok "the draft upload runs the Rust scan before storing" \
  || fail "$DRAFT upload must call scanUpload() before storing a file"

# 5. In-memory only — no browser/DB persistence in the draft tool, its data module or the wrapper.
for f in "$DRAFT" "$AGENTDATA" "$WRAP"; do
  [ -f "$f" ] || continue
  if has_browser_persistence < "$f" >/dev/null; then
    fail "$(basename "$f") persists state outside memory (rules 17-20)"
  else
    ok "$(basename "$f") keeps state in memory only"
  fi
done
grep -qE "useState" "$DRAFT" && ok "the draft input lives in React state (in-memory)" \
  || fail "$DRAFT must hold the draft input in React state (in-memory only)"
grep -qE 'const clear = \(\) =>' "$DRAFT" && grep -q 'setText("")' "$DRAFT" \
  && ok "the draft 'Limpar' clears the loaded/pasted artifact" \
  || fail "$DRAFT must clear the draft input (setText(\"\")) on Limpar"

# 6. The draft never claims to certify/approve or produce official evidence (honest boundary present).
if [ -f "$DRAFT" ]; then
  grep -qiE "não produz recibo oficial|não é exemplo oficial|não alimenta o Evidence Bundle" "$DRAFT" \
    && ok "draft boundary present (validating does not certify/approve/produce official evidence)" \
    || fail "$DRAFT must state validating a draft does not certify/approve/produce official evidence"
fi

# 7. Isolation (ADR-038 §4.5): the draft tool forwards the raw file body NOWHERE — it never sends it to
#    /ask nor to any operator origin. This is stronger than the superseded "summary-only to /ask" rule.
if [ -f "$DRAFT" ]; then
  if grep -qE 'banzaiKb|/banzai/ask|/ask|fetch\(' "$DRAFT"; then
    fail "$DRAFT must not forward the draft artifact off-host (no banzaiKb/ask/fetch) — the draft tool is isolated"
  else
    ok "the draft tool is isolated — the raw file body is never forwarded to /ask or any origin"
  fi
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "BANZAI UPLOAD/COPY CHECK PASSED ✅"; else echo "BANZAI UPLOAD/COPY CHECK FAILED ✗"; fi
exit "$FAILED"
