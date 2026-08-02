# Integration Test Instructions — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象(code-summary.md の FR-3 / FR-6)

1. `bun test tests/integration/t413-self-scope-face-parity.test.ts` — **CI blocking の常設ガード**(3検査: self-* 4 scope の5面存在 / 共有 stage キーのセル一致 / prose byte 一致)
2. `bun test tests/integration/t-self-scope-consistency-sensor.test.ts` — センサー値比較の落ちる実証(cell-mismatch / body-mismatch)+corpus sweep(実リポジトリ5面 findings 0)+既存6テスト
3. `bun test tests/integration/t89.test.ts tests/integration/t93.test.ts` — sensor id pin の非破壊確認(NFR)

## 全体回帰

`bash tests/run-tests.sh --ci` 相当は bolt ブランチで `bun run coverage:ci` として実行済み(9962 assertions / 0 failed — code-summary.md 検証表)。
