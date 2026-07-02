# UC002 生成直後に validator で確認する

## ユースケース

Agent が雛形の生成、更新の直後に validator を実行し、`state.json` に起因する構造 fail が出ないことを確認する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- UC001 で `state.json` が生成、更新されている。
- スクリプトの eval が実装前の失敗確認（RED）を経て実装され、生成結果と validator の整合を検証している。

## 基本フロー

1. Agent は、対象 Intent を指定して validator を実行する。
2. validator は、生成、更新された `state.json` を検査し、構造 fail を出さない。
3. Agent は、pass を確認して次の stage へ進む。

## 代替フロー

| 条件 | 扱い |
|---|---|
| `state.json` 以外の成果物（Markdown）に起因する fail が出る。 | 雛形の責務外として、該当成果物を補修する。 |
| `state.json` に起因する fail が出る。 | スクリプトの契約と validator の要求構造の乖離として、eval に fail ケースを追加して補修する。 |

## 対応要求

- R001
- R005

## 未確認事項

- なし。
