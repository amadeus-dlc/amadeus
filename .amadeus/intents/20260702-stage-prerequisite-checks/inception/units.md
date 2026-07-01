# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | phase skill 起動時の skill 供給元、実行環境、stage 前提を入力証拠として扱う。 | R001, R002, R003 | BC001 | なし | [U001-stage-prerequisite-evidence.md](units/U001-stage-prerequisite-evidence.md) |
| U002 | 前提不成立の分類と、repo 内代表例と配布対象 skill の説明境界を扱う。 | R004, R005 | BC001 | U001 | [U002-prerequisite-failure-routing.md](units/U002-prerequisite-failure-routing.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 前提確認の入力証拠が、分類と代表例境界の前提であるため。 |
| U002 | U001 | 前提不成立分類と説明境界は、stage 前提確認の結果を入力にするため。 |
