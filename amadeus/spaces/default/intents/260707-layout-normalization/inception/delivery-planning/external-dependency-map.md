# External Dependency Map

## Upstream Trace

この map は `requirements`, `components`, `unit-of-work`, `unit-of-work-dependency`, `unit-of-work-story-map`, `team-practices` を根拠にする。

## External Dependencies

| Dependency | Owner | Blocks | Lead time | Mitigation |
| --- | --- | --- | --- | --- |
| `packages/setup` sibling intent | separate parallel intent | does not block Bolt 1 or Bolt 2 | unknown | Treat as coordination point only; do not implement setup here |
| GitHub issue #610 context | repository maintainers | Bolt 1 | already available | Design record references issue scope and acceptance criteria |
| CI/runtime credentials | none required | none | none | Work is docs/design-focused; validation uses local/CI-safe commands |

## Non-Dependencies

- No AWS account or cloud environment is required.
- No UI/mockup approval is required.
- No external API/data availability is required.
- No npm publish access is required.

## Gate Items

Human approval is required at the end of Delivery Planning before entering Construction. If Construction proceeds, Bolt 1 may require a human decision on the final ADR/design record path.
