# Integration Test Instructions — parser-checkbox-fixes

- 新規: `tests/integration/t-practices-promote-contract.test.ts`(#1013 — 実 CLI spawn の exit 非0+無書き込み契約、in-process 配線駆動、落ちる実証ケース F/G/H)
- 新規: `tests/integration/t-scope-change-checkbox-preserve.test.ts`(#1015 — [?]/[R] 保存+6状態ヘッダ、dist 経由 in-process 駆動)
- 回帰確認: `tests/integration/t75.test.ts`(practices-promote 既存契約)
- 実行: `bun test tests/integration/t-practices-promote-contract.test.ts tests/integration/t-scope-change-checkbox-preserve.test.ts tests/integration/t75.test.ts`
