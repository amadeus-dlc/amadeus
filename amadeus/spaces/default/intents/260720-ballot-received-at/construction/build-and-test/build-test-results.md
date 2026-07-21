# Build & Test Results — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

> 測定 ref: bolt head `433391d2c`(base `7cb8afd0c` = #1273/#1274 込み、PR #1277)。ローカル実測 = builder+conductor 裏取り(scratch worktree)+e4 独立レビュー実測。

## 結果一覧(全て実行結果由来)

| 検査 | 実行環境 | 結果 |
|---|---|---|
| bun run typecheck / lint | bolt tree | exit 0 |
| bash tests/run-tests.sh --ci | bolt tree | exit 0、RESULT: PASS(ログ中の GATE FAILED 文字列は planted-failure fixture 出力 — assertion 実文で帰属確定) |
| dist:check / promote:self:check | bolt tree | exit 0(無変更 = 非対象実証) |
| 落ちる実証 | bolt tree(E-GMECG 追補準拠) | record.ts のみ base 切替 → E-BFARA1 fixture 赤(timeline-order finding)/移行窓 緑維持 → fix SHA 明示復元 → 緑・tree clean |
| 閉包 | scratch(repo 外)CLI ハンドラ完走 | 申告非単調・受理単調の選挙で handleVerify exit 0 |
| レビュアー独立実測(e4) | PR #1277 | 落ちる実証再現(赤2→SHA 復元 13 pass)+live e2e で receivedAt stamp 実測+留保3件の当事者照合 |
| lcov | bolt tree | diff 追加実行行 全 DA>0(未カバー 0) |
| conductor 裏取り | scratch worktree(origin/bolt head) | t234/t238/t235/t236 = 57 pass / 0 fail(exit 0)、three-dot diff = 7 files +168/-36 |

## 判定分離

- PASS: 上表全項目
- N/A: 専用性能テスト(NFR 不在)/ 追加サニタイズ(新規入力経路なし — 受理時刻は conductor mint の機械時刻)
- PENDING: PR #1277 の main マージ(e4 READY 済み・CI green は leader 監視 → ユーザー承認 → leader 執行)
