# The Orchestration Engine and Skill System

> Languages: **English** | [日本語](17-skill-system.ja.md)

> Audience: Tier 2/3 (team adopter, framework contributor).

> **Path convention.** `<record>/` below = the active intent's record dir, `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`, where per-intent state and runtime files live.

This chapter is the canonical reference for the orchestration architecture that drives every `/amadeus` run: a deterministic **engine** (`amadeus-orchestrate.ts`) that answers "what's next?", a thin **conductor** (`skills/amadeus/SKILL.md`) that acts on the engine's answer, the **typed directive contract** that joins them, the **plural skill** set the runner generator emits, the **scope shape** that decides which stages run, and the **swarm** referee that converges parallel Construction work. It replaces the older prose-orchestrator model, where the `SKILL.md` body itself held all the routing logic. Cross-link to [Orchestrator](03-orchestrator.md) (the conductor's own chapter), [Runtime Graph](13-runtime-graph.md) (the execution-truth mirror the engine and swarm read), [State Machine](12-state-machine.md) (the transitions `report` commits), and [Hooks and Tools](06-hooks-and-tools.md) (the deterministic spine, including the Stop hook).

---

## 1. The engine and the conductor

The cutover splits one concern into two. The **engine** owns *between-stage routing* — scope resolution, the flag-precedence ladder, jump-direction computation, resume and init guards, stage sequencing, gate status, and workflow completion. The **conductor** owns *execution quality inside the move the engine named* — framing the persona, asking good questions, keeping the stage diary, the intra-stage Keep/Modify/Redo loop, and surfacing judgement to the human at gates.

The engine is authored at `packages/framework/core/tools/amadeus-orchestrate.ts` and ships into each harness as `<harness-dir>/tools/amadeus-orchestrate.ts` (e.g. `.claude/tools/`); it is a Bun CLI with exactly two subcommands:

