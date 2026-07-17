# Unit Test Instructions — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/code-generation/code-summary.md`(AC-3 系)、`../eoc1-gate-guard/code-generation/code-generation-plan.md`。

## 実行手順

- `bun test tests/integration/t-eoc1-gate-evidence.test.ts` — in-process 11(述語6理由全列挙+配線3分岐 captureExit)。判定: 0 fail
- `bun test tests/unit/gen-coverage-registry.test.ts` — registry 鮮度(42 tests)
