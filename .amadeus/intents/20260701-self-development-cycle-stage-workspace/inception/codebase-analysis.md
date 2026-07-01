# 既存コード分析

## 対象コード

- `.amadeus/glossary.md`
- `.amadeus/steering/policies.md`
- `.amadeus/development.md`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`
- `.amadeus/intents/20260629-self-dev-steering-layer/ideation/decisions/D002-issue-233-handoff-scope.md`
- `.amadeus/intents/20260701-self-development-cycle-stage-workspace/**`

## 既存能力

- `.amadeus/glossary.md` は、build workspace、host environment、target workspace、target artifacts、stage0、stage1、stage2 の初期語彙を持つ。
- `.amadeus/steering/policies.md` は、stage2 を次回 stage0 として扱う条件と provenance の最低記録項目を持つ。
- `.amadeus/development.md` は、GitHub Issue 起点、PR 準備条件、merge 後の stage0 採用判断を持つ。
- 先行 Intent の D002 は、Issue #233 の範囲を stage 判定と build workspace / target workspace の対応記録に限定している。

## 統合点

- stage 判定語彙は `.amadeus/glossary.md` と `.amadeus/steering/policies.md` を参照して要求へ展開できる。
- build workspace と target workspace の対応記録は、Intent の `traceability.md`、`decisions.md`、PR 説明の検証記録へ接続できる。
- stage0 採用判断は、Maintainer の判断として User Story と Acceptance へ接続できる。

## ギャップ

- stage0、stage1、stage2 の意味は初期語彙として存在するが、後続 Intent が要求として参照できる受け入れ状態にはなっていない。
- stage2 を次回 stage0 として採用する条件はあるが、人間の採用判断をどの成果物で追跡するかが未確定である。
- build workspace、host environment、target workspace、target artifacts の対応記録先は、PR 準備条件としては示されているが、Intent 成果物上の記録先として固定されていない。

## リスク

- stage 判定と workspace 対応記録を同じ成果物に混ぜると、後続 Intent の provenance が読みにくくなる。
- stage2 を自動的に stage0 として扱うと、人間の採用判断を飛ばしてしまう。
- `CONTEXT.md` への stage 語彙追加は、この Intent の対象外であり、ここで先取りすると先行 Intent の D002 と衝突する。

## Inception への入力

- stage 判定語彙、stage0 採用条件、workspace 対応記録先を別要求として扱う。
- Maintainer の stage0 採用判断を User Story として扱う。
- Unit は stage 採用判断と workspace provenance 記録に分ける。
- Bolt は、stage 方針記録と workspace 対応記録を別の実施境界として扱う。

## 証拠

- `.amadeus/glossary.md`
- `.amadeus/steering/policies.md`
- `.amadeus/development.md`
- `.amadeus/intents/20260629-self-dev-steering-layer/ideation/decisions/D002-issue-233-handoff-scope.md`
- commit `553b248a25eef44ff2a02585d3105835d30d94e4`

## 鮮度

- analyzedAt: `2026-07-01T08:29:54Z`
- freshness: current

## 未確認事項

- 人間の stage0 採用判断を `decisions.md` と PR 説明のどちらに主に残すかは Construction で確定する。
