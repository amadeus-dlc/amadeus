# 技術スタック

## ランタイムと言語

Amadeus は TypeScript(ESM）を Bun ランタイム上で直接実行する構成である。ビルドステップを持たず、`bun scripts/package.ts` のように `.ts` ファイルをそのまま実行する。

- `package.json`(root）: build、drift check、self-promotion、typecheck、lint、test の root スクリプト群。`"workspaces": ["packages/*"]` を持つ Bun workspace 構成。
- `tsconfig.json`: `packages/framework/core/hooks/*.ts`、`packages/framework/core/tools/*.ts`、`packages/framework/harness/*/*.ts` を include。
- `tsconfig.tests.json`: `tests/` 用の型検査設定。
- `biome.json`: lint 設定。ただし `package.json` の `"lint"` スクリプトは `bunx @biomejs/biome check tests/` であり、対象は `tests/` のみ。`packages/framework` と `scripts/` は typecheck の対象ではあるが lint の対象外(既存の狭いスコープ)。

## ビルドとテストツール

| ツール | 用途 | 備考 |
| --- | --- | --- |
| Bun 1.3.13(pinned in CI） | script runner、TypeScript 実行、テスト実行 | `oven-sh/setup-bun@v2` で固定 |
| TypeScript(`typescript ^6.0.3`） | 静的型検査(`tsc --noEmit`、2つの tsconfig） | ビルド出力は生成しない |
| Biome 2.4系 | lint(`tests/` のみ） | フォーマッタは無効 |
| GitHub Actions | CI(単一 ubuntu-latest job） | typecheck → lint → dist:check → promote:self:check → `bash tests/run-tests.sh --ci` |
| bun:test + 自作ランナー | smoke(12)/unit(120)/integration(100)/e2e(64）= 計296 `.test.ts` | `tests/run-tests.ts`/`tests/run-tests.sh` がティア分割・`--ci` フラグを扱う |

## ランタイム依存関係(devDependencies のみ、実行時依存はゼロ)

- `@anthropic-ai/claude-agent-sdk` 0.3.158
- `@xterm/headless` ^5.5.0(e2e の TUI 駆動）
- `bun-types` ^1.3.13
- `node-pty` 1.1.0(e2e の TUI 駆動）
- `typescript` ^6.0.3(型検査専用）

現行の framework コード(`packages/framework`, `scripts/`）には実行時依存が一切なく、「Bun があれば動く」という前提を保っている。

## `@amadeus-dlc/setup` 導入に伴う技術スタックへの影響

- `packages/setup` は npx/bunx から実行可能な JS へビルドされる想定であり、これは「ビルドせず TypeScript を直接実行する」という既存原則からの意図的な逸脱になる。ビルドツール(tsc、esbuild、bun build 等のいずれを使うか)は未決定。
- npm publish が必要になるため、GitHub tag アーカイブの fetch(HTTP クライアント、圧縮アーカイブの展開)という、これまで存在しなかった実行時ロジックが `packages/setup` には必要になる。実行時依存を追加するかどうかは team.md の「実行時依存を追加する場合は理由を文書化する」ルールに従って判断する。
- `packages/setup` に対する lint(biome)は現状の `"lint": "bunx @biomejs/biome check tests/"` に含まれていないため、明示的な wiring が必要。
- publish 用の CI ワークフロー(現状ゼロ）と、`npm pack --dry-run` 等による実ツールベースの公開物検証が新規に必要(project.md cid:requirements-analysis:c4 参照）。

## バージョンと依存関係の注記

`AMADEUS_VERSION`(framework コンテンツバージョン、現在 `1.1.0`）と `@amadeus-dlc/setup` パッケージバージョンは独立したライフサイクルを持つべきである。root `package.json` と `packages/framework/package.json` はいずれも `0.0.0` の placeholder であり、これまで publish された npm パッケージは存在しない。`packages/setup/package.json` が実質的にこのリポジトリで最初の実 publish 対象になる。
