---
id: depth-budget
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-depth-budget.ts
default_severity: advisory
description: Flags a requirements.md whose bytes-per-requirement exceed the guidance for the workflow's resolved depth
category: document-shape
matches: "**/inception/requirements-analysis/requirements.md"
input_schema:
  output_path: string
  stage_slug: string
  depth: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  fr_count: integer
  bytes: integer
  bytes_per_fr: integer
  findings:
    - field: string
      reason: string
timeout_seconds: 5
---

# depth-budget sensor

Gives `brief` a number (#2425). The depth mechanism reaches the stage on the
run-stage directive's `depth` field and `requirements-analysis.md` states a
per-depth requirement volume, but "brief descriptions" carried no measurable
meaning — so nothing distinguished a proportionate artifact from one many times
larger. This sensor measures the result and reports overruns as advisory data
for the human at the gate. It never enforces; `advisory` is the only severity
the schema ships.

## Scope

Fires on the artifact the stage produces:
`<record>/inception/requirements-analysis/requirements.md`. The
`document-shape` category restricts firing further to the run-stage's declared
`produces`, so an unrelated `requirements.md` elsewhere in the tree is out of
reach. Any other output path is skipped (`reason: "not-requirements"`).

The `matches` glob uses only `**` and path segments — no brace expansion — so
the dispatcher's own matcher and the PostToolUse hook's `Bun.Glob` read it
identically. A pattern the two engines disagree on would fire in one place and
stay silent in the other.

## Measurement

Total UTF-8 bytes divided by the number of distinct numbered functional
requirements. Requirements are counted in the three forms the stage contract
allows:

- `### FR-1: <title>` (heading, two to four hashes)
- `- **FR-1**: <title>` (bold list entry)
- `**FR-1**: <title>` (bold line)

The id may carry a domain prefix — `FR-AUTH-1`, `FR-QRP-3`, `FR-GRT-004` — which
is how the corpus overwhelmingly writes them, and nothing is required to follow
the id: a colon, an em dash, or a parenthesised title inside the same bold run
all read the same. An earlier pattern demanded a digit straight after `FR-` and
a closing `**` right after the id; it undercounted 13 of 50 artifacts and read 7
as carrying no requirements at all.

Distinct ids are counted, so restating `FR-1` in a later cross-reference does
not inflate the denominator — which would otherwise make an over-long document
look proportionate.

## Budgets

Measured over the 43 corpus artifacts carrying `FR-n` ids, by applying this
sensor's own predicate to each with its recorded depth:

| Depth | Ceiling | min | median | max | Flags |
|---|---|---|---|---|---|
| Minimal | 1,800 B per FR | 1,346 | 2,353 | 6,544 | 19/26 |
| Standard | 2,400 B per FR | 864 | 2,040 | 3,354 | 3/17 |
| Comprehensive | none | — | — | — | — |

Both ceilings sit **inside** their level's observed range, which is what makes
each a detector rather than a verdict: above the minimum so it says something
about WHICH artifacts are outliers, below the maximum so it says anything at
all.

Where each sits within that range differs on purpose:

- **Minimal 1,800 is below its median (2,353).** Minimal is the level the
  inversion is about — it spends more per requirement than Standard while
  declaring less detail — so its ceiling pulls the level down rather than
  ratifying it.
- **Standard 2,400 is above its median (2,040).** Standard's current volume was
  judged reasonable, so its ceiling catches the tail rather than the middle.

The lower bound was learned the hard way: a first Minimal ceiling of 1,200 sat
under the observed minimum of 1,346 and flagged 26 of 26. A permanently red
signal carries no information, so it was noise rather than a measurement.

Comprehensive declares no ceiling, matching `stage-protocol.md` §8.

These are guidance, not a contract: the stage says so in the same words, and a
finding never blocks a gate.

## Fail-open

Every case where the sensor cannot legitimately measure is a pass:

- the output file does not exist yet (`no-file`) — absence is the artifact
  guard's business
- the file exists but is empty (`empty`) — a stage mid-write, not a violation
- no depth was supplied, or the value is unrecognizable (`no-depth`) — the
  sensor never guesses a level
- the depth is Comprehensive (`no-ceiling`)

The single exception is a written `requirements.md` carrying no `FR-n` ids at
all (`no-numbered-frs`). That is the stage contract's numbering requirement
going unmet, and downstream stages address requirements by those ids, so it is
reported rather than passed over.

## Depth delivery

The per-sensor script receives only `--stage`, `--output-path` and `--depth`.
The dispatcher resolves the depth by walking up from the output path to the
record's `amadeus-state.md`, bounded by the project root, and passes the answer
in — the script never locates the record itself. A depth that cannot be
resolved is simply absent, and the sensor passes.

## Failure mode

Findings emit `SENSOR_FAILED` through the existing dispatcher and write detail
under `.amadeus-sensors/<stage-slug>/`. A finding names the measurement and the
ceiling; the artifact's contents are never echoed.
