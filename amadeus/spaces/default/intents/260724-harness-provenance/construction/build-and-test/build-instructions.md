# Build Instructions — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 前提

- Bun はリポジトリが指定する実行基盤を使う。
- 依存関係は `bun install --frozen-lockfile` で復元し、lockfile を変更しない。
- 外部サービス、database、container、credential、追加環境変数は不要。
- ハーネス種別の検証では、各テストが `AMADEUS_HARNESS_TYPE`、`AMADEUS_HARNESS_DIR`、`CLAUDECODE` を隔離する。

## ビルド手順

1. `bun run typecheck`
2. `bun scripts/package.ts --check`
3. `bun run promote:self:check`
4. `bun tests/gen-coverage-registry.ts --check`
5. `bun tests/complexity-gate.ts --check`
6. `bun run lint`

`package.ts --check` は `packages/framework/core/` の正本と Claude Code / Codex / Cursor / OpenCode / Kiro CLI / Kiro IDE の6配布形態を照合する。`promote:self:check` は4つの self-install 面を照合する。

## 成功条件

- 全コマンドが exit 0。
- TypeScript source/test の型エラーが0件。
- dist/self-install/coverage registry/complexity baseline に未反映 drift がない。
- lint error が0件。既存 warning は新規差分と分離して記録する。

## トラブルシューティング

- `tsc: command not found`: `bun install --frozen-lockfile` を実行後、同一コマンドを再実行する。
- dist drift: 正本だけを修正し、`bun scripts/package.ts` で再生成する。生成物を手編集しない。
- self-install drift: `bun run promote:self` で同期し、再度 `promote:self:check` を実行する。
- registry drift: `bun tests/gen-coverage-registry.ts` で正本を再生成し、`--check` を再実行する。
