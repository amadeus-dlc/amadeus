# 統合テスト手順 — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) にある runner、workflow、consumer、guard の接続契約を検証する。

## セットアップと実行

```sh
TEST_TIME_FACTOR=2 bun test \
  tests/integration/t-test-time-factor-guard.integration.test.ts \
  tests/integration/t-test-time-factor-guard.test.ts \
  tests/integration/t-test-time-factor-workflows.test.ts
TEST_TIME_FACTOR=2 bun tests/run-tests.ts --integration
TEST_TIME_FACTOR=2 bun run test:ci
```

外部モデル基盤を必要とする live suite は、基盤がない場合に runner の正規規則で skip する。

## 期待するカバレッジ

- CI、coverage、PBT、release、plugin conformance の係数 `2` 配線を確認する。
- runner bypass が共通 CLI seam から係数化済み `--timeout` を受け取ることを確認する。
- 未分類sink、allowlist不正、count drift、stale entry、final override再scale、二重scaleを fail-closed に拒否する。
- 全体実行で smoke / unit / integration / e2e / harness の既存契約を維持する。

## 成功条件

- `bun run test:ci` が `RESULT: PASS`、failed files / assertions ともに `0` で完了する。
