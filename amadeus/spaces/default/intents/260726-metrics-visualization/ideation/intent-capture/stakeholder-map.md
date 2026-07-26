# Stakeholder Map — metrics 可視化(B1 後続)

## ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | 発案者・最終意思決定者・唯一の閲覧者 | コードベース健全性のトレンド把握。B1 の発案元(#921)。マージ承認の唯一の権限者(no-AI-merge) |
| conductor(本セッション、ソロモード) | 実行者 | ステージ成果物の生成・検証・ゲート運転。常任グラント(82605615)によるステージゲート自動承認 |
| 既存 CI(metrics-snapshot job) | 統合先システム | HTML 再生成の同乗先(Q2=C)。snapshot 記録の loud-fail 契約・ci-success 集約外の非対称(260712 設計)を壊さないこと |
| 将来のコントリビュータ | 間接受益者 | コミット済み `metrics/index.html` を開くだけでトレンドを把握できる |

## 意思決定者と影響者

- **意思決定者**: ユーザー(スコープ・ゲート裁定・マージ承認)。ステージゲートは常任グラントで委任済み(walking-skeleton・phase boundary・マージは対象外)
- **影響者**: intent `260712-metrics-observation` の既決(スキーマ疎結合・Codecov 非重複・loud-fail 契約)— 本 intent はその制約下で設計する

## コミュニケーション要件

- 進捗はセッション内報告で完結(ソロモード — チーム配送・ack 規律は不適用)
- ユーザー承認が必要な節目: walking-skeleton ゲート(amadeus-feature スコープは skeleton ON)、phase boundary ゲート(グラント対象外)、PR マージ
- GitHub 共有面: ミラー Issue の起票要否は ideation 内で確定する(intent-first 起票ノルム)
