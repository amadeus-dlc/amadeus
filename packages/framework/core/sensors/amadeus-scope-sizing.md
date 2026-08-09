---
id: scope-sizing
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-scope-sizing.ts
default_severity: advisory
description: Measures how many capabilities a scope-definition enumerated, alongside the record's depth, so the depth-versus-size band can be set once the distribution exists
category: governance
matches: "**/scope-definition/*.md"
input_schema:
  output_path: string
  stage_slug: string
  depth: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  capabilities: integer
  source: string
  depth: string-or-null
  findings: []
timeout_seconds: 5
---

# scope-sizing sensor

The L1 row of #2683 (#2692). Its two siblings measure written volume after the
fact — `depth-budget` reads a finished `requirements.md`, `question-budget` reads
a finished questions file. L1 asks the same question earlier, at the
scope-definition gate, where the capability enumeration is fresh and the depth
is already fixed by the scope.

## Measurement only

This sensor **always passes** and emits **no finding**. It carries no ceiling,
so there is nothing for it to be over.

The threshold comes after the observed distribution accumulates (#2692). Over
the committed corpus the Standard depth has 56 records (counts 3..16, median 6),
Minimal has one, and Comprehensive none — so a depth-keyed band would have to be
placed outside the observed range for two of the three levels, which
`project.md`'s `c1-threshold-inside-observed-range` forbids: a threshold outside
the range answers identically on every record and measures nothing. The band is
a later ruling built on what this sensor records; it is not this sensor's to
invent.

Because a passing advisory writes no detail file, the measurement lives in the
sensor's **stdout JSON** — `capabilities`, `source` and `depth`. That line is
the product. A pass that carried no numbers would be a sensor that fires and
reports nothing, which is the verification theatre `org.md` forbids; the
integration test asserts the numbers are in the line.

## Scope

Fires on every `.md` under a `scope-definition/` directory. The `governance`
category restricts firing further to the run-stage's declared `produces`, so the
reachable set is the three scope-definition outputs: `intent-backlog.md`,
`scope-document.md` and `scope-definition-questions.md`. The first two are the
sizing artifacts; a fire on the questions file measures nothing and says so
(`reason: not-sizing-artifact`).

Both sizing artifacts resolve the count from their **shared directory**, so a
fire on either reports the same number — whichever the stage writes last, the
measurement is the same, and the fallback below can reach `scope-document.md`
from a backlog fire.

The glob uses only `**`, `*` and path segments — no brace expansion — so the
dispatcher's matcher and `Bun.Glob` in the PostToolUse hook read it identically.
A pattern the two engines disagree on would fire in one place and stay silent in
the other.

## What is counted

`intent-backlog.md` holds the prioritized proto-Unit list that scope-definition
Step 3 requires. Its **rows** are the capability enumeration.

Its **header is not**. Over the 58 committed backlogs that carry a table, the
header row takes 55 distinct shapes:

| header | |
|---|---|
| `\| # \| Proto-Unit \| MoSCoW \| 依存 \| 概要 \|` | |
| `\| Priority \| ID \| Capability \| Value \| Dependency \| Confidence hypothesis \|` | |
| `\| 順位 \| ID \| Proto-Unit \| MoSCoW \| BV \| TC \| RR \| Size \| WSJF \| 依存 \|` | |

A predicate that names a column — "count the Must rows" — fails on about half
the corpus. So the measurement is **column-name-independent**: the body-row
count of the largest table in the file, MoSCoW breakdown not attempted.

No backlog format contract is imposed to make a narrower predicate possible.
#2692's ruling declines to write one while the column-name-independent predicate
already answers 56 of 58 records — a format contract for a need that has not
been measured is a contract written ahead of its evidence.

## Fallback chain

Reported as `source`, so a later band ruling can tell a primary measurement from
a fallback rather than averaging two different things together:

| source | when |
|---|---|
| `backlog-table` | `intent-backlog.md` has a table — 56 of 58 records |
| `scope-document-table` | it does not; `scope-document.md` has one — 1 record |
| `scope-document-list` | neither does; the `## In` section has list items — 1 record |
| `none` | nothing enumerable anywhere |

## Why a structural count, not a prose proxy

Measured over the same corpus against the eventual FR count: byte-length and
bullet-count proxies correlate r = 0.22..0.43 — too weak to threshold. The
backlog's largest-table row count correlates r = 0.636, and r = 0.531 against
the eventual Unit count. The sibling `depth-budget` sensor's own comment records
the other end of the same lesson: `requirements.md` byte volume is uncorrelated
(r = +0.084) with implementation size.

## Depth

`depth` is the record's resolved level, read by the dispatcher walking up to
`amadeus-state.md` and passed in as `--depth` — the same seam `depth-budget` and
`question-budget` use, so the three cannot disagree about a record's depth. An
absent or unrecognizable level is reported as `null`; the level is never
guessed, since a guess would corrupt the very distribution this sensor exists to
accumulate.

## Fail-open

Every case where the sensor cannot measure is still a pass, distinguished only
by `reason`:

- the fired path is not one of the two sizing artifacts (`not-sizing-artifact`)
- neither artifact exists, or neither enumerates anything (`no-capabilities`) —
  absence is the artifact guard's business, not this sensor's

An empty file is read as absent rather than as a zero-row table, so a stage
mid-write falls through to the next arm of the chain instead of recording a
zero.
