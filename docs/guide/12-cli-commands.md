# CLI Commands

> Languages: **English** | [日本語](12-cli-commands.ja.md)

All AI-DLC commands start with the orchestrator invocation. This chapter is a complete reference for every invocation pattern and flag.

> **Invocation prefix differs by harness.** On Claude Code and Kiro IDE you type
> `/amadeus`; on Codex CLI it is `$amadeus` (or `/skills` → amadeus). The flags and
> behaviour below are identical either way — only the prefix changes. The examples
> use `/amadeus`; substitute `$amadeus` on Codex. See [Running on Codex CLI](harnesses/codex-cli.md).

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `/amadeus [scope]` | Start a new workflow with an explicit scope |
| `/amadeus [description]` | Start a new workflow; scope is auto-detected from your description (rich/unmatched prose gets a compose offer) |
| `/amadeus compose "<task>"` | Force the adaptive composer: propose a tailored EXECUTE/SKIP plan for the task |
| `/amadeus compose --report <path>` | Compose from a scan report (triage findings into a compact fix-and-ship run) |
| `/amadeus --new-scope "<task>"` | Force the composer to synthesize a custom scope even when a stock scope matches |
| `/amadeus` | Resume an existing workflow (if an intent exists) or birth the first intent and start new |
| `/amadeus --status` | Display a read-only status summary |
| `/amadeus --doctor` | Run a health check on your setup |
| `/amadeus --migrate [path]` | Preview and, after explicit approval, migrate an upstream v2 workspace |
| `/amadeus --stage <slug\|#>` | Jump to a specific stage |
| `/amadeus --stage <slug> --single` | Run one stage in isolation, without advancing your workflow |
| `/amadeus --phase <name\|#>` | Jump to the start of a phase |
| `/amadeus --scope <name>` | Change the active scope |
| `/amadeus --depth <level>` | Override depth level (minimal, standard, comprehensive) |
| `/amadeus --test-strategy <level>` | Override test strategy (minimal, standard, comprehensive) |
| `/amadeus --version` | Print the framework version |
| `/amadeus --help` | Display usage information |

---

## Command Decision Tree

```mermaid
flowchart TD
    START(["What do you want to do?"])

    Q1{"Start a new\nworkflow?"}
    Q2{"Check or manage\nan existing workflow?"}
    Q3{"Verify the\nproject?"}

    A1["/amadeus feature"]
    A2["/amadeus Build a payments API"]
    A3["/amadeus"]
    A4["/amadeus --status"]
    A5["/amadeus --stage code-generation"]
    A6["/amadeus --phase construction"]
    A8["/amadeus --doctor"]

    START --> Q1
    START --> Q2
    START --> Q3

    Q1 -->|"Know the scope"| A1
    Q1 -->|"Describe what you want"| A2
    Q2 -->|"Resume where I left off"| A3
    Q2 -->|"See progress"| A4
    Q2 -->|"Jump to a stage"| A5
    Q2 -->|"Jump to a phase"| A6
    Q3 -->|"Verify setup"| A8

    style START fill:#e1bee7,stroke:#7b1fa2
```

<!-- Text fallback: Starting a new workflow: use /amadeus feature (known scope) or /amadeus Build a payments API (auto-detect; the first intent auto-births). Managing an existing workflow: /amadeus (resume), /amadeus --status (view progress), /amadeus --stage (jump to stage), /amadeus --phase (jump to phase). Verify setup: /amadeus --doctor (health check). -->

---

## Detailed Reference

### `/amadeus [scope]` — Start with explicit scope

Start a new workflow with one of the 9 named scopes.

**Syntax:**

```
/amadeus enterprise
/amadeus feature
/amadeus mvp
/amadeus poc
/amadeus bugfix
/amadeus refactor
/amadeus infra
/amadeus security-patch
```

**Behavior:** The framework recognizes the scope keyword, asks what you want to build, then runs the Initialization phase and begins the first domain stage. If a state file already exists, it offers resume options instead.

**Example:**

```
/amadeus bugfix
> What would you like to fix?
> The login API returns 500 when email contains a plus sign
```

---

### `/amadeus [description]` — Start with auto-detection

Describe what you want to build and the engine auto-detects the appropriate scope.

**Syntax:**

```
/amadeus Build a REST API for inventory management
/amadeus Fix the login timeout bug
```

