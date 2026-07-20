# Stakeholder Map — upstream-sync-230

上流入力(consumes 全数): なし(本ステージの consumes 宣言は空)

## Key Stakeholders and Interests

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(プロジェクトオーナー) | 最終意思決定者 | upstream 追従の方針決定・park/再開の承認・PR マージ承認(no-AI-merge) |
| leader(チームリーダー) | 執行管理 | ディスパッチ・ゲート delegate 発行・選挙配信・承認待ち台帳・ノルム PR |
| チームメンバー(e1〜e6) | 実装・レビュー | construction 再開後の Bolt 実装・クロスレビュー・選挙投票 |
| 全6ハーネスの利用者 | 消費者(内部) | フック・アダプタの信頼性向上、プラグイン拡張手段 |
| upstream(awslabs/aidlc-workflows) | 参照元 | 変更の取り込み元(コード実行はしない・読み取りのみ)。本 intent から upstream への還流はスコープ外 |

## Decision-Makers vs. Influencers

- **Decision-makers**: ユーザー(intent 着手・仕様・マージ・park 解除)、leader(既決ルールの機械的執行のみ — ゲート delegate、§13 persist)
- **Influencers**: reviewer(READY/REVISE verdict)、選挙(設計判断の裁定)、upstream の設計文書(ADAPT 実装のガイド — 拘束力は承認済み計画が持つ)

## Communication Requirements

- 進捗・ブロッカーは e5(conductor)→ leader へ push 報告(push-reporting、agmsg ack プロトコル準拠)
- ステージゲートは delegate-approval 経路(auto-gate-approval)、§13 学習候補はゲート報告に同梱(gate-report-s13-bundling)
- ideation 完了時: engine park + record push を実施し、park 状態と再開手順(`/amadeus --resume`)をユーザーへ報告
- 実装フェーズ再開後の Bolt PR は issue/PR 日本語規約・レビュアー指名(creator-first)に従う
