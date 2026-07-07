# Domain Entities — U3 Guard Validation Plan

## Upstream Trace

この entity 定義は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を元にする。

## Entities

| Entity | Attributes | Lifecycle |
| --- | --- | --- |
| Validation Command | command, purpose, required_when, expected_result | selected -> run/skipped-with-reason -> recorded |
| Guarded Surface | path, owner, guard command | identified -> mapped -> protected |
| Validation Result | command, exit status, summary, timestamp | captured -> reported |
| Skip Rationale | command, reason, risk | drafted -> reviewed |

## Relationships

- Guarded Surface is protected by one or more Validation Commands.
- Validation Result belongs to a Validation Command.
- Skip Rationale is allowed only when risk is documentation-only or command is not applicable.

## State Invariants

- `dist:check` and `promote:self:check` must be present as Validation Commands or explicitly marked not run with reason.
- Guarded Surface must include root `dist/*` and root `.claude/.codex/.agents`.
- Validation Result must not claim success without a command and exit status.
