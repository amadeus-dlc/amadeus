# Integration Test Instructions — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md` Step 8(検証)と `code-summary.md` の FR-2 / FR-3 / FR-5 節。

## 対象境界

本 unit が触った契約は engine(`amadeus-orchestrate.ts` の emit)と conductor 契約(SKILL/commands 8面 + docs 英日)の境界にあるため、統合層の関心は次の2つ:

1. **プロセス境界での directive 契約** — `report` の ack が `committed`、終端が `done` であることを、engine を実際に起動して確認する(`t528-report-ack-kind.integration.test.ts`、`t118.test.ts`)
2. **ハーネス投影の drift** — 正本(`packages/framework/core/`、`packages/framework/harness/<name>/`)と `dist/` / セルフインストール面が同期していること

## 実行

```
bun run test:ci                    # smoke + unit + integration(TEST_TIME_FACTOR=2)
bun run source-only:check          # source-only 境界
bun scripts/mirror-distribution-check.ts
bun scripts/mirror-docs-contract.ts
bun scripts/scan-public-projections.ts
bun run no-silent-drop -- --base-revision <merge-base>
bun tests/callsite-guard.ts --check
```

## 実行環境の注意(本 intent で実測)

- `bun run test:ci` をローカルで回すときは、`amadeus/spaces/<space>/intents/active-intent` カーソルを**退避してから**実行する。カーソルが実 intent を指したままだと OTel の one-workspace-per-process 不変量に当たり、`t-approve-batch-presence-guard.integration.test.ts` が決定的に 4 fail する(ablation の実測は `build-test-results.md`)。また実 record の監査シャードへテスト由来の `ERROR_LOGGED` が混入する
- `no-silent-drop` は `--base-revision` 必須。省略すると `BASELINE_INVALID` で exit 2 になる(合否ではなく引数不足)

## 期待水準

`Failed files: 0`。本 intent はコード変更を持たないため新規統合テストの追加は不要。
