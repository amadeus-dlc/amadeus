# Domain Entities — U4 Follow-Up Migration Preparation

## Upstream Trace

この entity 定義は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を元にする。

## Entities

| Entity | Attributes | Lifecycle |
| --- | --- | --- |
| Follow-Up Item | title, goal, non-goal, target areas, guard commands | identified -> recorded -> deferred |
| Migration Seam | name, current coupling, proposed abstraction | discovered -> scoped -> backlog |
| Coordination Point | sibling intent, shared boundary, conflict risk | identified -> documented |
| Deferred Risk | risk, reason deferred, trigger condition | recorded -> monitored |

## Relationships

- Follow-Up Item contains one or more Migration Seams.
- Coordination Point links `packages/setup` sibling intent to future framework layout work.
- Deferred Risk explains why full normalization is not implemented in this intent.

## State Invariants

- Follow-Up Item must not assign implementation to this intent.
- Migration Seam must include guard commands, especially `dist:check` or `promote:self:check` when relevant.
- Deferred Risk must have a trigger condition for reopening.
