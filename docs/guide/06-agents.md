# Agents

## What is an agent

An agent is a persona a stage adopts while it runs — a point of view, not a mechanism. Each of the 14 agents is a flat markdown file under `.agents/amadeus/agents/`, one file per agent. Its frontmatter declares a `name`, `display_name`, a `description` naming the stages it leads or supports, and a `modelOverride`; every agent file also declares `disallowedTools: Task` and opens with the same instruction — an agent never spawns a sub-agent of its own. Only the conductor delegates.

A stage loads its agent's persona one of two ways, depending on the stage's execution mode:

- **Inline stages** — the conductor reads the lead agent's file directly into its own context for role framing, then works the stage from that agent's perspective. A multi-agent stage layers each support agent's file the same way before synthesizing a result.
- **Subagent stages** — the persona file's content is passed into the Task tool call as context, so the delegated sub-agent boundary carries the same voice.

See the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) for how a stage's execution mode is decided; this chapter only covers how the persona is loaded once that mode is known.

## The 14 agents

The 14 agent files fall into three roles:

- **Domain agents (11)** — `amadeus-architect-agent`, `amadeus-aws-platform-agent`, `amadeus-compliance-agent`, `amadeus-delivery-agent`, `amadeus-design-agent`, `amadeus-developer-agent`, `amadeus-devsecops-agent`, `amadeus-operations-agent`, `amadeus-pipeline-deploy-agent`, `amadeus-product-agent`, `amadeus-quality-agent`. Each leads or supports the stages named in its own frontmatter — for example, the Architect Agent leads Feasibility, Application Design, Units Generation, Functional Design, NFR Requirements, and NFR Design. These are the agents that actually produce stage artifacts.
- **Reviewer agents (2)** — `amadeus-architecture-reviewer-agent` and `amadeus-product-lead-agent`. Neither produces artifacts; both review artifacts a domain agent already produced (see [Reviewers at the gate](#reviewers-at-the-gate) below).
- **Composer agent (1)** — `amadeus-composer-agent`. Proposes which stages a workflow should run rather than doing stage work itself (see [The composer](#the-composer) below).

Which domain agent leads or supports which stage is declared per stage, not enumerated here — see [Where agents are declared](#where-agents-are-declared).

## Reviewers at the gate

A stage whose definition names a `reviewer` gets an independent review pass after its lead agent produces artifacts, and before the stage's learnings ritual and approval gate. The reviewer sub-agent receives the stage definition, the stage's question-and-answer file, and the produced artifacts — never the lead agent's working notes (`memory.md`) or plan files — so its judgment stays independent of how the artifacts were built.

The reviewer appends a `## Review` section to the primary artifact with a verdict:

- **READY** — the stage proceeds to its learnings ritual and approval gate.
- **NOT-READY** — the lead agent addresses the findings and the artifact is re-reviewed, up to `reviewer_max_iterations` times (2, by default, per stage). Once iterations are exhausted, the stage still proceeds to the approval gate, with the unresolved findings presented for the human's decision.

The reviewer never blocks the workflow outright — the human always has the final say at the gate.

## The composer

The composer agent (`amadeus-composer-agent`) is dispatched by the `/amadeus compose` skill, or whenever Intake needs to shape a workflow beyond a stock scope. It reads the task at hand — a prompt, a scan report, or a running workflow's state — and proposes an EXECUTE/SKIP grid across the lifecycle's stages. Once a human approves the proposal at the gate, it authors that grid as scope data for a new workflow, or, for a workflow already in flight, proposes flipping pending stages between EXECUTE and SKIP. The composer is never invoked directly by a stage; only the orchestrator dispatches it.

## Where agents are declared

Each stage definition (`.agents/amadeus/amadeus-common/stages/<phase>/<slug>.md`) declares its own `lead_agent`, an optional `support_agents` list, and an optional `reviewer` in frontmatter — this is the single source of truth for which agent does which stage. This chapter does not reproduce that mapping. For the full stage list, see the [Stage Catalog](../../skills/amadeus/references/stage-catalog.md); for the stage contract those fields participate in (inputs, outputs, gates), see the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md).

## Next steps

Agents produce and review stage artifacts; the next chapter, [Interaction Modes](07-interaction-modes.md), covers how a human answers a stage's questions in the first place. See the [guide index](index.md) for the full chapter list and what has been published so far.
