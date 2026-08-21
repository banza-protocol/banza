# BanzAI knowledge & reasoning assurance

## What is here

| file | what it is |
|---|---|
| `ROOT_CAUSES.md` | the nine root causes, each reproduced against production and isolated locally |
| `corpus.jsonl` | the question corpus — id, locale, intent class, criticality |
| `baseline/production-src-14df955.jsonl` | the BEFORE run: the full `/ask` envelope for every question, against live production |
| `probe.mjs` | the read-only probe that produced it |

## The baseline

Taken against **production at `src-14df955`** (repo `14df955b3e0e47bda429f4cf6e0e89ff73e94365`),
website and API both on that tag, model `local_qwen` / `qwen3-4b`. Read-only: `POST /banzai/ask`
only, paced at 3.4s to stay under the edge limit of 20r/m, no destructive operation.

62 questions, Portuguese and English, across definition, comparison, requirement, implementation
guidance, status, false-premise, adversarial and source-follow-up classes.

## What it measured

| | |
|---|---|
| deterministic terminals | 14 |
| model terminals (`explanatory_trunk`) | 18 |
| refusals with zero sources | 18 |
| model answers whose only source is ADR-001 | **9 of 18** |
| `answer_locale` absent | **18 of 18 model answers; 0 of 44 others** |

Two of those numbers carry most of the story.

**Half of every model answer cited ADR-001 and nothing else.** That is the signature of a subject that
never resolved: the question fell to grounding, no concept was fixed, and the FactualPackage was
assembled from the generic protocol-identity entry. The model was then asked a specific question with
one general document in front of it, and answered from that document. It is where the false claims
came from — including "O BANZA não exige um ledger específico", which contradicts six `critical`
invariants and the ADR that defines them.

**`answer_locale` was absent on every model answer and present on every other terminal.** The website
accepts an absent declaration by design, so the locale gate was enforced on every path whose text is
fixed and reviewed and silent on the single path that composes free prose.

## Reproducing

```
node assurance/banzai-knowledge/probe.mjs \
  assurance/banzai-knowledge/corpus.jsonl \
  /tmp/run.jsonl
```

`BANZAI_BASE` selects the target (default `https://banza.network`); `PACE_MS` the spacing. The probe
resumes: ids already present in the output file are skipped.
