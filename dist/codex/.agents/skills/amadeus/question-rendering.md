# Question Rendering — Codex CLI harness annex

This file defines how THIS harness renders the structured questions that
`amadeus-common/protocols/stage-protocol.md` § "Structured questions" requires.
The protocol and stage files are harness-neutral: they say *present a
structured question* and carry a fenced ` ```question ` spec block. This annex
is the one place that binds that contract to a concrete mechanism.

## Mechanism — numbered prose only

Codex Amadeus questions and gates MUST use numbered prose. **MUST NOT call `request_user_input`**,
even when that built-in tool appears in the session.
Codex's PostToolUse hook surface does not observe the built-in question tool,
so a reply there cannot mint the auditable `HUMAN_TURN` required by the
human-presence guard. A prose reply returns as `UserPromptSubmit`; the shipped
Codex adapter can therefore mint exactly one `HUMAN_TURN` for it.

Render the spec as numbered prose options and let the user answer with a number
or free text:

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

becomes:

```
**Approval** — [Stage Name] complete. How would you like to proceed?

1. **Approve** — Continue to [next stage]
2. **Request Changes** — Provide revision feedback
3. **Other** — describe what you want instead

Reply with a number (or just tell me).
```

## Answer capture

- Before every structured question, record the options with
  `bun .codex/tools/amadeus-log.ts decision --stage <slug> ...` as required by
  the shared stage protocol.
- After an ordinary stage/interview question, record the exact human response
  with `bun .codex/tools/amadeus-log.ts answer --stage <slug> --details
  "<exact answer>"` before presenting another question.
- An approval or rejection response is a gate resolution, not an ordinary
  question answer. **MUST NOT call `amadeus-log.ts answer` for a gate response.**
  This harness-specific rule overrides any harness-neutral protocol or stage
  instruction that says to log an answer after an approval-gate response.
  On approval, call
  `bun .codex/tools/amadeus-orchestrate.ts report --stage <slug> --result
  approved --user-input "<exact choice>"` directly. The report emits
  `GATE_APPROVED` and consumes that reply's `HUMAN_TURN` exactly once. On
  request-changes, use the shared rejection path directly for the same reason.

## Rendering rules

- **No emergent options**: render exactly the spec's options plus the `Other`
  escape. The NO EMERGENT BEHAVIOR rule applies to the rendering, not just the
  spec.
- Put the recommended option first and append "(Recommended)" to its label.
- **multiSelect: true** → say "Reply with all numbers that apply (e.g. 1, 3)."
- A free-text reply that clearly matches an option counts as that option;
  anything else is an "Other" answer — treat it per the protocol (discuss,
  then re-ask for a final pick).
- Preserve the exact option label or free text in audit and `--user-input`;
  never summarize User Input.
- Gate semantics live in the ENGINE — rendering never decides; the user's
  answer rides back on `report --user-input "<exact label>"`.
