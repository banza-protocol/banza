#!/usr/bin/env python3
"""The parts of the trial-target guard that need to read JSON.

Kept out of the shell guard so the checks are readable rather than quoted twice. Each subcommand prints
one `ok:` or `FAIL:` line and exits 0 or 1; the shell guard aggregates.

    python3 tools/trial_target_checks.py describes | self-containment | vector-set
"""

import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "clean-room/packages/l0")
MAN = os.path.join(ROOT, "trials/banza-v1.0.0-l0-independent-trial-001/TRIAL_MANIFEST.json")
PROFILES = os.path.join(ROOT, "contracts/production/conformance-profiles.production.json")


def manifest():
    with open(MAN, encoding="utf-8") as f:
        return json.load(f)


def describes():
    """The recorded file set, digests and tree digest still match the package on disk."""
    man = manifest()
    recorded = {f["path"]: f["sha256"] for f in man["content_identity"]["package_files"]}

    on_disk = {}
    for dirpath, _dirnames, filenames in os.walk(PKG):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            with open(full, "rb") as f:
                on_disk[os.path.relpath(full, PKG)] = hashlib.sha256(f.read()).hexdigest()

    missing = sorted(set(recorded) - set(on_disk))
    extra = sorted(set(on_disk) - set(recorded))
    changed = sorted(p for p in set(recorded) & set(on_disk) if recorded[p] != on_disk[p])
    if missing or extra or changed:
        print("  FAIL: the trial manifest no longer describes the package on disk")
        for p in missing[:5]:
            print("      missing: %s" % p)
        for p in extra[:5]:
            print("      extra:   %s" % p)
        for p in changed[:5]:
            print("      changed: %s" % p)
        print("      (run: python3 tools/gen-trial-manifest.py)")
        return 1

    lines = "".join("%s  %s\n" % (recorded[p], p) for p in sorted(recorded))
    tree = hashlib.sha256(lines.encode("utf-8")).hexdigest()
    if tree != man["content_identity"]["package_content_tree_sha256"]:
        print("  FAIL: the recorded content tree digest does not match the recorded file digests")
        return 1

    print("  ok: the manifest describes the package on disk (%d files, tree digest matches)"
          % len(recorded))
    return 0


def self_containment():
    sc = manifest()["self_containment"]
    if sc["unresolved_count"]:
        print("  FAIL: %d unresolved reference(s) escape the package" % sc["unresolved_count"])
        for u in sc["unresolved"][:8]:
            print("      %s  <- %s" % (u["target"], ",".join(u["referenced_by"])))
        return 1
    print("  ok: self-containment holds: no unresolved reference escapes the package")
    return 0


def vector_set():
    """The trial's required vectors are the profile registry's, and each one is in the package."""
    man = manifest()
    with open(PROFILES, encoding="utf-8") as f:
        l0 = next(p for p in json.load(f)["profiles"] if p.get("level") == "L0")

    declared = [v["vector"] for v in man["required_vector_set"]["vectors"]]
    if declared != list(l0["required_vectors"]):
        print("  FAIL: the trial vector set diverges from the profile registry")
        print("      manifest: %s" % declared)
        print("      registry: %s" % list(l0["required_vectors"]))
        return 1

    absent = [v["vector"] for v in man["required_vector_set"]["vectors"] if not v.get("in_package")]
    if absent:
        print("  FAIL: required vector not in the package: %s" % absent)
        return 1

    print("  ok: the required vector set is the profile registry's, and every vector is in the package")
    return 0


def main():
    cmds = {"describes": describes, "self-containment": self_containment, "vector-set": vector_set}
    if len(sys.argv) != 2 or sys.argv[1] not in cmds:
        print("usage: trial_target_checks.py {%s}" % "|".join(cmds), file=sys.stderr)
        return 2
    return cmds[sys.argv[1]]()


if __name__ == "__main__":
    sys.exit(main())
