# Unit Test Instructions

## 対象

`code-generation-plan.md` と `code-summary.md` の要件に基づき、Delivery Bolt member集合の正規化、provenance、attestation、engine-singleton authorityを検証する。

## 実行

```sh
bun test --timeout 120000 \
  tests/unit/t-delivery-bolt-membership.test.ts \
  tests/unit/t532-pr-convergence-provenance.test.ts \
  tests/unit/t534-pr-convergence-report-attestation.test.ts
```

## 成功条件

happy pathに加え、空集合・重複・foreign member・改ざん・head不一致を含む全テストが成功すること。固定の件数目標ではなく、要件とリスク境界を網羅する。
