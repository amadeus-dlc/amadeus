---
name: amadeus-grilling
description: >
  Read-only grilling interview. Relentlessly interviews you about a plan,
  design, or file — one question at a time, each with a recommended answer —
  until you and the agent reach a shared understanding. Facts are looked up
  in the codebase; only decisions are put to you. Use when you want to
  stress-test a plan or design before building. Never advances the workflow
  stage pointer, never emits audit events, never writes files unless you
  explicitly ask for the summary to be saved.
argument-hint: "<file-or-topic>"
user-invocable: true
classification: read-only
---

<!-- Adapted from Matt Pocock's "grilling" skill (mattpocock/skills, MIT) — see the attribution header in .kiro/amadeus-common/protocols/grilling-protocol.md -->

# Amadeus Grilling

## Purpose

Interview the user relentlessly about every aspect of a plan, design, or
decision space until agent and user reach a shared understanding — one
question at a time, each with a recommended answer and its rationale.

The discipline is defined ONCE, in
`.kiro/amadeus-common/protocols/grilling-protocol.md` (§1 Dialogue
Discipline, §2 The Grilling Loop, §3 Question Spec Templates). Read that file
first and follow it exactly. This skill adds only the standalone-specific
rules below — it does not re-define the discipline.

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
2. **Discipline** is the protocol's §1 and §2 in full: one question at a
   time, recommended answer with rationale, facts self-researched with only
   decisions asked, estimates confirmed with a confidence level, hybrid
   termination ("done" at any time; continuation check at the depth
   guideline), and an explicitly confirmed agreement summary before closing.
3. **Output is terminal-only.** Print the agreement summary (the full
   question → decision table) to the terminal. Write it to a file ONLY when
   the user explicitly asks for it to be saved to a path (e.g. "save the
   summary to docs/plan-review.md") — the same explicit-request exception
   `/amadeus-outcomes-pack` uses. Never write anywhere unprompted.
4. **No enactment.** Do not start implementing the plan under discussion.
   The skill ends at the confirmed summary; acting on it is a separate,
   user-initiated step.
