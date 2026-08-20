#!/usr/bin/env bash
# Shared reader for the resolved site chrome.
#
# The header and footer no longer carry literal hrefs: an entry declares a semantic route target and the
# pathname is derived per edition. Guards that kept grepping website/lib/site.ts for `href: "/x"` were
# matching a form that no longer exists — they reported on reachability while testing nothing, and they
# only ever saw the Portuguese edition even when the English one was the one at risk.
#
# So the derivation is run once by website/scripts/emit-chrome-resolved.mjs and published as
# website/lib/chromeResolved.json; this file is how a guard reads it. Nothing here re-implements the
# derivation, because a second copy would drift from the real one and fail silently.
#
# Freshness is owned by website/lib/chromeResolved.test.ts, which re-runs the emitter in --check mode and
# fails if the committed artifact has drifted from the chrome. That test runs in the website suite, which
# gates the pull request. These functions therefore read a current artifact or the suite is already red —
# they do not re-derive it themselves, because paying an esbuild bundle in every guard would make the
# battery slow enough that people stop running it.

CHROME_RESOLVED="${CHROME_RESOLVED:-website/lib/chromeResolved.json}"

# Fails loudly rather than answering from a missing file: a chrome query that silently returns nothing
# would let every caller pass for the wrong reason.
chrome_require() {
  [ -f "$CHROME_RESOLVED" ] || {
    echo "chrome-resolved: $CHROME_RESOLVED is missing — run website/scripts/emit-chrome-resolved.mjs" >&2
    return 1
  }
}

# _chrome_query LOCALE WHERE FIELD  →  one value per line.
#   WHERE ∈ nav | footer | all      FIELD ∈ href | label | key | title
_chrome_query() {
  chrome_require || return 1
  CR_LOCALE="$1" CR_WHERE="$2" CR_FIELD="$3" python3 - "$CHROME_RESOLVED" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))
e = d["editions"][os.environ["CR_LOCALE"]]
where, field = os.environ["CR_WHERE"], os.environ["CR_FIELD"]
if field == "title":
    rows = [c["title"] for c in e["footer"]]
else:
    nav = e["nav"]
    foot = [i for c in e["footer"] for i in c["items"]]
    rows = {"nav": nav, "footer": foot, "all": nav + foot}[where]
    rows = [i.get(field, "") for i in rows]
print("\n".join(rows))
PY
}

chrome_nav_hrefs()     { _chrome_query "$1" nav href; }
chrome_nav_labels()    { _chrome_query "$1" nav label; }
chrome_footer_hrefs()  { _chrome_query "$1" footer href; }
chrome_footer_labels() { _chrome_query "$1" footer label; }
chrome_footer_titles() { _chrome_query "$1" footer title; }
chrome_all_hrefs()     { _chrome_query "$1" all href; }
chrome_all_labels()    { _chrome_query "$1" all label; }

# chrome_links LOCALE WHERE LABEL HREF — true when that edition offers exactly that destination under
# exactly that label. Both halves matter: a right label on a wrong path is a broken link, and a right path
# under a wrong label is a link no reader will recognise.
chrome_links() {
  chrome_require || return 1
  CR_LOCALE="$1" CR_WHERE="$2" CR_LABEL="$3" CR_HREF="$4" python3 - "$CHROME_RESOLVED" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))
e = d["editions"][os.environ["CR_LOCALE"]]
nav = e["nav"]; foot = [i for c in e["footer"] for i in c["items"]]
rows = {"nav": nav, "footer": foot, "all": nav + foot}[os.environ["CR_WHERE"]]
want_l, want_h = os.environ["CR_LABEL"], os.environ["CR_HREF"]
sys.exit(0 if any(i["label"] == want_l and i["href"] == want_h for i in rows) else 1)
PY
}
