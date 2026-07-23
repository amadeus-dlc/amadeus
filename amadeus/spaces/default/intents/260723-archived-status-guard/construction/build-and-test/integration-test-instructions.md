# Integrationテスト手順

## 対象

各 `code-generation-plan.md` と `code-summary.md` に記録されたmigration、archive/unarchive transaction、selector・next・unpark guard、配布境界を検証する。

## 実行方法

```sh
bun test tests/integration/t257-status-registry-migration.test.ts \
  tests/integration/t258-lifecycle-transaction.test.ts \
  tests/integration/t259-guard-corpus.test.ts \
  tests/integration/t259-guard-integration.test.ts
```

fixtureは一時ディレクトリに生成し、registry・cursor・auditの変更前後bytesを比較する。成功条件は、durable recovery全境界、8並行競合、archived拒否の副作用なし、AST sink分類0漏れである。
