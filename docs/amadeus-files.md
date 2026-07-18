# Complete AI-DLC v2 Generated File Inventory

> Languages: **English** | [日本語](amadeus-files.ja.md)

Sources of truth: `amadeus-dlc/amadeus` v2 branch (commit `9b77786`, as of 2026-07)
- Official reference: `docs/guide/14-artifacts-reference.md` (directory tree and git policy)
- Workspace layout: `docs/guide/03-spaces-and-intents.md`
- Exact file names: extracted from the `outputs:` frontmatter in all 31 stage files under `core/amadeus-common/stages/*/*.md`

---

## 1. Workspace Level (Cross-Intent, Per-Space)

```
.agents/                                                  # Skill distribution consumed by Codex (sibling of .codex/)
└── skills/
    ├── amadeus/                                          # Orchestrator skill
    └── amadeus-<stage-or-scope>/                         # Stage runner / scope runner skill
.claude/                                                  # Claude Code harness engine (generated, overwritten on upgrade)
├── agents/                                               # 14 agent persona definitions (.md)
│   └── amadeus-<role>-agent.md
├── amadeus-common/                                       # Harness-neutral shared prompts, protocols, and stage definitions
│   ├── conductor.md
│   ├── protocols/
│   │   └── stage-protocol.md
│   └── stages/
│       ├── initialization/
│       ├── ideation/
│       ├── inception/
│       ├── construction/
│       └── operation/
├── hooks/                                                # Claude Code hook implementations (11 hooks)
│   ├── amadeus-audit-logger.ts
│   ├── amadeus-log-subagent.ts
│   ├── amadeus-mint-presence.ts
│   ├── amadeus-runtime-compile.ts
│   ├── amadeus-sensor-fire.ts
│   ├── amadeus-session-end.ts
│   ├── amadeus-session-start.ts
│   ├── amadeus-statusline.ts
│   ├── amadeus-stop.ts
│   ├── amadeus-sync-statusline.ts
│   └── amadeus-validate-state.ts
├── knowledge/                                            # Framework methodology knowledge (shared + per-agent)
│   ├── amadeus-shared/
│   └── amadeus-<role>-agent/
├── rules/                                                # Claude Code entry point for AI-DLC rules
│   └── amadeus.md
├── scopes/                                               # Scope definitions such as amadeus-mvp
│   └── amadeus-<scope>.md
├── sensors/                                              # Deterministic sensor definitions
│   ├── amadeus-linter.md
│   ├── amadeus-required-sections.md
│   ├── amadeus-type-check.md
│   └── amadeus-upstream-coverage.md
├── skills/                                               # Claude Code skills (orchestrator + stage runners)
│   ├── amadeus/
│   └── amadeus-<stage-or-scope>/
├── tools/                                                # Deterministic Bun engine / CLI (26 files + data/)
│   ├── amadeus-*.ts
│   └── data/
│       ├── stage-graph.json
│       ├── scope-grid.json
│       ├── memory-seed/
│       ├── scaffold/
│       └── templates/
├── CLAUDE.md                                             # Claude Code onboarding instructions
├── CLAUDE.md.example
├── settings.json                                         # Hook, statusline, and permission settings
├── settings.json.example
├── settings.local.json.example
└── VERSION
.codex/                                                   # Codex CLI engine (generated; local active hooks are preserved on upgrade)
├── agents/                                               # Codex subagent definitions (14 roles, .md + .toml)
│   ├── amadeus-<role>-agent.md
│   └── amadeus-<role>-agent.toml
├── amadeus-common/                                       # Same shared prompts and stage definitions as .claude/amadeus-common
│   ├── conductor.md
│   ├── protocols/
│   └── stages/
├── hooks/                                                # Codex hook implementations (11 shared hooks + Codex adapter)
│   ├── amadeus-codex-adapter.ts
│   ├── amadeus-audit-logger.ts
│   ├── amadeus-log-subagent.ts
│   ├── amadeus-mint-presence.ts
│   ├── amadeus-runtime-compile.ts
│   ├── amadeus-sensor-fire.ts
│   ├── amadeus-session-end.ts
│   ├── amadeus-session-start.ts
│   ├── amadeus-statusline.ts
│   ├── amadeus-stop.ts
│   ├── amadeus-sync-statusline.ts
│   └── amadeus-validate-state.ts
├── knowledge/                                            # Framework methodology knowledge (shared + per-agent)
│   ├── amadeus-shared/
│   └── amadeus-<role>-agent/
├── rules/                                                # Codex permission rules; separate from the AI-DLC memory layer
│   └── default.rules
├── scopes/                                               # Scope definitions such as amadeus-mvp
│   └── amadeus-<scope>.md
├── sensors/                                              # Deterministic sensor definitions
│   ├── amadeus-linter.md
│   ├── amadeus-required-sections.md
│   ├── amadeus-type-check.md
│   └── amadeus-upstream-coverage.md
├── tools/                                                # Deterministic Bun engine / CLI (26 files + data/)
│   ├── amadeus-*.ts
│   └── data/
│       ├── stage-graph.json
│       ├── scope-grid.json
│       ├── memory-seed/
│       ├── scaffold/
│       └── templates/
├── config.toml                                           # Codex project configuration (only when needed)
├── config.toml.example
├── hooks.json                                            # Local active Codex hooks (per-clone, mutable, gitignored)
├── hooks.json.example                                    # Canonical Amadeus hooks (generated and committed)
├── trust-seed.toml                                       # Pre-seeding hook trust
└── VERSION
amadeus/
├── active-space                                          # Active space cursor (gitignored, per-user)
├── .migrated                                             # Marker for migration from the v1 flat layout
├── .amadeus-clone-id                                     # Audit shard name for this clone (gitignored, machine-local)
├── .amadeus-sessions/                                    # Conversation-to-intent map (gitignored)
└── spaces/<space>/
    ├── settings.json                                     # Canonical workspace settings (interactionModes; optional, committed)
    ├── memory/                                           # Rule layers (committed)
    │   ├── org.md                                        # Framework defaults
    │   ├── team.md                                       # Team practices (overrides org)
    │   ├── project.md                                    # Project-specific practices (overrides team)
    │   ├── phases/                                       # Phase-scoped rules (ideation/inception/construction/operation)
    │   └── templates/                                    # Artifact format overrides (one file per artifact)
    ├── knowledge/                                        # Team knowledge (committed; empty/free-form at bootstrap)
    │   ├── amadeus-shared/                               # Loaded by all agents by convention
    │   └── amadeus-<agent>-agent/                        # Loaded when the corresponding agent starts by convention
    ├── codekb/<repo>/                                    # Code knowledge base (committed, per repository, generated by 2.1)
    │   ├── business-overview.md
    │   ├── architecture.md
    │   ├── code-structure.md
    │   ├── api-documentation.md
    │   ├── component-inventory.md
    │   ├── technology-stack.md
    │   ├── dependencies.md
    │   ├── code-quality-assessment.md
    │   └── reverse-engineering-timestamp.md              # Freshness marker; rerun when stale
    └── intents/
        ├── active-intent                                 # Active intent cursor (gitignored, per-user)
        ├── intents.json                                  # Registry: {uuid, slug, dirName, scope, repos, status}
        └── <YYMMDD>-<label>/                             # Record directory for each intent (see Section 2)
```

