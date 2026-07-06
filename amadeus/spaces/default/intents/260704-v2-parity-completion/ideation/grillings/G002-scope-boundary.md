# G002：スコープ境界と最小価値の確定

## 概要

- 状態: completed
- 対象: Intent `260704-v2-parity-completion` の Scope Definition
- 反映先: [scope-document.md](scope-definition/scope-document.md)

最小価値スコープ、優先順、Issue #396 の未確定 2 論点を確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD009 | Intent モジュールファイル（`intents/<dirName>.md`）と `intents.md` 索引を廃止する。概要、依存、目標プロファイルは v2 の `intent-statement.md` と `intents.json` で代替し、人間向け一覧は `intents.json` から必要時に生成する（Issue #396 論点 1、論点 4 の確定） | active | scope-definition/scope-document.md の対象 | Intent モジュールファイル契約と IndexGenerate の常設運用 |
| GD010 | 価値を出せる最小スコープは、コピーした TS エンジン + amadeus-grilling 結線層 + 1 個の stage skill（intent-capture）が新駆動で動く縦切りとする | active | scope-definition/scope-document.md の最小スコープ | なし |
| GD011 | 優先順は risk-first とし、C（エンジン + 結線）→ B（skill 一覧）→ A（成果物一致と削除、規範改定）→ パリティ検査と examples 再生成の順で進める | active | scope-definition/scope-document.md の順序の方針 | なし |

## 質問記録

### Q001

- 確認したいこと: 価値を出せる最小スコープはどこまでか。
- 確認が必要な理由: walking skeleton の境界と Bolt 分割の基準になる。
- 推奨回答: エンジン + grilling 結線層 + 1 stage skill の新駆動縦切り。
- 推奨理由: 最大リスク（結線層）を最初に検証でき、以降の skill 置換が同じ型の繰り返しになる。
- ユーザー回答: エンジン縦切り。
- 確定判断: GD010

### Q002

- 確認したいこと: 作業候補の優先順。
- 確認が必要な理由: Bolt 計画（Delivery Planning）の入力になる。
- 推奨回答: risk-first（C → B → A → 検査と examples）。
- 推奨理由: 二度手間（旧アーキテクチャで作って作り直す）を避け、Q001 の最小価値スコープと整合する。
- ユーザー回答: risk-first。
- 確定判断: GD011

### Q003

- 確認したいこと: Issue #396 の未確定 2 論点（モジュールファイル、intents.md 索引）の扱い。
- 確認が必要な理由: 削除対象が残るとパリティ完成が遅れる。
- 推奨回答: この場で廃止確定。
- 推奨理由: 判断基準「重複系は削除」に該当し、内容は intent-statement.md と intents.json で代替できる。
- ユーザー回答: この場で廃止確定。
- 確定判断: GD009
