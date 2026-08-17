# Build and Test Results — intent 260816-priority-bug-batch-3

測定日時: 2026-08-17(JST)。測定方法: 各 Bolt PR の GitHub CI(必須集約 `CI Success`)と review thread 状態を `gh pr view --json statusCheckRollup` / GraphQL reviewThreads で実測(remote-first — blocking 検証の正は CI)。

## PR 別結果(実測転記)

| Bolt | Unit | PR | head | CI Success | mergeState | 未解決スレッド |
|---|---|---|---|---|---|---|
| 1 | autonomy-refusal-idem (#3152) | #3173 | 60cdfb723 | SUCCESS | CLEAN | 0 |
| 2 | milestone-presence (#3153) | #3175 | fd7529814 | SUCCESS | DIRTY(スタック — B1 着地後に retarget + rebase 予定) | 0 |
| 3 | prc-finalization (#3149) | #3172 | 9b29c4e37 | SUCCESS | CLEAN | 0 |
| 4 | source-work-probe (#3156) | #3174 | 3a51835a8 | SUCCESS | CLEAN | 0 |
| 5 | election-append (#3046) | #3171 | a7f296bfa | SUCCESS | CLEAN | 0 |

- 各 record の pr-convergence-report.md は上表の現 head を attest(全5一致を grep で実測)
- CI の Tests ジョブ(smoke + unit + integration フルスイート)・Coverage Report(head)/ Coverage Report(Project / Patch Coverage Gate)・Lint and complexity・no-silent-drop・再現性/境界/グラフ不変量検査は `CI Success` 集約の needs 経由で blocking(正本 = ci-success 集約)

## CI 収束の過程で是正した赤(全て解消済み)

| クラス | 対象 | 是正 |
|---|---|---|
| t517 question-budget corpus(blocking) | 全 PR(record 同梱の questions ファイル 5問 > Minimal 4) | AD/UG/DP の質問統合(4問)+ センサー実測 pass ×4 |
| NSD001 + censusDigest | #3173(意図的 fail-open catch) | grant イベント + approval 再束縛(evidence 3ファイルは未接触 → reconcile は REBIND_NOOP) |
| complexity / mechanism ratchet / model-map / registry | #3173 / #3171 ほか | 各台帳 resync(bt-ledger-resync の既知クラス) |
| Patch coverage | 全5 PR(各数行) | テスト追加(in-process 駆動化含む)+ spawn 到達クラスのみ allowlist |
| merge facts 形式検査欠落(CodeRabbit Major) | #3172 | checkLanded と1定義共有の形式検査 + 負例テスト |
| t224 flake(#3151 の既知クラス、未接触領域) | #3172 / #3174 | 次 run 自然解消 / `gh run rerun --failed`(再現は #3151 へ帰属) |
| Review Thread Gate stale fail | #3173 | スレッド全 resolve 後に `gh run rerun --failed`(bt-review-thread-gate-stale-fail の定型) |

## CodeRabbit スレッドの処理(per-push sweep)

計10件(3171×3 / 3172×2 / 3173×3 / 初回3171×3 は push で outdated 化含む)— 有効指摘は修正(barrier 早期解放・assert 強化・merge facts 形式検査・covers claim・ballot factory 共有・arrivalSequence 直接 assert)、根拠不成立2件は実測付き却下返信(t247 重複の不存在を grep 0件で反証 / 監査再読は fail-open 設計の意図)。全スレッド resolved・返信済み。

## 検証済み面と未検証面(verdict の書き分け)

- **検証済み**: 各 PR 単体の merge-vs-main 断面での全 blocking gate green(上表)。各 unit の受け入れ条件の Red→Green(各 code-summary.md)
- **未検証**: (1) 5 PR を全て統合した main 断面 — merge queue の直列着地(merge group CI)が担保する(着地は pr-convergence ステージ) (2) #3175 は base = #3173 ブランチの断面で green — #3173 着地後の retarget + rebase 後に再 CI (3) rfc-autonomy-modes の resume 実施(スコープ外 — #3149 着地後の別作業)
