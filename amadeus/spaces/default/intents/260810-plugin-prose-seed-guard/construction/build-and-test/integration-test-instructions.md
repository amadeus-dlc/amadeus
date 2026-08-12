# Integration Test Instructions

## 入力と対象要件

- `code-generation-plan.md` Step 2〜5 / FR-1 / FR-3 / FR-4 / FR-5
- `code-summary.md` の transform/seed 等価性と compose 合成面
- 対象: t532（全 manifest 等価性）と t2790（実 CLI compose）

## 実行

```bash
bun test --timeout 180000 \
  tests/integration/t532-plugin-prose-transform-seed-equivalence.integration.test.ts \
  tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts
```

## Consumer A/B 再演

- repo 外の空ディレクトリで旧形 `bun plugins/formal-model-check/tools/run-model-check.ts` を実行する
- 同じ場所から新形 `bun <workspace>/.codex/plugins/formal-model-check/tools/run-model-check.ts` を実行する
- 旧形は Module not found、新形は CLI の型付き引数検証まで到達すること

## 成功条件

- integration: 15 tests、0 failed
- 8 manifests / 7 distinct harness directories で byte equality
- compose 後の3 stage に未解決 token と root-relative plugin command がない
- A/B の新形に Module not found がない
