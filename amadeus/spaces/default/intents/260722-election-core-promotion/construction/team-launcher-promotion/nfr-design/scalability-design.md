# Scalability Design — team-launcher-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- scalability-requirements の「搬送のみ・スケール目標なし」を保つ構造: business-logic-model の移動+パス修正はチームサイズ機構(-2/-4/-6 — 対応 env は TEAM_ENGINEERS、scripts/team-up.sh:32 ヘッダ+:83 の TEAM_SIZE 既定、正本直読実測 2026-07-23。consumes 宣言外シンボルのため直読出典を明示)に一切触れない。prerequisite 検査もサイズ非依存(ツール2種固定)
- tech-stack-decisions の配布投影(coreDirs)は既存機構のスケール特性のまま

## 検証設計

- scalability-requirements の検証(Should 面既存テスト green)へ委譲 — 新規スケール検証なし

## 他 NFR との整合

- reliability-requirements の env 契約不変(BR-4)が Should 面のスケール機構を保護。performance-requirements / security-requirements と同じく「変更最小」が横断原理
