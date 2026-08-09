---
id: question-budget
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-question-budget.ts
default_severity: advisory
description: Counts the questions a stage's *-questions.md asks and compares the total against the depth's ceiling from the §8 Depth-Level Contract
category: governance
matches: "**/*-questions.md"
input_schema:
  output_path: string
  stage_slug: string
  depth: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  questions: integer
  depth: string-or-null
  ceiling: integer-or-null
  record_date: integer-or-null
  enforced: boolean
  findings:
    - field: string
      reason: string
timeout_seconds: 5
---

# question-budget sensor

The L2 row of #2683 (#2693). #2672 promoted §8's "Primary questions per stage:
Minimal 4 / Standard 8 / Comprehensive 12" from an illustration to a contract
that stages MUST hold to, and chose self-enforcement to carry it — the stage
agent is expected to respect the ceiling while drafting. Nothing counted. This
sensor supplies the count, which is what turns the row into a checkable one and
moves the enforcement style from self-judgement to machine measurement.

This manifest declares `advisory`, so a finding is data for the human at the
gate and never blocks. Raising it to `blocking` (the schema's other severity,
#2689) is held by #2683's ruling on how many surfaces may block at once — it is
not this sensor's decision to make.

## Scope

Fires on every `*-questions.md`, the same glob the `answer-evidence` sensor
carries. Two sensors sharing one glob is fine by construction: the dispatcher
walks a stage's `sensors_applicable` and fires each independently. The
`governance` category restricts firing further to the run-stage's declared
`produces`, so an unrelated file that happens to end in `-questions.md` outside
a stage's outputs stays silent.

The glob uses only `**`, `*` and path segments — no brace expansion — so the
dispatcher's matcher and `Bun.Glob` in the PostToolUse hook read it identically.
A pattern the two engines disagree on would fire in one place and stay silent in
the other.

## What counts as a question

The contract answers this itself, twice — "Primary and follow-up questions share
this single total budget" and "including follow-ups and chat-mode questions".
The column is headed *primary* questions, but the budget it caps is the total,
so a lettered follow-up (`Q1a.`) enters the same count as the primary that
spawned it. Counting primaries alone would read the contract against its own
words.

Four written forms, enumerated over the committed corpus rather than assumed:

| form | example | where it appears |
|---|---|---|
| heading | `### Q1. …`, `## Q3: …` | the majority form |
| prefixed question code | `### FDQ-1: …`, `### NQ-5: …`, `### DQ-3: …` | design-stage question files |
| bold inline | `**Q1: …**`, `**Q1(U-01): …**` | question files with a `## 質問と回答` section |
| 質問-headed table | `\| 質問 \| 回答 \|` with one ask per body row | operation-stage question files |

A heading-only predicate reads the other three as silence. That is the #2534
defect — an FR predicate blind to the table form — arriving in a second place,
so all four are in the closed set from the start rather than added after a
corpus sweep finds them.

A **prefixed** code is one whose prefix ends in `Q`. That is what separates
`### FDQ-1:` from the `### FR-1:` and `### ADR-2:` headings question files cite
constantly, without a per-prefix allowlist that has to grow as stages invent
their own codes.

Questions are counted **distinctly**. A question file restates its own ids: a
`裁定の記録` table naming `Q1` records the answer to the `### Q1.` heading above
it, and counting both would report a five-question stage as ten. Identity is the
code where one exists and the row's own text where it does not — a table of
prose asks has no ids to collide on.

## Measurement and comparison

`questions` is that distinct count. `depth` is the record's resolved level, read
by the dispatcher walking up to `amadeus-state.md` and passed in as `--depth` —
the same seam the `depth-budget` sensor uses, so the two cannot disagree about a
record's depth. `ceiling` is that level's number from the §8 table.

Unlike `depth-budget`, Comprehensive carries a ceiling here: §8 states one (12)
for questions where it deliberately states none for requirements volume.

A count **above** the ceiling on an enforced record is the one reported case.

## Enforcement cutoff

Records are dated by their directory name (`YYMMDD-…`), and only records dated
on or after **260809** — the day this sensor landed — are reported. The shape
mirrors the blocking-sensor guard's own cutoff.

Measured before choosing it, over every committed question file: zero exceed
Comprehensive's 12, and comparing each file against its own record's depth
leaves a few dozen above their row — nearly all of them Minimal records written
long before the row was a contract. Reporting those would be the
permanently-red signal #2525 had to undo, in a third shape.

Older records are still **measured**: `questions`, `depth` and `ceiling` are
reported for every file. Only the finding is withheld, under
`reason: "pre-cutoff"`.

## Fail-open

Every case where the sensor cannot legitimately compare is a pass:

- the path is not a `*-questions.md` (`not-questions-file`)
- the file does not exist yet (`no-file`) — absence is the artifact guard's
  business
- the file exists but holds only whitespace (`empty`) — a stage mid-write, not a
  contract violation
- no depth reached the sensor, or the state file names one it does not
  recognise (`no-depth`) — a level is never guessed, since guessing Minimal
  would report at the strictest row on exactly the runs where the row is unknown
- the record root or its date cannot be read — an unreadable layout is not
  evidence that a record is new, so it is never reported

## Failure mode

Findings emit `SENSOR_FAILED` through the existing dispatcher and write detail
under `.amadeus-sensors/<stage-slug>/`. A finding names the count, the level and
the ceiling; the questions themselves are never echoed.
