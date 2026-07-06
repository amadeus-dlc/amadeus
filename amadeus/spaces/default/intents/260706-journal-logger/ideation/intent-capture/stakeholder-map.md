# Stakeholder Map — 260706-journal-logger（Issue #557）

## 主要ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| j5ik2o（Maintainer） | 意思決定者 | 4 点構成の設計討議を確定済み。journal-logger の初回起動操作、日次 PR の merge |
| leader | 主要利用者 + 中継 | 横断判断の記録先。gate 承認の中継、#556 のクローズ判断 |
| engineer1〜5 | 利用者 | 記録の送信（agmsg → journal-logger）と ack の受領 |
| journal-logger（新設ロール） | 書き込み機構 | 単独所有 worktree、整形追記 + ack、仕分け提案、日次小 PR。定着決定権なし |
| engineer3 | 接触面当事者 | #525+#527 で validator に触れる可能性のみ確認中（ピア確認送信済み） |

## 意思決定者と影響者の区別

- 決定: Maintainer（構成確定済み、merge、logger 初回起動）。gate は auto 委任経路。
- 影響: 全メンバー（journal の利用規約に従う）。仕分け候補の定着は従来の §13 human gate / steering 反映 Intent が保持。

## コミュニケーション要件

- 4 イベント報告（gate / PR / ブロック / 完了）を leader へ。
- journal-logger の運用検証（受け入れ条件 2〜3）は手順書に沿って人間 / leader が初回起動後に実施するため、その依頼と結果受領の往復が発生する。
