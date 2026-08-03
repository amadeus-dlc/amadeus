# Stakeholder Map — record-roundtrip-pbt

上流入力(consumes 全数): なし（本ステージは consumes を宣言しない）

## Key Stakeholders

| ステークホルダー | 関心 | 役割 |
|---|---|---|
| ユーザー（リポジトリオーナー） | 記録系バグの再発防止、shift-left 施策群の前進、ゲート・マージの最終承認 | **決定者**（スコープ裁定・マージ承認・不可逆操作の承認） |
| conductor（本セッション） | ワークフロー駆動、ゲート執行、成果物品質 | 実行者・調整者 |
| builder / reviewer subagent | 実装と §12a 独立レビュー | 実行者（インフルエンサー） |
| 姉妹施策 Issue（#1979 / #1981 / #1982） | 射程外バグ族の分担境界の維持（無音化ゲート / 形式検証 CI / ランナーゲート） | 隣接オーナー — 分担変更時は相互参照を更新 |
| Amadeus 利用者・コントリビューター | fail-closed parse による堅牢化（dist 配布面）、CI の追加ジョブ | 受益者（間接） |

## Decision-makers vs. Influencers

- 決定者: ユーザーのみ（マージ・スコープ変更・深掘りジョブの schedule 化可否など）
- インフルエンサー: §12a reviewer（READY/REVISE verdict）、センサー・既存ブロッキングゲート（機械判定）

## Communication Requirements

- 進捗・ゲートは本ワークフローの承認ゲートと mirror Issue #2054（record → Issue 一方向同期）で可視化
- 実装 PR は Bolt ごとに発行し、レビュー READY・CI green 実測後にユーザーへマージ承認を諮る（no-AI-merge）
- #1980 本文は要求の正本参照先として維持（詳細裁定は本 record に置く — intent-first）
