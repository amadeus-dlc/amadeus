# Question Rendering — Claude Code harness annex

This file defines how THIS harness renders the structured questions that
`amadeus-common/protocols/stage-protocol.md` § "Structured questions" requires.
The protocol and stage files are harness-neutral: they say *present a
structured question* and carry a fenced ` ```question ` spec block. This annex
is the one place that binds that contract to a concrete mechanism.

## Mechanism

On Claude Code, every structured question renders via the **`AskUserQuestion`
tool**. Map the spec fields 1:1:

| Spec field | AskUserQuestion field |
|------------|----------------------|
| `prompt` | `questions[0].question` |
| `header` | `questions[0].header` |
| `multiSelect` | `questions[0].multiSelect` |
| `options[].label` | `questions[0].options[].label` |
| `options[].description` | `questions[0].options[].description` |

Example — this spec:

```question
prompt: "[Stage Name] complete. How would you like to proceed?"
header: Approval
multiSelect: false
options:
  - label: Approve
    description: Continue to [next stage]
  - label: Request Changes
    description: Provide revision feedback
```

renders as:

```
AskUserQuestion({
  questions: [{
    question: "[Stage Name] complete. How would you like to proceed?",
    header: "Approval",
    multiSelect: false,
    options: [
      { label: "Approve", description: "Continue to [next stage]" },
      { label: "Request Changes", description: "Provide revision feedback" }
    ]
  }]
})
```

## Mode selection (Guide me / Grill me / I'll edit the file / Chat)

`amadeus-common/protocols/stage-protocol.md` § "Question flow" Step 2 offers the
user a choice of interaction mode when a `<stage>-questions.md` file has been
created. On Claude Code, render that choice as a 4-option `AskUserQuestion`,
in this exact order — Guide me stays first and is the default:

```question
prompt: "I've created [N] questions at `[file path]`. How would you like to answer them?"
header: Questions
multiSelect: false
options:
  - label: Guide me
    description: Walk through each question interactively here
  - label: Grill me
    description: One question at a time, recommended answer attached (amadeus-grilling bridge)
  - label: I'll edit the file
    description: I'll fill in the answers in the file directly
  - label: Chat
    description: Discuss freely — I'll extract decisions from our conversation
```

**Grill me** is inserted as the 2nd option, between Guide me and I'll edit the
file. Guide me / I'll edit the file / Chat keep their existing labels,
descriptions, and Step 3a/3b/3c behavior from `stage-protocol.md` unchanged.

**If the user picks Grill me**, follow the `amadeus-grilling` engine bridge
protocol defined in `../../amadeus-grilling/references/engine-bridge.md`:

- Present the questions one question at a time — never batch multiple
  questions in a single turn.
- Attach a recommended answer and its rationale to each question.
- Wait for the human's response before presenting the next question.
- Before presenting each question, log the decision with
  `bun .agents/amadeus/tools/amadeus-log.ts decision --stage <slug> --decision "<summary>" --options "<csv>"`;
  after the human responds, log the answer with
  `bun .agents/amadeus/tools/amadeus-log.ts answer --stage <slug> --details "<exact choice>"`.
- Write each confirmed answer into the `<stage>-questions.md` file using the
  `[Answer]:` tag format — the questions file remains the source of truth.

## Harness-specific behaviors

- **Batching limits**: max 4 questions per `AskUserQuestion` call, max 4
  options per question. For 5+ options, split across multiple calls (options
  A-D, then E+); the questions file retains the full option set as the
  authoritative record.
- **"Other" escape**: `AskUserQuestion` has a built-in "Other" option, always
  available — do NOT add an explicit Other option to the spec's options list
  for interactive batches. (Questions *files* still end every question with
  `X. Other (please specify)` per protocol §3 — the file format is
  harness-neutral.)
- **Answer capture**: the user's selection returns as the exact option label;
  record it verbatim (protocol: never summarize User Input).
- **Long prompts**: the question body renders at full terminal width and wraps
  gracefully (multi-line wrap verified on macOS before each release) — see
  `knowledge/amadeus-shared/worktree-info-schema.md` for the long-path fallback.
