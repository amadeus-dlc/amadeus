# Stakeholder Map — 260717-state-mirror-fixes

上流入力(consumes 全数): (なし — 本ステージは consumes 宣言なし。関係者情報は Issue #1170 / #1172 の実読と leader タスク割当から導出)

## Key Stakeholders(主要関係者と関心)

| 関係者 | 役割 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | プロダクトオーナー / 最終決定者 | 着手 Issue の選定(issue-selection-user-decides)、scope=amadeus の明示指示、PR マージ承認。#1170 の追加実測(書き手特定)の起点でもある |
| leader | ゲート執行・選挙配信・マージ執行 | タスク割当(Ideation まで→park→mirror sync)、delegate-approval 発行、承認待ち台帳管理 |
| e1(本セッション) | conductor | intent の遂行品質、record の整合、park までの完遂 |
| e2 / e3 | クロスレビュアー | 両 Issue の独立検証済み(実在確認 verdict)。要件材料となる追加実測(機序のコード裏付け・git 履歴の3回目巻き戻り)の提供者 |
| amadeus チームモード利用チーム | 一次顧客 | 並行セッション下で state が巻き戻らないこと(手動修復の根絶) |
| mirror Issue 閲覧者(external 共有面) | 二次顧客 | 状態行の進捗分母が正しいこと(18/32=56% に見える誤認の解消) |

## Decision-Makers vs. Influencers(決定者と影響者)

- **決定者**: ユーザー(着手・マージ・仕様変更の最終承認 — エスカレーション正準リスト準拠)。ステージゲートは leader の delegate-approval による auto 承認(auto-gate-approval)
- **影響者**: e2/e3 のクロスレビュー所見(修正方向・テスト fixture 設計への示唆 — 留保付きで後続ステージへ持ち越し)、org/team/project の memory 層既決ノルム

## Communication Requirements(コミュニケーション要件)

- エージェント間連絡は agmsg(2026-07-17T17:24Z 運用復帰)。対応要求メッセージは受領 ack 必須、3分でタイムアウト再送(dispatch-ack-required)
- 完了・ブロッカーは e1 から leader へ自発報告(push-reporting)。ゲート準備完了報告には §13 学習候補(または明示 0 件)を同梱(gate-report-s13-bundling)
- 本 intent の外部共有面はミラー Issue(park 時に `bun scripts/amadeus-mirror.ts create --intent 260717-state-mirror-fixes` で起票し sync まで実測)。本文は概要+record リンク+状態行のみ、設計詳細は record 正本(intent-first-mirror-issue ノルム)
- 対象 Issue #1170 / #1172 には in-progress:amadeus ラベル+assignee 付与済み(intent-start-issue-grooming、2026-07-17T17:33Z 実施)
