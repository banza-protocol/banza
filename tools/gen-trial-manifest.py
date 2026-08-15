#!/usr/bin/env python3
"""Freeze the identity of one independent-implementation trial target.

Two things are kept apart on purpose:

  CONTENT IDENTITY    the file set, their bytes, their digests, and the tree digest over them
  VOLATILE PROVENANCE how and when this manifest happened to be produced

Only the first determines `content_tree_sha256`. Nothing that varies between two runs from the same
commit is allowed to touch it, because a target that changes digest without changing content cannot be
verified by the party who matters — the external team recomputing it.

Deterministic: two runs from the same commit produce byte-identical output.

    python3 tools/gen-trial-manifest.py
"""

import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "clean-room/packages/l0")
TRIAL_DIR = os.path.join(ROOT, "trials/banza-v1.0.0-l0-independent-trial-001")
TRIAL_ID = "banza-v1.0.0-l0-independent-trial-001"
OUT = os.path.join(TRIAL_DIR, "TRIAL_MANIFEST.json")

# The kit's own files. They are part of the trial, not part of the implementation surface, so they are
# digested separately: the team implements from the package, and follows the method from the kit.
KIT_FILES = [
    "INDEPENDENT_IMPLEMENTATION_TRIAL_PROTOCOL.md",
    "IMPLEMENT_BANZA_L0_FROM_THIS_PACKAGE.md",
    "IMPLEMENTER_QUALIFICATION_FORM.md",
    "ISOLATION_AND_PROHIBITED_SOURCES.md",
    "QUESTION_LEDGER.json",
    "pass-fail-criteria.json",
    "harness/run_trial.py",
    "harness/rehearsal_adapter.py",
    "adversarial/cases.json",
    "schemas/evidence-bundle.schema.json",
]


