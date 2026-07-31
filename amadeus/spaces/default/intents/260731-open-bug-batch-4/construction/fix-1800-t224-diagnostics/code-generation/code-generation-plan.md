# Code Generation Plan — fix-1800-t224-diagnostics

上流入力(consumes 全数): requirements.md — FR-2(#1800、裁定 Q4=A = 診断対称化+限定リトライ)を実装対象とし、受け入れ基準1〜3をテスト計画の導出元とした。

## 計画(実施順)

1. 実装前 RE: `t224-upstream-v2-migration-cli.test.ts` の :1411 患部・`-1` センチネル(:170/:210)・3分類 fixture(:311-313)・`expectSuccessfulMigration`(:218)を実読で再確定。
2. ブランチ `bolt/fix-1800-t224-diagnostics` を worktree 隔離で作成。
3. **Red**(TDD): 3分類 fixture を `EXIT_CHANNEL_CASES` へ抽出する新規診断テスト群(t375 は新規ファイル化せず要件が許す t224 内追加を採用 — スコープを対象1ファイルへ閉じる)を先行追加 → `ReferenceError: EXIT_CHANNEL_CASES is not defined` / Ran 0 tests (1 error) の Red 実測。
4. **Green**(最小実装): FR-2a = `expectSuccessfulMigration` を期待 exit code 引数化した `expectMigrationExit` へ一般化し :1411 を置換(既存6呼び出しは 0 期待ラッパ経由で無変更)。FR-2b = `runMigrationProcess` の spawnSync を `runWithSpawnRetry` 経由にし、EAGAIN/EMFILE/ENOMEM のみ 50ms×試行回数バックオフで最大2回再試行、発火は console.warn 記録。FR-2c = リトライ発火条件(3エラーコード×リトライ / signal・exit-status・ENOENT×非リトライ / 上限停止)をテスト固定。
5. **落ちる実証**: `SPAWN_RETRY_LIMIT` 2→0 の一時注入 → 3件赤(attempts expected 3 received 1)→ `git checkout <fix-commit> -- <path>` で即復元 → green 再実測(注入は head 非残留、falling-proof-injection-one-set / falling-proof-no-stash 準拠)。
6. 検証(個別直書き)→ deslop → コミット → push → PR #1820 → converge loop(CodeRabbit Minor 1件反映・thread resolved・CLEAN・全 green)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T06:38:21Z
- **Iteration:** 1
- **Scope decision:** none

実装は FR-2a〜2c に忠実 — リトライは spawn-error 限定・非侵襲、plan/summary は PR #1820 実態と一致。

### Findings

- None
