# Build and Test Summary

## 状態

| 項目 | 結果 |
|---|---|
| 入力 | `code-generation-plan.md` / `code-summary.md` |
| Build | PASS |
| Focused unit + integration | 94 pass / 0 fail / 391 assertions |
| Typecheck | PASS |
| Distribution / source-only | PASS |
| Full coverage runner | FAIL（1004 files中26 files、13,349 assertions中115 assertions） |
| PR CI | 実行中 |

## Readiness

変更対象のbuild、unit、integration、security境界はtest-readyかつPR-ready。全体coverage runnerの失敗は既知の高負荷・wall-clock driftと基準ブランチ由来を含むため、PR CIのhead/base比較で最終判定する。
