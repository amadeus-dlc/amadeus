# Stakeholder Map — 260722-space-record-catalog

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Key Stakeholders

| ステークホルダー | 関心 |
|---|---|
| ユーザー(プロジェクトオーナー) | Space 情報設計の一貫性、Issue #1309 の可読な整理、着手判断の材料 |
| リポジトリ閲覧者(人間) | GitHub・ファイルツリーからの時系列閲覧(Markdown 投影) |
| leader / メンバー(エージェント運用) | CLI での Space 横断一覧、安定 ID による機械参照の維持 |
| フレームワーク開発(本 repo チーム) | 既存 ID・監査・選挙検証・record 参照の非破壊、drift 検出可能な投影 |
| 下流の実装 intent | 本 intent の ADR・契約定義を実装入力として消費 |

## Decision-Makers vs. Influencers

- **決定者**: ユーザー — 用語裁定(済: ライフサイクルレコード)、完了定義、着手判断(Issue 選定はユーザー専権)。チームモード時の設計判断は選挙(本 intent はユーザー対話モードでユーザー裁定が代替、leader セッション実 HUMAN_TURN)
- **影響者**: Issue #1309 起票内容(設計方針・非目標)、既存 Intent 設計(参照モデル)、用語集ノルム(提案語彙は確定まで登録しない)

## Communication Requirements

- 裁定・成果物は record(`amadeus/spaces/default/intents/260722-space-record-catalog/`)を正本とし、#1309 へはミラー(概要+リンク+状態行)のみ同期(record → Issue の一方向)
- intent の節目(park・phase 完了・complete)で #1309 の状態行を更新
- record の main 反映はチェックポイント/record PR 経由(マージはユーザー承認)
