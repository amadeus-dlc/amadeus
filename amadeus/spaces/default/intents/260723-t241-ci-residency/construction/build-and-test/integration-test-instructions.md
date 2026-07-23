# Integration Test Instructions — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## 対象

- **移設本体(FR-1/FR-3)**: `tests/integration/t241-election-machine-executor.integration.test.ts` — FR-0 機械実行器の常設証明が --ci で実際に走ること(実行痕跡 verbatim)が本 intent の受け入れ中核
- **再発ガード(NFR-1)**: `tests/integration/t257-ci-residency-marker-guard.integration.test.ts` — CI-resident マーカー保持テストが --ci 実行層に在ることを assert(走査境界は tests/ 配下 — e5 レビュー留保の契約明確化)

## 実行

```
bun test tests/integration/t241-election-machine-executor.integration.test.ts tests/integration/t257-ci-residency-marker-guard.integration.test.ts
bash tests/run-tests.sh --ci   # 全層回帰+t241 実行痕跡の確認
```

## 判定

個別: exit 0(4 tests / 2 files 全数)。フルスイート: RESULT: PASS+`START/PASS/DONE t241-...integration.test.ts` 行の実在(FR-3 の実行痕跡)。
