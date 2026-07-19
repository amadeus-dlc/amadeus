# Performance Design — election-skill(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 設計方針

performance-requirements.md の「性能 SLO N/A・単一走査検査」を次で実現する:

- 禁止語彙 grep 検査は SKILL.md 1ファイルへの単一パス走査(business-rules.md BR-K1 の検査対象)。語彙集合は canonical 1定義からの導出(tech-stack-decisions.md の検査実装行)で、検査自体の実行コストは考慮対象外
- 実演層(subagent 完走)は非 CI の1回実行(business-logic-model.md — ADR-6 (ii))で常設負荷なし

## 検証設計

- ベンチマークなし(performance-requirements.md)。検査の実行は既存テストランナー内(reliability-requirements.md の両側 fixture と同一基盤 — security-requirements.md の語彙境界検査・scalability-requirements.md のスケール非対象と一体)。停止ガードは既存タイムアウト
