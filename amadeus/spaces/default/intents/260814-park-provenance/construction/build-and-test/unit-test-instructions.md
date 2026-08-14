# Unit Test Instructions — 260814-park-provenance

上流入力: `code-generation-plan.md`(S2-S4 の TDD)と `code-summary.md`。

- `tests/unit/t17.test.ts` — park の CLI 境界契約(受理 / turn 不在拒否 / consume-once の3件へ書換済み、計 87 tests)。実行: `bun test tests/unit/t17.test.ts`(builder 実測 87 pass / 0 fail)
- FR トレース: FR-1/FR-2/FR-3 → t17、FR-4/FR-5 → integration(下記)。カバレッジ正本は PR CI の Patch/Project Coverage Gate(push-first 方針によりローカル coverage は advisory 判定なしのまま委譲。既知リスク: `amadeus-lib.ts` の新規 resolution 行が spawn 経由のみの到達 — CI が赤なら in-process unit test で閉じる)
