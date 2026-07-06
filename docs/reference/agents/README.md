# Agent Reference

Technical reference for the 11 AI-DLC agents: configuration, stage ownership,
collaboration patterns, and comparison data.

For design philosophy and rationale, see the
[Agents chapter in the User Guide](../../guide/06-agents.md).

---

## The 13 Agents (11 domain experts + 2 reviewers)

| # | Agent | Domain |
|---|-------|--------|
| 1 | [amadeus-product-agent](product-agent.md) | Requirements, scope, user stories, market research |
| 2 | [amadeus-design-agent](design-agent.md) | UX/UI, wireframes, interaction design, accessibility |
| 3 | [amadeus-delivery-agent](delivery-agent.md) | Team formation, capacity planning, delivery sequencing |
| 4 | [amadeus-architect-agent](architect-agent.md) | Application design, domain modelling, NFRs, decomposition |
| 5 | [amadeus-aws-platform-agent](aws-platform-agent.md) | AWS infrastructure, IaC, FinOps, environment provisioning |
| 6 | [amadeus-compliance-agent](compliance-agent.md) | GRC, regulatory mapping, data classification, risk |
| 7 | [amadeus-devsecops-agent](devsecops-agent.md) | Threat modelling, security pipeline, secure design review |
| 8 | [amadeus-developer-agent](developer-agent.md) | Code generation, workspace detection, reverse engineering |
| 9 | [amadeus-quality-agent](quality-agent.md) | Test strategy, test generation, performance validation |
| 10 | [amadeus-pipeline-deploy-agent](pipeline-deploy-agent.md) | CI/CD pipelines, deployment strategy, release execution |
| 11 | [amadeus-operations-agent](operations-agent.md) | Observability, incident response, feedback loops |
| 12 | amadeus-product-lead-agent | Review-only: requirements / user-story / UX quality gate (sonnet) |
| 13 | amadeus-architecture-reviewer-agent | Review-only: technical-design soundness / implementability gate (sonnet) |

---

## Shared Configuration

All 14 agents share a common configuration baseline defined in their frontmatter. None declares a `tools:` allowlist, so every agent inherits the **full session toolset** — all of Claude Code's built-in tools plus any MCP tools provisioned to the session. The one shipped restriction is `disallowedTools: Task`.

### The session toolset (inherited by every agent)

Every agent inherits the built-in Claude Code tools, including:

| Claude Code Tool | Purpose |
|------------------|---------|
| Read | Read files from the filesystem |
| Edit | Perform exact string replacements in files |
| Write | Write files to the filesystem |
| Glob | Fast file pattern matching |
| Grep | Content search using ripgrep |
| AskUserQuestion | Interactive user prompts (main-thread stages only) |

### Common Disallowed Claude Code Tools

| Claude Code Tool | Reason |
|------------------|--------|
| Task | Agents operate as delegated workers. The conductor (the live `/amadeus` session) performs the `Task` call that runs an agent; agents themselves never spawn subagents. `disallowedTools: Task` avoids cascading subagent chains. |

### Tools each persona is expected to exercise

Every agent *can* reach Bash and WebSearch by inheritance; the table records which personas the methodology **expects** to use them, not a per-agent grant. To genuinely restrict a persona, add an optional `tools:` allowlist (which drops inherited MCP unless `mcp__<server>__<tool>` ids are also listed) — this implementation ships no such restrictions.

| Claude Code Tool | Expected to exercise it |
|------------------|---------------------|
| Bash | amadeus-aws-platform-agent, amadeus-devsecops-agent, amadeus-developer-agent, amadeus-quality-agent, amadeus-pipeline-deploy-agent, amadeus-operations-agent |
| WebSearch | amadeus-product-agent, amadeus-design-agent, amadeus-compliance-agent |

### Model Overrides

| Model | Agents |
|-------|--------|
| opus | amadeus-architect-agent, amadeus-product-agent, amadeus-design-agent, amadeus-developer-agent, amadeus-quality-agent, amadeus-devsecops-agent, amadeus-compliance-agent, amadeus-aws-platform-agent |
| sonnet | amadeus-delivery-agent, amadeus-pipeline-deploy-agent, amadeus-operations-agent |

Opus is the default. An agent uses sonnet only when its output is dominantly
templated — delivery plans, CI/CD YAML, observability and runbook scaffolding —
and the methodology is already encoded in the agent's knowledge files.

The eight opus agents share one property: their work requires high-judgment,
multi-constraint reasoning whose decisions cascade downstream. Architectural
boundaries, interpretation of ambiguous intent, UX trade-offs, code synthesis
under dense context, risk-based test strategy, threat prioritisation,
regulatory edge-cases, and cloud architecture trade-offs all fall in this
category.

---

## Agent Summary Table

