# Stakeholder Map — 260807-merged-pr-convergence

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし)。`intent-statement.md` と同一の裁定(Q1〜Q3)を前提とする。

## ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(repo オーナー) | 意思決定者 | override 裁定往復の解消。マージ承認境界(no-AI-merge)の不変 |
| conductor(AI-DLC 実行セッション) | 主要利用者 | マージ済み PR の unit で code-generation approve が override なしで通ること |
| leader / レビュアー(将来のチームモード) | 影響者 | landed report が「収束の証明」でなく「着地の事実」であることの読み分け(verdict 語彙の明確さ) |
| pr-convergence plugin 保守者 | 実装所有 | `evaluateConvergence` 単一定義(FR-3b)と fail-closed 設計(UNKNOWN never success)の保存 |
| 下流消費者(per-unit artifact guard / report-format センサー) | 機械消費者 | report の kind 語彙拡張(`landed`)と整合検査の同期改修 |

## 意思決定者 vs 影響者

- **意思決定者**: ユーザー — 方式裁定(Q1〜Q3 承認済み 2026-08-07T10:04:51Z)、各ステージゲート、PR マージ。
- **影響者**: クロスレビュー2名の設計申し送り(sensor 語彙・retry 短絡・導出案の限界)は requirements / design 段の拘束条件として搬送する。

## コミュニケーション要件

- 仕様の正本は Issue #2401(本文 + クロスレビュー verdict 2件)と本 intent record。ミラー Issue #2407 は record → Issue の一方向同期のみ。
- landed は「収束(converged)」と別語彙であることを report・docs・センサーの3面で一貫させる(誤読が最大のコミュニケーションリスク)。
