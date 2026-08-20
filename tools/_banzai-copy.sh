#!/usr/bin/env bash
# Shared reader for the resolved BanzAI copy.
#
# The BanzAI surfaces used to hold their sentences as Portuguese literals inside the modules and
# components that render them, so a guard could assert copy by grepping the component. Block E2 moved
# that copy into bilingual catalogues: a component names an id and the sentence is realized per edition.
# Guards that kept grepping for the sentence were reading a file that no longer contains it — and they
# only ever checked Portuguese, so the English edition could say anything at all.
#
# The catalogues are evaluated once by website/scripts/emit-copy-resolved.mjs and published as
# website/lib/copyResolved.json; this file is how a guard reads them. Freshness is owned by
# website/lib/copyResolved.test.ts, which re-runs the emitter in --check mode — that test is in the
# website suite, which gates the pull request, so these functions read a current artifact or the suite is
# already red.
#
# The published value is the catalogue TEMPLATE, placeholders included: some ids refuse to realize without
# their parameters, and the template is the sentence the catalogue actually owns.

COPY_RESOLVED="${COPY_RESOLVED:-website/lib/copyResolved.json}"

copy_require() {
  [ -f "$COPY_RESOLVED" ] || {
    echo "copy-resolved: $COPY_RESOLVED is missing — run website/scripts/emit-copy-resolved.mjs" >&2
    return 1
  }
}

# copy_id_says CATALOGUE ID LOCALE SUBSTRING — that catalogue entry, in that edition, contains SUBSTRING.
# An unknown catalogue or id fails rather than answering no, so a typo in a guard cannot read as a pass.
copy_id_says() {
  copy_require || return 1
  CP_CAT="$1" CP_ID="$2" CP_LOCALE="$3" CP_SUB="$4" python3 - "$COPY_RESOLVED" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))["catalogues"]
cat, cid = os.environ["CP_CAT"], os.environ["CP_ID"]
if cat not in d:
    sys.stderr.write(f"copy-resolved: unknown catalogue {cat}\n"); sys.exit(2)
if cid not in d[cat]["entries"]:
    sys.stderr.write(f"copy-resolved: unknown id {cat}/{cid}\n"); sys.exit(2)
sys.exit(0 if os.environ["CP_SUB"] in d[cat]["entries"][cid][os.environ["CP_LOCALE"]] else 1)
PY
}

# copy_id_is CATALOGUE ID LOCALE TEXT — exact wording, for the sentences a decision pinned verbatim.
copy_id_is() {
  copy_require || return 1
  CP_CAT="$1" CP_ID="$2" CP_LOCALE="$3" CP_TEXT="$4" python3 - "$COPY_RESOLVED" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))["catalogues"]
cat, cid = os.environ["CP_CAT"], os.environ["CP_ID"]
if cat not in d or cid not in d[cat]["entries"]:
    sys.stderr.write(f"copy-resolved: unknown id {cat}/{cid}\n"); sys.exit(2)
sys.exit(0 if d[cat]["entries"][cid][os.environ["CP_LOCALE"]] == os.environ["CP_TEXT"] else 1)
PY
}

# copy_ids_saying LOCALE SUBSTRING — every id whose text contains SUBSTRING, as "catalogue/id".
# Useful when a guard cares that the surface says something, not which id carries it.
copy_ids_saying() {
  copy_require || return 1
  CP_LOCALE="$1" CP_SUB="$2" python3 - "$COPY_RESOLVED" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))["catalogues"]
loc, sub = os.environ["CP_LOCALE"], os.environ["CP_SUB"]
print("\n".join(f"{c}/{i}" for c, cat in d.items() for i, v in cat["entries"].items() if sub in v[loc]))
PY
}

# copy_says LOCALE SUBSTRING — some catalogue says it in that edition.
copy_says() { [ -n "$(copy_ids_saying "$1" "$2")" ]; }

# copy_presented FILE CATALOGUE ID LOCALE SUBSTRING — the component names the id AND the id says that in
# that edition. This is the property most copy guards actually want: grepping the component alone stopped
# proving anything when the sentence moved, and checking the catalogue alone would pass on copy that no
# component renders.
copy_presented() {
  local file="$1" cat="$2" id="$3" loc="$4" sub="$5"
  [ -f "$file" ] || { echo "copy-resolved: missing file $file" >&2; return 1; }
  grep -qF "\"$id\"" "$file" || grep -qF "'$id'" "$file" || return 1
  copy_id_says "$cat" "$id" "$loc" "$sub"
}