**Behavior:** The engine analyzes keywords in your description (e.g., "fix" suggests bugfix). A clear match asks a one-line confirm naming the MATCHED scope; rich or unmatched prose gets the compose offer (see `/amadeus compose` below) instead of a silent default. You confirm or override before the workflow begins.

**Example:**

```
/amadeus Fix the null pointer in ProfileSerializer
> Detected scope: bugfix (Minimal depth, Minimal test strategy, 8 stages)
> Approve scope? [Yes / Change scope / Change depth / Change test strategy]
```

---

### `/amadeus compose` - The adaptive composer

Force the composer even when a stock scope would match. Works in three moments:

```
/amadeus compose "harden the deployment pipeline and add observability"
/amadeus compose --report sonar.json
/amadeus compose            (mid-workflow: re-shape the pending stages)
```

**Behavior:** the conductor dispatches the composer agent, which reads your task (or the scan report, or the running workflow's state), runs the read-only `detect` scan, and proposes an EXECUTE/SKIP grid with a reason for every SKIP. You approve, edit, or reject at a gate. On approve: a stock match births directly; a custom grid is authored as a real scope (two files in the installed tree) and the workflow births on it in the same turn; an in-flight proposal lands as pending-stage suffix flips via the `recompose` verb (under the audit lock, strict-validated, `RECOMPOSED` audited). `--new-scope` forces synthesis; `--report <path>` seeds the triaged findings into the intent. The `/amadeus-compose` skill is a typeable shortcut over the same path. Mid-workflow you can also just say it in chat ("can we skip market research?") - the conductor recognizes a reshape request and routes it through the same gate and verb, no literal `compose` needed (on Kiro and Codex the literal verb remains the documented reliable path).

See [Scopes and Depth - The Adaptive Composer](05-scopes-and-depth.md#the-adaptive-composer) for the full flow.

---

### `/amadeus` — Resume existing workflow

Run with no arguments when a state file exists to resume.

**Syntax:**

```
/amadeus
```

**Behavior:** Reads `amadeus-state.md`, checks `.amadeus-recovery.md` for corruption, then presents four resume options: resume from checkpoint, redo current stage, jump to stage, or start fresh. See [Session Management](11-session-management.md) for details.

If no state file exists, the framework treats this as a new workflow and asks for scope/description.

---

### Initialization — automatic, no command

There is no scaffold command. The shipped `dist/<harness>/` workspace shell
arrives pre-built (the `.claude/` engine plus `amadeus/spaces/default/memory/`),
and the engine **auto-births** the first intent on your first `/amadeus` (or when
you describe what to build). Birth runs the three Initialization stages
(Workspace Scaffold, Workspace Detection, State Init) as a single deterministic
tool call: it creates the intent's record dir at
`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` (the `audit/` shard dir, the
per-phase artifact dirs, `verification/`) and the empty space-level
`amadeus/knowledge/` directory, runs a rule-based workspace scan, and writes that
intent's `amadeus-state.md` with the scope plan.
It logs the init-sequence events (`WORKFLOW_STARTED`, `WORKSPACE_SCAFFOLDED`,
`WORKSPACE_SCANNED`, `WORKSPACE_INITIALISED`, plus per-stage
`STAGE_STARTED`/`STAGE_COMPLETED`). Naming a scope (`/amadeus --scope feature`)
seeds the initial scope; absent one it defaults to `poc`. To add team knowledge
or guardrails before the first run, edit the shipped `amadeus/spaces/default/memory/`
files; the space-level `amadeus/knowledge/` directory is created (empty) once the
first intent exists, and you add free-form files to it from there.

The welcome message is rendered at session start via the `companyAnnouncements`
entry in `settings.json`.

**Multi-repo workspaces.** When your workspace root holds more than one sibling
code repo (each an immediate child directory with a `.git`), the birth step
records the set of repos the intent touches in its `intents.json` row. By default
it **auto-discovers** every sibling repo; to scope an intent to a specific subset,
the birth tool accepts `--repos a,b` (a comma-separated list of repo directory
names). These are flags of the deterministic `amadeus-utility intent-birth` step the
engine runs for you — not `/amadeus` flags you type. During Construction, each git
operation (worktree, swarm, Bolt) targets one repo; the conductor passes
`--repo <name>` to anchor it, required only when an intent spans more than one
repo. An intent with no recorded repos is the single-repo default (git runs in the
workspace/project dir). See [Artifacts Reference](14-artifacts-reference.md).

---

### `/amadeus --status` — Read-only status

Display current workflow progress without modifying anything.

**Syntax:**

```
/amadeus --status
```

**Behavior:** Reads the active intent's `amadeus-state.md` and displays: current phase, current stage, completed/total stage count, scope, depth, and the stage progress list. If no workflow is active, reports that no workflow is in progress.

---

### `/amadeus --migrate [path]` — Migrate an upstream v2 workspace

Run a non-mutating dry-run over `<project>/aidlc` or the explicitly supplied
path. The conductor prints the full plan and stops at a numbered Yes/No gate;
only an explicit approval runs the internal apply command. This route never
creates, resumes, or advances an Intent. Public `--apply` and combinations with
workflow flags are rejected.

Natural-language routing requires both an `aidlc`/AI-DLC name and a
migrate/convert term. It always uses `<project>/aidlc`; use the explicit flag to
select another source path.

See [Migrating an Upstream AI-DLC v2 Workspace](18-migrating-upstream-v2.md)
for prerequisites, supported revisions, transformations, and recovery.

---

### `/amadeus --doctor` — Health check

Validate that all of this implementation's prerequisites, configuration, and stage-graph integrity are in place. Exits 0 on full pass, 1 on any failure; the full report writes to stdout in both cases so the orchestrator surfaces it either way. `--doctor` is **read-only** — on a fresh shell with no intent yet (no `audit/` shards) it creates no files, so it is safe to run before the first intent is born; once an intent exists it records a `HEALTH_CHECKED` audit row.

**Syntax:**

```
/amadeus --doctor
```

**What it checks:**

| Check | What it validates |
|-------|-------------------|
| Prerequisites | `bun` is installed and on PATH |
| Hook presence | Every hook `settings.json` wires (its `hooks` blocks + the `statusLine` command — all 11 framework hooks) exists in `.claude/hooks/`; a wired-but-missing hook fails loudly. Sourcing the expected roster from `settings.json` means adding a hook there auto-checks it |
| Project structure | `.claude/settings.json` exists (file presence only, no content validation) |
| Workspace shell | `.claude/` + `amadeus/spaces/default/memory/` are present (the shipped shell) |
| Env scope | `AMADEUS_DEFAULT_SCOPE` (if set) names a valid scope |
| Hook heartbeats | `.amadeus-hooks-health/` contains recent timestamps from hook executions |
| State drift | the active intent's `amadeus-state.md` matches the last `WORKFLOW_COMPLETED` in the audit |
| Cycle detection | `stage-graph.json` has no cycles |
| Orphan stage files | Every slug in the graph has a matching `<phase>/<slug>.md` on disk |
| Uncompiled stage files | Surfaces any stage `.md` on disk whose slug is not in the compiled graph, it will not execute until you run `amadeus-graph.ts compile` (advisory, never fails) |
| Scope validation | All 9 scopes (from `.claude/scopes/*.md`) walk cleanly (advisories for scope-truncation gaps are expected) |
| Schema validation | Every stage's YAML frontmatter passes `validateStageFrontmatter` |
| Graph references | Every `consumes[].artifact` and `requires_stage[]` target resolves |
| Keyword overlap | No keyword is claimed by >1 scope |
| Rule drift | Surfaces any team or project rule heading that overlaps a populated org-policy heading, so you can review it for contradiction (advisory — never fails) |
| Paired sensor coverage | Confirms every rule that names a paired Sensor resolves to a Sensor some stage actually fires (advisory — never fails) |

**Example output:**

```
✓ bun installed (required for CLI tools and hooks)
✓ amadeus-audit-logger.ts present
✓ amadeus-sync-statusline.ts present
✓ amadeus-validate-state.ts present
✓ amadeus-log-subagent.ts present
✓ amadeus-session-start.ts present
✓ amadeus-session-end.ts present
✓ amadeus-statusline.ts present
✓ settings.json present
✓ AMADEUS_DEFAULT_SCOPE (unset — no project default)
✓ workspace shell ready (.claude/ + amadeus/spaces/default/memory/)
✓ Hook heartbeats: not yet fired (first workflow stage will populate)
✓ State matches last audit event (no drift)
✓ Cycle detection: 0 cycles
✓ Orphan stage files: 32 graph entries all have files
✓ Uncompiled stage files: 0 stage files missing from the compiled graph
✓ Scope validation: 9 scopes valid (29 advisories)
✓ Schema validation: 32/32 stages valid
✓ Graph references: 122 artifacts + edges resolved
✓ Keyword overlap: no conflicts
✓ Rule drift: no team/project rule overlaps org policy
✓ Paired sensor coverage: no sensor-bound rules (0 feedforward-only)
```

---

### `/amadeus --stage <slug|#>` — Jump to stage

Jump directly to a specific stage by slug or number.

**Syntax:**

```
/amadeus --stage code-generation
/amadeus --stage 3.5
/amadeus --stage requirements-analysis
/amadeus --stage 2.3
```

**Behavior:** If a workflow is active, jumps to the target stage (skipping intervening stages with warnings). If no workflow exists, you can combine with `--scope`:

```
/amadeus --stage code-generation --scope bugfix
```

---

### `/amadeus --stage <slug> --single` — Run one stage in isolation

Add `--single` to run a single stage on its own without touching your main
workflow. The stage runs, writes its artifact, and stops; your workflow's
`Current Stage` is never advanced — the isolation is enforced by the engine, not
by convention. Use it to apply one piece of methodology (a requirements
analysis, a reverse-engineering scan) without committing to a full lifecycle.

```
/amadeus --stage requirements-analysis --single
/amadeus --stage reverse-engineering --single
```

Every runnable stage also ships a typeable one-word runner — `/amadeus-<slug>`,
which packages `/amadeus --stage <slug> --single`. The full runner family (scope
runners, stage runners, `/amadeus-init`, and the session views) is documented in
[Skills and Runner Commands](17-skills.md).

---

### `/amadeus --phase <name|#>` — Jump to phase

Jump to the first stage of a specific phase.

**Syntax:**

```
/amadeus --phase construction
/amadeus --phase 3
/amadeus --phase ideation
/amadeus --phase 1
```

**Behavior:** Same as `--stage` but targets the first stage of the named phase. Can be combined with `--scope`.

---

### `/amadeus --scope <name>` — Change scope

Change the active scope of a running workflow.

**Syntax:**

```
/amadeus --scope bugfix
/amadeus --scope enterprise
```

**Behavior:** Updates the scope configuration in `amadeus-state.md`, recalculates which stages should execute and which should be skipped, and logs a `SCOPE_CHANGED` audit event. Can be combined with `--depth` to override the new scope's default depth.

On a fresh project with no workflow yet, `--scope <name>` starts one instead: it behaves exactly like `/amadeus <name>` — the workspace is initialized with the named scope and the workflow begins at its first stage.

---

### `/amadeus --depth <level>` — Override depth

Override the depth level of the current or new workflow.

**Syntax:**

```
/amadeus --depth minimal
/amadeus --depth standard
/amadeus --depth comprehensive
```

**Behavior:** When a workflow is active, updates the Depth field in `amadeus-state.md` and logs a `DEPTH_CHANGED` audit event. When combined with `--scope`, overrides the new scope's default depth. When combined with `--stage` or `--phase`, sets the depth for the jump target's execution context. Without an active workflow, produces an error.

**Valid values:** `minimal`, `standard`, `comprehensive` (case-insensitive).

**Examples:**

```
/amadeus --depth minimal                            Change depth of active workflow
/amadeus --scope bugfix --depth comprehensive        Bugfix with comprehensive analysis
/amadeus --stage code-generation --depth minimal     Jump with minimal depth
```

---

### `/amadeus --test-strategy <level>` — Override test strategy

Override the test volume strategy independently of depth.

**Syntax:**

```
/amadeus --test-strategy minimal
/amadeus --test-strategy standard
/amadeus --test-strategy comprehensive
```

**Behavior:** Defaults to the current depth level when not specified, unless the scope declares its own default (e.g., workshop defaults to Minimal). When set independently, allows combinations like Standard depth (full artifacts) with Minimal testing (Nyquist model). Updates the `Test Strategy` field in `amadeus-state.md` and logs a `TEST_STRATEGY_CHANGED` audit event.

**Valid values:** `minimal`, `standard`, `comprehensive` (case-insensitive).

**Test strategy models:**
- **Minimal (Nyquist):** 1 test per requirement, happy-path floor, unit tests only (~5-15 total)
- **Standard:** 5-8 tests per component, unit + integration
- **Comprehensive:** 10-15 tests per component, all test types

See [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md#the-3-test-strategy-levels) for full details on each level, defaulting behavior, and common combinations.

**Examples:**

```
/amadeus --test-strategy minimal                         Minimal testing for active workflow
/amadeus --depth standard --test-strategy minimal        Full artifacts, minimal tests
/amadeus --scope bugfix --test-strategy comprehensive    Bugfix with thorough testing
```

---

### `/amadeus --version` — Framework version

Print the framework version (`amadeus <X.Y.Z>`) and exit. Read-only — works without a workflow and never prompts to resume one.

Every install also ships a plain-text `VERSION` file at the engine-dir root (e.g. `.claude/VERSION`), so `cat .claude/VERSION` answers the same question without running the CLI.

**Syntax:**

```
/amadeus --version
```

---

### `/amadeus --help` — Usage information

Display a summary of available commands and flags.

**Syntax:**

```
/amadeus --help
```

---

## Deterministic CLI Tools

Beyond the `/amadeus` flags above, this implementation ships three Bun/TypeScript tools that the hooks call automatically as a workflow runs. You rarely invoke them by hand — they keep the audit trail, the Sensor results, and the runtime graph in sync without you asking. They are documented here because they surface in `--doctor` output and in the `audit/` shards, and because each one is a useful debug handle when you want to see what the framework saw.

Run any of them with `bun .claude/tools/<tool>.ts <subcommand>`.

### `amadeus-utility detect` - read-only workspace scan

`bun .claude/tools/amadeus-utility.ts detect --json` prints the workspace scan (project type, languages, frameworks, build system) plus the resolved scopes dir and scope-grid path. Pure read; the composer runs it to learn where scope data lives on the current harness.

### `amadeus-utility recompose` - in-flight plan flips

`bun .claude/tools/amadeus-utility.ts recompose --skip <slugs> --add <slugs>` (comma-separated) flips PENDING, ahead-of-cursor stages' plan suffixes on the live state file. Runs under the audit lock, rejects flips that would starve a remaining stage of a required input (and flips of completed/in-progress stages, behind-cursor stages, any flip that would move the first EXECUTE stage of Construction - the walking-skeleton anchor - in either direction, and any recompose against a workflow whose Status is not Running), rebuilds the derived state fields, and emits `RECOMPOSED`. Normally reached through `/amadeus compose` mid-workflow, not typed directly.

### `amadeus-graph validate-grid` - arbitrary-grid dependency check

`bun .claude/tools/amadeus-graph.ts validate-grid --proposal <path> [--strict] [--project-type <t>] [--keywords <csv>]` validates an arbitrary `{"<stage>": "EXECUTE"|"SKIP"}` JSON grid. Lenient mode mirrors `validate-scope` (an off-path required producer is advisory); `--strict` hard-rejects it (the recompose posture). `--keywords` checks each granted keyword against the keywords existing scopes already claim: a collision is a hard error naming the incumbent scope (the composer runs this before writing gate-granted keywords). Exit 1 iff invalid; the JSON result lands on stdout.

### `amadeus-sensor` — inspect and fire Sensors

Sensors are deterministic checks that run after every `Write` or `Edit` to a stage output (see [Rules and the Learning Loop](09-rules-and-the-learning-loop.md) and reference [Sensor System](../reference/07-sensor-system.md)). The PostToolUse hook fires them for you; this tool lets you list, describe, and manually fire one.

| Subcommand | What it does |
|------------|--------------|
| `list` | Print every framework Sensor (`id`, `kind`, `description`), alphabetically |
| `describe <id>` | Print one Sensor's full manifest (command, default severity, `matches` glob, timeout) |
| `fire <id> --stage <slug> --output-path <path>` | Run a Sensor against a file and emit a `SENSOR_FIRED` row plus its paired result row |

A manual fire emits a `SENSOR_FIRED` audit row, then exactly one terminal row: `SENSOR_PASSED`, `SENSOR_FAILED`, or `SENSOR_BUDGET_OVERRIDE`. A failure writes a detail file under `<record>/.amadeus-sensors/<stage>/` (in the intent's record dir). Sensors are advisory — a Sensor failure is never a tool failure, so the command still exits 0. The four Sensors that ship with the framework are `required-sections`, `upstream-coverage`, `linter`, and `type-check`.

```
bun .claude/tools/amadeus-sensor.ts list
bun .claude/tools/amadeus-sensor.ts describe required-sections
bun .claude/tools/amadeus-sensor.ts fire required-sections \
  --stage requirements-analysis \
  --output-path amadeus/spaces/default/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md
```

### `amadeus-learnings` — the learning-gate tool

This is the deterministic half of the §13 learning gate. After a stage is approved, the orchestrator uses it to turn your stage's `memory.md` diary into reviewable learning candidates, then to persist the ones you confirm. You normally never call it directly — the orchestrator drives both steps around an `AskUserQuestion` gate — but it is here so the audit rows it emits make sense.

| Subcommand | What it does |
|------------|--------------|
| `surface --slug <stage-slug>` | Read the just-approved stage's `memory.md` and print structured candidates (Interpretations, Deviations, Tradeoffs) plus any parked open questions. Read-only |
| `persist --slug <stage-slug> --selections-json <path>` | Write the confirmed learnings (a confirmed learning is a practice) to the space memory layer — `amadeus/spaces/<space>/memory/project.md` / `memory/team.md` (and, for a Sensor-binding learning, scaffold and bind a project-tier Sensor), emitting `RULE_LEARNED` / `SENSOR_PROPOSED` |

Confirmed learnings apply on the next workflow, not the current one.

### `amadeus-runtime` — read the runtime graph

The runtime graph (`runtime-graph.json` in the intent's record dir) is the data-plane record of what actually happened this workflow: which stages ran, how full each `memory.md` diary got, which Sensors fired, what each returned. It is the runtime mirror of the structural `stage-graph.json`. The framework recompiles it after every stage transition; this tool lets you trigger a compile or read one stage's row.

| Subcommand | What it does |
|------------|--------------|
| `compile` | Walk the `audit/` shards and the per-stage `memory.md` files and rewrite `runtime-graph.json`. Fired automatically by a hook on every transition |
| `read <stage-slug>` | Print one stage's row from `runtime-graph.json` (timestamps, agent, memory breakdown, Sensor firings, outcome) |
| `summary [--json]` | Print deterministic aggregates over the whole graph — stage/phase outcome tallies, memory-entry counts, Sensor 4-state tallies, learnings captured, workflow duration. The data source the read-only session skills read from |

```
bun .claude/tools/amadeus-runtime.ts read requirements-analysis
```

`runtime-graph.json` is gitignored. See [Artifacts Reference](14-artifacts-reference.md) for the artifact's shape and the [Runtime Graph](../reference/13-runtime-graph.md) reference chapter for the full schema.

### Session skills — report on a workflow

Three read-only skills surface what `amadeus-runtime summary` reports, wrapped in readable output. Type them like commands:

| Skill | What it does |
|-------|--------------|
| `/amadeus-session-cost` | Deterministic cost view (duration, stage outcomes, memory, Sensors, learnings). Terminal only |
| `/amadeus-replay` | Readable session narrative for async review. Terminal only |
| `/amadeus-outcomes-pack` | Handover document for the team. Writes `OUTCOMES.md` |

All three are read-only — no stage advance, no audit emit — and source every number from `amadeus-runtime summary --json`. See [Session Management § Session Skills](11-session-management.md#session-skills) for the full walkthrough.

A fourth read-only skill, `/amadeus-grilling <file-or-topic>`, runs a one-question-at-a-time grilling interview about a plan or design — workflow optional, terminal only. See [Interaction Modes](07-interaction-modes.md).

---

## Environment Variables

### `AMADEUS_DEFAULT_SCOPE`

Pre-set the default scope for a project. Read from `.claude/settings.json` `env` block at workflow initialization.

**Syntax (in `.claude/settings.json`):**

```json
{
  "env": {
    "AMADEUS_DEFAULT_SCOPE": "workshop"
  }
}
```

**Valid values:** `enterprise`, `feature`, `mvp`, `poc`, `bugfix`, `refactor`, `infra`, `security-patch`, `workshop`.

**Precedence:** explicit CLI flag > keyword detection > `AMADEUS_DEFAULT_SCOPE` > hard-coded fallback.

**Scope of effect:** applies at workflow initialization only. Once the intent's `amadeus-state.md` exists, the state file is authoritative. See [Customization § Per-Project Default Scope](13-customization.md#per-project-default-scope) for the full walkthrough.

---

## Next Steps

- [Skills and Runner Commands](17-skills.md) — The typeable `/amadeus-<scope>` and `/amadeus-<stage>` runners, and what `--single` does
- [Session Management](11-session-management.md) — Resume options and stage jumps in detail
- [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) — Scope definitions, stage mappings, and test strategy levels
- [Troubleshooting](15-troubleshooting.md) — When commands don't behave as expected
- [Glossary](glossary.md) — Definitions for command, utility command, scope
