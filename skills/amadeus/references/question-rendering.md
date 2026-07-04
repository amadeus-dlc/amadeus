# Question Rendering — Claude Code harness annex

This file defines how THIS harness renders the structured questions that
`amadeus-common/protocols/stage-protocol.md` § "Structured questions" requires.
The protocol and stage files are harness-neutral: they say *present a
structured question* and carry a fenced ` ```question ` spec block. This annex
is the one place that binds that contract to a concrete mechanism.

## Harness routing

This annex defines the **Claude Code** binding. On **Codex**, the
harness-specific binding lives in `question-rendering-codex.md` (same
directory as this file). Sections marked "harness-neutral" below (the
Display language section, and the interview rendering rules further down)
apply to every harness: Claude Code and Codex each follow them within their
own tool-call mechanism.

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

## Display language (harness-neutral)

The user-facing prompt and the `label`/`description` of every structured
question — the mode selection below, a gate approval, or a stage question
presented interactively — are shown to the human in the **conversation
language** of the current session (the language the human is chatting in).

Machine-readable records and branching stay in the **canonical English
label**, never the display translation: mode dispatch, the `[Answer]:`
write-back tag, `amadeus-log.ts decision`/`answer` entries, and the
`--user-input` value reported to the engine all use the canonical label.

When writing an `[Answer]:` entry, pair the canonical label with its display
translation — e.g. `[Answer]: Approve (承認)` — never the translation alone.

This section, the spec block, and this annex's own prose stay in English
(Skill Language Policy): it is an English-written instruction that governs
runtime display in whatever the conversation language happens to be, not a
translation of the annex itself.

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

### Grill me rendering rules

The bullets above are the Claude Code binding. This section restates them as
harness-neutral rendering rules that every harness follows for Grill me, each
within its own tool-call mechanism (see `question-rendering-codex.md` for the
Codex binding):

- **One question per tool call.** Load exactly one question per tool call —
  never batch multiple questions into a single call. This section requires
  one question per tool call on every harness; on Claude Code that means one
  question per `AskUserQuestion` call.
- **Recommendation first.** The recommended answer is the first option, and
  its label carries a recommendation marker in the conversation language
  (e.g. a Japanese conversation appends "（推奨）" to the label).
- **Rationale in prose.** The recommendation's rationale, and why the
  decision matters now, is stated in the question body or in the prose
  immediately before the tool call — not squeezed into an option
  description, which stays a short supplement.
- **Split rule.** When a question's option count exceeds the harness's
  per-call limit, this annex reuses the existing split rule (options A-D,
  then E+) from "Harness-specific behaviors" below.
- **Free-text escape.** "I'd like to discuss this more" and other free text
  route through the harness's built-in escape — Claude Code's built-in Other
  option, Codex's custom option.
- **Logging and write-back are unchanged.** Decision/answer audit logging and
  the `[Answer]:` write-back (canonical label + display translation, see
  Display language above) follow the existing procedure unchanged.

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
