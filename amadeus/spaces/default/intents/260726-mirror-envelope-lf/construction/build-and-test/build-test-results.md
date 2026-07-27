# Build & Test Results

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

測定 ref: worktree-bugfix(#1537 着地の origin/main を merge 済み = d1ac53faa 以降)、集計値は scratchpad/bt-1498-gates.log 出力からの転記。

## ゲート実測(fresh)

| ゲート | 結果 |
|---|---|
| `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` | PASS(連鎖) |
| `bash tests/run-tests.sh --ci` | **RESULT: PASS** — Test files **573** / Failed files **0** / Failed assertions **0** |
| 連鎖全体 | ALL-GATES-EXIT=**0** |

## 検証済み/未検証の書き分け

- 検証済み: #1498 の regression 閉包(実 gh 2.96.0 バイト列 fixture、修正前 10 fail → 緑、退行注入 9 fail の落ちる実証)、5 verb のパース成立、dist 14 パス同期、allowlist ピン5件照合、model-map ピンなし(conductor 独立 grep 0 で reviewer Minor 2 を閉包)。
- 未検証(明示): 実 GitHub API への end-to-end mirror create(CI 実行不能 — 実運用初回で観測)。gh 2.96 以外のバージョンの実出力(パーサは両終端対応でバージョン非依存化済み、fixture は両形保持)。find ページウォークの上限カウンタ非設置は申告済み設計判断(フォローアップ観点、#1534 系の mirror 整備で再訪可)。

## CI(着地面)

PR #1537 は着地時点で全15ジョブ pass、MERGED・#1498 CLOSED を gh 実測。
