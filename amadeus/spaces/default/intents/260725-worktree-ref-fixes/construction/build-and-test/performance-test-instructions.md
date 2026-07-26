# Performance Test Instructions — 260725-worktree-ref-fixes

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-summary.md` の変更面(hook 起動行・解決 ladder)に対する性能面の検討を記録する。

## 判定

本 intent は性能要件を持たない(requirements.md に性能 NFR なし)。専用の性能テストは **N/A(反証可能な根拠: 変更は hook のパス解決 1 関数+テスト helper+起動行の引用形で、ホットパス・ループ・I/O 量に変化なし)**。

## 代替観測

- t257 系の既存 performance contract(p95/RSS/growth)はフルスイートで green を維持 — helper 差し替えが性能テスト自体を壊していないことの実測
- reviewer 観測の growth-ratio flake は負荷起因で単独再実行 green(本変更外)
