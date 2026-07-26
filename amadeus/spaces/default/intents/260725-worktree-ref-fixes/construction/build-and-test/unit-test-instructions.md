# Unit Test Instructions — 260725-worktree-ref-fixes

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-summary.md` のテスト面(t202 改訂+test 7/8 新設)を対象として引用した。

## 対象と実行

- `bun test tests/unit/t202-hook-project-dir-worktree-marker.test.ts` — resolveProjectDirFromHook の rung 契約(改訂 test 2: payload cwd 不在時は env が勝つ / 新設 test 7: marker 付き payload cwd が env に勝つ / 新設 test 8: marker 無し payload cwd は棄却)。実測 8 pass / exit 0(2026-07-26T01:31Z)
- 実 FS/process を要する検証は integration 層に置く(fs-tests-integration-first)— unit 層への新規追加は t202 改訂のみ

## 判定基準

- t202 の新契約はユーザー裁定 Q1=A に基づくテスト契約変更であり、既存他テストの期待値は不変(NFR-1)
