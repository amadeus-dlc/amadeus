# Stakeholder Map — インセプション固定費バッチ(#3181 + #2415)

## Key Stakeholders and Interests

| ステークホルダー | 関心 |
|---|---|
| ユーザー(リポジトリオーナー) | ワークフロー所要時間の短縮、トランクの単純性維持、一時生成物(temp scope 等)を残さないこと |
| conductor(AI、self-fix/self-feature intent の実行主体) | RE/RA の再導出作業の解消、Issue エビデンスの機械的な流入経路 |
| §12a レビュアー / クロスレビュアー | upstream-coverage 引用の一次資料への接地、検証エビデンスの再現可能性 |
| 後続 intent(フレームワーク利用者としての将来ワークフロー) | RE 入力の自己増幅停止 — 活動量増でも RE コストが単調増加しない構造 |

## Decision-Makers vs. Influencers

- **決定者(ユーザー専権)**: スコープ選択(self-feature — 裁定済み)、PR マージ、仕様変更に相当する裁定。着手 Issue の選定も済み(2026-08-18 バッチ承認)
- **決定者(設計ゲート)**: application-design の設計裁定(#3181 実装形3案 / #2415 除外集合)は AD ゲートで人間承認
- **影響者**: Issue クロスレビュー4名(xrev-3181-20260817 / xrev-2415-20260818)の refinements — 要件・設計の入力として消費される(#2415 は除外集合3面の設計検討を勧告)

## Communication Requirements

- ステージゲートごとに承認を諮る(Intent Autonomy Mode: none)。Construction Bolt 1 は self-feature の walking-skeleton ゲート対象
- Issue #3181 / #2415 へのミラー・ラベル同期は intent mirror が担う(GitHub 一時障害時は fail-open で retry 記録 — 本 intent の initial-create は 503 により retry 状態で記録済み)
- 記録は日本語(パス・CLI・コード識別子は原文保持)
