# Build & Test Summary — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## サマリ

origin/main(#1407 fix landed)を本 worktree へマージ解消し、bugfix / Minimal の全 CI ゲートを実測 green で確認した。#1389(in-process error 駆動による fixture シャードの実 record 汚染)の閉包を、Issue 再現の逆転(ambient 汚染ゼロ)として実測固定した。

- **ビルド/ドリフト**: `typecheck` 0 / `lint` 0 / `dist:check` 0 / `promote:self:check` 0。正本 ↔ 全 harness dist / self-install 同期。
- **テスト**: `bash tests/run-tests.sh --ci` = `RESULT: PASS`、exit 0(Test files 464、Failed files 0、Total assertions 6654、Failed assertions 0)。
- **回帰(FR-3)**: 汚染ゼロ回帰は `tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`(正準、integration 層 / canonical import)に着地。犯人 t248 の env 隔離(FR-2)も適用済み。
- **閉包の逆転**: `CLAUDE_PROJECT_DIR=<fake>` で t248 coverage-gate ケースを実行 → fake の audit シャード **0**(修正前は生成)。修正コード(`recordEngineError(message, projectDir?)` / `emit()` の `_handlerProjectDir` 貫通、#1407=`49927d829`)へ因果帰属。
- **性能 / セキュリティ**: いずれも **N/A**(cid:build-and-test:c1/c3 の比例選定 — 性能 NFR 不在・攻撃面拡大なし・依存追加なし)。再評価条件を各 instructions に明記。

## 品質ゲート状況とリリース準備性

| ゲート | 状態 | 根拠 |
|---|---|---|
| typecheck | PASS(exit 0) | build-test-results.md 検証表 |
| lint(Biome) | PASS(exit 0) | 既存 warning のみ・非ブロッキング |
| dist ドリフト | PASS(exit 0) | `dist:check` all harness in sync |
| self-install ドリフト | PASS(exit 0) | `promote:self:check` in sync |
| test スイート(--ci) | PASS(exit 0) | 464 files / 0 failed / 6654 assertions / 0 failed |
| #1389 回帰・閉包逆転 | PASS | t258 着地 + fake audit 0 shard 実測 |
| マージ解消整合 | PASS | 11 ファイル union 解消・conflict marker 0・JSON parse OK・単一 current view(marker-heading-exemption) |

**リリース準備性**: 本 intent は bugfix / Minimal でありデプロイ基盤を持たない(project.md)。修正 #1407 は既に origin/main へ着地済み。本 B&T はその origin/main を本 worktree へ取り込むマージ解消 + 検証であり、全ゲート green・回帰固定済みで record 反映(construction 完了)可能な状態。残課題なし(t118:378 の同型ベクトルは根の修正で構造封鎖 — code-summary 同型サイト実測表参照)。
