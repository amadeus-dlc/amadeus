# Unit Test Instructions

Unit: u001-lifecycle-inputs（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の unit test は追加しない。本 Intent はコード変更を含まない文書変更であり、検証の実体は実測突き合わせ（[measurement-correction-log.md](../u001-lifecycle-inputs/code-generation/measurement-correction-log.md)）と §12a review である。

## 回帰確認

文書が記述するエンジン契約（stage frontmatter、rules_in_context、scope 定義）の既存検証は `npm run test:all`（contracts:check、test:it:all、engine-e2e）に含まれており、全段通過で回帰なしを確認する。結果は [build-test-results.md](build-test-results.md) を参照。