| Subcommand | Role | Mutates state? |
|------------|------|----------------|
| `next` | Read the workflow state (the active intent's `amadeus-state.md`, under `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`) and the compiled stage graph (`tools/data/stage-graph.json`), resolve scope and position, and emit **exactly one** typed directive (JSON) to stdout. | No (one documented transitive exception: a no-state birth over a workspace that already holds intents emits an intent-pick prompt rather than birthing a duplicate). |
| `report` | Commit the transition after the conductor acted on a directive. A stage-aware dispatcher: `--stage <slug>` pins the acted directive so a recovered `Current Stage` cannot make the report target drift. It shells out to the state tool transition(s), opening a missing gate before approval when the explicitly reported stage is still `[-]`. | Yes. |

The engine is deterministic code by design — routing is the determinism concern, so it lives in a tool, never in LLM prose (handing route string-building to an LLM would invert the tool/agent/human thesis). It **composes** the existing deterministic library: `loadGraph()` for the compiled graph, `nextInScopeStage()` / `firstInScopeStageOfPhase()` for sequencing, `validScopes()` for the scope-name set, and `getField` / `parseCheckboxes` for state reads. The non-happy-path branches (jump, resume, intent birth, scope/config change, env-scope validation) compose the sibling CLI tools by shelling out and relaying their stderr verbatim, so user-facing error wording is never reconstructed. The only things the engine *adds* rather than composes are the decision rule mapping `(observed state + graph) → directive kind` and the artifact-path resolver that turns the graph node's vocabulary names into canonical record-dir paths (`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/...`).

Every directive is validated against the frozen contract in `amadeus-directive.ts` before it is printed; a malformed directive exits non-zero rather than emitting a lie the conductor would act on.

---

## 2. The typed directive contract

`amadeus-directive.ts` defines a discriminated union keyed on the `kind` field. Each directive carries exactly the fields its kind needs, enforced by per-kind allowed-key sets (a field outside its kind's set is rejected as an unknown key). The kinds below are the ones the conductor branches on; two are documented placeholders that keep the loop complete-shaped until later waves wire them, and the rest are emitted today.

| `kind` | Emitted today? | What the conductor does |
|--------|----------------|--------------------------|
| `print` | Yes | Do exactly what `directive.message` says — it is authoritative. Two shapes: **terminal** (names a read-only utility such as status/help/doctor/version; run it, print stdout verbatim, STOP) and **run-then-continue** (names a mutating tool such as a scope change, a jump `execute`, or the workflow-birth `init --scope <scope>` emitted when the user explicitly names a scope — flag or positional — on a fresh workspace; run it, then return to step 1 of the loop). The mutation lives in the named tool, never in `next`. |
| `error` | Yes | Print `directive.message` verbatim and STOP. Do not recover or smooth it over — the message is the user-facing error. |
| `committed` | Yes | A `report` transition landed and the loop CONTINUES. Emitted by `report` on every successful non-terminal commit — the normal commit ack, the authorized-carrier approval ack, and the idempotent stale re-report. `directive.reason` names the move; the conductor runs `next` again. Split out of `done` by #2762, which had one kind meaning both "the workflow is over, stop" and "the commit landed, keep going". |
| `done` | Yes | The workflow (or single-stage run) is complete. Present the completion summary and STOP. Only terminal completion emits this; a successful `report` acks with `committed`. |
| `parked` | Yes | The workflow was parked mid-flow at a clean inter-stage boundary (`directive.stage`) for a later session. Tell the user it is parked and how to resume (`/amadeus --resume`), then STOP. Emitted on a plain `next` while a `Parked` marker is set (written by `amadeus-orchestrate park`); no stage is advanced. The Stop hook treats `parked` as a terminal allow, so the conductor parks instead of rubber-stamping stages to reach `done` (#367). |
| `run-stage` | Yes | Load the lead agent's persona plus any `support_agents`, read `directive.stage_file`, run the stage body, write `produces`, keep the diary at `directive.memory_path`, then branch on `directive.gate` (see [Orchestrator](03-orchestrator.md)). Carries the resolved routing fields straight off the graph node: `lead_agent`, `support_agents`, `mode`, `gate`, `consumes`, `produces`, `rules_in_context`, `sensors_applicable`, `stage_file`. It also carries `depth` — the workflow's resolved depth level (`amadeus-state.md` → `**Depth**`, falling back to the scope default), the single authority a stage reads for depth-scaled artifact volume. |
| `ask` | Yes | Render `directive.question` via `AskUserQuestion`, then feed the human's answer back on the next `report` via `--user-input`. The engine never calls `AskUserQuestion` itself — it defers the human turn to the conductor. |
| `invoke-swarm` | Yes | The engine granted an eligible Construction batch to the swarm. The conductor fans out the units in `directive.units` and runs the convergence loop, consulting the swarm referee (see §6), passing `directive.batch` — the engine's 1-origin batch identity and the durable Unit Pool id — to every referee call for the batch. The convergence check itself is NOT carried: `--check-cmd` and the optional `--test-file` stay conductor knowledge, sourced as each conductor surface's swarm step names. Emitted for an eligible Construction batch under an `autonomous` OR `gated` grant; under `gated` the engine emits an `ask` batch-end gate between batches, which `amadeus-bolt approve-batch --batch <n>` clears. |
| `await-advisory-choice` | Yes | A plugin raised an advisory at this checkpoint and nothing has answered it. Record the protected presentation via `amadeus-log.ts advisory-decision`, present `directive.question` verbatim with exactly `directive.options`, and STOP. This kind is the human question route ONLY — an advisory that already carries its answer arrives as `execute-advisory-handoff`. |
| `execute-advisory-handoff` | Yes | The advisories at `directive.stage` were already answered `run-now`, by a human or by the autonomy ladder, and the hold still stands. Do not present anything: run `/amadeus --stage <slug> --single` for each slug in `directive.handoff_stages` in array order, then re-run `next` (never `report`). An empty `handoff_stages` means no advisory names a destination — report the standing hold and stop. Opening a handoff stage never releases the hold; only the declaring plugin's evaluator returning no-hold does (#2967). |
| `dispatch-subagent` | No (engine-future placeholder) | *Would* run the named stage via a `Task` call rather than inline. Not emitted today; do not implement speculatively. |
| `present-gate` | No (engine-future placeholder) | *Would* run the gate ritual as its own directive; today the gate decision is folded into `run-stage`'s `gate` field. |

**The exit code contract.** The engine's exit code answers one question only — could it emit a valid directive? — never whether that directive is good news. Emitting any one of the directive kinds above, `error` included, exits 0; a non-zero exit means no directive was produced at all. This holds across `next`, `report`, `gate-reserve`, and `gate-reject` alike: `amadeus-orchestrate.ts` calls `process.exit(1)` from exactly five sites, and every one of them is a failure to construct a directive, not a directive with bad news — a stranded autonomy carry (`:771`), a malformed directive the frozen contract rejects (`:778`), a failed sensor-invocation projection for a `run-stage` directive (`:801`), an unknown or missing subcommand (`:6115`), and an uncaught exception caught by the top-level error boundary in `runEngineMain` (`:6135`). None of the five is reachable once an `error` directive has been successfully emitted. `tests/integration/t214-engine-error-logged.test.ts:95-96` pins the contract verbatim (`// Exit code unchanged: an error directive is a conductor-handled terminal, NOT a process failure.`); `t365-kimi-reviewer-boundary.integration.test.ts:2232` and `t427-goal-reconciliation-completion.integration.test.ts:316` pin the same exit-0-with-`error`-directive shape on `report`. A **non-interactive caller** (CI job, script, wrapper) must read `directive.kind` from stdout to detect a refusal — the exit code alone cannot distinguish a refusal from success, so branching on it silently swallows a rejected `report`. This is the opposite of the sibling CLI tools' convention: `amadeus-state.ts`'s `error()` helper (`:5595`) exits non-zero on refusal, matching the exit-code-means-success/failure convention most CLIs use. Do not assume the two tools share a convention.

**The gate sentinel.** `run-stage`'s `gate` is a boolean for every deterministic case (`false` for the auto-proceeding bootstrap initialization stages, `true` for every other EXECUTE stage). One case is not deterministic: the first Construction Bolt's gate depends on the team's free-form `## Walking Skeleton` practices prose, which no parser can derive. The engine emits the string sentinel `GATE_UNRESOLVED` (`"unresolved"`) and defers the classification to the conductor's knowledge-work, which hands the stance back via `report --skeleton-stance <on|off|scope-dependent>`; the next `next` re-emits the same stage with a now-determined boolean gate.

**The conductor persona delivery.** The conductor's execution-quality charter lives once at `amadeus-common/conductor.md`. No skill references it by path. Instead the engine reads it and bakes its contents into the `conductor_persona` field of the **first `run-stage` directive of the workflow**. When the conductor receives that field, it adopts the persona for the whole run. This keeps every entry point — framework runner and hand-written alike — on one persona with no per-skill diligence.

---

## 3. The forwarding loop and the Stop hook

`skills/amadeus/SKILL.md` is the **conductor**: a thin forwarding loop that acts on the engine's directives. Its whole control structure is:

```
Loop:
  1. directive = `bun .claude/tools/amadeus-orchestrate.ts next $ARGUMENTS`
  2. act on directive.kind
  3. `bun .claude/tools/amadeus-orchestrate.ts report --stage <directive.stage> --result <outcome> [--user-input "<text>"]` when the directive names a stage; omit `--stage` only for non-stage report round-trips.
  4. repeat while the directive continues the loop (`committed` — the report
     ack — plus `run-stage`, `invoke-swarm`, run-then-continue `print`)
```

```mermaid
flowchart LR
  A["next $ARGUMENTS"] --> B{"directive.kind"}
  B -->|"run-stage / ask / invoke-swarm"| C["conductor acts on the move"]
  C --> D["report --stage ... --result ..."]
  D --> A
  B -->|"print (run-then-continue)"| C
  B -->|"committed (report ack)"| A
  B -->|"print (terminal) / error / done"| E["STOP"]
```

Text description of the diagram: `next` (passed `$ARGUMENTS` verbatim) returns one directive. The conductor branches on `directive.kind`. For `run-stage`, `ask`, `invoke-swarm`, and run-then-continue `print` directives it performs the named move and calls `report`, which loops back to `next`. A `committed` directive — what a successful `report` returns — goes straight back to `next` with no second `report`. For terminal `print`, `error`, and `done` it stops the loop.

`$ARGUMENTS` passes through to the first `next` verbatim — the engine parses the flags (`--status`, `--stage`, `--scope`, `--depth`, freeform text), so the conductor never pre-parses or strips them. Because `next` mutates nothing, the loop only advances when `report` commits a transition, so the next `next` always reads fresh state.

On the interactive path the conductor holds the loop, because only it can ask the human a question. To keep the loop from resting on the LLM's good behaviour, the **Stop hook** (`hooks/amadeus-stop.ts`) enforces it deterministically - the framework's first flow-altering hook (every other framework hook is advisory and always exits 0). When the conductor tries to end its turn, the Stop hook runs `amadeus-orchestrate next`; if a directive is still pending, it blocks the stop and injects the directive back via the `reason` field, phrased as an **on-task continuation** (it names the work still owed - run the loop, act, report - never an override-shaped instruction, which the conductor's safety training would refuse). A `done` or `parked` directive (the latter from `amadeus-orchestrate park`, the supported mid-flow pause for a later session) allows the stop. Some pending cases are *not* blocked either: a **human-wait carve-out** allows the stop when the conductor is correctly parked on the human (or simply chatting) - the current stage is positively `[?]` awaiting-approval, `[R]` revising, `[-]` in-progress with an unanswered `[Answer]:` tag in its `<slug>-questions.md` (a pending mid-stage clarifying question), or the ending turn was conversational (the human's last prompt was answered with no workflow-engine call, read from the harness transcript; a read-only `--status`/`--doctor` query does not count as engagement). The question-tag case is suppressed under Intent autonomy `full` and human-command `semi`, the conversational case under `full` only, so an unattended run keeps moving; the conversational case is also inert on Kiro, which delivers no transcript, where the interactive cap is the release path instead. Blocking there would only spam the nudge (positive-confirmation only; the human-wait checks fail open and the conversational check fails closed; stateless cases and a genuine mid-stage quit still block). Two bounds keep a stuck loop from trapping the session: Claude Code's `stop_hook_active` signal, and a no-progress counter persisted under `<record>/.amadeus-stop-hook/` (in the active intent's record dir). Once consecutive no-progress blocks reach the ceiling (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, whose default is run-mode aware: **2 in an interactive run and 8 under autonomous Construction**) the hook lets go; a workflow advance changes the position signature and resets the counter to 0, so a healthy loop is never throttled. With no active workflow, or on any unexpected error, the hook fails open - it never blocks a non-AIDLC session.

---

## 4. Plural skills, runners, and the shared spine

The orchestrator is one skill among many. Each harness ships a plural set under its skills directory (`<harness-dir>/skills/`, e.g. `dist/claude/.claude/skills/`): the base `amadeus` orchestrator, one **stage-runner** per runnable stage (`amadeus-<slug>`), one **scope-runner** per first-batch scope (`amadeus-<scope>`), the read-only session skills (`amadeus-session-cost`, `amadeus-replay`, `amadeus-outcomes-pack`, `amadeus-grilling`), and `amadeus-init`. All of the routing-and-execution knowledge lives once in the **shared spine** authored at `packages/framework/core/amadeus-common/` (shipped as `<harness-dir>/amadeus-common/`): the `conductor.md` persona, the `protocols/`, and the 32 stage files under `stages/{initialization,ideation,inception,construction,operation}/`.

The runner skills are generated, never hand-written, by `tools/amadeus-runner-gen.ts`:

- **Stage-runners** are opt-in sugar. Each `/amadeus-<slug>` packages `/amadeus --stage <slug> --single` (which works without it) into a typeable command that runs one stage in isolation via the engine's `--single` mode and never advances the main workflow's `Current Stage`. The slug list comes from `loadGraph()` — the one compiled source of truth — so a stage added to the graph flows into a runner with no edit here. The bootstrap initialization stages are excluded (they have no standalone `--single` meaning; `--single` refuses them), and the whole initialization phase ships as one `/amadeus-init` runner that packages the engine's intent-birth move.
- **Scope-runners** package an already-runnable command; the scope file holds the definition. Each is a short shell that drives `amadeus-orchestrate next --scope <scope>` to `done` with a fixed scope and no detection. The full scope set stays reachable via `/amadeus --scope <name>`; runners are typeable sugar over the high-traffic ones.

Two drift guards keep the on-disk runner sets pinned to their sources: `amadeus-runner-gen.ts check` for stage-runners and `scopes --check` for scope-runners, both run in CI. Runners carry **no `hooks:` block** — the workflow-spine hooks live project-wide in `settings.json`, so the deterministic spine is inherited, not copied. And no runner loads `conductor.md` by hand: the engine delivers the persona on the first `next`.

---

## 5. Scope shape

Scope is a file-authored primitive, the same muscle memory as authoring a sensor or an agent. There is **no `scope-mapping.json`** — it has been removed from the shipped tree. Scope identity and stage membership are split across two file-authored surfaces, transposed into a compiled grid:

1. **Identity** lives in one file per scope at `dist/claude/.claude/scopes/amadeus-<name>.md` — frontmatter (`name`, `depth`, `keywords`, `description`) plus prose describing the scope. The shipped set is `fix`, `chore`, `enterprise`, `feature`, `infra`, `mvp`, `poc`, `refactor`, `security-patch`, `workshop`.
2. **Membership** lives in each stage's `scopes:` frontmatter — the list of scopes for which that stage is EXECUTE.

`bun .claude/tools/amadeus-graph.ts compile` (the same compile path that produces `stage-graph.json`) transposes these into the grid at `tools/data/scope-grid.json` — a `scope → {stages: {slug: EXECUTE|SKIP}}` map that the engine reads for all scope-level routing. The engine's `validScopes()` derives its canonical scope-name set from that compiled grid.

Adding a scope is purely additive: drop `.claude/scopes/amadeus-<name>.md`, tag the member stages' `scopes:` lists, recompile, and regenerate the human-readable summary table in `SKILL.md`. No dispatch-logic edit is required, and the drift guards prevent the on-disk set from diverging.

---

## 6. The swarm referee, the driver seam, and the Bolt-DAG

The **swarm** is how parallel Construction work converges under human-granted autonomy. It fires only inside a live `/amadeus` session, so the conductor (that session) owns the fan-out and the retry loop; `tools/amadeus-swarm.ts` is the deterministic **referee** the conductor consults while it owns the loop itself. This is the three-concerns split applied to convergence: the conductor owns fan-out and the retry decision (knowledge), the tool owns the convergence verdict + merge + audit (determinism), and the human grants autonomy and takes the baton back on the failure envelope (judgement).

The convergence checks remain stateless, while the fixed Unit pool is an audit-folded C2 single writer. Its canonical event sets own FIFO queue order, slots, Unit-attempt budgets, and reconciliation; harnesses report native facts only.

| Subcommand | Role | Emits |
|------------|------|-------|
| `prepare --batch <n> --units <a,b,c> [--base <branch>] [--concurrency <1..4>] [--degraded-from <subagent\|claude-ultra\|codex-ultra>]` | Resolve `swarm.unit.concurrency.limit`, initialize the canonical FIFO pool, and fork an isolated git worktree per submitted Unit. | `SWARM_STARTED`, `UNIT_POOL_EVENT_SET_COMMITTED` (plus `SWARM_DEGRADED` when a loud downgrade is reported). |
| `acquire` / `confirm-dispatch` / `record-reconciliation` / `settle-release*` / `terminate-batch` / `late-result-observed` | Atomically reserve at most `cap` slots, accept native start facts, release and promote the next dependency-ready FIFO Unit, or drain/terminate safely. | `UNIT_POOL_EVENT_SET_COMMITTED`. |
| `check <unit> --check-cmd <cmd> [--test-file <path>]` | Stateless single-unit verdict: run the project's own check command (exit 0 = green, the authoritative signal — a worker's self-claim is never trusted) plus an anti-tamper compare of the protected file against its forked-git baseline. Prints `{converged, tampered, reason}`; exits 0 iff genuinely converged. | None (advisory; informs the conductor's retry decision). |
| `finalize --batch <n> --units <a,b,c> --claimed <a,b> --check-cmd <cmd> [--test-file <path>] [--reasons <unit>=<reason>,…]` | The authoritative gate: **re-run the check on every claimed unit** before any merge (a unit named in `--claimed` but red on disk is refused the merge and lands in the failure envelope — the lying-conductor guard), then serialised HOLD-MERGE merge-back of the genuine passes. Exits 0 (batch converged and merged) or 2 (failure envelope). | `SWARM_UNIT_CONVERGED` / `SWARM_UNIT_FAILED` / `SWARM_BATON_RETURNED` / `SWARM_COMPLETED`. |

These six `SWARM_*` events and the Unit-pool event are part of the 81-event audit taxonomy (see [State Machine](12-state-machine.md)). On an exit-2 envelope the conductor takes the baton back - failure always halts and re-engages the human regardless of autonomy mode.

**The driver seam.** `AMADEUS_USE_SWARM` is a three-value enum — its only valid states are **unset**, `claude-ultra`, and `codex-ultra`. The conductor resolves it once per batch before preparation. Driver selection changes the native dispatch substrate only; every substrate must consume pool-issued permits and can never own or widen the cap. Non-native ultra values loud-degrade to the subagent floor, and unknown values fail closed before any worktree, dispatch, or audit start.

**The Bolt-DAG.** The batch the swarm fans out comes from the `bolt_dag` node of `runtime-graph.json` (see [Runtime Graph](13-runtime-graph.md)), parsed from units-generation's `unit-of-work-dependency.md` edge block. The node carries `units` (each with its `depends_on` list) and `batches` — topological levels where every unit's dependencies are satisfied by prior batches, so a batch's units can fan out in parallel. The node is present only once a valid edge block exists on disk. When it is missing, the graph says why: a legitimate absence (the scope skips units-generation, or the stage has not run yet) writes `bolt_dag_absence` instead, while a defect (units-generation completed with the artefact missing, or an artefact whose block does not parse) fails the compile outright — the gate-time required-sections sensor flags the same block upstream.

---

## Next Steps

- **The conductor's own chapter** — the forwarding loop, the gate ritual, and the learnings ritual in full. See [Orchestrator](03-orchestrator.md).
- **The execution-truth artefact the engine and swarm read** — `runtime-graph.json` and its `bolt_dag` node. See [Runtime Graph](13-runtime-graph.md).
- **The transitions `report` commits** - the workflow / phase / stage machines and the 81-event audit taxonomy. See [State Machine](12-state-machine.md).
- **The deterministic spine** — the Stop hook and the other framework hooks and tools. See [Hooks and Tools](06-hooks-and-tools.md).
- **Using the runners day to day** — the typeable `/amadeus-<stage>` and `/amadeus-<scope>` commands. See the User Guide's [Skills and Runner Commands](../guide/17-skills.md).
