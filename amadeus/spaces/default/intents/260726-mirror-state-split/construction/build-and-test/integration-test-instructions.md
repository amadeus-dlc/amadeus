# Integration Test Instructions — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/ — 検証対象の Steps・FR 対応・実測 exit code の導出元)。

## リグレッション(regression-first — code-generation-plan.md Step 1)

- `bun test tests/integration/t300-amadeus-mirror-state-read.integration.test.ts` — real-create→status / 404 divergence / 重複 create 拒否 / 負の対照2(5ケース)
- 落ちる実証: pre-fix 面切替で 3 fail(#1547a/b の起票文言 verbatim 再現)→ 復元後 5 pass(code-summary.md「落ちる実証」節)

## 周辺整合

- `bun test tests/integration/t232-amadeus-mirror.integration.test.ts`(C6 dispatch / precondition 維持)
- `bun test tests/integration/t265-engine-boundary.integration.test.ts`(boundary 判定の v1 seed 化 — 28 pass)
- フル: `bash tests/run-tests.sh --ci` exit 0(RESULT: PASS)
