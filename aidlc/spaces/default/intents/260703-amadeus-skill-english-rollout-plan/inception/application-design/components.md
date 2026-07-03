# Components：Amadeus skill 英語化実施計画

## 概要

この成果物は、Issue #399 の完了追跡に必要な論理コンポーネントを整理する。

実装クラスやファイル変更は定義しない。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 参照要求 |
|---|---|---|---|
| C001 | 子 Issue 順序管理 | #395、#400、#401、#402 の順序と依存関係を保持する。 | R001 |
| C002 | 完了証拠管理 | 子 Issue ごとの PR merge、明示的な Issue close、対象外判断、英語化 PR merge を完了証拠として扱う。 | R002、R005、R006 |
| C003 | #401 配下 Issue 扱い管理 | #391、#392、#393、#394 の扱いと個別完了または対象外判断を保持する。 | R003、R005 |
| C004 | skill 英語化 PR 境界管理 | 翻訳変更、意味変更、昇格フロー、検証結果の境界を PR 判断材料として保持する。 | R004 |
| C005 | 親 Issue 完了判断 | #395、#400、#401、#402、#391〜#394、RU002〜RU006、最終検証の完了証拠から #399 の完了判断可否を示す。 | R005、R006 |

## 既存アーキテクチャとの対応

| コンポーネント | 既存の置き場 | 扱い |
|---|---|---|
| C001 | Intent の requirements、delivery-planning、traceability | 新しい実行時コンポーネントは作らず、成果物責務として扱う。 |
| C002 | Intent の requirements、delivery-planning、traceability、GitHub Issue と PR | GitHub 状態を外部証拠として参照する。 |
| C003 | Intent の requirements、delivery-planning、traceability | #401 の計画証拠と B005 の個別完了証拠を分けて扱う。 |
| C004 | PR 説明、team-practices、昇格フロー | source skill と昇格先 skill の同期境界を扱う。 |
| C005 | Intent の traceability、audit、GitHub Issue #399 | 完了判断は人間が行う。 |

## 対象外

GitHub API クライアント、永続ストア、Web UI は定義しない。

この Intent は、成果物と PR gate を通じた追跡を扱うためである。
