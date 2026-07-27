# Build Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

依拠箇所: 対象は code-generation-plan.md Step 3-4 の 3 PR(#1576/#1577/#1578)。docs-only 変更(code-summary.md の NFR-2 実測)のためビルド産物はない。

## ビルド手順

- 本 intent はドキュメントのみの変更であり、ビルド対象の成果物(dist/self-install)は変更しない。`bun run dist:check` / `bun run promote:self:check` は不変 green が期待値(PR CI の path filter でも同判定)
- 検証時の再現手順: 各 PR ブランチを checkout し `bun test tests/unit/t174-docs-legacy-refs-gate.test.ts` を実行

## 対象外(N/A、反証可能根拠)

- コンパイル・パッケージング: 変更ファイルは README*.md と docs/ のみ(code-summary.md「NFR-2 遵守 — git diff --name-only 実測」)。ビルド入力に docs は含まれない(scripts/package.ts の対象は packages/framework 配下)
