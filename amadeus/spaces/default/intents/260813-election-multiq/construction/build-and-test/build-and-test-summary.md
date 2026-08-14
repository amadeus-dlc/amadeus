# Build and Test 要約

入力は U1–U8 の [code-generation-plan](../election-canonical-schema/code-generation/code-generation-plan.md) と [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) である。Test Strategy は Comprehensive、Depth は Standard。実測は [build-test-results](./build-test-results.md)。

## ビルド状態

- typecheck / source-only / coverage registry / `bun run build` は終了 0。
- lint は終了 0。警告は既存ベースラインで、新規エラーはない。

## テスト種別

| 種別 | 成果物 | 実測 |
| --- | --- | --- |
| Unit | [unit-test-instructions](./unit-test-instructions.md) | 30 pass |
| Integration / E2E | [integration-test-instructions](./integration-test-instructions.md) | 84 pass |
| Performance | [performance-test-instructions](./performance-test-instructions.md) | NFR-2 未実施。未検証面 |
| Security | [security-test-instructions](./security-test-instructions.md) | source-only と coverage registry は緑 |

## 準備判定

- build-ready: はい。
- test-ready: Intent 契約の focused suite は緑。size / complexity ゲートも修復済み。repo-wide `test:ci` の残り失敗は Intent 外。
- deployment-ready: Operation は SKIP。次は tla-authoring、そのあと PR 収束。