def sha256_file(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def walk(base):
    out = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames.sort()
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            out.append((os.path.relpath(full, base), full))
    return sorted(out)


def tree_digest(entries):
    """sha256 over 'digest  path' lines, sorted by path.

    Path-and-bytes, nothing else: no mtime, no ordering from the filesystem, no generation time.
    """
    lines = "".join(f"{d}  {p}\n" for p, d in sorted(entries))
    return hashlib.sha256(lines.encode("utf-8")).hexdigest()


# ── self-containment (§10) ──────────────────────────────────────────────────────────────────────────

REF_RE = re.compile(r"(?<![\w/.])((?:spec|contracts|conformance|docs|decisions|engines|clean-room)/[A-Za-z0-9_./-]+\.(?:md|json|yaml|rs|py))")
RFC_RE = re.compile(r"\bRFC\s?(\d{3,5})\b")


def classify_references(pkg_files):
    """Every path-like reference inside the package, classified.

    INCLUDED                   resolves inside the package
    EXTERNAL_PUBLIC_REFERENCE  on the public normative surface but not required at L0, or a public
                               standard — reachable, and not needed to implement this profile
    UNRESOLVED                 needed and not reachable. This is the number that must be zero.

    Three files are indexes rather than documents: the Normative Manifest catalogues the whole surface,
    the invariant registry catalogues every invariant, and the profile registry catalogues every level.
    A path listed inside them is an entry in a catalogue, not something this profile depends on, so
    scanning them for dependencies would report the existence of higher profiles as a defect in this one.
    """
    CATALOGUES = {
        "contracts/production/normative-manifest.json",
        "contracts/invariants.json",
        "contracts/production/conformance-profiles.production.json",
    }
    present = {p for p, _ in pkg_files}
    manifest = json.load(open(os.path.join(PKG, "package-manifest.json"), encoding="utf-8"))
    declared = {o["target"]: o for o in manifest.get("outbound_references", [])}
    surface = {a["path"] for a in json.load(
        open(os.path.join(ROOT, "contracts/production/normative-manifest.json"), encoding="utf-8")
    )["artifacts"]}

    found = {}
    for rel, full in pkg_files:
        if rel in CATALOGUES or not rel.endswith((".md", ".json")):
            continue
        text = open(full, encoding="utf-8", errors="replace").read()
        for m in REF_RE.findall(text):
            found.setdefault(m, set()).add(rel)

    included, external, unresolved = [], [], []
    for target in sorted(found):
        cited_by = sorted(found[target])
        if target in present:
            included.append({"target": target, "referenced_by": cited_by})
        elif target in declared:
            external.append({"target": target, "kind": declared[target]["kind"],
                             "why": declared[target]["why"], "referenced_by": cited_by})
        elif target in surface:
            external.append({"target": target, "kind": "higher profile",
                             "why": "on the public normative surface; not required at L0",
                             "referenced_by": cited_by})
        elif target.startswith(("decisions/", "engines/")):
            # An undeclared pointer into rationale or implementation is the leak this trial exists to
            # rule out: it would make an implementer reach for a decision record or the reference
            # implementation to finish the job.
            unresolved.append({"target": target, "referenced_by": cited_by,
                               "why": "an undeclared pointer into rationale or implementation"})
        else:
            # Not in the package, not normative, and not rationale or implementation: a pointer to
            # human-readable material. No rule can depend on it, because it carries none.
            external.append({"target": target, "kind": "non-normative material",
                             "why": "outside the normative surface; carries no rule, so nothing can depend on it",
                             "referenced_by": cited_by})

    rfcs = set()
    for rel, full in pkg_files:
        if rel.endswith((".md", ".json")):
            rfcs |= set(RFC_RE.findall(open(full, encoding="utf-8", errors="replace").read()))

    return included, external, unresolved, sorted(f"RFC {n}" for n in rfcs)


def main():
    if not os.path.isdir(PKG):
        print("package missing; run tools/gen-clean-room-package.py first", file=sys.stderr)
        return 1

    pkg_files = walk(PKG)
    pkg_entries = [(p, sha256_file(f)) for p, f in pkg_files]
    content_tree = tree_digest(pkg_entries)

    kit_entries = []
    for rel in KIT_FILES:
        full = os.path.join(TRIAL_DIR, rel)
        if os.path.isfile(full):
            kit_entries.append((rel, sha256_file(full)))
    kit_tree = tree_digest(kit_entries)

    pm = json.load(open(os.path.join(PKG, "package-manifest.json"), encoding="utf-8"))
    prov = json.load(open(os.path.join(PKG, "provenance.json"), encoding="utf-8"))
    profiles = json.load(open(os.path.join(ROOT, "contracts/production/conformance-profiles.production.json"), encoding="utf-8"))
    l0 = next(p for p in profiles["profiles"] if p.get("level") == "L0")

    included, external, unresolved, rfcs = classify_references(pkg_files)

    # The required vector set is DERIVED from the profile registry, never listed by hand: a second
    # hand-kept list is a second thing to keep in step, and it is the one that goes stale.
    required_vectors = []
    for v in l0.get("required_vectors", []):
        rel = v
        full = os.path.join(PKG, rel)
        entry = {"vector": rel, "in_package": os.path.isfile(full)}
        if entry["in_package"]:
            doc = json.load(open(full, encoding="utf-8"))
            key = next((k for k in ("vectors", "cases", "tests") if isinstance(doc.get(k), list)), None)
            cases = doc.get(key, [])
            entry["case_count"] = len(cases)
            entry["case_ids"] = [c.get("id") for c in cases]
        required_vectors.append(entry)

    adv = json.load(open(os.path.join(TRIAL_DIR, "adversarial/cases.json"), encoding="utf-8"))

    manifest = {
        "_spec": "BANZA independent-implementation trial manifest",
        "manifest_schema_version": "1",
        "_authority": (
            "This manifest freezes the identity of one trial target. It is not a specification and adds "
            "no requirement. The BANZA Normative Manifest inside the package remains the authority for "
            "what an implementation must do."
        ),

        "trial": {
            "trial_id": TRIAL_ID,
            "protocol_version": "1.0.0",
            "target_profile": "L0",
            "target_profile_name": l0.get("name", "Protocol Sandbox"),
            "run": "001",
        },

        "content_identity": {
            "_note": (
                "Everything under this key determines the target. Two exports from the same source "
                "commit produce identical values here; if they do not, the package is not verifiable "
                "and the trial is not ready."
            ),
            "source_commit": prov["source_commit"],
            "normative_manifest_sha256": pm["normative_manifest_sha256"],
            "package_manifest_sha256": sha256_file(os.path.join(PKG, "package-manifest.json")),
            "package_content_tree_sha256": content_tree,
            "package_file_count": len(pkg_entries),
            "package_files": [{"path": p, "sha256": d} for p, d in pkg_entries],
            "trial_kit_tree_sha256": kit_tree,
            "trial_kit_file_count": len(kit_entries),
            "trial_kit_files": [{"path": p, "sha256": d} for p, d in kit_entries],
        },

        "volatile_provenance": {
            "_note": (
                "Recorded for traceability and deliberately excluded from every digest above. Nothing "
                "here may change the identity of the target."
            ),
            "generator": "tools/gen-trial-manifest.py",
            "generator_version": "1",
            "package_generator": prov["generation_tool"],
            "_no_timestamp": (
                "Deliberately absent. A generation time would make two exports of the same content "
                "differ, which is exactly the property the external team needs to check."
            ),
        },

        "l0_requirements": {
            "_derivation": "Read from contracts/production/conformance-profiles.production.json. Not restated by hand.",
            "required_capabilities": l0.get("required_capabilities", []),
            "required_invariants": l0.get("required_invariants", []),
            "required_schemas": l0.get("required_schemas", []),
            "required_contracts": l0.get("required_contracts", []),
            "required_specifications": l0.get("required_specifications", []),
            "required_registries": l0.get("required_registries", []),
            "required_endpoints": l0.get("required_endpoints", []),
            "not_required": l0.get("not_required", []),
        },

        "required_vector_set": {
            "_derivation": "Derived from the L0 profile's required_vectors. The case ids are frozen here so that a later change to a vector file is visible as a change to this manifest.",
            "vectors": required_vectors,
            "total_cases": sum(v.get("case_count", 0) for v in required_vectors),
        },

        "first_stop_gate": {
            "gate": "BCJ/1",
            "vector": "conformance/vectors/canonicalization.json",
            "rule": "Byte equality, not semantic equivalence. If this gate fails the trial stops and the failure is classified before any downstream work.",
        },

        "adversarial_set": {
            "_derivation": "Derived from rules the package states. Cases carry must_reject only where the specification determines a verdict.",
            "file": "adversarial/cases.json",
            "case_count": adv["case_count"],
            "must_reject": sum(1 for c in adv["cases"] if c.get("must_reject")),
            "well_behaved_only": sum(1 for c in adv["cases"] if not c.get("must_reject")),
        },

        "self_containment": {
            "_rule": "UNRESOLVED must be zero. An L0 implementation may not depend on a decision record, an engine, an internal document or this repository.",
            "included_count": len(included),
            "external_public_reference_count": len(external),
            "unresolved_count": len(unresolved),
            "unresolved": unresolved,
            "external_public_references": external,
            "referenced_public_standards": rfcs,
        },

        "result_model": ["PASS", "FAIL", "SPECIFICATION_BLOCKED", "INVALID_TRIAL", "INTERRUPTED"],
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"trial manifest: {os.path.relpath(OUT, ROOT)}")
    print(f"  package files            {len(pkg_entries)}")
    print(f"  content tree sha256      {content_tree}")
    print(f"  kit tree sha256          {kit_tree}")
    print(f"  required vector cases    {manifest['required_vector_set']['total_cases']}")
    print(f"  unresolved references    {len(unresolved)}")
    return 0 if not unresolved else 2


if __name__ == "__main__":
    sys.exit(main())
