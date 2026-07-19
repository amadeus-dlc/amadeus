# Performance Design — election-model(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## 設計方針

performance-requirements.md の「SLO 非設定・アルゴリズム上限 O(n)」を次の構造で実現する:

- tally は受理票列の単一走査で side ごとの度数を積算し、判定順序(business-logic-model.md の先勝ち決定表)を同一走査結果への逐次判定として実装 — 二次走査・中間コレクション生成を設けない
- shuffleView は Fisher-Yates 1回(O(n))+シード生成 fnv1a 1回(tech-stack-decisions.md 確定)。メモ化・キャッシュは決定性検証を複雑化するだけで導入しない(performance-requirements.md の非導入方針の設計反映)

## 検証設計

- 性能専用テストなし。BR-10(同一入力2回 deep-equal)の unit テストが決定性を、既存ランナーのタイムアウトが停止性を担保(performance-requirements.md 測定と検証節の写像)
