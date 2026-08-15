# Build and Test Results — 260814-priority-bug-batch

> 測定 ref: PR #3076 head `37b7c8f2b109df3cca3ae1b4351ca8b15b87f72a`(9 commits: 実装5 + record checkpoint 1 + 収束是正3... 実体は fix 4/refactor 1/test 系 3/checkpoint 1)。取得コマンド: `gh pr checks 3076` / `gh pr view 3076 --json headRefOid,mergeStateStatus`(2026-08-15 実測)。

## Blocking 検証(リモート CI = 正本)

| Check | 結果 | 所要 |
|---|---|---|
| CI Success(集約・blocking 正本) | pass | 3s |
| Tests(フルスイート) | pass | 11m24s |
| Coverage Report(Project/Patch gate) | pass | 21s(head 計測 12m11s) |
| Coverage registry | pass | 1m2s |
| Typecheck / Lint and complexity | pass | 1m27s / 2m2s |
| Reproducible build / Source-only and graph invariants | pass | 2m4s / 1m4s |
| Plugin conformance E2E | pass | 4m57s |
| Control byte gate / Intent Mirror distribution contract | pass | 15s / 56s |
| CI Review Thread Gate + Check unresolved comments | pass | 9s(5 スレッド全件対応・resolve 後) |
| mergeStateStatus | CLEAN | — |

初回 run 31854003601 の赤 2 件と是正:
1. Project Coverage Gate `RELATIVE_DROP_EXCEEDED`(current 91.1955% vs merge-base 93.3076%、delta -2.1121pp)— 原因は t226 が 3847 行の `amadeus-migrate.ts` を in-process import した唯一のテストとなり未カバー母集団が +2718 行膨張。是正 = `normalizeGitOutcome` を `amadeus-migrate-git.ts`(31 行)へ切り出し(commit a81b21c02)。是正後 Coverage Report pass を実測
2. Review Thread Gate — CodeRabbit 5 スレッド。4 件採用是正(stderr 原文保持 621ea674a / t2851 fail-open 除去+skipIf 化 1bc0be289 / t07 ARTIFACT_CREATED 属性固定 37b7c8f2b)、1 件実測根拠付き却下(covers ヘッダは列挙宇宙外の装飾クレーム)。全件返信+resolve 後に gate pass

## ローカル検証(advisory・補助)

- builder worktree: typecheck 0 / lint 0 / build 0(追跡不変)/ targeted 111 pass 0 fail / coverage-patch-quick PASS(added 21 / covered 21)
- conductor 取込後: typecheck 0 / t226+t07+t2851 = 40 pass 0 fail / t427 26 pass 0 fail(是正前断面 37+26)

## 未検証面(verdict の書き分け)

- 本結果は PR 断面の CI green を確認したもので、merge queue(merge group 合成断面)の green とマージ実行は未実施 — マージはユーザー承認事項(正準リスト)
- t224 symlink ケースのローカル timeout は base 帰属の既知赤(#3079、アブレーションで自変更由来でないことを再確認済み — 差 2ms)。CI では pass
