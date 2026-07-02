# B001 再生成スクリプトと検証

## 概要

`intents.md` と `discoveries.md` を配下モジュールと `state.json` から再生成する同梱スクリプトを、検証先行（RED から GREEN）で実装する。
Intent モジュールファイルの概要と依存（理由付き）の見出し契約の定義を含む。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-shared-index-generation-contract/design.md)

## 完了条件

- 再生成スクリプトが `skills/amadeus-validator/scripts/` に置かれ、workspace を指定して実行できる。
- 同じ入力から常に同じ出力が得られ、出力の先頭に生成マーカーが含まれる。
- 決定論性、冪等性、並行統合シナリオの検証が実装前に失敗した記録（RED）を持ち、実装後に pass する。
- 見出し契約を満たさないモジュールに対して、不足を示して失敗する。

## 依存

なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（新設）と `.agents/skills/amadeus-validator/scripts/` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` または `dev-scripts/evals/` 配下の検証 | 未確認 | なし | 未確認 |

## 未確認事項

- スクリプトの名前、引数体系、行の並び順規則、見出しの抽出規約は Construction Functional Design で確定する。
- 検証の置き場所と repo の test chain への組み込みは Task Generation で確定する。
