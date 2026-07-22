# Stakeholder Map — 260720-goa-sparse-family

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

| ステークホルダー | 関心 | 関与 |
|---|---|---|
| ユーザー(j5ik2o) | ノルム台帳(team.md)の GoA 記録が将来の集計実装で全量読めること・選挙 record の可読性 | ディスパッチ承認済み(4 intent 並列の1)。マージ承認(no-AI-merge) |
| leader | 選挙開催・ゲート執行(常任グラント cabcb933)・PR マージ執行 | 選挙配信/開票、E-OC1 承認 |
| e2(並行 intent #1267) | record.ts/election.ts のファイル共有 — 関数単位非交差の維持 | 非交差合意済み(変動時相互通知) |
| e1/e3 | クロスレビュー・選挙投票・PR レビュー | レビュアー候補(実装者以外) |
| 将来の集計実装 intent | #1254 の対応方向裁定が distill の GoA-variance 実装の前提を決める | 本 intent の裁定・実測を Issue/record 経由で継承 |

## 影響面

- 正本: `packages/framework/core/tools/amadeus-norm-metrics.ts`(dist×6+self-install×4 再生成対象)/ `scripts/amadeus-election*.ts`(配布外・W-04 同型)
- 消費者: 週次蒸留(parse-only)、選挙 CLI render/verify、t238/t-norm-metrics テスト群
