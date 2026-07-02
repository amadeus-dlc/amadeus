# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | 各 Intent のモジュールファイルが概要と依存（理由付き）を持ち、共有インデックスにしか存在しない情報がなくなる。 | 採用済み | なし | [R001-index-source-consolidation.md](requirements/R001-index-source-consolidation.md) |
| R002 | `intents.md` と `discoveries.md` を配下モジュールと `state.json` から決定論的に再生成できる。 | 採用済み | R001 | [R002-deterministic-regeneration.md](requirements/R002-deterministic-regeneration.md) |
| R003 | 再生成された共有インデックスは、先頭に生成物であることと編集先を示すマーカーを持つ。 | 採用済み | R002 | [R003-generation-marker.md](requirements/R003-generation-marker.md) |
| R004 | 共有インデックスと配下モジュールの不整合を validator が fail にする。 | 採用済み | R002, R003 | [R004-consistency-validation.md](requirements/R004-consistency-validation.md) |
| R005 | 生成入口が配布先ユーザー環境で動作し、共有インデックスを更新する skill 手順とテンプレートが再生成前提に更新される。 | 採用済み | R002 | [R005-distribution-and-procedure-alignment.md](requirements/R005-distribution-and-procedure-alignment.md) |
| R006 | workspace の既存データと examples の 4 snapshot が新契約に適合し、validator が pass する。 | 採用済み | R001, R002, R003, R004, R005 | [R006-existing-data-and-examples-migration.md](requirements/R006-existing-data-and-examples-migration.md) |
| R007 | 再生成の決定論性と不整合検査の検証を、実装より先に追加して RED を確認する。 | 採用済み | R002, R004 | [R007-verification-first.md](requirements/R007-verification-first.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 定義元の移設は他の要求に依存せず定義できるため。 |
| R002 | R001 | 再生成は、概要と依存の定義元が配下モジュールに揃っていることが前提になるため。 |
| R003 | R002 | マーカーは再生成が出力するファイルの一部であるため。 |
| R004 | R002, R003 | 不整合検査は、生成規則とマーカーの存在が前提になるため。 |
| R005 | R002 | 手順とテンプレートの更新は、参照する生成入口の実在が前提になるため。 |
| R006 | R001, R002, R003, R004, R005 | 既存データの適合は、契約、生成、検査、手順のすべてが確定した後に成立するため。 |
| R007 | R002, R004 | 検証は再生成の契約と不整合検査を対象にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |
| R006 | 採用済み | 未登録 |
| R007 | 採用済み | 未登録 |
