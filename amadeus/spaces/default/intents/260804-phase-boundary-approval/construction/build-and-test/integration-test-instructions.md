# Integration Test Instructions — fix-2143-phase-boundary-approval

上流入力(consumes): `code-generation-plan.md` S1/S3/S4、`code-summary.md` の Red/Green 実測。

## 対象と実行

- `bun test tests/integration/t-harness-approval-order-contract.test.ts` — FR-1/FR-2/FR-5e: skill-bearing 全ハーネス SKILL.md の順序契約文言と `record` 手順の存在検査(全数走査、ハーネス名非列挙)。3ケース。
- `bun test tests/integration/t-autonomy-phase-boundary-artifact.integration.test.ts` — FR-4: autonomy full × phase boundary(phase-check 不在で auto-approve 拒否 / 著述後成功)。2ケース。
- `bun test tests/integration/t-advisory-choice-record.test.ts` — FR-5: `record` サブコマンド(15ケース: 正常系 / HUMAN_TURN 不在拒否 / pending 不在拒否 / 提示未記録拒否 / 同一choice冪等 / 異choice競合拒否 / 二重消費拒否ほか)。
- 非退行: `bun test tests/integration/t-advisory-human-choice-boundaries.test.ts tests/integration/t-advisory-human-choice-domain.test.ts`(既存 prompt 経路)。

## 実測

2026-08-05: 上記+t413 の合計 54 pass / 0 fail(承認前の再実測)。既存経路非退行 102 pass(code-summary.md §S4)。
