# Intent Backlog

## Prioritization Method

This backlog uses MoSCoW priority plus dependency-first sequencing. Items are proto-Units for later Inception and Construction stages; they are not yet final implementation units.

## Backlog

| ID | Priority | Proto-Unit | Value | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| IB-01 | Must | Current layout and path-assumption inventory | Establishes evidence before any decision. | Intent Capture, Feasibility | Include `scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, `.claude/`, `.codex/`, `.agents`, tests, README, docs. |
| IB-02 | Must | Layout candidate comparison | Makes status quo, staged layout, and full normalization comparable. | IB-01 | Must include `packages/<name>/{core,harness,dist,scripts}` and at least one low-risk alternative if discovered. |
| IB-03 | Must | ADR / design record | Satisfies the issue's explicit decision-record requirement. | IB-01, IB-02 | Must link to GitHub issue #610. |
| IB-04 | Must | Release and drift guard preservation plan | Prevents migration from weakening package generation and self-promotion checks. | IB-01, IB-02 | Cover `dist:check`, `promote:self:check`, typecheck, lint, and test profiles. |
| IB-05 | Must | Final migration-or-no-migration recommendation | Lets maintainers decide whether to implement, defer, or close. | IB-03, IB-04 | If no migration, explain root-level `core/` / `harness/` retention. |
| IB-06 | Should | Parallel `packages/setup` coordination note | Keeps sibling intent boundaries clear. | IB-02 | Do not absorb implementation of setup package. |
| IB-07 | Should | Documentation update plan | Identifies README/docs changes required by whichever layout is selected. | IB-03 | Implementation may be follow-up if no code migration happens now. |
| IB-08 | Could | Follow-up implementation issue breakdown | Supports later migration without bloating this workflow. | IB-05 | Use only if full or staged migration is recommended. |

## Sequencing Preference

1. Inventory current path assumptions.
2. Compare candidate layouts.
3. Decide and document.
4. Plan guard-preserving migration or no-migration closure.
5. Only then consider implementation slices.

This is risk-first sequencing. It intentionally avoids moving files before the blast radius is known.

## Value Stream

```text
Issue 610
  -> clarify scope boundary
  -> inventory path assumptions
  -> compare layout candidates
  -> record decision
  -> plan migration or justify no migration
  -> enable safe implementation or issue closure
```
