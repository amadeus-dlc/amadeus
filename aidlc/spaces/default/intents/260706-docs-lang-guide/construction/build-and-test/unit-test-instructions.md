# Unit Test Instructions

Unit: docs-lang-guide（Test Strategy: Minimal）

## 適用判断

コード単体テストは不適用とする（実装コード・テストコードの変更なし = C-3）。文書に対する要求駆動の検証は次で行った。

- H2 見出し構成が functional-design の設計表（安定アンカー）と一致すること（reviewer が英日 4 文書で確認）。
- 実測アンカー（rules_in_context 解決、template 解決順、cid 新形式、runtime-graph スキーマ）の実在（reviewer が file:line で裏取り。22→32 の数値訂正 1 件を検出・修正済み）。
- 対訳パリティ（英日で意味ドリフトなし）と BR-3 リンク規約の遵守。
