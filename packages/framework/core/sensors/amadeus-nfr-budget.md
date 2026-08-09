---
id: nfr-budget
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-nfr-budget.ts
default_severity: advisory
description: Measures an NFR unit's bytes per declared requirement id, and reports a unit written under the id contract that declares none
category: document-shape
matches: "**/nfr-*/*.md"
input_schema:
  output_path: string
  stage_slug: string
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

Stage ① (#2686) supplied the contract. This sensor supplies the measurement and
**carries no ceiling**. Placing one before the observed distribution exists is
the mistake #2525 had to undo: a threshold under the observed minimum flags
every artifact, and a permanently red signal says nothing about which artifact
is an outlier. Ceilings are the issue's stage ③ and are derived from the numbers
this sensor and the repository's depth artifact census produce.

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

## The one reported case

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
under `.amadeus-sensors/<stage-slug>/`. A finding names the missing id contract;
the artifact's contents are never echoed.
