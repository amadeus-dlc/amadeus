# Build and Test Summary — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。

## 総括

全 4 Bolt(PR #1848/#1851/#1855/#1859)が squash マージ着地。検証は「per-PR の CI green ×4 + merge 後 main run 30665853396 success + 本 record ブランチ(main merge 済み)でのローカル全数ベースライン」で構成(cid:build-and-test:bt-20260730-1 の Comprehensive 執行形)。

| 面 | 実測 |
|---|---|
| --ci ローカル | 716 files / 0 failed / 9812 assertions(exit 0) |
| --perf ローカル | 6 files / 0 failed(exit 0) |
| 静的4ゲート | typecheck / lint / dist:check / promote:self:check 全 0 |
| CI(main) | run 30665853396 success(head 150634197) |
| perf.yml 動的 | dispatch run 30644685248 全 job success |
| NFR-1 | 決定的層 = --ci から perf 6面除外を実測(Bolt 1)/ 非退行層 = 505s→415s PASS(Bolt 4) |

## verdict の検証面区分(cid:build-and-test:c4-conditional-ready)

- 検証済み: blocking CI の全数 green・perf tier の実行成立・dispatch 経路の perf.yml 完走・非退行
- 未検証(明示): cron 発火の実績(初回は 2026-08-01 17:47 UTC — 運用観測事項。workflow_dispatch では成立済みのため条件付きでなく READY とし、発火確認は運用フォローとする)

## 残課題(スコープ外・記録)

- main run 30664282817(771afe2a2)の Metrics Snapshot 赤 = 本 intent 無関係の publication 収束 race(Bolt 4 builder 実測: finalState publication-not-converged)— Issue 化を別途判断
