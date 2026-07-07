# Business Rules — U1 Layout Decision Record

## Upstream Trace

この rules は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` の U1 mapping に基づく。

## Mandated Rules

- ALWAYS design record は status quo, staged mixed layout, full workspace normalization, source root abstraction first を比較する。
- ALWAYS `scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, `.claude/.codex/.agents`, docs, tests, CI の path impact を扱う。
- ALWAYS `packages/setup` は sibling intent dependency として扱い、この intent の implementation target にしない。
- ALWAYS root `dist/` を public install contract として維持する推奨理由を明記する。
- ALWAYS full workspace normalization を将来可能性として残す場合は source root abstraction を first safe slice として記録する。

## Forbidden Rules

- NEVER directory move を design record なしに正当化しない。
- NEVER `dist/<harness>/` 手編集を migration plan に含めない。
- NEVER `dist:check` と `promote:self:check` の扱いを省略しない。
- NEVER `packages/setup` が現 checkout に存在するかのように記述しない。

## Validation Rules

Design record は Issue #610 の acceptance criteria に対応していなければならない。対応が曖昧な場合、Code Generation は docs だけでなく design record を修正対象に戻す。
