# Stakeholder Map — intent 260815-rfc-autonomy-modes

## Key Stakeholders

| ステークホルダー | 関心 | 役割 |
|---|---|---|
| ユーザー(j5ik2o) | RFC-0001 どおりの autonomy 挙動。人間専権境界の維持。仕様変更・選挙 hold・マージの裁定 | **意思決定者**(RFC 承認者。仕様変更・正準リスト事項の専権) |
| conductor(本セッション/後続セッション) | 裁定順序の一意性、膠着・空振りの排除、record による引き継ぎ性 | 実行者(選挙管理・ゲート提示・レビュー統合) |
| builder / reviewer サブエージェント | bound-surfaces の明確な owned-files 境界、TDD シームの実在 | 実装・独立検証 |
| 後続 intent の運用 | 新 autonomy 意味論下でのワークフロー互換(park/resume・grant・梯子) | 消費者 |

## Decision-makers vs. Influencers

- **決定**: ユーザー(RFC 本文と裁定 Q1/Q3/Q16/Q17・付録 A 指示 1〜8 が既決の正本)。実装中の設計逸脱・複数妥当解は選挙(fresh 2 voter)。
- **影響**: RFC の related Issue 群(#2253 / #2067 / #1241 / #2396 / #1437 / #2899 / #2974 / #3016)— 参照のみ、再裁定しない。

## Communication Requirements

- ミラー Issue #3116 が record → Issue の一方向同期で進捗を共有
- 仕様変更に相当する追加発見はユーザーエスカレーション(正準リスト 4)
- PR は Bolt ごと、record checkpoint 同梱可(E-260813-RECORD-BUNDLING-NORM)
