# Build Instructions — p3-repair-batch6

本 intent は既存リポジトリのバグ修正バッチ(6件、うち5件 restart-loss regression)であり、ビルドは既存手順をそのまま用いる(新規ビルド機構なし)。

## 手順

1. `bun install --frozen-lockfile` — 依存導入(tsc 等の devDependencies を含む)
2. `bun scripts/package.ts` — dist 再生成(正本 core/harness → dist 4系統)
3. `bun run promote:self` — セルフインストール昇格

## 検証コマンド

- `bun run typecheck`(tsc --noEmit ×2 構成)
- `bun run lint`(Biome)/ `bun run lint:check`(#873 で root/framework に追加された check-only、linter sensor tier-1 の検出対象)
- `bun run dist:check` / `bun run promote:self:check`(ドリフトガード)
- `bun tests/complexity-gate.ts --check`(CCN ラチェット、#837)
- `bun tests/gen-coverage-registry.ts --check`(coverage registry 鮮度)
