# Integration Test Instructions — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元)。

## リグレッション(regression-first)

`bun test ./tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`(19 tests)— 新設3ケース(approve 往復 / skip 往復 / 封鎖解除)は consume(expectedPrompt null 化)まで assert。pre-fix 面切替で3ケースとも起票文言 verbatim の赤 → 復元後 19 pass(conductor 再演 — code-summary.md)。

## 周辺整合

- guard negative(rejects incomplete manual lifecycle requests)グリーン維持
- フル: `bash tests/run-tests.sh --ci` exit 0(RESULT: PASS)
