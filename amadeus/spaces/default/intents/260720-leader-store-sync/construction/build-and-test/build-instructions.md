# ビルド手順 — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 前提

- Bun 1.3 系、TypeScript、既存依存を使用する。新規依存・環境変数・外部サービスは不要。
- リポジトリルートで実行し、AWS 認証が無効な場合の live SDK skip は既存 CI 契約として扱う。

## 実行と合格条件

1. `bun run typecheck` — 両 tsconfig が exit 0。
2. `bunx @biomejs/biome check --max-diagnostics=100 scripts/amadeus-leader-sync.ts tests/unit/t245-amadeus-leader-sync.test.ts tests/integration/t245-amadeus-leader-sync.integration.test.ts` — warning 0、exit 0。
3. `bun tests/gen-coverage-registry.ts --check` — freshness、guard、ratchet が成立。
4. `bun run dist:check` — 6 harness の配布面が正本と一致。
5. `bun run test:ci` — CI profile の完走値を `build-test-results.md` に記録する。

## 障害時の切り分け

- 失敗ファイルを単独再実行し、実装対象 t245 の回帰と、ambient な実行時間超過を分離する。
- 全体負荷由来でも赤を green と表現せず、初回値・単独再実行値・GitHub CI の三面を別々に記録する。
