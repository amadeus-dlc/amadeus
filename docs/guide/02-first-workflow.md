# Your First Workflow

## The conductor loop

Inside Claude Code, you drive Amadeus DLC by typing `/amadeus`, optionally followed by a freeform description of what you want to build — for example `/amadeus "Add a hello command to my CLI"`. Everything that follows is the `amadeus` skill running one small, fixed loop against the engine: ask `amadeus-orchestrate.ts next` what to do, do exactly that one thing, `report` the outcome, and repeat until the engine says the workflow is done. The engine — not the skill — decides Intake, scope, stage order, and when a gate applies; the skill only carries out the directive it is handed. The full contract for this loop lives in [skills/amadeus/SKILL.md](../../skills/amadeus/SKILL.md) ("The Forwarding Loop").

This chapter does not narrate a `/amadeus` chat session. Instead it runs the engine's own commands directly — the same commands the skill runs on your behalf — so you can see exactly what the engine returns before trusting the skill to run the loop for you.

## Birth: creating your first Intent

Inside `/amadeus`, an Intent is never created directly: Intake classifies your freeform input, and the engine proposes a **birth** only when the input looks like a new, independently completable outcome. Human approval before birth is mandatory — the engine never auto-births. Once approved, the skill runs `intent-birth` with the approved scope and description.

Every command in this chapter is run from the root of your target workspace — the directory you installed into, not the Amadeus clone that [Getting Started](01-getting-started.md) left you in:

```sh
cd <workspace>
```

This is that same birth command, run directly:

```sh
bun .agents/amadeus/tools/amadeus-utility.ts intent-birth --scope poc --arguments "Add a hello command to my CLI" --label "hello-command"
```

```
Intent born: 260706-hello-command (space: default)
State initialized: poc scope, 7 stages, Minimal depth
Project type: Greenfield
Languages: Unknown
Frameworks: Unknown
Build System: Unknown
First post-init stage: intent-capture (IDEATION)
```

Birth creates the Intent record (`amadeus/spaces/default/intents/260706-hello-command/`) and, alongside it, the Space shell — `amadeus/spaces/default/memory/` — that [Getting Started](01-getting-started.md#verify-the-install) showed as `pending first workflow` right after install. Re-running `doctor` in the same workspace, right after this birth, shows that line flipped to `workspace shell ready` (unrelated passing lines omitted below; nothing here has been altered beyond that trim):

```
AI-DLC Health Check
─────────────────────────────────────
…
✓  workspace shell ready (.claude/ + amadeus/spaces/default/memory/)
…
─────────────────────────────────────
33 passed, 0 failed
```

## The engine names the next move

With the Intent born, ask the engine what to do next:

```sh
bun .agents/amadeus/tools/amadeus-orchestrate.ts next
```

The engine returns exactly one directive as JSON. Here is the real one for this Intent, shown as an abridged excerpt rather than a complete JSON document (its `conductor_persona` field — a long, fixed block of execution-quality guidance carried on the first directive of every session — is omitted; the capture below is cut immediately before it, at the point where the trimmed source log itself stops):

```json
{
  "kind": "run-stage",
  "stage": "intent-capture",
  "phase": "ideation",
  "lead_agent": "amadeus-product-agent",
  "support_agents": [
    "amadeus-architect-agent"
  ],
  "mode": "inline",
  "gate": true,
  "memory_path": "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/memory.md",
  "consumes": [],
  "produces": [
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/intent-statement.md",
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/stakeholder-map.md",
    "amadeus/spaces/default/intents/260706-hello-command/ideation/intent-capture/intent-capture-questions.md"
  ],
  "rules_in_context": [
    "amadeus/spaces/default/memory/org.md",
    "amadeus/spaces/default/memory/team.md",
    "amadeus/spaces/default/memory/project.md",
    "amadeus/spaces/default/memory/phases/ideation.md"
  ],
  "sensors_applicable": [
    "required-sections",
    "upstream-coverage"
  ],
  "stage_file": ".claude/amadeus-common/stages/ideat…
```

Reading a `run-stage` directive: `stage` and `phase` name the single move; `lead_agent` (plus any `support_agents`) says whose persona frames the work; `mode: inline` means the skill runs the stage body in the current session rather than dispatching a subagent; `gate: true` means this stage ends at a human approval gate, not an auto-proceed; `memory_path` is where the stage keeps its observation diary; `consumes` and `produces` are the stage's declared inputs and outputs (this Intent's first stage consumes nothing yet); `rules_in_context` lists the steering documents loaded for the stage; `sensors_applicable` names the deterministic checks that apply at its gate; and `stage_file` points at the stage definition the skill reads to run the body.

## Checking where you are

At any point, ask the engine for a status summary instead of the next directive:

```sh
bun .agents/amadeus/tools/amadeus-utility.ts status
```

```
AI-DLC Workflow Status
==============================
Project:        Add a hello command to my CLI
Scope:          poc
Phase:          IDEATION
Current Stage:  Intent Capture & Framing (1.1)
Status:         Running
Active Agent:   amadeus-product-agent
Completion:     3/7 stages (43%)

Phase Progress:
  INITIALIZATION   ███ 3/3
  IDEATION         ▒ 0/1
  INCEPTION        ░ 0/1
  CONSTRUCTION     ░░ 0/2

Last Completed: state-init
Next Stage:     reverse-engineering
```

This is the poc scope's compiled 7-stage plan: the 3 Initialization stages ran automatically at birth, and the remaining 4 stages (this scope's Ideation, Inception, and Construction subset) are still ahead. `Current Stage` is the work in front of you now; `Next Stage` names the stage that follows once the current one completes. `Completion` and the `Phase Progress` bars both derive from the same stage count; `Current Stage` and `Last Completed` are always the same field pair `/amadeus` shows you at any point mid-run.

## Gates and audit

Approving a stage is a human decision, never the engine's or the skill's. Each stage gate, and each Construction Bolt gate, waits for an explicit Approve or Request Changes before work advances — the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) defines the full gate contract (stage gates, Bolt gates, and the phase gates that PRs and human merges settle). Every gate decision and stage transition is written to the Intent's own append-only `audit/` log as it happens, never reconstructed after the fact; the record structure behind both `audit/` and the state file the engine reads on every `next` call is defined in the [State Reference](../amadeus/lifecycle/state.md).

## Where artifacts land

Everything this Intent produces lands under its own record, `amadeus/spaces/default/intents/260706-hello-command/`: one directory per phase (`ideation/`, `inception/`, `construction/`, …) holding one subdirectory per stage, plus the record-level `audit/` log and the state file that names the current stage and gate status. The full record layout — down to per-stage artifact names — is defined in the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) (its artifact-placement section); this chapter does not duplicate it.

## Next steps

This chapter covered the first steps of an Intent at the command level — birth, the first engine directive, and where state and artifacts land. Running the remaining stages to completion happens through the conductor loop (`/amadeus`), gate by gate. The guide continues past this introductory arc — see the [guide index](index.md) for the full chapter list and what has been published so far. To steer or extend an installed workspace — new scopes, custom stages, engine changes — see the [Extension Guide](../amadeus/extension-guide.md).
