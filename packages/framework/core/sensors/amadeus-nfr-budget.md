---
id: nfr-budget
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-nfr-budget.ts
default_severity: advisory
description: Measures an NFR unit's bytes per declared requirement id, flags a Standard-depth unit over its per-stage ceiling, and reports a unit written under the id contract that declares none
category: document-shape
matches: "**/nfr-*/*.md"
input_schema:
  output_path: string
  stage_slug: string
  depth: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  bytes: integer
  declared_ids: integer
  unit_files: integer
  unit_bytes: integer
  unit_nfr_count: integer
  bytes_per_nfr: integer
  unit_bytes_per_nfr: integer
  record_birth: string-or-null
  under_id_contract: boolean
  findings:
    - field: string
      reason: string
timeout_seconds: 5
---

# nfr-budget sensor

The measurement stage of #2684. The two NFR stages produce more artifact files
than any other stage in the corpus, with a per-artifact spread wider than the
one #2425 was filed about, and until #2686 they carried no id contract at all —
so no denominator existed to measure volume against.

Stage ① (#2686) supplied the contract. Stage ② (this sensor, before the ruling
below) supplied the measurement and no ceiling — placing one before the
observed distribution exists is the mistake #2525 had to undo: a threshold
under the observed minimum flags every artifact, and a permanently red signal
says nothing about which artifact is an outlier. Stage ③ (issue comment
5230416035) ships the first ceiling, **Standard depth only**, derived from the
numbers this sensor and the repository's depth artifact census produce.
Minimal (n=3 today — too thin to rule on) and Comprehensive (no ceiling by
convention, `stage-protocol.md` §8) are unchanged: measured, never flagged.

