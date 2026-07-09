# 技術スタック

## ランタイムと言語

変更なし。TypeScript(ESM)を Bun ランタイム上で直接実行する構成を維持している。

- root `package.json`: `"workspaces": ["packages/*"]` の Bun workspace 構成。`test:all` script が新規追加された。`lint` スコープが `tests/` → `tests/ packages/setup/` に拡大した(前回 codekb では `packages/setup/` は lint 対象外だったが、前回 intent 内で配線済み)。
- `release-it` が devDependencies に追加された(release.yml の workflow_dispatch から呼ばれる)。
- license は `MIT-0` → `(MIT OR Apache-2.0)`、repository url は `awslabs/amadeus-workflows` → `amadeus-dlc/amadeus` に修正済み(前回 codekb で記録した既知の不備は解消されている)。

## `packages/setup` の技術スタック(完成済み)

- functional-domain-modeling-ts スタイル(class-free、type + companion namespace、frozen literal factory、判別ユニオン Result)を全面採用。
- `type: module`、`bin: amadeus-setup` → `dist/cli.js`。npx/bunx から実行可能な JS へビルドする、既存原則(ビルドせず TS を直接実行)からの意図的な逸脱。
- テストは `bun test` ベースで `tests/setup-*.test.ts`(11ファイル、約1500行)が新設された。

## ビルドとテストツール

| ツール | 用途 | 備考 |
| --- | --- | --- |
| Bun(pinned in CI) | script runner、TypeScript 実行、テスト実行 | 変更なし |
| TypeScript(`typescript ^6.0.3`) | 静的型検査 | **#657 の直接原因**: `bunx tsc` がこのピンとは独立にバージョン解決するため、CI 外の実行環境でドリフトしうる |
| Biome 2.4系 | lint(`tests/ packages/setup/`) | スコープ拡大済み |
| GitHub Actions | CI(単一 ubuntu-latest job) | typecheck → lint → dist:check → promote:self:check → `bash tests/run-tests.sh --ci` |
| bun:test + 自作ランナー | smoke/unit/integration/e2e | `tests/integration/t92.test.ts` が #657 のリグレッションアンカー |

## #657 に関連する技術的な注記

`bunx tsc` はグローバルまたは bunx 独自キャッシュから TypeScript を解決する可能性があり、repo の `node_modules/.bin/tsc`(`typescript ^6.0.3` にピン)と食い違いうる。観測された食い違いでは bunx 側が v7.0.2 を解決し、期待する TS18003(exit 2)ではなく別のエラー(exit 1)を返した。修理の技術的方向性は「repo-local tsc を優先し、存在しない場合のみ bunx にフォールバックする」分岐の追加。

## #641 に関連する技術的な注記

Claude Code の hooks 実行環境では `CLAUDE_PROJECT_DIR` env と実際の worktree cwd が必ずしも一致しない。`resolveProjectDirFromHook()` の技術的な選択肢は、(a) engine が渡す明示的な worktree パスを hooks 側にも伝搬させる、(b) cwd probe を最優先にする、のいずれか。requirements-analysis で確定が必要。

## バージョンと依存関係の注記

`AMADEUS_VERSION`(framework コンテンツバージョン)と `@amadeus-dlc/setup` パッケージバージョンの独立ライフサイクルは前回 intent で確立済み。バージョンバンプは `release.yml` の `workflow_dispatch` 一本に統一され、`after:bump` の `scripts/release-version-sync.ts` が全バージョン面を機械的に同期する(project.md DECIDED 参照)。本 intent はこの仕組みに変更を加えない。
