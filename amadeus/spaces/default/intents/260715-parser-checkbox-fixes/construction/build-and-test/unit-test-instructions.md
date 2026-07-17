# Unit Test Instructions — parser-checkbox-fixes

- 新規: `tests/unit/t-practices-promote-contract-seam.test.ts`(#1013 純関数3つ — parseRuleLines / validateRuleLines / parseRuleSectionsOrFail の全分岐。small/pure、size-purity 準拠)
- 回帰確認: `tests/unit/t194-recompose.test.ts`(別関数 handleRecompose の非影響)/ `tests/unit/t27.test.ts`(status 表示)
- 実行: `bun test tests/unit/t-practices-promote-contract-seam.test.ts tests/unit/t194-recompose.test.ts tests/unit/t27.test.ts`
