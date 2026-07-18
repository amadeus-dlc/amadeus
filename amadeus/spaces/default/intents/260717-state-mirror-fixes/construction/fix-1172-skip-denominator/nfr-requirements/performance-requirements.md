# Performance Requirements — fix-1172-skip-denominator(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠 |
|---|---|---|
| P-1 | countStageProgress は行単位線形走査のまま(business-logic-model の疑似コード — 追加は行あたり定数コストの正規表現1回)。新規 I/O なし | requirements FR-2a の最小差分、business-rules BR-1/BR-2 |

応答時間 SLO は設けない(単発 CLI の純関数 — 数値目標の捏造をしない)。

## 前提(technology-stack 由来)

technology-stack.md の Bun 直接実行前提。scripts/ は配布面なしのローカル実行のみ。
