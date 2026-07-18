# Scalability Requirements — fix-1172-skip-denominator(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠 |
|---|---|---|
| SC-1 | ステージ行数の増加に対し線形のまま(business-rules BR-5 の既存挙動維持)— 32行規模の実データで実用十分 | business-logic-model 判定マトリクス(実コーパス 1216 行の集計実測) |

分散・水平スケールは N/A(反証可能: repo ローカル純関数 — requirements の消費側棚卸しで countStageProgress の消費は amadeus-mirror render+t232 のみ)。

## 前提(technology-stack 由来)

technology-stack.md の単一マシン構成が前提。
