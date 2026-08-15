#!/usr/bin/env python3
"""BANZA v1.0.0 L0 independent-implementation trial harness.

Language-neutral by construction. It observes protocol behaviour through two boundaries and nothing
else: a command-line adapter the implementer supplies, and an HTTP origin the implementation serves.
It never sees function names, modules, logs, database rows or call graphs, and it does not care what
language anything is written in.

Python 3, standard library only — no dependency the implementer has to install, and nothing that would
make one language easier to test than another.

    python3 run_trial.py --package <dir> --adapter <cmd> [--origin http://host:port] [--out results.json]

The adapter is invoked as `<cmd> <subcommand>` with the case on stdin and the answer on stdout:

    canonicalize            stdin: raw bytes of the document
                            accept -> exit 0, stdout is the canonical UTF-8 byte sequence
                            reject -> exit non-zero (stderr is free-form and is not compared)
    capability-satisfies    stdin: {"required": "...", "declared": [...]}
                            stdout: satisfied | not_satisfied
    field-validate          stdin: {"field": "...", "value": <json>}
                            stdout: accept | reject
    receipt-equivalence     stdin: {"a": <json>, "b": <json>}
                            stdout: EQUIVALENT | NOT_EQUIVALENT
    step-status             stdin: {"engine_status": "..."}
                            stdout: the step status for that engine status

Exit code 0 means every required case passed. Any other exit code means the run did not pass; the JSON
result file is written either way and is the evidence, not this exit code.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

TIMEOUT = 30


# ── adapter boundary ────────────────────────────────────────────────────────────────────────────────

def call(adapter, sub, payload_bytes):
    """Run one adapter subcommand. Returns (exit_code, stdout_bytes)."""
    try:
        p = subprocess.run(
            adapter + [sub],
            input=payload_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=TIMEOUT,
        )
        return p.returncode, p.stdout
    except subprocess.TimeoutExpired:
        return 124, b""
    except OSError as e:
        return 127, str(e).encode()


def text(out):
    return out.decode("utf-8", "replace").strip()


# ── gate 1 — BCJ/1 ──────────────────────────────────────────────────────────────────────────────────

def gate_bcj(adapter, vectors):
    """The first stop gate. Byte equality, not semantic equivalence."""
    results = []
    for v in vectors:
        # The document is fed as bytes exactly as the vector carries it. `input_raw`, when present, is
        # the authority: it exists precisely for cases whose bytes cannot survive a JSON round trip.
        if "input_raw" in v:
            raw = v["input_raw"].encode("utf-8")
        else:
            raw = json.dumps(v["input"], ensure_ascii=False, separators=(",", ":")).encode("utf-8")

        rc, out = call(adapter, "canonicalize", raw)
        expect = v["expect"]
        r = {"id": v["id"], "expect": expect, "title": v.get("title", "")}

        if expect == "reject":
            r["observed"] = "reject" if rc != 0 else "accept"
            r["pass"] = rc != 0
        else:
            if rc != 0:
                r.update(observed="reject", **{"pass": False})
            else:
                canonical = v["canonical"].encode("utf-8")
                got_sha = hashlib.sha256(out).hexdigest()
                byte_equal = out == canonical
                r["observed"] = "accept"
                r["bytes_equal"] = byte_equal
                r["sha256_expected"] = v.get("sha256")
                r["sha256_observed"] = got_sha
                if v.get("canonical_bytes_len") is not None:
                    r["bytes_len_expected"] = v["canonical_bytes_len"]
                    r["bytes_len_observed"] = len(out)
                # Both are asserted: the digest is what a signature is computed over, and the byte
                # sequence is what produced it. A digest match with different bytes is not possible,
                # but reporting both makes a failure diagnosable without re-running.
                r["pass"] = bool(byte_equal and (v.get("sha256") in (None, got_sha)))
        results.append(r)
    return results


# ── gate 2 — capabilities ───────────────────────────────────────────────────────────────────────────

def gate_capabilities(adapter, vectors):
    results = []
    for v in vectors:
        payload = json.dumps({"required": v["required"], "declared": v["declared"]}).encode()
        rc, out = call(adapter, "capability-satisfies", payload)
        got = text(out)
        results.append({
            "id": v["id"], "expect": v["expect"], "observed": got,
            "title": v.get("title", ""), "pass": rc == 0 and got == v["expect"],
        })
    return results


# ── gate 3 — reason codes ───────────────────────────────────────────────────────────────────────────

def gate_reason_codes(adapter, vectors):
    results = []
    for v in vectors:
        expect = v["expect"]
        if "a" in v or "input_a" in v:
            a = v.get("a", v.get("input_a"))
            b = v.get("b", v.get("input_b"))
            rc, out = call(adapter, "receipt-equivalence", json.dumps({"a": a, "b": b}).encode())
        elif "engine_status" in v:
            rc, out = call(adapter, "step-status", json.dumps({"engine_status": v["engine_status"]}).encode())
        else:
            payload = json.dumps({"field": v["field"], "value": v["input"]}).encode()
            rc, out = call(adapter, "field-validate", payload)
        got = text(out)
        results.append({
            "id": v["id"], "expect": expect, "observed": got,
            "title": v.get("title", ""), "pass": rc == 0 and got == expect,
        })
    return results


# ── gate 4 — the served operator manifest ───────────────────────────────────────────────────────────

def gate_manifest(origin, vectors):
    """L0 requires a reachable manifest, so this gate is served over HTTP rather than emitted.

    Reachability is part of what L0 demonstrates; asking the implementation to print the document it
    would serve would test a different, weaker claim.
    """
    results = []
    for v in vectors:
        r = {"id": v["id"], "title": v.get("title", "")}
        if not origin:
            r.update({"pass": False, "observed": "no origin supplied", "expect": "served"})
            results.append(r)
            continue
        url = origin.rstrip("/") + v["input"]["path"]
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
                status = resp.status
                body = resp.read()
        except Exception as e:  # unreachable is a result, not a crash
            r.update({"pass": False, "observed": f"unreachable: {e}", "expect": "served"})
            results.append(r)
            continue

        exp = v["expected"]
        checks = []
        checks.append(("status", status == exp.get("status", 200), status))
        try:
            doc = json.loads(body)
        except Exception:
            checks.append(("json", False, "body is not JSON"))
            doc = {}

        for f in exp.get("response_fields_required", []):
            checks.append((f"field:{f}", f in doc, doc.get(f, "<absent>")))
        for f, want in exp.get("response_field_values", {}).items():
            checks.append((f"value:{f}", doc.get(f) == want, doc.get(f, "<absent>")))
        for parent, fields in exp.get("nested_fields_required", {}).items():
            sub = doc.get(parent, {})
            for f in fields:
                checks.append((f"nested:{parent}.{f}", isinstance(sub, dict) and f in sub,
                               (sub or {}).get(f, "<absent>")))

        r["checks"] = [{"check": c, "pass": p, "observed": o} for c, p, o in checks]
        r["pass"] = all(p for _, p, _ in checks)
        results.append(r)
    return results


# ── adversarial set ─────────────────────────────────────────────────────────────────────────────────

def gate_adversarial(adapter, cases):
    """Hostile input. The bar is: no crash, deterministic, no silent repair — not a specific verdict.

    A case declares `must_reject` only where the specification determines rejection; where it does not,
    the case asserts only that the implementation is well-behaved and repeatable.
    """
    results = []
    for c in cases:
        raw = c["input_raw"].encode("utf-8", "surrogatepass") if c.get("input_raw") is not None \
            else bytes(c["input_bytes"])
        rc1, out1 = call(adapter, c.get("subcommand", "canonicalize"), raw)
        rc2, out2 = call(adapter, c.get("subcommand", "canonicalize"), raw)
        deterministic = (rc1 == rc2) and (out1 == out2)
        crashed = rc1 in (124, 127) or rc1 < 0 or rc1 > 125
        r = {
            "id": c["id"], "title": c["title"], "basis": c["basis"],
            "deterministic": deterministic, "crashed": crashed,
            "exit_code": rc1,
        }
        ok = deterministic and not crashed
        if c.get("must_reject"):
            r["expect"] = "reject"
            r["observed"] = "reject" if rc1 != 0 else "accept"
            ok = ok and rc1 != 0
        else:
            r["expect"] = "well-behaved (the specification does not determine a verdict here)"
            r["observed"] = "reject" if rc1 != 0 else "accept"
        r["pass"] = ok
        results.append(r)
    return results


# ── driver ──────────────────────────────────────────────────────────────────────────────────────────

def load(pkg, rel):
    with open(os.path.join(pkg, rel), encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", required=True, help="the frozen L0 package directory")
    ap.add_argument("--adapter", required=True, help="command that speaks the adapter contract")
    ap.add_argument("--origin", help="HTTP origin serving the operator manifest (L0 reachability)")
    ap.add_argument("--adversarial", help="adversarial case file (defaults to ../adversarial/cases.json)")
    ap.add_argument("--out", default="trial-results.json")
    a = ap.parse_args()

    adapter = a.adapter.split()
    pkg = a.package

    bcj = load(pkg, "conformance/vectors/canonicalization.json")["vectors"]
    caps = load(pkg, "conformance/vectors/capabilities.json")["vectors"]
    rcs = load(pkg, "conformance/vectors/reason-codes.json")["vectors"]
    mans = load(pkg, "conformance/vectors/operator-manifests.json")["vectors"]

    adv_path = a.adversarial or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                             "..", "adversarial", "cases.json")
    adv = json.load(open(adv_path, encoding="utf-8"))["cases"] if os.path.exists(adv_path) else []

    out = {
        "harness_version": "1",
        "package_manifest_sha256": hashlib.sha256(
            open(os.path.join(pkg, "package-manifest.json"), "rb").read()).hexdigest(),
        "gates": {},
    }

    # BCJ/1 is the first stop gate: if it does not pass, downstream results are not meaningful, so
    # they are reported as not-run rather than as failures of their own.
    out["gates"]["bcj1"] = gate_bcj(adapter, bcj)
    bcj_pass = all(r["pass"] for r in out["gates"]["bcj1"])

    if bcj_pass:
        out["gates"]["capabilities"] = gate_capabilities(adapter, caps)
        out["gates"]["reason_codes"] = gate_reason_codes(adapter, rcs)
        out["gates"]["operator_manifest"] = gate_manifest(a.origin, mans)
        out["gates"]["adversarial"] = gate_adversarial(adapter, adv)
    else:
        out["gates"]["_not_run"] = "BCJ/1 did not pass; downstream gates were not executed (stop rule)."

    summary = {}
    for gate, rs in out["gates"].items():
        if isinstance(rs, list):
            summary[gate] = {"total": len(rs), "passed": sum(1 for r in rs if r["pass"])}
    out["summary"] = summary
    out["bcj1_gate"] = "PASS" if bcj_pass else "FAIL"
    every = bcj_pass and all(s["passed"] == s["total"] for s in summary.values())
    # The harness reports; it does not adjudicate. A trial verdict is assigned by the trial protocol,
    # against the pre-registered criteria, by a human reading this file.
    out["all_required_cases_passed"] = every

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"BCJ/1 gate: {out['bcj1_gate']}")
    for g, s in summary.items():
        print(f"  {g:20} {s['passed']}/{s['total']}")
    print(f"results: {a.out}")
    return 0 if every else 1


if __name__ == "__main__":
    sys.exit(main())
