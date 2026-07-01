# Construction ノート

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | README の内部 skill 一覧を workflow family ごとに整理する。 | [test-results.md](test-results.md) |
| T002 | 完了 | 内部 skill を公開入口として扱わない説明を維持する。 | [test-results.md](test-results.md) |

## 実行方針

README の Internal Skills を、Decision and learning support、Domain support、Ideation internals、Inception internals、Construction internals の family に分ける。

README.ja.md も同じ分類へそろえる。

## 実装判断

公開入口の説明は維持した。

内部 skill は必要時に workflow から使うものとして記述し、直接起動を前提にする案内へ変えていない。

## 検証入口

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | pass | README と Inception の Bolt 定義を根拠にした。 |
| スコープ | pass | README の skill role inventory に限定した。 |
| 互換性 | pass | 既存 skill 本文、metadata、契約ファイルは変更していない。 |

## 未確認事項

- PR は未作成である。
