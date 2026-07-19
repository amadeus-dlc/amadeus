# Scalability Design — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## ステートレス設計

scalability-requirements.md の同時実行要件(制御不要)を、モジュール構造で保証する:

- U1 モジュールはモジュールレベル可変状態を持たない(全 API が入力→出力の純関数、business-logic-model.md エラー処理節)。時刻・乱数は入力パラメータで受ける(BR-11 — Date.now/Math.random 直接呼び出しの禁止を lint 相当の grep テストで固定)
- 並行選挙 N 件は独立の関数呼び出し — スケール機構は不要(scalability-requirements.md N/A 判定の設計反映)

## 拡張面

- 投票者数の増加は choices/ballots 配列長の線形増のみ。tech-stack-decisions.md の自前 fnv1a+mulberry32 は入力長に線形で、規模上の制約を追加しない
