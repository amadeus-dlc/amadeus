# Performance Design — election-cli(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、frontend-components.md、domain-entities.md

## 設計方針

performance-requirements.md の「決定表引き O(1)+票走査 O(n)・SLO 非設定」を次で実現する:

- next は「election.json の state 読取 → 7状態決定表の引き当て → 指令 JSON 構築」の直列3段(business-logic-model.md の指令表)。状態別分岐は switch 1段で、探索・再帰なし
- 票集合走査(collect-wait の未着一覧・tally-ready 判定)は U2 status/U1 canEarlyTally への委譲呼び出し1回ずつ — U5 内に重複走査を持たない(責務は business-rules.md の verb 契約どおり配線のみ)

## 検証設計

- 性能テストなし(performance-requirements.md)。機械実行器 e2e(e2e 層 — tech-stack-decisions.md)は完走の決定性のみ検証し、実行時間は既存ランナーのタイムアウトが上限。入力検証(security-requirements.md)・状態遷移検査(reliability-requirements.md)も同一 e2e 基盤に同乗し、走行回数を増やさない(scalability-requirements.md の単発 CLI 前提)
