---
id: conformance-fixture
kind: deterministic
command: bun {{HARNESS_DIR}}/plugins/conformance-fixture/tools/conformance-fixture-tool.ts sensor
default_severity: advisory
description: Fixture sensor that always passes, carried so plugin composition has a sensor manifest to project
category: fixture
matches: "**/conformance-fixture-never-matches.txt"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  reason: string
timeout_seconds: 10
---

# conformance-fixture sensor

A fixture sensor. It exists so the plugin projection, composition, and drop
paths have a sensor manifest to carry, and it deliberately matches no real
artifact so it never fires against a workspace under test.

## Verdict

Always passes. There is no drift to detect: the manifest is data for the host's
projection machinery, not a check of anything in the repository.
