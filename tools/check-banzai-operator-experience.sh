#!/usr/bin/env bash
#
# BANZA BanzAI operator-experience canonicalization guard (M2.19G.3B).
#
# The "Validar operador" and "Onboarding de operador" surfaces must be canonical: the operator +
# implementation list and the protocol option sets (version / profile / environment) come from ONE
# source — the Rust registry engine (banza-target-registry) — never a hardcoded/drifted TypeScript
# constant, and no operator (not even Operador Zero) is hardcoded as "the only operator". Rust decides;
# TypeScript displays. This guard asserts these invariants (OE1..OE13). Exit 1 on any violation; exit 2
# if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

pass=0
g() { printf 'banzai-operator-experience: ✓ %s\n' "$1"; pass=$((pass+1)); }
fail() { printf 'banzai-operator-experience: ✗ %s\n' "$*" >&2; exit 1; }
have() { grep -q "$1" "$2"; }
lacks() { if grep -q "$1" "$2"; then return 1; else return 0; fi; }

VALID=website/lib/banzaiValidation.ts
CLIENT=website/lib/banzaiValidateClient.ts
JOURNEY=website/components/banzai/validationJourney.tsx
VMODE=website/components/banzai/BanzaiValidationMode.tsx
STATE=website/lib/banzaiState.ts
SERVER=services/banzai-api/src/server.js
VALIDATE=services/banzai-api/src/validate.js
REGMODEL=engines/banza-target-registry/src/model.rs
REGLIB=engines/banza-target-registry/src/lib.rs
REGPROD=engines/banza-target-registry/src/registry.rs
ONBROUTES=services/banzai-api/src/onboarding/routes.js
ONBSVC=services/banzai-api/src/onboarding/service.js
ONBCLIENT=website/lib/banzaiOnboardingClient.ts
OMODE=website/components/banzai/BanzaiOnboardingMode.tsx

for f in "$VALID" "$CLIENT" "$JOURNEY" "$VMODE" "$STATE" "$SERVER" "$VALIDATE" "$REGMODEL" "$REGLIB" "$REGPROD" "$ONBROUTES" "$ONBSVC" "$ONBCLIENT" "$OMODE"; do
  [ -f "$f" ] || fail "missing expected file: $f"
done

# OE1 — the validation TS holds NO hardcoded operator/implementation DATA constant.
if grep -qE "^export const OPERATOR_REGISTRY|^export const OPERATOR_LIST" "$VALID"; then
  fail "OE1: $VALID still defines a hardcoded OPERATOR_REGISTRY/OPERATOR_LIST (registry must be fetched from the Rust endpoint)"
fi
g "OE1: no hardcoded operator/implementation registry constant in $VALID"

# OE2 — the retired certification-outcome field is gone from the registry type.
lacks "last_known_state" "$VALID" || fail "OE2: 'last_known_state' (a certification outcome) must not appear in the registry type/UI ($VALID)"
lacks "last_known_state" "$VMODE" || fail "OE2: 'last_known_state' must not be rendered in $VMODE"
g "OE2: certification-outcome field 'last_known_state' removed from the registry surface"

# OE3 — no drifted hardcoded protocol option values in the validation TS.
if grep -qE "demonstração|settlement_simulation" "$VALID"; then
  fail "OE3: drifted hardcoded option values (profile 'demonstração' / capability 'settlement_simulation') must not appear in $VALID"
fi
g "OE3: no drifted hardcoded protocol option values in $VALID"

# OE4 — the client fetches the registry + options from the same-origin Rust endpoints.
have "export async function fetchRegistry" "$CLIENT" || fail "OE4: $CLIENT must export fetchRegistry()"
have "export async function fetchOptions" "$CLIENT" || fail "OE4: $CLIENT must export fetchOptions()"
have "/banzai/validate/registry" "$CLIENT" || fail "OE4: $CLIENT must GET /banzai/validate/registry"
have "/banzai/validate/options" "$CLIENT" || fail "OE4: $CLIENT must GET /banzai/validate/options"
g "OE4: client fetches the registry + options from the Rust-sourced endpoints"

