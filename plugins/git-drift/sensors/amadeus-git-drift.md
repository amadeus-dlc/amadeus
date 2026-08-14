---
id: git-drift
kind: deterministic
command: bun {{HARNESS_DIR}}/plugins/git-drift/tools/amadeus-sensor-git-drift.ts
default_severity: advisory
description: Reports when origin has moved ahead of this checkout in files the current work also holds
category: governance
input_schema:
  output_path: string
  stage_slug: string
  settings_json: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  findings:
    - field: string
      reason: string
timeout_seconds: 15
---

# git-drift sensor

Early warning that the trunk moved underneath a Bolt. It fires while work is in
progress rather than at the merge, so the decision — pull the change in, or land
first and let the other side rebase — is made when it is still cheap.

## Scope

Declares no `matches` filter: drift is a property of the checkout, not of the
file that happened to be written, so every stage output the seam stages produce
is an equally valid moment to look. The stages that import it are
`code-generation` and `build-and-test`, declared through the plugin's seams.

## Verdict

`reason` names what was seen and `pass` says whether an operator needs to act:

- `synced` — level with `origin/<default>`.
- `info` — behind, but in files nothing here touches. Recorded, not flagged.
- `warning` — behind in files this checkout also holds. The finding names them,
  ledger paths first (an audit shard, an `amadeus-state.md`, a no-silent-drop
  event), because two histories appending to the same ledger is the costlier
  surprise. The wording asks for a judgement; it never orders a rebase.
- `skipped:not-a-git-repo`, `skipped:no-origin` — nothing to compare against.
- `skipped:fetch-failed` — origin could not be read. Reported as a finding
  because the absence of a verdict is itself worth seeing.

Severity is `advisory` throughout: every outcome exits 0 and no outcome can gate
a stage.

## Cost

`fetch-throttle-seconds` (default 600) bounds how often the remote is contacted.
Throttling suppresses the fetch alone — the verdict still runs on every fire,
against the remote-tracking refs already on disk. The last fetch instant is kept
in the machine-local `amadeus/.amadeus-sessions/git-drift-fetch.json`; an absent
or corrupt record simply means "fetch now".

`timeout_seconds` (15) sits above the sensor's own fetch budget (10s), which in
turn sits above the measured cost of a real fetch against a warm remote
(2.00-2.16s over three runs of this repository), so a slow network becomes a
fail-open skip rather than a killed sensor.

## Effect on the repository

The only git state this sensor changes is the remote-tracking refs that `git
fetch` updates. It never touches the working tree, the index, the branch or the
stash.
