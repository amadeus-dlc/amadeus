# B004 workspace と examples の migration

## 概要

workspace の既存 Intent モジュールファイルへ概要と依存（理由付き）の見出しを追加し、`intents.md` と `discoveries.md` を再生成結果で置き換え、examples の 4 snapshot を新契約に適合させる。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-shared-index-generation-contract/design.md)

## 完了条件

- workspace の既存 Intent モジュールファイル（21 件以上）が見出し契約を満たす。
- workspace の `intents.md` と `discoveries.md` が再生成結果と一致し、validator が pass する。
- examples の 4 snapshot が新契約の下で `npm run validate:all` の pass を維持する。
- migration の前後で、概要、依存、依存理由の情報が失われていない。

## 依存

- B001
- B002
- B003

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/intents/*.md`、`.amadeus/intents.md`、`.amadeus/discoveries.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `examples/*/.amadeus/` 配下のモジュールファイルと index | 未確認 | なし | 未確認 |

## 未確認事項

- examples の migration を同じ PR で扱うか後続 PR に分けるかは Task Generation で確定する。
- 既存 Intent の概要文の出典（現行 index の文言を正とするか）は migration 時に確定する。
