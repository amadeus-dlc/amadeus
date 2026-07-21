# Stakeholder Map — 260719-ballot-failclosed-amend

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

## Key Stakeholders and Interests

| ステークホルダー | 関心 | 種別 |
| --- | --- | --- |
| ユーザー(j5ik2o) | 選挙基盤の信頼性(E-ETF-CANON で CLI を正本宣言済み)。マージ承認・編成承認の最終決定者 | 意思決定者 |
| leader | 選挙運営の当事者(open/配布/開票)。不正 ballot の store 手是正コストの直接負担者。ゲート執行・delegate 発行 | 意思決定者(執行) |
| 投票メンバー(e1〜e6) | vote verb の利用者。受理段 fail-closed 化で入力ミスの即時検出、amend 経路で CLI 内訂正が可能になる | 影響者(利用者) |
| e1(#1226 intent conductor) | `tests/unit/t238-election-record.test.ts:104` の反転を予定 — 本 intent と修正面が交差しうる唯一の並行作業者 | 影響者(調整対象) |
| e2(本 intent conductor) | #1252/#1253 の起票者・実装責任。自己実装の自己レビュー禁止によりレビュアーは別メンバー | 実行者 |

## Decision-makers vs. Influencers

- **意思決定者**: ユーザー(PR マージ・仕様変更)、leader(ゲート執行・選挙開票)、エージェント選挙(設計判断 — tally 側 amend 解決規則は design 段で選挙)。
- **影響者**: 投票メンバー(利用体験)、e1(t238 交差の直列化判断に影響)。

## Communication Requirements

- 完了・ブロッカーは conductor(e2)から leader へ自発報告(push-reporting)。対応要求メッセージは ack 必須(dispatch-ack-required)。
- 設計判断が出た時点で leader へ選挙依頼(ディスパッチ要件(5)、implementation-deviation-election)。
- t238 交差が判明したら着手前に e1 と非交差確認し、交差なら当該ファイルのみ直列化を leader へ報告(要件(4))。
- PR 作成時は実装者以外のメンバーへレビュー依頼し、レビュアー名を leader 報告に含める(independent-review-on-pr)。