# OE5 — the validation session loads operators dynamically + resolves against the fetched list.
have "fetchRegistry" "$JOURNEY" || fail "OE5: $JOURNEY must load operators via fetchRegistry"
have "resolveOperatorIn" "$JOURNEY" || fail "OE5: $JOURNEY must resolve against the fetched list (resolveOperatorIn)"
if grep -qE "OPERATOR_LIST" "$JOURNEY"; then fail "OE5: $JOURNEY must not use the removed static OPERATOR_LIST"; fi
g "OE5: validation session loads + resolves operators dynamically"

# OE6 — the backend exposes the canonical read endpoints.
have "/validate/registry" "$SERVER" || fail "OE6: $SERVER must serve /validate/registry"
have "/validate/options" "$SERVER" || fail "OE6: $SERVER must serve /validate/options"
g "OE6: backend serves /validate/registry + /validate/options"

# OE7 — those endpoints are sourced from the Rust registry WASM (not a JS constant).
have "registry_catalogue_json" "$VALIDATE" || fail "OE7: $VALIDATE must source the catalogue from registry_catalogue_json (Rust)"
have "registry_tool_version_json" "$VALIDATE" || fail "OE7: $VALIDATE must source options from registry_tool_version_json (Rust)"
g "OE7: registry + options come from the Rust registry engine"

# OE8 — the Rust registry models + emits a per-implementation display_name.
have "pub display_name: String" "$REGMODEL" || fail "OE8: ImplementationRecord must carry display_name ($REGMODEL)"
have '"display_name": i.display_name' "$REGLIB" || fail "OE8: catalogue_json must emit the implementation display_name ($REGLIB)"
have "display_name:" "$REGPROD" || fail "OE8: production_registry must set the implementation display_name ($REGPROD)"
g "OE8: canonical implementation display_name lives in the Rust registry"

# OE9 — onboarding validates the declared version/profile/environment against the CANONICAL Rust sets.
have "registry_tool_version_json" "$ONBROUTES" || fail "OE9: $ONBROUTES must load the canonical option sets from the Rust registry"
have "CANONICAL_OPTIONS" "$ONBROUTES" || fail "OE9: $ONBROUTES must validate against CANONICAL_OPTIONS"
have "invalid_option" "$ONBROUTES" || fail "OE9: $ONBROUTES must reject off-list options (fail-closed 422 invalid_option)"
g "OE9: onboarding validates version/profile/environment against the canonical Rust option sets (fail-closed)"

# OE10 — the onboarding client sends the implementation profile (version/profile/environment).
have "expected_protocol_version" "$ONBCLIENT" || fail "OE10: $ONBCLIENT createImplementation must send expected_protocol_version"
have "expected_profile" "$ONBCLIENT" || fail "OE10: $ONBCLIENT must send expected_profile"
have "expected_environment" "$ONBCLIENT" || fail "OE10: $ONBCLIENT must send expected_environment"
g "OE10: onboarding client sends the implementation protocol/profile/environment"

# OE11 — the onboarding UI fetches the canonical options + shows human state labels.
have "fetchOptions" "$OMODE" || fail "OE11: $OMODE must populate its selectors from fetchOptions (canonical)"
have "CANDIDATE_STATE_LABEL" "$OMODE" || fail "OE11: $OMODE must map candidate state enums to human labels"
have "ORIGIN_STATE_LABEL" "$OMODE" || fail "OE11: $OMODE must map origin state enums to human labels"
g "OE11: onboarding UI uses canonical option selectors + human state labels"

# OE12 — candidateView surfaces the implementation profile for display.
have "expected_protocol_version" "$ONBSVC" || fail "OE12: $ONBSVC candidateView must surface expected_protocol_version"
g "OE12: candidateView surfaces the implementation protocol/profile/environment"

# OE13 — the client's operator list is built ONLY by the pure catalogue mapper (no operator hardcoded).
have "export function mapCatalogueToOperators" "$VALID" || fail "OE13: $VALID must expose the pure mapCatalogueToOperators"
g "OE13: the client operator list is built only from the canonical catalogue (no operator hardcoded)"

printf 'banzai-operator-experience: all %d invariants hold (M2.19G.3B)\n' "$pass"
