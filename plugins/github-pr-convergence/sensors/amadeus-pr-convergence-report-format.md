---
id: pr-convergence-report-format
kind: deterministic
command: bun {{HARNESS_DIR}}/plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
default_severity: blocking
description: Flags a pr-convergence-report.md whose required CLI fields are missing, blank, or self-contradictory; code-generation also accepts a local-evidence report without a CLI kind
category: governance
matches: "**/construction/*/code-generation/pr-convergence-report.md"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  findings:
    - field: string
      reason: string
timeout_seconds: 5
---

# pr-convergence-report-format sensor

Blocking evidence surface for the PR convergence report (FR-4). The
`code-generation` artifact guard only asks whether `pr-convergence-report.md`
exists. At `--stage code-generation` this sensor accepts either a CLI-shaped
report or a local-evidence report. At `--stage pr-convergence` only the plugin
CLI shape is accepted. It never enforces — a failing verdict is data for the
shared completion guard, and the shipped severity is `blocking`.

## Scope

Fires on the per-unit report path the guard resolves (FR-2b):
`<record>/construction/<unit>/code-generation/pr-convergence-report.md`. Any
other output is skipped (`reason: "not-a-report"`), and an output path that
does not exist is a failure (`reason: "no-file"`).

Every attestation re-resolves `runtime-graph.json.delivery_bolts` and verifies
its current Delivery Bolt membership, including single-Unit reports. For a
multi-Unit Delivery Bolt, each member path carries a separate projection
of the same Intent/Bolt/member-set/PR/head tuple. The attestation names the
owner Unit and the complete sorted member set. The checker rejects a projection
copied to another member path, a partial member set, non-canonical bytes or
field order, a changed body digest, or a missing owner-specific audit receipt.
The authority source digest is verified, so stale plan bytes or forged runtime
membership are blocking evidence.
For multi-Unit reports it strictly parses and canonically re-renders the Owner
Projection before checking its owner Unit, report path, shared tuple, payload
digest, attestation, and owner-specific audit receipt.

## Checked shape

The accepted shapes are:

- **local-evidence** — only when `--stage code-generation`. Unit-local
  implementation evidence with `## 判定` and `## 実行証拠`, and no CLI
  `kind` line. This is not PR attestation.

The canonical CLI kinds are accepted:

- **created** — the pull-request identity and a fresh canonical CLI
  attestation for the current local, remote, and PR head.
- **converged** — `kind`, `pull request`, `generated at`, and `converged: true`.
- **override** — the same four fields with `converged: false`, plus the human
  ruling record that makes FR-7b auditable: `human turn`, `recorded at`, and a
  non-blank `reason`.
- **landed** — only when `--stage pr-convergence`. The merge that already
  happened, recorded rather than converged: `converged: false`, a `merged at`
  that parses, and a `merge commit` that is a commit object id. The check
  rollup is recorded but never a pass condition. At any other stage a `landed`
  report is rejected.

Timestamps must parse, `pull request` must read `<repo>#<number>`, and `kind`
must agree with `converged` — a report claiming `kind: override` while also
claiming `converged: true` contradicts itself and is reported.

## Which environment a record answers for

A record is bound either to the checkout it was written from or to the merge it
was finalised against, and the receipt decides which — never the kind (#3149).
A receipt that attests `merge commit` and `merged at` answers for that merge, so
the local head is not compared; every other receipt answers for the checkout,
whose HEAD must still be the head it names. Merge facts a record states in its
body but does not attest are a finding on any kind: they would claim a merge
the audit shard never carries.

Because attesting a merge is what selects that binding, the attested values are
checked for the shape a merge fact has — a commit object id and a timestamp
that parses — by the same rule applied to the values a `landed` record states.
A malformed value is a finding, never a fallback to the checkout binding.

Half a merge is refused twice over, and neither refusal is a fallback to the
checkout binding. A receipt carrying only the commit, or only the instant, is
malformed by construction — the two fields travel together, so the receipt is
rejected before any binding is chosen. A body that names one of them without a
receipt attesting both still selects the merge binding, and the missing
attestation is the finding.

## Independence from the plugin

The checker re-reads the report with its own minimal line reader instead of
importing `tools/pr-convergence-cli.ts`. The sensor and CLI are sibling plugin
resources, but keeping the reader independent prevents report validation from
sharing the implementation that renders the report. The shipped integration
test renders its fixtures from the plugin's own `renderReport`, so the two
readers cannot drift unobserved.

## Failure mode

Findings emit `SENSOR_FAILED` through the existing dispatcher and write detail
under `.amadeus-sensors/<stage-slug>/`. Findings name only the offending field
and a fixed reason; report contents are never echoed.
