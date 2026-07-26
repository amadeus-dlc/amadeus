# Question Rendering — Kimi Code harness annex

This file defines how THIS harness renders the structured questions that
`amadeus-common/protocols/stage-protocol.md` § "Structured questions" requires.
The protocol and stage files are harness-neutral: they say *present a
structured question* and carry a fenced ` ```question ` spec block. This annex
is the one place that binds that contract to a concrete mechanism.

## Mechanism — `AskUserQuestion`, with a numbered-prose fallback

On Kimi Code, every structured question renders via the **`AskUserQuestion`
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

**Fallback — numbered prose.** When `AskUserQuestion` is unavailable (auto
permission mode, or a headless `kimi -p` run), render the SAME spec as
numbered prose options and let the user answer with a number or free text:

```
**Approval** — [Stage Name] complete. How would you like to proceed?

1. **Approve** — Continue to [next stage]
2. **Request Changes** — Provide revision feedback
3. **Other** — describe what you want instead

Reply with a number (or just tell me).
```

Both paths are presence-safe: the shipped wiring mints exactly one
`HUMAN_TURN` for an `AskUserQuestion` reply (`PostToolUse`) AND for a prose
reply (`UserPromptSubmit`) — the two events route to the same `mint` target,
so the human-presence guard holds on either rendering. Never render the same
question in both forms for one turn.

## Answer capture

- Before every structured question, record the options with
  `bun .kimi-code/tools/amadeus-log.ts decision --stage <slug> ...` as required
  by the shared stage protocol.
- After an ordinary stage/interview question, record the exact human response
  with `bun .kimi-code/tools/amadeus-log.ts answer --stage <slug> --details
  "<exact answer>"` before presenting another question.
- An approval or rejection response is a gate resolution, not an ordinary
  question answer. **MUST NOT call `amadeus-log.ts answer` for a gate
  response.** This harness-specific rule overrides any harness-neutral
  protocol or stage instruction that says to log an answer after an
  approval-gate response. On approval, call
  `bun .kimi-code/tools/amadeus-orchestrate.ts report --stage <slug> --result
  approved --user-input "<exact choice>"` directly. The report emits
  `GATE_APPROVED` and consumes that reply's `HUMAN_TURN` exactly once. On
  request-changes, use the shared rejection path directly for the same reason.

## Rendering rules

- **No emergent options**: render exactly the spec's options. `AskUserQuestion`
  carries a built-in "Other" escape — do NOT add an explicit Other option to
  the tool call's options list; the numbered-prose fallback adds its own
  `Other` line instead. (Questions *files* still end every question with
  `X. Other (please specify)` per protocol §3 — the file format is
  harness-neutral.) The NO EMERGENT BEHAVIOR rule applies to the rendering,
  not just the spec.
- Put the recommended option first and append "(Recommended)" to its label.
- **multiSelect: true** → say "Reply with all numbers that apply (e.g. 1, 3)"
  in the numbered-prose fallback; the tool renders its own multi-select UI.
- A free-text reply that clearly matches an option counts as that option;
  anything else is an "Other" answer — treat it per the protocol (discuss,
  then re-ask for a final pick).
- Preserve the exact option label or free text in audit and `--user-input`;
  never summarize User Input.
- Gate semantics live in the ENGINE — rendering never decides. For an `ask`
  directive, the user's answer rides back with exactly
  `bun .kimi-code/tools/amadeus-orchestrate.ts report --user-input "<exact label>"`;
  do not add `--result` or `--stage`.
