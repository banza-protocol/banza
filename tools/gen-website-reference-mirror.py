#!/usr/bin/env python3
# Mirror the two canonical Reference editions into the website content tree.
#
#     python3 tools/gen-website-reference-mirror.py [--check]
#
# DIRECTION IS THE POINT. The editorial sources are docs/reference/{pt,en}/; the website copies are
# derived. The website is built with website/ as its Docker context, so it cannot read docs/ at build
# time — that build boundary, not a preference, is why a mirror exists at all.
#
# The mirror is generated, never edited. --check regenerates into memory and compares, so verification
# never writes to tracked state.
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The diagrams have exactly one copy, under website/public/diagrams/. The Reference sources cite it by
# a repository-relative path so the editions render on GitHub; the website serves the same single copy
# by URL. Rewriting the path is what lets one source satisfy both readers without a second copy of any
# SVG. The transformation is total — a path left unrewritten would 404 on the published page.
ASSET_SOURCE_PREFIX = "../../../website/public/diagrams/"
ASSET_SERVED_PREFIX = "/diagrams/"

# Links between the two editions, and out to repository files, are relative in the source because a
# reader browsing the repository follows them there. The published page has no such tree, so they
# resolve to GitHub instead of dangling.
REPO_DOC_BASE = "https://github.com/banza-protocol/banza/blob/main/docs/reference/"
REPO_BLOB_BASE = "https://github.com/banza-protocol/banza/blob/main/"

EDITIONS = {
    "pt": {
        "source": "docs/reference/pt/BANZA_REFERENCIA.md",
        "mirror": "website/content/reference/pt.md",
        "status": "Edição canónica (português).",
    },
    "en": {
        "source": "docs/reference/en/BANZA_REFERENCE.md",
        "mirror": "website/content/reference/en.md",
        "status": "Official English translation. The Portuguese edition is canonical.",
    },
}

BANNER = (
    "<!-- GENERATED FILE — DO NOT EDIT.\n"
    "     {status}\n"
    "     Source of truth: {source}\n"
    "     Regenerate:      make website-reference-mirror\n"
    "     Verify:          make website-reference-source-boundary-check\n"
    "     Editing this file instead of the source is a source-boundary violation and the guard\n"
    "     fails on it. The website publishes the Reference; it does not own it.\n"
    "     source-sha256: {digest}\n"
    "-->\n"
)


def render(lang):
    spec = EDITIONS[lang]
    src = ROOT / spec["source"]
    if not src.exists():
        sys.exit("gen-website-reference-mirror: missing source %s" % spec["source"])
    body = src.read_text(encoding="utf8")
    # Digest the source as written, so the banner identifies the editorial bytes rather than the
    # transformed ones.
    digest = hashlib.sha256(body.encode("utf8")).hexdigest()

    served = body.replace(ASSET_SOURCE_PREFIX, ASSET_SERVED_PREFIX)
    # Sibling document links are written for a reader browsing the repository. On the published page
    # they have no route, so they resolve to the file on GitHub rather than dangling.
    served = re.sub(r'\]\(\.\./([^)]+\.md)\)', r'](%s\1)' % REPO_DOC_BASE, served)
    served = re.sub(r'\]\(\.\./\.\./\.\./([^)]+)\)', r'](%s\1)' % REPO_BLOB_BASE, served)

    leftover = re.findall(r'\]\((\.\.?/[^)]+)\)', served)
    if leftover:
        sys.exit("gen-website-reference-mirror: %s leaves paths the published page cannot resolve: %s"
                 % (spec["source"], ", ".join(sorted(set(leftover))[:4])))

    banner = BANNER.format(status=spec["status"], source=spec["source"], digest=digest)
    return banner + "\n" + served


def main():
    check = "--check" in sys.argv
    drift = []
    for lang, spec in EDITIONS.items():
        want = render(lang)
        mirror = ROOT / spec["mirror"]
        if check:
            have = mirror.read_text(encoding="utf8") if mirror.exists() else None
            if have != want:
                drift.append((spec["mirror"], spec["source"], have is None))
            continue
        mirror.parent.mkdir(parents=True, exist_ok=True)
        mirror.write_text(want, encoding="utf8")
        print("  wrote %s  (from %s)" % (spec["mirror"], spec["source"]))

    if not check:
        return 0
    if drift:
        print("website-reference-mirror: the tracked mirror is not what the source generates.",
              file=sys.stderr)
        for mirror, source, missing in drift:
            print("  %-40s %s" % (mirror, "absent" if missing else "differs from %s" % source),
                  file=sys.stderr)
        print("  The Reference is edited at its source and mirrored by the generator.",
              file=sys.stderr)
        print("  Fix: edit the source, then run `make website-reference-mirror`.", file=sys.stderr)
        return 1
    print("website-reference-mirror: ok — both mirrors reproduce from their canonical source")
    return 0


if __name__ == "__main__":
    sys.exit(main())
