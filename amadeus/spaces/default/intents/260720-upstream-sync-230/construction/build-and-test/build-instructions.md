# Build Instructions — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

本書は各ユニットの `code-generation-plan.md` が宣言し `code-summary.md` が実測記録したビルド手順を、ステージ横断の単一手順へ集約する。測定 ref: `965f609174006b643d385f50bd090209881e8e18`(branch `resume-usync-230-takeover`)。

## 前提

- Bun(ランタイム/パッケージマネージャ)。`bun install` で開発依存(typescript、Biome 等)を導入する。
- ビルド成果物は生成物であり手編集しない(`dist/` 6ハーネス+self-install 4面)。

## ビルド手順

1. `bun install` — 開発依存の導入(初回のみ)。
2. `bun scripts/package.ts` — 正本(`packages/framework/core/` + `packages/framework/harness/<name>/`)から `dist/` 6ハーネスツリーを再生成。plugin source が 0件の場合の出力は従来 baseline と byte-identical(FR-6 item 19、U09)。
3. `bun run promote:self` — self-install 4面(.claude/.codex/.cursor/.opencode)へ投影。
4. 同期検査: `bun run dist:check` および `bun run promote:self:check` — 正本と生成物のドリフト 0 を機械確認。

## 型検査・静的検査

- `bun run typecheck` — `tsc --noEmit`(base + tests tsconfig)。
- `bun run lint:check` — Biome(フォーマッタ無効)。
- `bun tests/complexity-gate.ts --check` — 複雑度ゲート。
- `bun tests/gen-coverage-registry.ts --check` — coverage registry 鮮度。
