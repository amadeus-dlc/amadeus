# 技術スタック

## Runtime と言語

Amadeus is implemented as TypeScript running on Bun with ESM-style imports.

Observed root-level tooling:

- `package.json`: root package scripts for build, drift check, self-promotion, typecheck, lint, and tests.
- `tsconfig.json`: includes `core/hooks/*.ts`, `core/tools/*.ts`, `harness/*/*.ts`, and `scripts/*.ts`.
- `biome.json`: lints repository sources and excludes root `dist/**`.

Layout implication: TypeScript and Biome configuration are currently expressed in root-level glob terms. A package-owned layout requires either moving these configs into a package or broadening root config globs to cover both current and future package paths.

## ビルドとテストツール

| ツール | 用途 | レイアウト結合 |
| --- | --- | --- |
| Bun | script runner、TypeScript 実行、tests | root scripts と package.json |
| TypeScript | static type checking | root `core`, `harness`, `scripts` の include |
| Biome | lint | root source glob と `dist/**` 除外 |
| GitHub Actions | CI drift guard | root `bun run dist:check`, `bun run promote:self:check` |
| Bun test / custom runner | unit/integration/e2e tests | fixtures anchored to root `dist` |

## 配布ツールチェーン

The most relevant technology for Issue #610 is the local packaging toolchain.

- `scripts/package.ts` is the build orchestrator for 配布物s.
- `scripts/promote-self.ts` is the dogfood install/check orchestrator.
- `scripts/manifest-types.ts` provides the manifest data model.
- Harness-specific emitters, especially `harness/codex/emit.ts`, add 配布物-specific 出力s.

These are not isolated package scripts. They encode repository topology and should be treated as architecture components during normalization.

## バージョンと依存関係の注記

This scan did not introduce a new dependency version inventory because Issue #610 is about ファイルシステム/package boundaries rather than library upgrade risk. The next design stage should only pull exact package versions when comparing implementation cost or CI impact.

The key stack constraint is that Bun can execute TypeScript directly from current root paths. If scripts move under `packages/<name>/scripts`, relative imports and execution commands must be updated together.
