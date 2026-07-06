# Integration Test Instructions

Unit: u001-presence-evidence（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の統合テストは追加しない。文書が説明する統合挙動（`declare-docs-only` の evidence 検証から `GUARD_EXEMPTED` 記録まで）は、既存のエンジン sandbox e2e（`npm run test:it:engine-e2e`）と関連 eval が既に検証している（[code-summary.md](../u001-presence-evidence/code-generation/code-summary.md) の FR-2.2 判断を参照）。

## 実行方法

```sh
npm run test:it:engine-e2e
```

`npm run test:all` に含まれる。結果は [build-test-results.md](build-test-results.md) を参照。
