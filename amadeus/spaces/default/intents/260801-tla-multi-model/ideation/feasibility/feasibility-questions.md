# Feasibility 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`、`raid-log.md`

E-OC1 判定: 本ファイルの2問は CI 運用方針・スキーマ移行の裁定であり、ソロモードでは仕様裁定はユーザー専権のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T15:00:00Z

## Q1: CI での MirrorLifecycle 完全探索の時間方針(R1)

u7 ローカル実測は 208628 states / depth 18。CI runner では計算資源が限られ、探索時間が長引く可能性がある。

- A. 既存ジョブのタイムアウト内でまず実測し、超過した場合のみ time-box(states 制御や shallow 探索へのフォールバック)を後続裁定とする — 完全探索を原則維持
- B. 最初から time-box 付きで CI に載せ、完全探索は workflow_dispatch の手動実行時のみとする
- C. 完全探索を必須とし、タイムアウト超過時はジョブ分割(モデル別ジョブ)まで本 intent で行う
- X. Other (please specify)

[Answer]: A. 既存ジョブのタイムアウト内でまず実測し、超過時のみ time-box を後続裁定

## Q2: model-map スキーマ移行の形(C1)

補助モジュール identity 配列の追加(Q2=C の宣言面)に伴うスキーマ拡張。

- A. 既存 v2 エントリへ optional フィールド追加(省略時 = 補助モジュールなし)。既存4資産の identity 算法・値は不変。バージョン番号は v2 のまま
- B. スキーマを v3 としてバージョンアップし、マイグレーション経路を持つ(既存 receipt との互換は identity 値の不変で担保)
- X. Other (please specify)

[Answer]: A. 既存 v2 エントリへ optional フィールド追加(identity 算法・値は不変、v2 のまま)
