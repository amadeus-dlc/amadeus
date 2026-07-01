# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | stage 判定語彙と stage0 採用判断を扱う。 | R001, R002 | BC001 | なし | [U001-stage-adoption.md](units/U001-stage-adoption.md) |
| U002 | workspace 対応記録と検証証拠を扱う。 | R003, R004 | BC001 | U001 | [U002-workspace-provenance.md](units/U002-workspace-provenance.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | stage 判定語彙と採用条件は workspace 対応記録の前提であるため。 |
| U002 | U001 | workspace 対応記録には stage 判定を含めるため。 |