### 1.1 Engine Directories vs Workspace Directory

| Path | Role | Manual edits | git |
|---|---|---|---|
| `.claude/` | Runtime engine for Claude Code. Generated from `dist/claude/` and promoted into the project | Do not edit directly. Edit `core/` or `harness/claude/`, then regenerate | Committed |
| `.codex/` | Runtime engine for Codex CLI. Copied/promoted from `dist/codex/` | Do not edit generated files directly. The local active `hooks.json` may be updated by Codex integrations | Committed, except gitignored `.codex/hooks.json` |
| `.agents/` | Skill distribution consumed by Codex. Includes `$amadeus` and every stage runner | Do not edit directly. Edit the generation source, then regenerate | Committed |
| `amadeus/` | Harness-neutral AI-DLC workspace. Holds spaces, intents, state, audit, artifacts, and team memory | `memory/` and artifacts are normal review targets. Runtime scratch files should not be edited | Committed + partly gitignored |

`agents/`, `amadeus-common/`, and `hooks/` are part of the engine, not AI-DLC output artifacts. User- and team-owned long-lived information belongs under `amadeus/spaces/<space>/memory/` and `amadeus/spaces/<space>/knowledge/`, not under a harness-specific engine directory.

Within `.codex/`, hook ownership is deliberately split. The generated and committed `.codex/hooks.json.example` is the canonical Amadeus contract. The ignored `.codex/hooks.json` is the active, per-clone runtime file; Codex integrations may add non-Amadeus entries or rewrite its formatting without changing the tracked canonical file.

