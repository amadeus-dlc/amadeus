# Unit Test Instructions

Unit: u001-presence-evidence（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の unit test は追加しない。本 Intent はコード変更を含まない文書変更であり、[code-generation-plan.md](../u001-presence-evidence/code-generation/code-generation-plan.md) の FR-2.2 の確定（新規 eval は作らず、既存 test:all の回帰確認で足りる）に従う。

## 回帰確認

文書が言及する実装（`verifyDocsOnlyEvidence`、`GUARD_EXEMPTED` emit、`humanActedSinceGate`）の既存検証は `npm run test:it:all` と `npm run test:it:engine-e2e` に含まれており、`npm run test:all` の全段通過で回帰なしを確認する。結果は [build-test-results.md](build-test-results.md) を参照。
