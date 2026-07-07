# Scalability Requirements — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U4 is pure in-process planning. Scalability requirements focus on file count, backup operation count, target-state branch count, and maintaining deterministic output without live filesystem traversal.

## Capacity Targets

| Dimension | Requirement |
|---|---|
| Source metadata entries | plan at least 2,000 files |
| Target snapshot entries | consume at least 2,000 expected-file rows |
| Backup candidates | plan at least 500 backup operations with one timestamp |
| Target states | cover `manifest-installed`, `manual-or-unknown`, `partial`, `none`, `unsupported-layout`, `ambiguous-harness` |
| File classes | cover `owned`, `shared`, `user-preserved` |
| Parallel invocations | independent pure function calls, no shared mutable planner state |

## Scaling Triggers

U4 design must be revisited if any of these become true:

- Multiple harnesses are planned in one invocation.
- Operation plan must stream because file count exceeds in-memory planning limits.
- Backup path collision checks require live filesystem reads inside U4 rather than injected predicate.
- Rollback planning is added.
- Target state classes grow without corresponding U4 behavior.

## Concurrency Requirements

- U4 keeps no mutable global state.
- Operation timestamp is supplied per plan and shared within that plan only.
- Backup collision predicate is injected and deterministic for the plan.
- Concurrent invocations may produce the same backup timestamp, but collision handling is downstream/filesystem concern; U4 only plans within one invocation.

## Growth Guardrails

- Adding a `FileOperation` kind requires Reporter and Applier contract updates.
- Adding a target state requires explicit no-write/apply policy.
- Adding a file class requires explicit classifier and overwrite policy.
- Planner must not introduce direct filesystem/network/prompt dependencies.

## Upstream Coverage

- `business-logic-model.md`: planning inputs and workflows define scaling dimensions.
- `business-rules.md`: target state, file class, backup, and operation rules define capacity boundaries.
- `requirements.md`: FR-005, FR-006, FR-008, FR-009, FR-010, FR-011, NFR-002, NFR-003, and NFR-004 define capacity constraints.
- `technology-stack.md`: local Bun process model informs concurrency and no-daemon stance.
