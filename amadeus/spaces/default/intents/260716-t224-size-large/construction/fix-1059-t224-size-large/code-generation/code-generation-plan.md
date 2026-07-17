# Code Generation Plan — fix-1059-t224-size-large

- intent: `260716-t224-size-large`(Issue #1059、bugfix スコープ、per-unit degrade — 単一ユニット)
- conductor: e4 / 実装: conductor インライン(1行修正、subagent-utilization の小規模側)+ 独立 reviewer subagent(自己レビュー禁止の担保)
- bolt: `bolt/260716-t224-size-large`(origin/main 1bb281880 起点、scratchpad worktree 隔離)

## 変更対象(全数)

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `tests/integration/t224-upstream-v2-migration-cli.test.ts` | :2 に `// size: large` を1行挿入(`// covers:` 直後 — t207/t209 :2 の既習配置、AC-1a) |

計1ファイル・1行挿入(列挙から機械再計算)。dist/self-install 非関与(tests/ 直下のみ、AC-2d)。

## 実装手順

1. 修正前 drift 実測(落ちる実証 — AC-1c 前段): `bash tests/run-tests.sh --integration --filter t224` で drift 1 を確認
2. :2 へアノテーション挿入(parseSizeAnnotation 走査域 = 先頭40行、test-size.ts:279-287)
3. 修正後 drift 実測: 同コマンドで drift 0 を確認(閉包 — ruling-premise-closure-verification)
4. 全検証: typecheck / lint / dist:check / promote:self:check / t-test-size-drift+dynamic / smoke
5. 独立 reviewer → PR 発行 → gate 報告

## カバレッジ整理(local-lcov-pre-push の適用判断)

変更は tests/ 配下のコメント1行のみ — lcov 計測対象(tools 面)に新規・変更行を持たないため patch 母集団は空。lcov 事前生成は非適用(適用外根拠の明示)。
