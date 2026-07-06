# Team-Level Rules

> このチームが承認したプラクティスと是正事項。org.md を上書きする。practices-discovery の承認ゲートで記入される。原則としてゲート経由で編集し、直接編集しない。

## Way of Working

トランクベース開発。すべての作業は短命ブランチから Pull Request 経由で `main` にマージする(履歴上、PR はマージコミットで統合されている)。

このリポジトリの鉄則: 編集するのは `core/`(または `harness/<name>/`)であり、`dist/` は決して手編集しない。編集後は `bun scripts/package.ts` で全 `dist/<harness>/` を再生成し、`bun scripts/package.ts --check`(ドリフトガード、CIでも実行)でパリティを確認してからコミットする。

ファイル・ディレクトリ・コマンド・フラグを追加/削除/改名したときは、`docs/` と `README.md` を grep して古い参照を同一コミット内で更新する。

## Walking Skeleton

<!-- practices-discovery で承認された内容。例: -->
<!-- walking skeleton は実施しない — デプロイパイプラインが成熟しており、現在の成熟度ではスライスのコストが価値を上回るため。 -->

## Testing Posture

テストはすべて TypeScript(`tests/` 配下の `t*.test.ts`)で、bun で実行する。4層構成: smoke(構造検証)/ unit(単一コンポーネント)/ integration(コンポーネント間契約)/ e2e(ライフサイクル全体)。

- 実行: `bash tests/run-tests.sh`(または `bun tests/run-tests.ts`)
- デフォルトおよび `--ci` プロファイル = smoke + unit + integration
- リリース前は `--release`(e2e を含む全レベル)を通す
- マージ前に `bun run check`(typecheck + lint)をグリーンにする

## Deployment

デプロイ基盤は持たない。配布形式は「ユーザーが `dist/<harness>/` を自プロジェクトへコピーする」方式(例: `cp -r dist/claude/.claude/ your-project/.claude/`)。

リリースはバージョンタグで切る。パッチ版はリリース準備サイクル中に積み上げ、マイナーカット(例 `v0.7.0`)で統合する。

## Code Style

- リンター: Biome(`biome.json`)。`bun run lint` で実行。フォーマッタ機能は無効化しており、Prettier も使わない。
- 型検査: `tsc --noEmit`(`tsconfig.json` と `tsconfig.tests.json` の両方)。`bun run typecheck` で実行。
- 命名: フレームワークのファイルはすべて `amadeus-` プレフィックス(tools / hooks / agents / sensors)。
- ツールとフックはすべて `.ts` で bun 実行。実行ビット(chmod +x)は不要 — macOS / Linux / Windows で同一に動作させるための規約。

## Forbidden

- NEVER `dist/<harness>/` 配下を手編集する — 生成物であり、`bun scripts/package.ts --check` が CI で失敗する

## Mandated

- ALWAYS `core/` または `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成して同一コミットに含める

## Corrections

<!-- 自己学習ループがここに追記する。 -->
