# Stakeholder Map — 260810-numeric-provenance-guard

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)。一次入力 = Issue #2815・クロスレビュー2件・intent-statement.md。

## Key Stakeholders and Interests

| ステークホルダー | 関心 | 種別 |
|---|---|---|
| リポジトリオーナー(j5ik2o) | 数値規律の決定的執行、レビューイテレーション消費の削減 | 意思決定者 |
| conductor / builder(エージェント) | 起草時点での違反検出(ゲート前の自己是正)、偽陽性による作業妨害の回避 | 利用者 |
| §12a レビュアー(エージェント) | 数値 provenance 検査の機械化により実質検証(再導出)へ集中できる | 利用者 |
| 将来の読み手・下流ステージ | 成果物数値の再導出可能性(provenance 併記)の保証 | 受益者 |
| Amadeus フレームワーク保守者 | センサー層の一貫性(advisory 契約・fail-closed 原則・既存 13 manifest との整合)、#1237 との実装重複回避 | 影響者 |

## Decision-Makers vs. Influencers

- **意思決定者**: ユーザー(リポジトリオーナー)— PR マージ・仕様変更・優先度はユーザー専権(issue-selection-user-decides / no-AI-merge)。intent 内のステージゲート・質問は full グラント(intent-grant-637c32aed3f69d2db6a64fc18336aaa6)の授権範囲
- **影響者**: クロスレビュー2名の収束済み訂正(効能範囲限定・対象クラス定義・cutoff・共通化の申し送り)は要件段の一次入力として拘束力を持つ

## Communication Requirements

- ミラー Issue #2822 が intent の状態を GitHub へ一方向同期(record 正本)
- 起票元 Issue #2815 は本 intent の着地確認後にクローズ判定(close-after-landing-verification)
- 人間専権事項(walking-skeleton ゲート・PR マージ承認)でブロックされた場合は park してユーザー入力を待つ(起動指示で明示)
