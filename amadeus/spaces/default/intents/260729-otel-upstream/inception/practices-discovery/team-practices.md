# Team Practices — 260729-otel-upstream（再確認）

上流入力（consumes 全数）: `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`（いずれも codekb 最新断面を参照）

本 intent は brownfield で、5領域すべてに affirmed 済みプラクティス（`amadeus/spaces/default/memory/team.md`・`project.md`）が存在する。4レーンの証拠スキャン（`evidence.md`）は affirmed 内容と実コードの一致を確認した。以下は証拠＋インタビュー回答の統合。

## Way of Working

正本（`packages/framework/core/`・`packages/framework/harness/`）を編集し、`dist/`・セルフインストール面は `bun scripts/package.ts` と promote で同期する生成物として扱う（`code-structure.md`・`dependencies.md` と一致）。変更は main 中心の短命ブランチ＋PR で取り込み、正本・生成面を同一変更で同期する。大規模 initiative は 1 intent で扱い、並行化は Unit/Bolt で行う（project.md ## Way of Working c4-2、本 intent で追加）。

## Walking Skeleton

org.md のスコープ別既定に従い、greenfield 要素（新パッケージ・新配布経路）を含む intent では最初の Construction Bolt を小さな end-to-end スライスとし、人間がゲートで確認する。**本 intent は skeleton-on**（Q1 確定 — Phase 1 が walking skeleton であり、新規 Provider／パッケージ導入を含む）。

## Testing Posture

`code-quality-assessment.md` の実測どおり: 819 本の TS テストを bun test で駆動し、feature/fix とテストは同一コミットで着地する（実質 red-green-refactor）。CI 基準は typecheck／lint／dist:check／promote:self:check／run-tests --ci に加え、**coverage ゲート（project/patch/relative）と plugin-conformance-e2e を含む現行ブロッキング集合**（Q2 で affirmed 内容の更新を承認）。PBT（fast-check）と TLA+ は補助層。

## Deployment

GitHub Flow（squash merge）＋ release.yml dispatch 一本。実行環境トポロジは存在せず、配布は CLI フレームワークの npm/self-install 経路（pipeline-deploy レーンの実測が affirmed 内容と一致）。

## Code Style

`amadeus-<kebab>.ts`・1ツール1ファイル・camelCase・`.ts` 拡張子付き相対 import。エラーハンドリングはドメイン境界で判別ユニオン Result 型、不変条件違反で例外、CLI 境界で `emitError()`（`ERROR_LOGGED` 記録後 exit）のハイブリッド（`code-structure.md`・developer レーン実測と一致）。コメントは英語。
