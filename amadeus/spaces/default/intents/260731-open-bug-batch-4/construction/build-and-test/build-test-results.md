# Build Test Results — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 検証コマンド集合の導出元。code-summary.md — unit 別実績との突き合わせ対象。

## 実行記録(main worktree、HEAD 9008141df、2026-07-31 実行)

| コマンド | exit code | 実測値 |
|---|---|---|
| `bun run typecheck` | 0 | — |
| `bun run lint` | 0 | — |
| `bun run dist:check` | 0 | 7ハーネス drift 0 |
| `bun run promote:self:check` | 0 | self-install drift 0 |
| `bash tests/run-tests.sh --ci` | 0 | 674 files / 9398 assertions / 0 failed |

集計出典: `tests/run-tests.sh --ci` 末尾サマリ(`Test files: 674 / Failed files: 0 / Total assertions: 9398 / Failed assertions: 0 / RESULT: PASS`)。

## Advisory(非ブロッキング)

- wall-clock drift 3件: t-codex-hooks-migration(34.2s)/ t225(33.4s)/ t258(30.0s)— declared=medium measured=large。いずれも本 intent 変更ファイル非接触。t258 の flake クラスは #1830 起票済み(closed #1511 dup 確認込み)。
- test-size matrix: smoke 15 / unit 327 / integration 332 / e2e 90 / other 2(全 green)。

## PR CI(unit 別・着地時点)

- PR #1821: 全 checks green・CLEAN・thread 0
- PR #1820: 全 checks green・CLEAN・thread 0(CodeRabbit Minor 1件反映済み)
- PR #1822: 全 checks green・CLEAN・thread 0(1回目の非依存赤2件は帰属確定済み)
- PR #1823: 17 checks green・CLEAN・thread 0(Bugbot 1件は FR-4b' で解決)
