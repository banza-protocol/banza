#!/usr/bin/env python3
"""Extract every reader-visible tasked content item from the Rust task tables.

The tasked terminal assembles its answer in Rust from typed section structs whose ELEMENTS are
Portuguese prose. Localizing it means giving each of those elements a stable semantic identity, so the
first thing needed is an exact, reproducible list of them — not a grep count. An earlier hand count
said 106; structured extraction says 129, and the difference is items sharing a source line.

DELIBERATELY EXCLUDED: `required_fields` and `body_json`. Those are canonical schema field names and a
JSON body — identifiers, not prose, and they read the same in every locale.

Regenerate:  python3 tools/gen-tasked-item-inventory.py
"""
import json
import re

SRC = "engines/banzai-query-core/src/tasked.rs"
OUT = "docs/banzai/tasked-item-inventory.json"
SCALARS = ("framing", "precondition", "result", "gap_note", "schema_note")
LISTS = ("actors", "sequence", "prerequisites", "steps", "validations")
TASKS = (("example", "ExampleData"), ("procedure", "ProcedureData"), ("template", "TemplateData"))


def main() -> None:
    src = open(SRC, encoding="utf-8").read()
    body = "\n    SubjectProfile {" + src.split("SubjectProfile {", 1)[1]
    items = []
    for block in re.split(r"\n    SubjectProfile \{", body):
        subject = re.search(r'subject: "([a-z_]+)"', block)
        if not subject:
            continue
        subject = subject.group(1)
        for task, cls in TASKS:
            found = re.search(rf"{task}: Some\({cls} \{{(.*?)\n        \}}\)", block, re.S)
            if not found:
                continue
            data = found.group(1)
            for field in SCALARS:
                m = re.search(rf'\n\s+{field}: "((?:[^"\\]|\\.)*)"', data)
                if m:
                    items.append({"subject": subject, "task": task, "section": field, "index": 0, "pt": m.group(1)})
            for field in LISTS:
                m = re.search(rf"\n\s+{field}: &\[(.*?)\],\n", data, re.S)
                if not m:
                    continue
                for i, text in enumerate(re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))):
                    items.append({"subject": subject, "task": task, "section": field, "index": i, "pt": text})

    for it in items:
        suffix = f'.{it["index"]}' if it["section"] in LISTS else ""
        it["item_id"] = f'{it["subject"]}.{it["task"]}.{it["section"]}{suffix}'

    ids = {it["item_id"] for it in items}
    if len(ids) != len(items):
        raise SystemExit(f"item ids are not unique: {len(items)} items, {len(ids)} ids")

    json.dump(
        {
            "generated_from": SRC,
            "generator": "tools/gen-tasked-item-inventory.py",
            "note": "Reader-visible tasked content items. `required_fields` and `body_json` are canonical schema identifiers, not prose, and are excluded.",
            "count": len(items),
            "items": items,
        },
        open(OUT, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )
    print(f"{len(items)} items -> {OUT}")


if __name__ == "__main__":
    main()