| Agent | Lead Stages | Support Stages | Model | Tools Expected to Exercise |
|-------|-------------|----------------|-------|------------------------------|
| [amadeus-product-agent](product-agent.md) | intent-capture, market-research, scope-definition, requirements-analysis, user-stories | rough-mockups, approval-handoff, refined-mockups | opus | WebSearch |
| [amadeus-design-agent](design-agent.md) | rough-mockups, refined-mockups | user-stories, application-design | opus | WebSearch |
| [amadeus-delivery-agent](delivery-agent.md) | team-formation, approval-handoff, delivery-planning | scope-definition, units-generation | sonnet | -- |
| [amadeus-architect-agent](architect-agent.md) | feasibility, application-design, units-generation, functional-design, nfr-requirements, nfr-design | intent-capture, reverse-engineering (synthesis), delivery-planning | opus | -- |
| [amadeus-aws-platform-agent](aws-platform-agent.md) | infrastructure-design, environment-provisioning | feasibility, application-design, nfr-design, feedback-optimization | opus | Bash |
| [amadeus-compliance-agent](compliance-agent.md) | (none) | feasibility, nfr-requirements, infrastructure-design, environment-provisioning | opus | WebSearch |
| [amadeus-devsecops-agent](devsecops-agent.md) | (none) | practices-discovery, nfr-requirements, infrastructure-design, build-and-test, environment-provisioning | opus | Bash |
| [amadeus-developer-agent](developer-agent.md) | reverse-engineering (code scan), code-generation | practices-discovery, functional-design, deployment-execution | opus | Bash |
| [amadeus-quality-agent](quality-agent.md) | build-and-test, performance-validation | practices-discovery, nfr-requirements | opus | Bash |
| [amadeus-pipeline-deploy-agent](pipeline-deploy-agent.md) | practices-discovery, ci-pipeline, deployment-pipeline, deployment-execution | (none) | sonnet | Bash |
| [amadeus-operations-agent](operations-agent.md) | observability-setup, incident-response, feedback-optimization | (none) | sonnet | Bash |

---

## Agent Comparison Matrix

| Agent | Bash | WebSearch | Opus Model | Lead Stages | Support Stages | Total Stage Involvement |
|-------|------|-----------|------------|-------------|----------------|-------------------------|
| amadeus-product-agent | No | Yes | Yes | 5 | 3 | 8 |
| amadeus-design-agent | No | Yes | Yes | 2 | 2 | 4 |
| amadeus-delivery-agent | No | No | No | 3 | 2 | 5 |
| amadeus-architect-agent | No | No | Yes | 6 | 3 | 9 |
| amadeus-aws-platform-agent | Yes | No | Yes | 2 | 4 | 6 |
| amadeus-compliance-agent | No | Yes | Yes | 0 | 4 | 4 |
| amadeus-devsecops-agent | Yes | No | Yes | 0 | 5 | 5 |
| amadeus-developer-agent | Yes | No | Yes | 2 | 3 | 5 |
| amadeus-quality-agent | Yes | No | Yes | 2 | 2 | 4 |
| amadeus-pipeline-deploy-agent | Yes | No | No | 4 | 0 | 4 |
| amadeus-operations-agent | Yes | No | No | 3 | 0 | 3 |

**Observations:**
- The amadeus-architect-agent has the broadest stage involvement (9 stages across 3 phases), reflecting its role as the central design authority.
- Eight of 11 agents run on opus; the three sonnet agents (delivery, pipeline-deploy, operations) produce dominantly templated planning, CI/CD, and runbook output where methodology is already encoded in knowledge files.
- The amadeus-compliance-agent operates purely in an advisory capacity (4 support stages across Ideation, Construction, and Operation; no lead stages).
- Six of 11 agents have Bash access, all in roles that need CLI interaction (infrastructure, security, development, testing, deployment, operations).
- Three agents have WebSearch access for research tasks (product, design, compliance).

---

## Phase Participation

This table shows which agents are active in which phases, and whether they
serve as lead (L) or support (S) in that phase.

| Agent | Initialization (Phase 0) | Ideation (Phase 1) | Inception (Phase 2) | Construction (Phase 3) | Operation (Phase 4) |
|-------|--------------------------|---------------------|---------------------|------------------------|---------------------|
| amadeus-product-agent | -- | L (intent-capture, market-research, scope-definition), S (rough-mockups, approval-handoff) | L (requirements-analysis, user-stories), S (refined-mockups) | -- | -- |
| amadeus-design-agent | -- | L (rough-mockups) | L (refined-mockups), S (user-stories, application-design) | -- | -- |
| amadeus-delivery-agent | -- | L (team-formation, approval-handoff), S (scope-definition) | L (delivery-planning), S (units-generation) | -- | -- |
| amadeus-architect-agent | -- | L (feasibility), S (intent-capture) | L (application-design, units-generation), S (reverse-engineering, delivery-planning) | L (functional-design, nfr-requirements, nfr-design) | -- |
| amadeus-aws-platform-agent | -- | S (feasibility) | S (application-design) | L (infrastructure-design), S (nfr-design) | L (environment-provisioning), S (feedback-optimization) |
| amadeus-compliance-agent | -- | S (feasibility) | -- | S (nfr-requirements, infrastructure-design) | S (environment-provisioning) |
| amadeus-devsecops-agent | -- | -- | S (practices-discovery) | S (nfr-requirements, infrastructure-design, build-and-test) | S (environment-provisioning) |
| amadeus-developer-agent | -- | -- | L (reverse-engineering), S (practices-discovery) | L (code-generation), S (functional-design) | S (deployment-execution) |
| amadeus-quality-agent | -- | -- | S (practices-discovery) | L (build-and-test), S (nfr-requirements) | L (performance-validation) |
| amadeus-pipeline-deploy-agent | -- | -- | L (practices-discovery) | L (ci-pipeline) | L (deployment-pipeline, deployment-execution) |
| amadeus-operations-agent | -- | -- | -- | -- | L (observability-setup, incident-response, feedback-optimization) |

