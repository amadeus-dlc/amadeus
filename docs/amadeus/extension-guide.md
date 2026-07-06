# Extension Guide

This guide answers a recurring question for anyone operating Amadeus DLC on their own workspace: when you need to extend or steer the lifecycle, what under `amadeus/spaces/<space>/` (or, for a handful of Amadeus-specific points, outside it) should you edit, and may you edit it by hand?

If you are new to Amadeus, start with the [User Guide](../guide/index.md) (installation and your first workflow) before extending anything.

## Scaling principle

A stage definition carries only WHAT it does: its declared `phase`, its `produces`, and the stage protocol prose that describes its purpose. It does not carry HOW the work should be done for a specific team or project — that comes from the Space's `memory/` files, resolved and injected at compile time.

The stage-graph compiler's rule resolver, `resolveRulesForStage` (`.agents/amadeus/tools/amadeus-graph.ts:599-612`), builds each stage's `rules_in_context` from the loaded rule files: every rule scoped `org`, `team`, or `project` attaches to every stage unconditionally, and a rule scoped `phase` attaches only when its filename matches the stage's own declared `phase:` value. In practice this means `memory/org.md`, `memory/team.md`, and `memory/project.md` reach every stage, while `memory/phases/<phase>.md` reaches only the stages that declared that phase — so a Construction stage picks up `memory/phases/construction.md` but not `memory/phases/ideation.md`.

This is why the same 32 stage definitions (`.agents/amadeus/amadeus-common/stages/**`, mirrored by the compiled `scope-grid.json`) can serve very different teams and projects: the stage protocol is fixed, and `memory/` is the lever that changes HOW each stage's guardrails and working conventions apply.

## Extension points

