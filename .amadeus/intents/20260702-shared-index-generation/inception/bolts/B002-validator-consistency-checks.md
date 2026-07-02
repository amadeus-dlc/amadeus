# B002 validator の不整合検査

## 概要

共有インデックスと配下モジュールの不整合（行の過不足、内容の不一致、生成マーカーの欠落）を fail にする検査を validator に追加する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-shared-index-generation-contract/design.md)

## 完了条件

- 行の過不足、内容の不一致、生成マーカーの欠落がそれぞれ fail として報告される。
- 検査は workspace 検証の既存入口から実行される。
- 不整合を注入すると fail になる検証が、実装前に失敗した記録（RED）を持ち、実装後に pass する。
- 生成規則との整合が、B001 のスクリプトの再利用または共通化で保たれている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/AmadeusValidator.ts` と昇格先 | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` または `dev-scripts/evals/` 配下の検証 | 未確認 | なし | 未確認 |

## 未確認事項

- 検査の実装方式（再生成結果との完全一致か、行単位の対応か）は Construction Functional Design で確定する。
