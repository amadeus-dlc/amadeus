# Build & Test Results — 260814-plugins-rename-drift

上流入力: 各 Unit の `code-generation/code-summary.md`(builder 実測)、`build-instructions.md` ほか本ステージ instructions 4 面。測定 ref = conductor 統合断面(3 Bolt + origin/main `a7e82ea53` 系を合流したローカル HEAD)。

## ローカル(統合断面 — どの PR CI も未検証の組合せ)

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0(既存 warning 464 / info 17 — 新規診断なし) |
| ビルド + 取込後再生成 | `bun install && bun run build` | exit 0、追跡ファイル不変、配送先ツリー述語 green(`.claude/plugins/{github-pr-convergence,git-drift}`、センサー投影 2 種、残存参照パス軸 0 件 = exit 1) |
| フルスイート 1 回目 | `bash tests/run-tests.sh --ci` | FAIL — 帰属分解: (a) `gen-coverage-registry` 2 fail = **統合断面固有の registry 鮮度**(新規テストで宇宙が変化)→ `bun tests/gen-coverage-registry.ts` 再生成で解消(コミット済み。#3051 branch 側も同修正を push) (b) size 分類 4 件(下記) |
| フルスイート 2 回目(registry 修正後) | 同上 | Test files **1005 / Failed files 1 / Failed assertions 1** + size 分類 11 件。機能赤 `t-pi-child-driver.integration.test.ts` は単独再実行で 15 pass / 0 fail(6.02s)— 負荷起因 flake、本変更へ非帰属 |
| size 分類(declared=medium measured=large) | run-tests classifier | 2 回の実行で **異なる集合**(1 回目 4 件 / 2 回目 11 件、共通は t147・t17 等)= 実行環境の負荷依存(本セッションが CI・builder・TLC を並行実行 — load-sensitive 帯 #1331/#1326 の既知クラス)。本変更のテスト自体は全て green |

## リモート CI(blocking の正 — remote-first ノルム)

| PR | head 時点の実測 | 特記 |
|---|---|---|
| #3051(b1-rename) | Tests / Coverage の赤 2 巡を是正: (1) origin/main 前進との競合解決 (2) coverage registry 再生成(`2de80e130`)。現在再実行中(fails=0 観測) | Plugin conformance E2E 系を含む必須集合が対象 |
| #3052(b2-settings) | Patch Coverage Gate 赤 2 巡を是正: (1) in-process 配線カバレッジ(`6bc5fad88`) (2) timing sink guard(`e7db072fb`) (3) 防御分岐 5 行の被覆(`c1b3a2df2`)。現在再実行中(fails=0 観測) | |
| #3055(b3-git-drift) | head `07c368b19` で **Plugin conformance E2E = pass**(job 94770584366)、Tests = pass(job 94770584411)。main 取込後の再実行中 | FR-DRIFT-1 の名指し経路を CI 実測済み |

- auto-merge(queue)有効化: #3051(ユーザー事前承認 2026-08-14「CI green になったら自動マージして OK」— 実行はユーザー承認に基づく)。#3052 は順序(#2996 → #2997)維持のため #3051 の queue 投入後に有効化、#3055 は #3052 マージ後に base を main へ retarget して有効化。

## 未検証面(verdict-names-unverified-facets)

- merge queue 上の合成断面(最新 main + 先行 PR)の必須 CI は queue 投入時に測定される(merge-ready の正本 — cid:ci-pipeline:strict-up-to-date-before-merge)
- Project Coverage Gate の最終判定は各 PR の CI が正(ローカルでは coverage:ci 未実行 — remote-first)
