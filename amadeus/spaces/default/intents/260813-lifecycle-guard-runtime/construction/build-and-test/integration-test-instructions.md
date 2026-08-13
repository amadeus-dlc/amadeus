# Integration Test Instructions — 260813-lifecycle-guard-runtime

上流入力: `code-generation-plan.md` Steps 3-9 と `code-summary.md` の統合テスト群。filesystem/process を使うため integration 層に配置(unit allowlist 不変)。

## 対象

- `tests/integration/t2771-lifecycle-guard-census.integration.test.ts`(8 tests)— 4 checkpoint + jump の commit 経路 census(FR-2 の迂回不能測定述語。落ちる実証済み)
- `tests/integration/t2771-lifecycle-guard-checkpoints.integration.test.ts`(30 tests)— 7 観点 × checkpoint 対照(FR-8。タイムアウトは同期実装のため構造的到達不能と根拠明記)
- `tests/integration/t2771-lifecycle-guard-regression.integration.test.ts`(6 tests)— 拒否文言バイト一致・off-switch/cutoff/G9 無変更(FR-7)
- `tests/integration/t511-blocking-sensor-gate.integration.test.ts`(Runtime 経由 seam へ更新)

## 実行

```sh
bun test tests/integration/t2771-lifecycle-guard-census.integration.test.ts \
         tests/integration/t2771-lifecycle-guard-checkpoints.integration.test.ts \
         tests/integration/t2771-lifecycle-guard-regression.integration.test.ts \
         tests/integration/t511-blocking-sensor-gate.integration.test.ts
```

## 環境

- 各テストは temp fixture project を自作する。実 record への書込なし。