| Extension point | Location | Role | Human edits directly? | Verified anchor |
|---|---|---|---|---|
| `memory/` — 3 layers | `amadeus/spaces/<space>/memory/{org,team,project}.md` | Team practices and judgment criteria; `org` → `team` → `project` override in that order | Yes — the Maintainer's direct instruction channel (discipline below) | `amadeus-graph.ts:599-612` (`resolveRulesForStage`) |
| Phase guardrails | `amadeus/spaces/<space>/memory/phases/<phase>.md` | Phase-scoped guardrails, injected only into stages that declared that `phase` | Yes (same channel) | `amadeus-graph.ts:607` (phase-match branch) |
| Template overrides | `amadeus/spaces/<space>/memory/templates/` | Overrides a produced artifact's template; wins over the skill-shipped default | Yes | `.agents/amadeus/amadeus-common/protocols/stage-protocol.md:741-746` (team template = first-priority tier); `.agents/amadeus/sensors/amadeus-required-sections.md:38-62` (template-override layer takes precedence over an in-stage `## Sensors` override at the gate) |
| `knowledge/` | `amadeus/spaces/<space>/knowledge/` (`glossary.md`, `domain-map.md`, `context-map.md`, `actors.md`, …) | Domain knowledge | Possible directly, but the `amadeus-domain-modeling` skill is the safer path for keeping glossary/domain-map/context-map consistent (`CONTEXT.md` is the canonical vocabulary source; `glossary.md` is a workspace excerpt of it, see #527) | [steering.md](steering.md) (Space contract) |
| `codekb/` | `amadeus/spaces/<space>/codekb/<repo>/` | Codebase knowledge (generated) | No — regenerate via an incremental reverse-engineering update rather than hand-editing | This Intent's own incremental codekb update; `amadeus/spaces/default/codekb/amadeus/timestamp.md` |
| `scopes/` | `.agents/amadeus/scopes/amadeus-<name>.md` | Changes the stage set a workflow runs (one file per scope, stage frontmatter, recompile) | Outside the workspace — a repository change plus a parity declaration. `pdm` is an Amadeus-specific scope with no upstream counterpart (see #524, pending, for the full feature-difference inventory) | `.agents/amadeus/scopes/amadeus-pdm.md`; `.agents/amadeus/tools/data/scope-grid.json` |
| `sensors/` | `.agents/amadeus/sensors/` + a stage's frontmatter `sensors:` list | Adds a deterministic gate-time check | Outside the workspace — a repository change | Sensor manifests under `.agents/amadeus/sensors/`; the `SENSOR_FIRED` audit event |
| docs-only declaration | The registry's (`intents.json`) `docsOnly` field | Exempts an Intent whose `produces` are record-internal documents only from the `workspace_requires` guard (Amadeus-specific, #499 — see #524, pending) | No — tool-owned. Only `amadeus-state.ts declare-docs-only --evidence <ref>` may write it, and the evidence is cross-checked against a real human-approval audit event | `.agents/amadeus/tools/amadeus-state.ts:83-89` (`HARNESS_DOC_DIRS`), `:897-903` (`workspaceHasWork`), `:923-949` (`declare-docs-only` refusal / `GUARD_EXEMPTED`) |
| composer | (becomes available after the upstream 2.2.0 sync) | Authoring a custom scope | Under discussion — upstream #428 has not merged, so this row is not yet measurable against a real implementation | — |

## Human editing discipline

`memory/` is the Maintainer's direct instruction channel — it is meant to be hand-edited. Two disciplines apply:

1. A new judgment criterion is added only when it is grounded in an observed precedent, not as a speculative rule (`team.md`'s own stated principle).
2. An addition to a stage's `Corrections` section uses the `learned` format together with a `cid` marker in the form `cid:<dirName>:<stage>:<cN>` (the format introduced after #504). This coexists with entries the engine appends through the §13 learning ritual — the two do not conflict.

`knowledge/` also accepts direct edits, but going through the `amadeus-domain-modeling` skill is the safer path: it keeps `glossary.md`, `domain-map.md`, and `context-map.md` mutually consistent. `CONTEXT.md` is the canonical vocabulary source for this repository's own development terminology; `glossary.md` holds only a workspace excerpt of it, synced one-way from `CONTEXT.md` (#527).

`codekb/` is generated content. Edit it by regenerating — an incremental reverse-engineering update — not by hand; a hand edit would be silently overwritten by the next regeneration and would not reflect the actual codebase it claims to describe.

## Design lineage

Two structural decisions that used to live in `docs/adr/` were retired there and folded into this repository's current artifact contracts (#525). The full decision history remains in git (`git log -- docs/adr/0001-lifecycle-binding-profile.md`, `git log -- docs/adr/0002-intent-phase-directory-layout.md`).

**Lifecycle Binding / Profile** (adopted 2026-06-28, formerly ADR 0001): Amadeus DLC binds skills, artifacts, gates, and validators to each phase through a concept named Lifecycle Binding, and a concrete bundle of that binding for a given domain is a Profile (e.g. the software-development profile this repository implements). Agent Skills, Agent Plugin, and MCP are each a distinct extension boundary — a skill is an individual capability, a plugin is a distribution/install unit, and MCP connects external tools/resources/prompts — none of them is the DLC's phase/gate/artifact contract itself. This vocabulary (Lifecycle Binding, Profile) is the definition CONTEXT.md now carries directly.

The other retired decision, **Intent Phase Directory Layout** (formerly ADR 0002), is documented in [lifecycle/overview.md](lifecycle/overview.md)'s "Artifact layout" section, which owns that contract.

Decision records for work going forward live in the Intent record's own decision log, Grilling Decision Trail, and steering rationale tables — not in a repository-wide ADR series (#527).

## Sources

These anchors were read directly from this repository's own source while writing this guide (Design Honesty; no anchor here is asserted from memory):

- Rule resolution into `rules_in_context`: `.agents/amadeus/tools/amadeus-graph.ts:599-612` (`resolveRulesForStage`).
- Template resolution order (team template first, skill-shipped default second): `.agents/amadeus/amadeus-common/protocols/stage-protocol.md:741-746`.
- Template-override precedence at the gate: `.agents/amadeus/sensors/amadeus-required-sections.md:38-62`.
- Space-level template authoring guidance: `.agents/rules/amadeus-artifacts-and-examples.md` (生成前チェック section).
- docs-only guard mechanics: `.agents/amadeus/tools/amadeus-state.ts:83-89`, `:897-903`, `:923-949`.
- Space contract (`memory/`, `knowledge/`, `codekb/`, `intents/`): [steering.md](steering.md).
- Amadeus-specific scope example: `.agents/amadeus/scopes/amadeus-pdm.md`; the compiled grid: `.agents/amadeus/tools/data/scope-grid.json`.
- codekb regeneration precedent: `amadeus/spaces/default/codekb/amadeus/timestamp.md`.

One candidate source did not hold up under verification: this guide's own Intent record (`amadeus/spaces/default/intents/260706-docs-lang-guide/runtime-graph.json`) was checked as a possible live example of a compiled `rules_in_context`, but it records only stage execution summaries (memory entry counts, sensor firings, learnings) — it does not carry the per-stage `rules_in_context` array. The mechanism above is verified against the compiler source instead.