### 1.2 Canonical Workspace Settings

| File | Description | git |
|---|---|---|
| `spaces/<space>/settings.json` | Canonical per-space workspace settings. Optional — when absent, defaults are in effect | Committed |

- **Path**: `amadeus/spaces/<space>/settings.json` — the sole location read (no fallback search).
- **Format**: JSON. The one known key is `interactionModes`, an object of four booleans: `guideMe`, `grillMe`, `editFile`, `chat`.
- **Defaults**: every interaction mode is `true`. An absent file, or an absent individual key, resolves to this default posture.
- **Error policy**: fail-closed. An unknown key (root or under `interactionModes`), a type mismatch, or disabling all four modes at once (all-modes-off) makes the file `invalid`; every violation is reported, not just the first.
- **Doctor**: `/amadeus --doctor` reports a `settings.json` row — absent (defaults in effect), valid (with the resolved path), or invalid (with the parse errors as the fix text).

---

## 2. Intent Record Directory (1 Intent = 1 Lifecycle Run)

Located under `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`.

### 2.0 Root

| File | Description | git |
|---|---|---|
| `amadeus-state.md` | Workflow state (six-state checkbox model) | Committed |
| `audit/<host>-<clone>.md` | Audit trail (append-only shard per clone, 68 event categories) | Committed |
| `verification/phase-check-<phase>.md` | Phase-boundary verification. Three files: ideation, inception, construction. Stage definitions only instruct creation for these three phases; initialization and operation do not have one. Corrected by live verification in 2026-07 | Committed |
| `.amadeus-recovery.md` | Recovery breadcrumb | gitignored |
| `runtime-graph.json` | Runtime telemetry, derivable again from audit shards | gitignored |
| `.amadeus-sensors/`, `.amadeus-hooks-health/` | Sensor findings and heartbeat files | gitignored |
| `archive/{ISO-date}-{stage-name}/` | Previous artifact backup created on demand during redo | Committed |

### 2.1 Common Per-Stage Companion Files

- `<phase>/<stage>/memory.md` — Stage observation diary. Generated automatically, maintained by the orchestrator, and not meant for manual edits. The approval gate's Learnings Ritual reads it and promotes accepted learnings into the memory-layer rules.
- `<phase>/<stage>/<stage-name>-questions.md` — Question file for stages that require user input. Uses A-E+X choices and `[Answer]:` tags. This is the source of truth for captured user input.

### 2.2 Initialization (0.1-0.3)

| Stage | Outputs |
|---|---|
| 0.1 workspace-scaffold | `scaffold-report.md` plus the record directory tree and `knowledge/` skeleton |
| 0.2 workspace-detection | `workspace-findings.md` (greenfield/brownfield classification and technology stack detection) |
| 0.3 state-init | `state-init-summary.md`, plus initialization of `amadeus-state.md` itself |

### 2.3 Ideation (1.1-1.7)

| Stage | Outputs | Condition |
|---|---|---|
| 1.1 intent-capture | `intent-statement.md`, `stakeholder-map.md` | Always |
| 1.2 market-research | `competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md` | Conditional |
| 1.3 feasibility | `feasibility-assessment.md`, `constraint-register.md`, `raid-log.md` | Conditional |
| 1.4 scope-definition | `scope-document.md`, `intent-backlog.md` | Always |
| 1.5 team-formation | `team-assessment.md`, `skill-matrix.md`, `mob-composition.md` | Conditional |
| 1.6 rough-mockups | `wireframes.md`, `user-flow.md` | Conditional |
| 1.7 approval-handoff | `initiative-brief.md`, `decision-log.md` | Always |

### 2.4 Inception (2.1-2.8)

