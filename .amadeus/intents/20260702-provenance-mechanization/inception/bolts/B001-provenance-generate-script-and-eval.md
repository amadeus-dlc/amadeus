# B001 provenance:generate の dev-script と eval の実装

## 概要

`dev-scripts/` に、作業実行の事実を実測して policies.md の最低記録項目 9 項目に対応する機械可読 JSON を生成する `provenance:generate` を新設し、eval を先行追加（RED → GREEN）で実装する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-provenance-record-contract/design.md)

## 完了条件

- `provenance:generate` が policies.md の最低記録項目 9 項目に対応する値をすべて実測して出力する。
- 出力先が対象 Intent 直下の `provenance/` ディレクトリであり、実行単位の JSON を累積する。
- 実測は git コマンドとファイルハッシュ計算だけで完結し、人間の手書きを必要としない。
- eval が実装前の失敗（RED）を記録し、repo の標準検証（`test:it:*`）から実行される。

## 依存

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/`（`provenance:generate` 新設） | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/` 配下の eval（新設） | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `package.json`（`provenance:generate` の実行入口） | 未確認 | なし | 未確認 |

## 未確認事項

- JSON スキーマの詳細型と命名、`provenance/` 配下のファイル命名規則、eval の置き場所は Task Generation と実装で確定する。
