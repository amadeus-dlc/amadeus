# Business Rules — U3 Guard Validation Plan

## Upstream Trace

この rules は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` の U3 mapping に基づく。

## Mandated Rules

- ALWAYS `dist:check` と `promote:self:check` を layout decision の guard として扱う。
- ALWAYS code/test helper を変更する場合は `bun run typecheck` と `bun run lint` の必要性を判断する。
- ALWAYS relevant `tests/run-tests.sh` profile を、behavior impact がある場合に validation plan へ含める。
- ALWAYS validation plan は U1 design record と U2 docs update の内容に追従する。

## Forbidden Rules

- NEVER `dist/` relocation を internal-only と見なして validation を省略しない。
- NEVER self-promotion preservation を検証対象から外さない。
- NEVER command が重いという理由だけで drift guard の説明を消さない。

## Validation Rules

Validation plan は command 実行結果または実行不要理由のどちらかを残す。Build and Test stage ではこの plan を verification checklist として利用する。