This manifest declares `advisory`, so a finding is data for the human at the
gate and never blocks. Raising it to `blocking` (the schema's other severity,
#2689) is held by the issue's stopping condition until #2683 rules on how many
surfaces may block at once.

## Scope

Fires on the artifacts the two NFR stages produce, under
`<record>/construction/<unit>/nfr-requirements/` and
`<record>/construction/<unit>/nfr-design/`:

| nfr-requirements | nfr-design |
|---|---|
| performance-requirements.md | performance-design.md |
| security-requirements.md | security-design.md |
| scalability-requirements.md | scalability-design.md |
| reliability-requirements.md | reliability-design.md |
| tech-stack-decisions.md | logical-components.md |

The `matches` glob uses only `**`, `*` and path segments — no brace expansion —
so the dispatcher's own matcher and `Bun.Glob` in the PostToolUse hook read it
identically. A pattern the two engines disagree on would fire in one place and
stay silent in the other. The glob is deliberately wider than the artifact set;
the sensor holds the closed list of ten basenames and skips anything else in
those directories — the stage diary and question files included
(`reason: "not-nfr-artifact"`). The `document-shape` category restricts firing
further to the run-stage's declared `produces`.

## Measurement

**The denominator is the UNIT's declared id count**: the distinct ids declared
across that unit's `nfr-requirements` artifacts, in the five positions the stage
contract fixes.

Both stages divide by that same number. NFR ids are declared in
`nfr-requirements` and only *cited* in `nfr-design` — the stage contract says so
("do not renumber, re-prefix, or invent ids the upstream artifacts do not
declare") — so counting declarations inside a design artifact would always yield
zero.

Two figures come out:

- **`unit_bytes_per_nfr`** — the unit's bytes for this stage over its id count.
  The primary axis (D2 in the issue's Part B-1), chosen because `produces_kinds`
  pruning moves numerator and denominator together: a unit whose kind prunes
  three of five artifacts loses their bytes and their ids at once, so the ratio
  stays comparable across kinds.
- **`bytes_per_nfr`** — this artifact's share of the same denominator. A
  diagnostic for *which category of one unit* is the outlier (D1), not a second
  denominator.

`declared_ids` reports what this artifact itself declares, which is how a design
artifact's zero is told apart from a requirements artifact's.

### Ids

An id is one or more uppercase-letter-led segments joined by `-`, ending on a
segment that finishes in digits — `SEC-1`, `REL-3`, `P-12`, `NFR-PERF-1`,
`U2-SCALE-4`, `SCL-CP-2`. Category-local prefixes stay valid; there is no
`NFR-` requirement (ruling 6 on #2684 — an `NFR-` monopoly would retro-invalidate
98% of the corpus).

Declarations are counted in the same five positions #2673 fixed for FR ids:

- `### SEC-1: <title>` (heading, two to four hashes)
- `- **SEC-1**: <title>` (bold list entry)
- `**SEC-1**: <title>` (bare bold line)
- `- SEC-1: <title>` (plain list entry, optionally through one parenthesised
  gloss before the colon)
- `| SEC-1 | <title> |` (first cell of a table row)

The predicate is the FR one with its `FR-` anchor replaced by the leading
segment's own shape — the same skeleton, not a second predicate. Ending on
digits is what separates an id from a category name (`SEC-AUTH`) and drops the
prose tokens the corpus already carries (`NFR-design`, `NFR-only`,
`NFR-traceable`); requiring an uppercase letter first drops a date
(`2026-08-09`) without needing to recognise dates. Distinct ids are counted, so
restating one in a cross-reference does not inflate the denominator.

### What is not measured

`produces_kinds` prunes artifacts by unit kind, and **the expected set cannot be
reconstructed from disk**. Measured over the corpus: of the 142
`nfr-requirements` unit directories, 130 belong to units whose kind is
unresolvable from the committed `unit-of-work-dependency.md`, and the engine's
kindless fallback hands those every declared artifact. "Artifact absent" and
"artifact pruned" are therefore indistinguishable for most of the corpus, so
this sensor measures the artifacts that EXIST and never assumes an expected set.
Separating pruning from a silent omission is the issue's stage ⑤ (coverage) and
needs the directive's resolved kind rather than the filesystem.

## Budgets

Measured by applying this sensor's own predicate to every Standard-depth unit
with at least one declared id, from the same corpus the repository's depth
artifact census walks (which imports this sensor's predicates rather than
re-deriving them):

| Stage | Ceiling | n | min | median | max | Flags |
|---|---|---:|---:|---:|---:|---:|
| nfr-requirements | 1,200 B per id | 78 | 299 | 657 | 2,290 | 12/78 = 15.4% |
| nfr-design | 1,200 B per id | 78 | 130 | 769 | 2,553 | 16/78 = 20.5% |

Both ceilings compare against `unit_bytes_per_nfr` (D2), the unit's total bytes
for that stage over its declared id count — not `bytes_per_nfr` (D1), which
stays a diagnostic.

Both ceilings sit **inside** their stage's observed range — above the minimum
so the ceiling says something about WHICH units are outliers, below the
maximum so it says anything at all
(cid:code-generation:c1-threshold-inside-observed-range) — and both sit ABOVE
their stage's median (roughly 1.8x for nfr-requirements, 1.6x for nfr-design),
so each catches the tail rather than the middle. The two ceilings landing on
the same 1,200 is **coincidence, not a shared rule**: they were derived
independently, one stage at a time, and a future ruling may move one without
the other — see the `NFR_REQUIREMENTS_STANDARD_BUDGET` and
`NFR_DESIGN_STANDARD_BUDGET` constants for the per-stage reasoning.

**The ceiling check is independent of the id-contract cutoff.** A unit
written before the id contract landed that nonetheless declares ids is
measured against the ceiling exactly like a unit written after — the cutoff in
"The one reported case" below governs only the missing-id finding.
Consequently, and only because the id contract landed moments before this
ruling, every Standard-depth unit measured in the table above predates the
contract; the ceiling could not yet have anything else to measure against.

Minimal declares no ceiling: its Standard-depth sibling had 78 units to derive
a range from, Minimal has 3 — too thin to place a threshold inside without it
being either an accident of three data points or, at the corpus's current
size, a permanently-red signal. Comprehensive declares no ceiling by the
depth-budget sensor's own convention (`stage-protocol.md` §8). Both stay
absent from the CLI's Standard-only comparison rather than an entry of
Infinity, which would read as a threshold someone forgot to pick.

## Depth delivery

The per-sensor script receives `--stage`, `--output-path` and — new for this
ruling — `--depth`. The dispatcher resolves depth the same way it does for
depth-budget: walking up from the output path to the record's
`amadeus-state.md`, bounded by the project root
(`amadeus-sensor.ts`'s `depthBudgetArgs`, which now threads both sensors
through the same lookup). A depth that cannot be resolved is simply absent,
and the ceiling check passes fail-open.

## The two reported cases

A unit written **under the id contract** whose `nfr-requirements` artifacts
declare no id at all (`missing-nfr-ids`). Without ids there is no denominator to
measure against, and nothing downstream — `nfr-design`'s tracing,
Build and Test's proportional test selection, a reviewer checking that an
absence claim is falsifiable — can address the requirement by name.

"Under the contract" is the record's birth (`WORKFLOW_STARTED`, earliest across
its audit shards) at or after **2026-08-09T03:47:46Z**, the instant PR #2686
squash-merged. Half the pre-contract corpus declares no id and could not have
declared one — there was no contract to follow — so reporting those records
would be a retroactive finding on every gate that reopens an old record: the
permanently-red failure again in another shape.

## Fail-open

Every case where the sensor cannot legitimately measure is a pass:

- the path is not one of the ten artifacts (`not-nfr-artifact`)
- the file does not exist yet (`no-file`) — absence is the artifact guard's
  business
- the file exists but is empty (`empty`) — a stage mid-write, not a violation
- the record's birth cannot be read (no audit shard, no start event) — the
  sensor never guesses a record into the reported cohort
- the record was born before the contract landed

A fail-open result reports `record_birth: null` (hence `string-or-null` above)
and `under_id_contract: false`.

The ceiling check adds its own fail-open cases, evaluated independently of the
missing-id case above:

- the depth cannot be resolved from the `--depth` flag (unset, unresolved
  ancestry) — no ceiling applies, not just Minimal/Comprehensive
- the depth resolves to anything other than `Standard` — Minimal and
  Comprehensive report `measured` and nothing else
- `unit_nfr_count` is zero — a ceiling divides by the id count; zero ids means
  no ratio to compare, and (for post-contract units) the missing-id case
  already reports the more useful finding

Births are compared as **instants**, never as strings. A timestamp is read only
when it matches the audit schema's UTC form, parses, and round-trips its own
calendar fields — three checks because each admits what the others reject: the
shape lets `2026-13-01` through, the parse rolls `2026-02-30` over into March,
and neither notices `"z"`. Anything that fails leaves the record birth-unknown,
which is the fail-open side.

String order is not chronological order here: `.` sorts below `Z`, so
`…:46.001Z` reads as earlier than `…:46Z` and a record born a millisecond after
the cutoff would file itself as pre-contract.

## Failure mode

Findings emit `SENSOR_FAILED` through the existing dispatcher and write detail
under `.amadeus-sensors/<stage-slug>/`. `missing-nfr-ids` names the missing id
contract; `nfr-budget-exceeded` names the unit's measured bytes, id count, and
the ceiling it crossed. Neither finding echoes the artifact's contents.
