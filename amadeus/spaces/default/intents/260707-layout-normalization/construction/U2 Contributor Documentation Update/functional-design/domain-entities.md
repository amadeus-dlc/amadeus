# Domain Entities — U2 Contributor Documentation Update

## Upstream Trace

この entity 定義は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を元にする。

## Entities

| Entity | Attributes | Lifecycle |
| --- | --- | --- |
| Documentation Section | file, heading, current message, target message | located -> edited -> reviewed |
| Contributor Mental Model | source zone, generated zone, package zone | implicit -> documented -> maintained |
| Install Example | harness, source path, target path | verified -> preserved/updated |
| Layout Terminology | term, definition, allowed usage | drafted -> normalized -> reused |

## Relationships

- Documentation Section expresses Contributor Mental Model.
- Install Example depends on `dist/` public install contract.
- Layout Terminology must match U1 Design Decision.

## State Invariants

- Contributor Mental Model must distinguish authored source from generated output.
- Install Example must not point at package-local `dist/` unless U1 changes the `dist/` decision.
- Layout Terminology must not imply `packages/setup` is implemented here.
