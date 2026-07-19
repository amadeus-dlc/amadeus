# Performance Design — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計方針

performance-requirements.md の「逐次配信・最適化不要」を次で実現する:

- AgmsgTransport.notify は voter 1名につき send.sh の spawnSync 1回(business-logic-model.md の輸送別フロー)。並列化・接続プールなし — 数十件規模で不要(scalability-requirements.md の成長前提なしと同根)
- SubagentTransport.notify は DeliveryDirective の生成のみ(spawn なし — Q1=B)で計算量ゼロ相当。fail-closed 検査(security-requirements.md の型構造)は生成時の型検査で走行時コストなし

## 検証設計

- 性能テストなし(performance-requirements.md)。fake transport 注入(reliability-requirements.md のテストシーム)で挙動検証し、実 spawn は integration 層(tech-stack-decisions.md のテスト行)— 実行時間は既存ランナーのタイムアウトが上限