---

## Agent Collaboration Map

```mermaid
graph TD
    subgraph "Ideation & Inception"
        PA[amadeus-product-agent]
        DA[amadeus-design-agent]
        DL[amadeus-delivery-agent]
        AA[amadeus-architect-agent]
        CA[amadeus-compliance-agent]
    end

    subgraph "Construction"
        DEV[amadeus-developer-agent]
        QA[amadeus-quality-agent]
        SEC[amadeus-devsecops-agent]
        AWS[amadeus-aws-platform-agent]
    end

    subgraph "Operation"
        PD[amadeus-pipeline-deploy-agent]
        OPS[amadeus-operations-agent]
    end

    PA -- "requirements, stories, intent" --> AA
    PA -- "personas, intent" --> DA
    PA -- "priorities, scope" --> DL
    DA -- "interaction specs" --> DEV
    DA -- "UX acceptance criteria" --> QA
    AA -- "unit specs, API contracts" --> DEV
    AA -- "NFR targets, test boundaries" --> QA
    AA -- "infrastructure requirements" --> AWS
    AA -- "design for review" --> SEC
    CA -. "regulatory constraints" .-> AA
    CA -. "compliance controls" .-> SEC
    SEC -. "security gates" .-> PD
    SEC -. "secure coding requirements" .-> DEV
    SEC -. "security test cases" .-> QA
    DL -- "delivery plan, mob assignments" --> DEV
    DEV -- "code scan results" --> AA
    DEV -- "implemented code" --> QA
    DEV -- "build scripts, source" --> PD
    QA -- "test suites, quality gates" --> PD
    QA -- "performance baselines" --> OPS
    AWS -- "environment endpoints" --> PD
    AWS -- "provisioned infra" --> OPS
    PD -- "deployed services" --> OPS
    OPS -- "operational feedback" --> PA
    OPS -. "architecture improvements" .-> AA
    AWS -. "cost optimization" .-> OPS
```

### Text Fallback

```
amadeus-product-agent
  |-- requirements, stories --> amadeus-architect-agent
  |-- personas, intent -------> amadeus-design-agent
  |-- priorities, scope ------> amadeus-delivery-agent

amadeus-design-agent
  |-- interaction specs ------> amadeus-developer-agent
  |-- UX acceptance criteria -> amadeus-quality-agent

amadeus-architect-agent
  |-- unit specs, API contracts --> amadeus-developer-agent
  |-- NFR targets, test boundaries --> amadeus-quality-agent
  |-- infrastructure requirements --> amadeus-aws-platform-agent
  |-- design for review -----------> amadeus-devsecops-agent

amadeus-compliance-agent
  |-- regulatory constraints ....> amadeus-architect-agent
  |-- compliance controls .......> amadeus-devsecops-agent

amadeus-devsecops-agent
  |-- security gates ............> amadeus-pipeline-deploy-agent
  |-- secure coding requirements > amadeus-developer-agent
  |-- security test cases .......> amadeus-quality-agent

amadeus-delivery-agent
  |-- delivery plan, mob assignments --> amadeus-developer-agent

amadeus-developer-agent
  |-- code scan results --> amadeus-architect-agent
  |-- implemented code ---> amadeus-quality-agent
  |-- build scripts ------> amadeus-pipeline-deploy-agent

amadeus-quality-agent
  |-- test suites, quality gates --> amadeus-pipeline-deploy-agent
  |-- performance baselines ------> amadeus-operations-agent

amadeus-aws-platform-agent
  |-- environment endpoints --> amadeus-pipeline-deploy-agent
  |-- provisioned infra -----> amadeus-operations-agent

amadeus-pipeline-deploy-agent
  |-- deployed services --> amadeus-operations-agent

amadeus-operations-agent
  |-- operational feedback -------> amadeus-product-agent  (CLOSES THE LOOP)
  |-- architecture improvements .> amadeus-architect-agent
```

---

## Cross-References

- [Architecture Overview](../01-architecture.md)
- [Orchestrator](../03-orchestrator.md)
- [Agent System](../05-agent-system.md)
- [Stage Documentation](../04-stages/)
- [Agents chapter in the User Guide (philosophy and rationale)](../../guide/06-agents.md)
- [SKILL.md (Conductor)](../../../dist/claude/.claude/skills/amadeus/SKILL.md) -- the forwarding loop that acts on engine directives; carries a human-readable stage-graph mirror
