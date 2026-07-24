# Stakeholder Map — 260722-tla-plugin

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — intent-statement.md と同一の入力源に基づく)

## Key Stakeholders(主要ステークホルダーと関心)

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | プロダクトオーナー / 全ゲート承認者 | 実験成果(TLA 7/7)の常設化、opt-in による非強制、既決の二層検証態勢との整合 |
| フレームワーク開発チーム(ソロ/チーム両モード) | 一次利用者 | 並行プロトコル spec 変更時に形式検証を再現可能な1コマンドで実行できること |
| fork 利用チーム | 二次利用者 | プラグインを compose しない限りワークフローが一切変わらないこと(安全契約: 上書きなし・可逆 drop) |
| CI(GitHub Actions) | 実行環境 | ci.yml 統合ジョブが既存 PR blocking バンドと分離され(workflow_dispatch)、通常 CI の速度・信頼性に影響しないこと |

## Decision-Makers vs. Influencers(意思決定者と影響者)

- **意思決定者**: ユーザー — 全ステージゲート承認、PR マージ承認(no-AI-merge)、仕様変更の裁定(エスカレーション正準リスト)。本intentの主要判断5件(Q1〜Q5)はすべて grilling で裁定済み
- **影響者**: 前intent 260720-formal-verif-experiment の裁定群(二層検証態勢・PBTオラクル相殺・fail-closed 探索契約・blind実験ノルム) — 本intentの制約として作用し、再審の対象にはしない(no-election-for-decided-norms)
- **執行**: ソロモードの conductor(本セッション) — 既決ノルムと実測証拠から導出し、未決事項・仕様変更・不可逆操作はユーザーへエスカレーション

## Communication Requirements(コミュニケーション要件)

- ステージゲートごとに成果物サマリ+レビューパスを提示し、ユーザーの明示承認を得る(HARD STOP)
- PR は CI green・レビュー READY を実測確認のうえマージ承認を AskUserQuestion で個別に諮る
- 工程記録(record)は amadeus/ ツリーとしてチェックポイントコミットで版管理し、実装 PR と分離する
- ミラー Issue(intent-first 起票ノルム)の要否は本intentが直接のユーザー指示起点(実験完了の後続)であるため、必要になった時点で leader 判断ではなくユーザーへ確認する