| Stage | Outputs | Condition |
|---|---|---|
| 2.1 reverse-engineering | Nine files under `codekb/` (see Section 1). These are space-level files, not record-directory files | Brownfield only |
| 2.2 practices-discovery | `team-practices.md`, `discovered-rules.md`, `evidence.md`, `practices-discovery-timestamp.md`. After approval, promoted into `memory/team.md` and `memory/project.md` | Conditional |
| 2.3 requirements-analysis | `requirements.md` | Always |
| 2.4 user-stories | `stories.md`, `personas.md`, `user-stories-assessment.md` | When user-facing functionality exists |
| 2.5 refined-mockups | `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md` | UI projects |
| 2.6 application-design | `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md` | When new components are needed |
| 2.7 units-generation | `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md` | Always |
| 2.8 delivery-planning | `bolt-plan.md`, `team-allocation.md`, `risk-and-sequencing-rationale.md`, `external-dependency-map.md` | Always |

### 2.5 Construction (3.1-3.7)

Stages 3.1-3.5 repeat **per Unit of Work** and write to `construction/{unit-name}/{stage-name}/`. Stages 3.6-3.7 run once after all units are complete.

| Stage | Outputs | Condition |
|---|---|---|
| 3.1 functional-design | `business-logic-model.md`, `business-rules.md`, `domain-entities.md`, and conditionally `frontend-components.md` | Plan-dependent, per unit |
| 3.2 nfr-requirements | `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md` | Plan-dependent, per unit |
| 3.3 nfr-design | `performance-design.md`, `security-design.md`, `scalability-design.md`, `reliability-design.md`, `logical-components.md` | Plan-dependent, per unit |
| 3.4 infrastructure-design | `deployment-architecture.md`, `infrastructure-services.md`, `monitoring-design.md`, `cicd-pipeline.md`, and conditionally `shared-infrastructure.md` | Plan-dependent, per unit |
| 3.5 code-generation | `code-generation-plan.md` (checkboxes + story tracking), `code-summary.md` (actual code goes to the code repository, not the record directory) | Always, per unit |
| 3.6 build-and-test | `build-instructions.md`, `unit-test-instructions.md`, `integration-test-instructions.md`, `performance-test-instructions.md`, `security-test-instructions.md`, `build-and-test-summary.md`, `test-results.md` | Always, after all units |
| 3.7 ci-pipeline | `ci-config.md`, `quality-gates.md` | Conditional, after all units |

### 2.6 Operation (4.1-4.7, All Conditional)

| Stage | Outputs |
|---|---|
| 4.1 deployment-pipeline | `cd-config.md`, `deployment-strategy.md`, `rollback-runbook.md` |
| 4.2 environment-provisioning | `environment-inventory.md`, `validation-report.md` |
| 4.3 deployment-execution | `deployment-log.md`, `smoke-test-results.md`, `health-check-report.md` |
| 4.4 observability-setup | `dashboards.md`, `alarms.md`, `slo-config.md`, `log-queries.md`, `tracing-config.md`, `anomaly-config.md` |
| 4.5 incident-response | `runbooks.md`, `incident-plan.md`, `escalation-matrix.md` |
| 4.6 performance-validation | `load-test-plan.md`, `test-results.md`, `nfr-validation-matrix.md` |
| 4.7 feedback-optimization | `slo-report.md`, `cost-analysis.md`, `drift-report.md`, `feedback-loop.md` |

---

## 3. Commit / gitignore Split (Official Policy)

| Commit | gitignore |
|---|---|
| `amadeus-state.md` | `amadeus/active-space`, `intents/active-intent` (per-user cursors) |
| `audit/*.md` (per-clone shards) | `intents/*/.amadeus-*`, including `.amadeus-recovery.md` (temporary breadcrumbs) |
| All stage artifacts | `runtime-graph.json` (derivable from audit shards) |
| `verification/` phase verification results | `amadeus/.amadeus-clone-id` (machine-local) |
| Space-level `knowledge/` | `amadeus/.amadeus-sessions/` |
| Per-stage `memory.md` diaries and space-level `memory/` layers | `.amadeus-hooks-health/`, `.amadeus-sensors/` |

---

## 4. Notes

- **Code does not go into the record directory**. `amadeus/` contains only method, state, audit, and artifacts. Generated code goes into the workspace's code repository: the project root for a single-repository workspace, or sibling directories for a multi-repository workspace. Repositories touched by an intent are recorded in the `repos` field of `intents.json` when the intent is born.
- Lifecycle: generate → review at approval gate → commit → downstream stages consume → verify at phase boundary with traceability checks.
- Sensor failure details are written to `<record>/.amadeus-sensors/<stage-slug>/<sensor>-<iso>.md` (gitignored).
