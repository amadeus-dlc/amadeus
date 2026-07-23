# Unitテスト手順

## 対象

`status-registry`、`lifecycle-transaction`、`guard-integration` の `code-summary.md` に対応するstrict parser、遷移行列、journal topology、不可分validated targetを検証する。

## 実行方法

```sh
bun test tests/unit/t257-status-registry.test.ts \
  tests/unit/t258-lifecycle-transaction.test.ts \
  tests/unit/t259-archived-intent-guard.test.ts
```

各テストは独立fixtureを使用し、許可経路に加えて未知status、無効遷移、失効lock context、forged targetを含む。期待値は全件pass、失敗0であり、coverage registryのfreshnessも全体CIで確認する。
