# Performance Test Instructions — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。

## 実行面(本 intent の成果そのもの)

- ローカル: `bash tests/run-tests.sh --perf` — 2026-08-01 実測: 6 files / 0 failed / RESULT PASS(exit 0)
- CI: perf.yml(daily cron 47 17 UTC + workflow_dispatch)— dispatch run 30644685248 全 job success(perf-tests 1.5分 / benchmark 0.2-0.3分 ×3 / aggregate 0.2分)
- NFR-1(ii) 非退行: Tests job 中央値 505s → 415s(PASS、U4 code-summary.md の実測ブロック参照)

## 注意

perf は --ci に含まれない(本 intent の設計)。cron 初回発火は 2026-08-01 17:47 UTC に確認予定。
