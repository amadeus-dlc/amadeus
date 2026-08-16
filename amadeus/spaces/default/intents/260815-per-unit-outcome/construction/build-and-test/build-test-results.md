# Build & Test Results — intent 260815-per-unit-outcome

> 実測のみ。blocking は PR #3105 のリモート CI(`ci-success` 集約)を正とする。

## ローカル(bolt worktree、head c7df64a30 断面 — builder/conductor 実測転記)

| 検査 | 結果 |
|---|---|
| bun run build | exit 0(追跡ファイル不変) |
| typecheck / lint / source-only:check | exit 0 |
| t533 integration | 20 pass / 0 fail |
| targeted 16 ファイル | 269 pass / 0 fail(path 実在事前確認・報告数一致) |
| swarm guards 5 ファイル | 98 pass / 0 fail |
| t533 unit(edge drift 含む) | 8 pass / 0 fail(conductor 再実測) |

## リモート CI(PR #3105)

- **run 31877155328(head c7df64a30): CI Success = FAILURE**
- 失敗内訳(Tests job 94994515039 実読):
  1. `t81.test.ts:240` — VALID_EVENT_TYPES 件数ピン Expected 92 / Received 93(イベント追加に伴う 4 面目のピン bump 漏れ)
  2. `t403-issuance-guard` case h / `t449` full-autonomy resume — `OTel logs already bootstrapped … one workspace per process` at settlePerUnitOutcomes(orchestrate.ts:4662)。新設 settle emit が複数 fixture/1 プロセスのテストで OTel 不変量に抵触(既知クラス、resetOtelPerProject() の fixture 間リセットで閉じる)
  3. Coverage Report (head) / Coverage Report — Tests 失敗の従属と推定(是正後の再実行で確認)
- 是正の経過(3 ラウンド、各 push で全数 sweep):
  1. `e117e7038`+`00fcd94f8` — t81 ピン 93 へ bump(残余ピンの 3 述語 sweep で第 5 の面なしを機械確認)/ t403・t449・t212(先回り検出)へ resetOtelPerProject() の beforeEach 同期
  2. `ec5ca39b3` — lcov 継続行 2 行をメッセージ定数 hoist で削除 / engine 行の outcome 語彙閉包(succeeded のみ・改竄 Red→Green)/ cancelled 除外の docs 明記(CodeRabbit 2 スレッド対応)
  3. `045ec60eb` — settled 行の Stage 必須検証(CodeRabbit Major・Red→Green・stage-collapse 設計不変)
- **最終結果(head `045ec60eb`): CI Success = SUCCESS**(run 実測、失敗 check 0)。CodeRabbit sweep `unresolved=0`・全コメント返信済み。converged report re-mint(kind: converged / converged: true、4 条件成立)→ merge queue 投入
