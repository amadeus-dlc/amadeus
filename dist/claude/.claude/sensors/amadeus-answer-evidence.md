---
id: answer-evidence
kind: deterministic
command: bun .claude/tools/amadeus-sensor-answer-evidence.ts
default_severity: advisory
description: Advisory surface for the E-OC1 evidence guard — flags a *-questions.md whose filled [Answer] carries no ruling reference (E-code) or leader-approval timestamp
category: governance
matches: "**/*-questions.md"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  skipped: string
timeout_seconds: 5
---

# answer-evidence sensor

Advisory Write/Edit-time surface for the E-OC1 evidence guard (#1101). It
re-uses the shipped predicate `checkQuestionsEvidence` (amadeus-lib.ts) — the
same predicate the gate-start guard runs fail-closed — so a `*-questions.md`
with a filled `[Answer]` but no ruling reference (`E-code`) or parseable
leader-approval timestamp surfaces at authoring time, upstream of the approval
gate. The check is deterministic and byte-reproducible; no LLM.

## Scope

Fires only on `*-questions.md` outputs (the `matches` glob). Non-questions
files are skipped (`skipped: "not-questions"`).

## Enforcement cutoff

Only intents whose record-dir date (`YYMMDD-...`) is on/after the guard's
adoption day are checked; older or undatable paths are skipped
(`skipped: "pre-cutoff"`). The cutoff is canonical in amadeus-lib.ts
(`QUESTIONS_EVIDENCE_CUTOFF_YYMMDD`), shared with the gate-start guard so the
two never drift. The gate resolves the record dir from state; this sensor parses
it from the output path directly, so it stays state-free.

## Predicate mapping

The predicate's discriminated union maps 1:1 onto the sensor result: its two
fail reasons (`no-evidence`, `unparseable-timestamp`) become a failing check
with `findings_count: 1`; its four pass reasons (`no-file`, `no-answer-tag`,
`answer-blank`, `evidence-present`) become a passing check with
`findings_count: 0`. The sensor never re-implements or alters the predicate.

## Failure mode

When the check fails, emits `SENSOR_FAILED` and writes detail to
`amadeus-docs/.amadeus-sensors/<stage-slug>/answer-evidence-<fire-id>.md` (Fire
id is the 8-hex correlator from the SENSOR_FIRED audit row). The verdict is
advisory — the human decides at the gate.
