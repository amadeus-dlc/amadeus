# Performance Test Instructions

入力は `code-generation-plan.md` と `code-summary.md`。今回の requirements に latency、throughput、capacity の performance NFR はなく、長時間サービスも追加していない。

## 適用判定

専用 load/stress/soak test は非該当。`bun run test:ci` が wall-clock drift を観測し、30秒以上へ変化した test file を一覧化する既存の性能回帰面を使用する。

## 成功条件

- 機能失敗と wall-clock drift を区別する。
- drift は分類情報として記録し、assertion failure と混同しない。
- 新しい性能目標を推測して追加しない。
