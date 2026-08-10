---
name: amadeus-grilling
description: >
  Read-only grilling interview. Relentlessly interviews you about a plan,
  design, or file — round by round over the whole design tree, every question
  carrying a recommended answer — until every branch is settled and you and
  the agent reach a shared understanding. Facts are looked up in the codebase;
  only decisions are put to you. Use when you want to stress-test a plan or
  design before building. Never advances the workflow stage pointer, never
  emits audit events, never writes files unless you explicitly ask for the
  summary to be saved.
argument-hint: "<file-or-topic> [Minimal|Standard|Comprehensive|Free]"
user-invocable: true
classification: read-only
---

<!-- Adapted from Matt Pocock's "grilling" skill (mattpocock/skills, MIT) — see the attribution header in {{HARNESS_DIR}}/amadeus-common/protocols/grilling-protocol.md -->

# Amadeus Grilling

## Purpose

Interview the user relentlessly about every aspect of a plan, design, or
decision space until agent and user reach a shared understanding — the design
tree worked round by round, every question carrying a recommended answer and
its rationale.

The discipline is defined ONCE, in
`{{HARNESS_DIR}}/amadeus-common/protocols/grilling-protocol.md` (§1 the
upstream skeleton — design tree, rounds, frontier; §2 the Amadeus overlay —
pruning threshold, deferred nodes, circuit breaker; §3 Question Spec
Templates). Read that file first and follow it exactly. This skill adds only
the standalone-specific rules below — it does not re-define the discipline.

## Classification

Read-only. This skill never advances the workflow stage pointer and never
emits an audit event. It is safe to run at any point, with or without an
active workflow. The workflow-only obligations in the protocol (questions
file, `decision`/`answer` audit logging) do NOT apply here — everything
happens in the conversation.

## Standalone rules

1. **Subject** comes from the argument: a file path or a topic. If a file
   path, read it (and whatever it references) as the starting material for
   the Investigate step. If no argument was given, ask "What should I grill
   you about?" as the very first question.
2. **Discipline** is the protocol's §1 and §2 in full: the design tree worked
   in rounds, the whole pruned frontier asked per round with recommended
   answers and rationale, facts self-researched with only decisions asked,
   estimates confirmed with a confidence level, and termination when the
   pruned frontier is empty or the user says "done". Close with an explicitly
   confirmed agreement summary that lists the deferred nodes and every
   unresolved material point.
3. **Level** is the second argument and sets the pruning threshold only
   (protocol §2.2) — never a question budget. `Minimal` / `Standard` /
   `Comprehensive` prune progressively less and each arms the circuit breaker
   at 12 / 24 / 36 rendered questions (protocol §2.4). `Free` prunes nothing
   and has no breaker: every branch of the tree is visited, and the safety
   valves are the per-round gate and "done". **Default to Free when the user
   names no level** — single use matches upstream behaviour. Under Free, say
   so explicitly in the summary's deferred section ("none — Free prunes
   nothing") rather than omitting it.
4. **Output is terminal-only.** Print the agreement summary (the full
   question → decision table, the deferred nodes, and the unresolved
   material points) to the terminal.
   Write it to a file ONLY when
   the user explicitly asks for it to be saved to a path (e.g. "save the
   summary to docs/plan-review.md") — the same explicit-request exception
   `/amadeus-outcomes-pack` uses. Never write anywhere unprompted.
5. **No enactment.** Do not start implementing the plan under discussion.
   The skill ends at the confirmed summary; acting on it is a separate,
   user-initiated step.
