# Interaction Modes

## The four modes

When a stage creates a questions file (`<stage>-questions.md`), the human is offered four ways to answer it. In Claude Code they render as a four-option choice, in this order:

- **Guide me** — walk through the questions interactively in small batches, right in the conversation.
- **Grill me** — one question at a time, with a recommended answer attached to each — the `amadeus-grilling` bridge (see [Grill me and the grilling protocol](#grill-me-and-the-grilling-protocol) below).
- **I'll edit the file** — fill in the answers directly in the questions file, then tell the conductor when you're done.
- **Chat** — discuss the topic freely; the conductor extracts decisions from the conversation as they emerge.

All four converge on the same place: whatever mode produced it, every answer is written back into the questions file's `[Answer]:` tags, which remain the single authoritative record. A human can also switch modes mid-stage — starting with Guide me and finishing the rest in Chat, for instance. The exact rendering of these options depends on the harness and is defined in the [question-rendering annex](../../skills/amadeus/references/question-rendering.md) — in Codex, for instance, three options are listed and Chat is reached through the free-text custom option rather than a dedicated one.

## Grill me and the grilling protocol

Picking Grill me hands the question flow to the `amadeus-grilling` bridge protocol. Questions are presented one at a time, never batched: each carries a recommended answer and the reasoning behind it, and the conductor waits for the human's response before moving to the next question. This is the same discipline the [amadeus-grilling skill](../../skills/amadeus-grilling/SKILL.md) follows everywhere else it is invoked — research the codebase and existing artifacts first, ask only what still needs human judgment, and always attach a recommendation.

## The questions file

Every stage's questions live in a single file, `<stage>-questions.md`, co-located with the stage's other artifacts. Each question ends with options A through E as appropriate, plus a mandatory final option, `X. Other (please specify)`, and a blank `[Answer]: ` tag beneath it. Whichever mode answers a question, the answer lands in that question's `[Answer]:` tag — the file is always the source of truth, regardless of how the conversation went. A stage cannot proceed while any tag is still blank.

## Modes and gates

Choosing an interaction mode happens *during* a stage, while its questions are still open — it decides how the human answers, not whether the resulting artifact is accepted. The approval gate is a separate, later step: once the stage produces its artifact (and, if a reviewer is declared, once the reviewer has weighed in), the human is asked to Approve or Request Changes on the artifact itself. See the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) for the gate contract in full.

The protocol layer underneath these four modes (`.agents/amadeus/amadeus-common/protocols/stage-protocol.md`) defines only three: Guide me, I'll edit the file, and Chat. The harness inserts Grill me as the second option, producing the four the human actually sees.

## Next steps

Interaction modes govern how a stage's questions get answered; the agents doing the asking and building were covered in the previous chapter, [Agents](06-agents.md). See the [guide index](index.md) for the full chapter list and what has been published so far.
