# Build & Test Results — 260816-open-bug-batch-7

検証の正本はリモート CI(remote-first ノルム)。本結果は「conductor 統合断面のローカル実測」+「各 PR の必須 CI」の 2 層で構成する。

## conductor 統合断面(gh-issue、3 unit + 是正を全統合、build 済み)

| 検証 | 結果 | 実測 |
|---|---|---|
| `bun run build` | PASS | exit 0、追跡ファイル不変(`git status` 非 record 面クリーン) |
| no-silent-drop gate 実走 | PASS | `bun run no-silent-drop -- --base-revision <merge-base>` → `status: "pass"` exit 0 |
| 参照掃引(退役残渣) | PASS | bootstrap-provenance / validateBootstrapHistory / baselineAtRevision すべて不在(git grep -F、exit 1) |
| `.pi` 配送先述語 | PASS | `.pi/agents` ⇔ `dist/pi/.pi/agents` 集合一致(15 件)、reviewer charter `tools: read, grep, find, ls` 逐語、source-only:check exit 0 |
| t3028(値照合拡張) | PASS | 11 pass / 0 fail(統合断面で再実行) |

## unit 内実測(worktree、builder 報告からの転記 — 各 code-summary に一次記録)

- nsd: gate+t413+t433+t427 = 95 pass / 0 fail、typecheck/lint/source-only/registry --check すべて 0。是正後 t174 系含む再実行 green
- pi: 対象 23 ファイル 180 pass / 0 fail、build 前後追跡不変、是正後 t-formal-verif + t227 + t2851 green。ローカルフル実行の赤 20 件は `.pi` 退避 ablation で全件同一再現 = 本変更に非帰属(リモート CI を正とする)
- sen: t3028 11 pass、t174 remap 後 5 pass、隣接センサーテスト 6 ファイル 79 pass(期待ファイル数と runner 報告一致を事前確認)

## 各 PR の必須 CI(検証の正本)

GitHub Actions のイベント配送不発(push / close-reopen とも suite 未作成)のため、`workflow_dispatch` で新 head の CI を起動した:

| PR | head | run | 結論 |
|---|---|---|---|
| #3157(nsd) | `2ae24453e`(base 競合解消の rebase 後) | 31959793557 | **success** |
| #3161(pi) | `bfa073128` | 31959493957 | **success** |
| #3158(sen) | `6672f91cf` | 31959495536 | **success** |

補足: nsd は main 前進(priority-bug-batch-2 最終 checkpoint #3159)との intents.json 競合を rebase で解消し(registry は main 版 + 本 intent entry で再構成)、再 mint 済み。pi / sen は現 head で green だが、record 同梱のため nsd 着地後に同種 rebase → 再 mint → CI 再走が必要(直列着地)。

前回 run の失敗(t174 / ci.yml ピン / t227)は全件是正済み(各 builder の是正報告と commit)。#3157 の前回 run は必須 CI green 実績あり(3fd75b517 断面)。

## レビュースレッド

3 PR とも未解決スレッド 0 件(pagination つき GraphQL 全数 sweep、#3157 は 2 件へ返信・resolve 済み)。

## 判定

**PASS** — 3 PR すべて現 head の CI run が success(上表、gh run view の conclusion 転記)。conductor 統合断面のローカル実測も全 green。未解決レビュースレッド 0 件。着地(マージ)は pr-convergence 段の直列収束で行い、本ステージの判定は「全 unit の実装が検証可能な状態で PR 化され、必須 CI green を実測した」ことに限る(着地の成立へは昇格させない — verdict-names-unverified-facets)。
