<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-08T06:27:22Z — second user correction: Rev.2 had pushed ALL behavior onto companion namespaces (static-style, first-arg receivers), which is NOT the style — the type itself declares instance methods (implemented by internal factory + closure, frozen literals) and the companion holds only statics (parse/build/collection ops). Rev.3 applied after presenting a concrete code example and getting explicit user confirmation; domain-entities.md, business-logic-model.md, component-methods.md all revised
- 2026-07-08T06:22:28Z — user correction mid-unit (setup-foundation): domain objects were anemic (bare type aliases + external utility functions) violating Tell-Don't-Ask; adopted the functional-domain-modeling-ts team style (type + companion namespace, smart constructors, discriminated-union Result), added the adoption pointer rule to project.md Code Style per the guide's 適用条件, and revised domain-entities.md (Rev.2), business-logic-model.md (Rev.2), and the frozen contract application-design/component-methods.md (Rev.2). Manifest.dispositionFor now owns the FR-008 decision instead of planner-side branching. Reviewer pass 1 (dispatched against Rev.1) was stopped; re-dispatching against Rev.2
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
