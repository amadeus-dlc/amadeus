# Unit Test Instructions — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## 対象と実行

- Bolt 2(#1711)契約改訂: `bun test tests/unit/t186-foreach-per-unit-iteration.test.ts tests/unit/t116-directive-path-resolution.test.ts` — degrade 経路の解決 emit / fail-closed / --single 免除維持をピン(仕様裁定 Q1=A に基づく契約変更)。
- 関連回帰: `bun test tests/unit/t118*.test.ts`(gate/routing の unit dir seed 済み assert)。

## 実測

worktree 最終形(3e9fd02ae)で 0 fail(t116+t118+t247+ratchet = 68 tests / 292 assertions)。typecheck exit 0、lint exit 0。
