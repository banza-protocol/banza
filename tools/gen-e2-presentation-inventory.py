#!/usr/bin/env python3
"""Extract and classify every reader-facing presentation occurrence in the E2 application.

Block E2 covers the BanzAI workspace and the decisions explorer. Neither has any locale mechanism, so
before a locale boundary can be designed the surface has to be known — and known by CONSUMER, not by
file extension. Two of the largest presentation owners (`banzai-agent.ts`, `suggestions.ts`) are plain
data modules, not React components, which means a provider alone cannot localize them.

Counting rules, and why:
  * `.test.ts(x)` files are excluded. Tests are not reader surface, and including them inflated an
    earlier count from 17 files to 28.
  * A string is a candidate only if it reads like prose: three or more words, or Portuguese accents.
  * CSS values, prop names, media types, paths, hosts and identifiers are excluded by shape.
  * The classification a human still owns is `reader` vs `machine` per FILE, recorded below from
    tracing the actual consumer — extension does not decide it.

Regenerate:  python3 tools/gen-e2-presentation-inventory.py
"""
import json
import pathlib
import re

ROOTS = ["website/components/banzai", "website/components/decisoes"]
OUT = "docs/website/e2-presentation-inventory.json"

# Consumer-traced classification. `reader` = its strings can reach a Website reader in normal use.
OWNER_CLASS = {
    "banzai-agent.ts": "reader-data-module",       # workspace headings, descriptions, placeholder
    "suggestions.ts": "reader-data-module",        # suggestion prompts rendered in the workspace
    "traceVerifier.ts": "mixed",                   # a reader status + canonical JSON literals
    "safeLinks.ts": "machine",                     # hostnames and route mechanics only
    "BanzaiWorkspaceProvider.tsx": "transparent",  # container; zero reader items
    "BanzaiRouteBinder.tsx": "transparent",        # route boundary; zero reader items
}
CODEY = re.compile(r"^(?:[a-z]+[A-Z]|--|aria-|data-|application/|text/|utf|Bearer|POST|GET)|[{}<>$]|=>|\)\s*$")


def is_prose(x: str) -> bool:
    x = x.strip()
    if len(x) < 8 or CODEY.search(x):
        return False
    if re.search(r"(px|rem|%|deg|fr)\b", x) and re.search(r"\d", x):
        return False
    return len(x.split()) >= 3 or bool(re.search(r"[àáâãçéêíóôõú]", x))


def main() -> None:
    items, files = [], []
    for root in ROOTS:
        for f in sorted(list(pathlib.Path(root).rglob("*.tsx")) + list(pathlib.Path(root).rglob("*.ts"))):
            if ".test." in f.name:
                continue
            src = re.sub(r"/\*[\s\S]*?\*/", "", re.sub(r"//.*", "", f.read_text(encoding="utf-8")))
            found = [(m, "jsx") for m in re.findall(r">([^<>{}]{8,})<", src)]
            found += [(m, "literal") for m in re.findall(r'"([^"\\\n]{8,})"', src)]
            n = 0
            for raw, kind in found:
                if not is_prose(raw):
                    continue
                n += 1
                items.append({
                    "file": str(f),
                    "owner_class": OWNER_CLASS.get(f.name, "reader-component"),
                    "origin": kind,
                    "pt": raw.strip(),
                    # Parameterised prose is realised from a template, not translated per rendered value.
                    "parameterized": bool(re.search(r"\$\{|\{[a-zA-Z]", raw)),
                })
            files.append({"file": str(f), "owner_class": OWNER_CLASS.get(f.name, "reader-component"), "items": n})

    reader = [i for i in items if i["owner_class"] != "machine"]
    json.dump(
        {
            "generator": "tools/gen-e2-presentation-inventory.py",
            "note": "Occurrences, not translation identities. Semantic ids are assigned in E2A.",
            "roots": ROOTS,
            "source_files": len(files),
            "raw_occurrences": len(items),
            "reader_occurrences": len(reader),
            "machine_occurrences": len(items) - len(reader),
            "files": files,
            "items": items,
        },
        open(OUT, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )
    print(f"{len(files)} source files · {len(items)} raw · {len(reader)} reader -> {OUT}")


if __name__ == "__main__":
    main()
