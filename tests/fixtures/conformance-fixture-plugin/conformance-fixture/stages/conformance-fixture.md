---
slug: conformance-fixture
number: 3.9
name: Conformance Fixture
phase: construction
execution: CONDITIONAL
condition: Runs only when a host explicitly selects it, either through a scope binding or through an explicit `--stage conformance-fixture` invocation. It is a test fixture and carries no production meaning.
lead_agent: amadeus-quality-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: nothing beyond the host root passed on the command line.
outputs: nothing — the stage body is a no-op that exists so plugin composition has a stage to carry.
sensors:
  - conformance-fixture
scopes: []
---

# Conformance Fixture

This stage exists so the plugin conformance journey and the plugin-lifecycle
tests have a composable stage to install, compose, reach through the compiled
stage graph, and drop again. Its empty `scopes:` keeps scope ownership in the
host, which is the invariant the plugin-boundary guard enforces for every
plugin stage.

## Stage body

1. Do nothing. The stage is a fixture: the behaviour under test is the host's
   composition, projection, and directive machinery, never this body.
2. Report completion.

## Notes

The companion tool is an advisory evaluator only. It holds until a host records
a verdict and returns no-hold afterwards, which is the minimum a declared
advisory needs in order to exercise the host's advisory channel end to end.

Its two verbs, written the way plugin prose must write an executable path — the
harness-dir token, never a repo-root-relative one, so the seeding transform has
something to resolve:

    bun {{HARNESS_DIR}}/plugins/conformance-fixture/tools/conformance-fixture-tool.ts advisory
    bun {{HARNESS_DIR}}/plugins/conformance-fixture/tools/conformance-fixture-tool.ts record
