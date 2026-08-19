# Unit Test Instructions — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md` Step 1(FR-6 の Red 先行)と `code-summary.md` の FR-1 / FR-4 / FR-6 節。本 intent の実装は PR #2767(squash `34888d840`)で着地済みのため、本ステージが行うのは**新規作成ではなく検証と拡張の要否判定**である。

## フレームワークと実行

- ランナー: `bun test`(自作ハーネス `tests/run-tests.ts` が層別に駆動)
- 単体層のみ: `bun test tests/unit/<file>`
- 全層(CI と同形): `bun run test:ci`(`TEST_TIME_FACTOR=2`)

## 要件駆動のカバレッジ対応表

| FR | 固定するテスト | 実行コマンド |
|---|---|---|
| FR-1(`committed` kind が validator に載る) | `tests/unit/t115.test.ts`(directive 契約ポート) | `bun test tests/unit/t115.test.ts` |
| FR-1 / FR-4(kind ごとのフィールド検査と Stop 判定の非交差) | `tests/integration/t118.test.ts` | `bun test tests/integration/t118.test.ts` |
| FR-6(非終端 ack が `committed`、終端が `done`) | `tests/integration/t528-report-ack-kind.integration.test.ts` | `bun test tests/integration/t528-report-ack-kind.integration.test.ts` |

t528 は #2767 が Red 先行で追加したもので、negative control(read-only latch の bare `next` は依然 `done`)を同ファイルに持つ。

## 期待水準

- 上表の3ファイルはすべて 0 fail
- 本 intent はコード変更を持たないため**新規単体テストの追加は不要**。追加すると、着地済み実装に対する事後テストとなり TDD 既定(team.md § Testing Posture)の趣旨からも外れる
- カバレッジ目標: 本 intent の diff は `amadeus/` の record のみで、patch coverage の対象行が存在しない(`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus/'` → 0 行)
