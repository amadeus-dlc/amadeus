# Question Rendering — Codex harness annex

This file defines how the **Codex** harness renders the structured questions
that `amadeus-common/protocols/stage-protocol.md` § "Structured questions"
requires. The protocol and stage files are harness-neutral: they say *present
a structured question* and carry a fenced ` ```question ` spec block.
`question-rendering.md` is the Claude Code harness binding for that same
contract; this file is the Codex counterpart.

## Shared rules

Two sections of `question-rendering.md` are harness-neutral and apply here
unchanged, without duplication:

- **Display language** — the user-facing prompt, label, and description are
  shown in the conversation language; machine-readable records (mode
  dispatch, `[Answer]:` write-back, `amadeus-log.ts` entries, the engine
  report) stay in the canonical English label. `[Answer]:` pairs the
  canonical label with its display translation.
- **The one-question-per-call interview pattern** — one question per tool
  call, recommended option first with a recommendation marker, rationale in
  prose, the existing split rule for option overflow, and the built-in
  free-text escape. Defined once, harness-neutral, in `question-rendering.md`.

This annex only defines what's Codex-specific: the mechanism, the enablement
gate, and how mode selection, the interview pattern, and the text fallback
differ here from Claude Code.

## Mechanism

On Codex, a structured question renders via the **`request_user_input`**
tool. Map the spec fields:

| Spec field | `request_user_input` field |
|------------|-----------------------------|
| `prompt` | question text |
| `header` | question header |
| `options[].label` | option label |
| `options[].description` | option description |
| (n/a — always available) | `custom` free-text option |

## Enablement

`request_user_input` is gated by `experimental_request_user_input` under
`[tools]` in `config.toml`. It is **disabled by default** — before relying on
it, confirm the human has opted in (or has confirmed the tool is available in
this session). It is **not available under `codex exec`**: non-interactive
runs report "request_user_input is not supported in exec mode". When the tool
is unavailable for either reason, follow Text fallback below instead of this
mechanism.

## Mode selection

`request_user_input` accepts 1-3 questions per call, 2-3 options plus a
custom option per question — fewer than the Claude Code annex's 4-option
mode selection. Fold Guide me / Grill me / I'll edit the file into the 3
listed options, and route Chat through the custom option:

```question
prompt: "I've created [N] questions at `[file path]`. How would you like to answer them? (Type a custom answer to discuss freely instead.)"
header: Questions
options:
  - label: Guide me
    description: Walk through each question interactively here
  - label: Grill me
    description: One question at a time, recommended answer attached
  - label: I'll edit the file
    description: I'll fill in the answers in the file directly
```

State in the question body (as above) that a custom/free-text reply starts a
Chat-style discussion — Chat has no dedicated option on Codex, it is
reachable only through the custom option.

## Grill me

Grill me follows the harness-neutral rules in `question-rendering.md` §
"Grill me rendering rules": one question per `request_user_input` call,
recommended option first with a recommendation marker, rationale in the
question body. Each call offers 2-3 options plus a custom option; custom is
the "I'd like to discuss this more" / free-text escape for that question.
Decision/answer audit logging and the `[Answer]:` write-back (canonical
label + display translation) are unchanged from the existing procedure in
`../../amadeus-grilling/references/engine-bridge.md`.

## Text fallback

When `experimental_request_user_input` is not enabled, or the agent is
running under `codex exec`, present every structured question as plain text
instead of a tool call:

- One question per message — never batch multiple questions into one
  message; wait for the reply before sending the next question.
- Letter the options A, B, C, … and always end with `X. Other (please
  specify)`.
- Put the recommended option first and append its recommendation marker
  (conversation language) to the label.
- Include a reply instruction telling the human they can answer with the
  option's letter or its exact label.
- Record the answer under its canonical label regardless of whether the
  human replied with a letter, a display-translated label, or free text —
  and pair the canonical label with the display translation in the
  `[Answer]:` write-back, per `question-rendering.md` § "Display language".
