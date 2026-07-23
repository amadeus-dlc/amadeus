---
id: required-sections
kind: deterministic
command: bun .codex/tools/amadeus-sensor-required-sections.ts
default_severity: advisory
description: Checks that stage output contains the required H2 headings — generic content-shape check, fires on every stage that writes markdown
category: document-shape
matches: "**/{amadeus-docs,intents}/**"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  h2_count: integer
  headings: string[]
  findings_count: integer
  edge_block: string
  template: string
  template_expected: string[]
  template_missing: string[]
  config_warning: string
  marker_exempt: boolean
timeout_seconds: 5
---

# required-sections sensor

Default mode: checks the output contains at least 2 H2 headings (generic
content-shape sanity check).

**Marker exemption (E-FVEPD).** A `*-questions.md` Q&A file or a `*-timestamp.md`
marker intentionally omits the ≥2-H2 prose shape, so it is exempted from the
generic floor: the sensor passes with zero findings and reports
`marker_exempt: true`. The exemption is keyed off the output-filename stem
suffix, the same predicate the dispatcher uses to build the template-eligible
set, so a marker is never checked against a heading-set template either.

For `unit-of-work-dependency.md` (units-generation 2.7), additionally
requires the fenced `yaml` `units:` edge block to be present, well-formed,
and cycle-free — the machine-readable DAG the runtime compiler parses into
the batch fan-out. The check reports `edge_block` as `ok`, `absent`,
`malformed`, or `cyclic`; anything but `ok` fails the sensor at the gate so
the malformed block never reaches the compiler. Every other artefact keeps
the generic H2-count check only.

## Heading-set overrides — two paths, with precedence

The default heading set can be overridden two ways. **Precedence: a resolving
`templates/<artifact>.md` wins over a `## Sensors`-documented heading set.**

1. **Template-override layer (file-driven, preferred).** A team drops
   `amadeus/spaces/<space>/memory/templates/<artifact>.md` (keyed by the output filename stem —
   artifact `X` writes to `X.md`). When one resolves for the output path, its
   `##` headings become the expected set and the sensor passes iff
   `expected ⊆ output`; the missing headings are precise findings. Whole-doc,
   advisory — the human decides at the gate. The same file is the skeleton the
   agent fills (see the stage protocol § Template overrides), so the produced
   shape and the checked shape cannot drift. A template applies only to a
   template-eligible artifact (the stage's prose `produces` entries, threaded by
   the dispatcher); a template resolving for a questions/timestamp marker is
   ignored with a config warning.

2. **`## Sensors`-prose override (in-stage, legacy anticipation).** A stage's
   `## Sensors` body may document a heading-set override (post-milestone-12
   mechanism). This applies only when no template file resolves for the output.

The framework ships no per-stage `## Sensors` overrides by default — teams
introduce specific heading shapes either by authoring a template (path 1) or via
the §13 learning loop when there's a real reason. When neither override is
present, a non-marker output keeps the generic ≥2-H2 floor (markers are exempt,
per the marker exemption above).

## Failure mode

When required headings are missing, emits `SENSOR_FAILED` and writes detail
to `amadeus-docs/.amadeus-sensors/<stage-slug>/required-sections-<fire-id>.md` (Fire id is the 8-hex correlator from the SENSOR_FIRED audit row)
listing the missing headings.
