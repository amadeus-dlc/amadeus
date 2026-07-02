# UC001 遷移単位の雛形を生成、更新する

## ユースケース

Agent が phase 遷移時に同梱スクリプトを実行し、対象 Intent の `state.json` へ遷移に対応する valid なブロックを生成、更新する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 Intent のディレクトリと（Intent Capture 以外では）既存の `state.json` が存在する。
- 昇格済みの同梱スクリプトが配布先ユーザー環境から実行できる。

## 基本フロー

1. Agent は、対象 Intent と遷移種別（Intent Capture、Inception 開始と完了、Construction 開始、Functional Design、Bolt 準備、finalization）を指定してスクリプトを実行する。
2. スクリプトは、既存の `state.json` を読み、既存の値と前 phase の状態ブロックを保持したまま、対象遷移のブロックを追加または更新する。
3. Agent は、生成、更新された `state.json` を成果物の作成と同じ変更に含める。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 同じ遷移で再実行される。 | 結果は変わらず（冪等）、既存の値は保持される。 |
| 遷移種別が不正である。 | スクリプトは利用可能な遷移種別を示して失敗する。 |
| Intent Capture で `state.json` が存在しない。 | 新規に生成する。 |

## 対応要求

- R001
- R002
- R003

## 未確認事項

- 引数体系の詳細は Construction で確定する。
