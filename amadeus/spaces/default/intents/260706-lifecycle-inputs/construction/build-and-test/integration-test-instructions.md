# Integration Test Instructions

Unit: u001-lifecycle-inputs（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の統合テストは追加しない。文書が説明するステージ間の入出力関係は、既存のエンジン sandbox e2e（`npm run test:it:engine-e2e`）が実挙動として検証している（[code-generation-plan.md](../u001-lifecycle-inputs/code-generation/code-generation-plan.md) の検証方法を参照）。

## 実行方法

```sh
npm run test:it:engine-e2e
```

`npm run test:all` に含まれる。結果は [build-test-results.md](build-test-results.md) を参照。
