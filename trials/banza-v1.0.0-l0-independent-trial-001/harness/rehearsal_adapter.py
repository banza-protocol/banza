#!/usr/bin/env python3
"""A NULL adapter. It implements nothing.

Its only purpose is to rehearse the experiment's mechanics — that the harness starts, feeds every case
through the adapter boundary, parses the vector files, aggregates results and writes evidence. It is
deliberately incapable of passing: every subcommand refuses.

This is not a BANZA implementation and must never be presented as one. It exists so the harness can be
proven to *report failure correctly* before anyone relies on it to report success. An experiment whose
failure path has never been executed is not an experiment that can fail.

    python3 rehearsal_adapter.py <subcommand>   # reads stdin, refuses, exits 1
"""

import sys


def main():
    sys.stdin.buffer.read()          # consume the case, exactly as a real adapter would
    sys.stderr.write("null adapter: nothing is implemented here\n")
    return 1                          # every case refuses, deterministically


if __name__ == "__main__":
    sys.exit(main())
