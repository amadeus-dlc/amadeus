# Integration Test Instructions

Unit: persona-loading（Test Strategy: Minimal、scope: bugfix）

## 上流入力

検証対象は code-generation の実体 2 ファイル修正である。内訳は [code-generation-plan.md](../persona-loading/code-generation/code-generation-plan.md) と [code-summary.md](../persona-loading/code-generation/code-summary.md) を参照する。

## 適用判断

統合検証は repo 標準検証で行う。`stage-protocol.md` はエンジンの forwarding loop と 38 stage skill が参照する共有プロトコルであり、`parity-map.json` は parity eval の入力であるため、次の 2 系統で他機構との整合を確認する。

## 手順

1. `npm run test:all` を実行し、engine e2e、parity、rename-leftovers を含む全 eval が pass することを確認する。
2. `npm run parity:check` を実行し、exceptions[] の reason 更新後も宣言済み差分として検査が pass することを確認する。

結果は [build-test-results.md](build-test-results.md) を参照する。
