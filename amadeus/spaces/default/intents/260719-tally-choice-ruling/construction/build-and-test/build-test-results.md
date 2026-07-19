# Build & Test Results — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

> 測定 ref: bolt head `da7834f`(`bolt/fix-1261-tally-choice-ruling`、base `afa872034`、PR #1268)。ローカル実測 = builder+conductor 裏取り(scratch worktree)。

## 結果一覧(全て実行結果由来)

| 検査 | 実行環境 | 結果 |
|---|---|---|
| bun run typecheck | bolt tree | exit 0 |
| bun run lint | bolt tree | exit 0(warnings は未変更ファイルの既存 complexity のみ) |
| bash tests/run-tests.sh --ci | bolt tree | exit 0(388 files / 5504 assertions / Failed 0) |
| dist:check / promote:self:check | bolt tree | exit 0(無変更 = scripts/tests 非対象の実証) |
| 落ちる実証 | bolt tree(E-GMECG 追補準拠) | base 切替 → t234 **6 fail** → fix SHA 明示復元 → **17 pass**・tree clean |
| 閉包(起票時再現) | in-process(scratch) | E-GMEBT 3票 → `winner.internalNo=2`(不採用側)— 現行バグの adopted 誤描画が反転 |
| レビュアー閉包(独立) | e3(PR コメント) | 実 E-GMEBT ledger の両版 tally 再適用: pre-fix adopted 誤 / post-fix choice2 — 対照実証 |
| lcov | bolt tree | diff 追加行未カバー 0(DA:0 2行は既存行の continuation 偽陰性) |
| conductor 裏取り | scratch worktree(origin/bolt head) | t234/t238/t236 = 38 pass / 0 fail(exit 0) |

## 判定分離

- PASS: 上表全項目
- N/A: 専用性能テスト(NFR 不在)/ 追加サニタイズ(新規入力境界なし — unknown-choice はむしろ強化)
- PENDING: PR #1268 の main マージ(レビュー READY(e3)済み・CI green は leader 監視中 → ユーザー承認 → leader 執行で閉じる)
