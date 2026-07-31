# Stakeholder Map — 260731-perf-ci-separation

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Key Stakeholders

| ステークホルダー | 関心事 | 役割 |
|---|---|---|
| ユーザー(j5ik2o) | PR CI の速度と安定性、性能退行の検知継続 | 意思決定者(全ゲート承認、マージ承認) |
| conductor(本セッション) | ワークフロー執行、設計・実装・検証の品質 | 実行者 |
| PR 作成者(人間+AI エージェント) | 偽赤による差し戻し・再実行の解消 | 影響を受ける利用者 |
| 後続 intent(#1830 経路B 是正) | perf.yml 上の予算基準の設計余地 | 下流依存 |

## Decision-makers vs. Influencers

- **意思決定者**: ユーザーのみ(スコープ変更・マージ・不可逆操作。エスカレーション正準リスト準拠)
- **影響者**: Issue #1830 / #1835 の実測記録(要件の根拠)、既存ノルム(bt-timeout-verification-shape、two-layer-verification-posture、ci-pipeline:c3)

## Communication Requirements

- ミラー Issue #1839 で intent の節目(park・phase 完了・complete)に状態行を同期(record → Issue 一方向)
- #1830 / #1835 へは本 intent の着地時に関係を明記(経路A は本 intent、経路B は別 intent と切り分け)
- PR は Bolt ごとに発行し、収束(j5ik2o-gh-pr-converge-loop)後にユーザーへマージ承認を諮る
