# Compare the QA checklist's cumulative points against the engine's step weights.
#
# This is what binds the BanzAI QA document to the code. The checklist tells a reviewer to expect
# 20 → 45 → 60 → 75 → 95 → 100; those numbers are only correct while
# `engines/banzai-operator-journey/src/session.rs::weight` returns 20/25/15/15/20/5. Change a weight
# without changing the checklist and every manual QA run afterwards would be validating against a
# stale target — silently, which is the failure mode this whole gate exists to prevent.
#
# Usage: awk -f qa-checkpoints.awk weights.txt checkpoints.txt
#   weights.txt     lines of `step|weight`
#   checkpoints.txt markdown table rows: `| step | … | N/100 |`
#
# Exits non-zero on any mismatch.

BEGIN { FS = "|"; bad = 0; total = 0 }

# First file: the weights parsed out of Rust, in Rust match-arm order — which IS the journey order.
FNR == NR {
    split($0, w, "|")
    gsub(/[ \t]/, "", w[1]); gsub(/[ \t]/, "", w[2])
    if (w[1] != "") { weight[w[1]] = w[2] + 0; order[++nsteps] = w[1] }
    next
}

# Second file: the checklist rows, in journey order.
{
    step = $2; gsub(/[ \t]/, "", step)
    if (step == "" || step == "Step") next

    # The points cell is the last `N/100` on the row.
    points = ""
    for (i = 1; i <= NF; i++) {
        cell = $i
        if (match(cell, /[0-9]+\/100/)) {
            points = substr(cell, RSTART, RLENGTH)
            sub(/\/100/, "", points)
        }
    }
    if (!(step in weight)) {
        printf("  FAIL: checkpoint names step '%s', which has no weight in the engine\n", step)
        bad = 1
        next
    }

    # The journey order is fixed by the engine. A reordered table that still totals 100 would have a
    # reviewer validating the wrong step at every stage, so position is checked, not just the sum.
    row++
    if (order[row] != step) {
        printf("  FAIL: checkpoint %d is '%s', but the engine's journey order has '%s' there\n",
               row, step, order[row])
        bad = 1
    }

    # Account for the step even when its cell is unreadable, so one blank cell does not cascade into
    # a false mismatch on every row after it.
    total += weight[step]
    seen[step] = 1

    if (points == "") {
        printf("  FAIL: checkpoint row for '%s' has no N/100 value\n", step)
        bad = 1
        next
    }
    if (points + 0 != total) {
        printf("  FAIL: after '%s' the checklist expects %d/100, but the engine weights give %d/100\n",
               step, points + 0, total)
        bad = 1
    } else {
        printf("  ok: %s → %d/100 matches the engine weights\n", step, total)
    }
}

END {
    # Every weighted step must appear, or the checklist stops short of a full journey.
    for (s in weight) {
        if (weight[s] > 0 && !(s in seen)) {
            printf("  FAIL: step '%s' carries weight %d but never appears in the checklist\n", s, weight[s])
            bad = 1
        }
    }
    if (!bad && total != 100) {
        printf("  FAIL: the checklist ends at %d/100, not 100/100\n", total)
        bad = 1
    }
    exit bad
}
