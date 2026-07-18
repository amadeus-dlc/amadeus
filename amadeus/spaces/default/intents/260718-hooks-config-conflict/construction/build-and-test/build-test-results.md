# Build and Test Results — hooks-config-conflict（Issue #770）

上流入力（consumes全数）: `../fix-770-hooks-config-conflict/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../fix-770-hooks-config-conflict/code-generation/code-summary.md`（`code-summary`）。

## Fresh実測

測定ref: record branch `a26dbf2c3`、source面は`origin/main ddafecc62`と差分0。実行時刻: 2026-07-18T11:58Z。

| 検証 | コマンド | 結果 |
| --- | --- | --- |
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0、error 0、既存warning 205 / info 16 |
| dist drift | `bun run dist:check` | exit 0、6 harnessすべてOK |
| self-install drift | `bun run promote:self:check` | exit 0、project-local sync |
| focused回帰 | `bun test` + 7対象file | 2026-07-18T12:13Z再実測、exit 0、180 pass / 1 skip / 0 fail / 3,614 assertions |
| shell syntax | `bash -n scripts/run-codex.sh scripts/team-up.sh` | exit 0 |
| full CI | `bun run test:ci` | exit 0、RESULT: PASS、380 files / 5,421 assertions / 0 failures / wall-clock drift 0 |

## Code Generationから継承した検証

| 検証 | 結果 |
| --- | --- |
| focused 6ファイル合算 | 138 pass / 1 skip / 0 fail / 2,562 assertions |
| ownership Linux CI再現 | fix前 13 pass / 3 fail → fix後 17 pass / 0 fail / 221 assertions |
| full coverage | 380 test files / 5,421 assertions / 0 fail / RESULT: PASS |
| full LCOV patch gate | 857 measured / 857 covered / 0 allowlisted / 0 uncovered |
| GitHub checks | [PR #1212](https://github.com/amadeus-dlc/amadeus/pull/1212) merge `bf84cdfaf`・CI/Coverage/typecheck-tests green、[PR #1216](https://github.com/amadeus-dlc/amadeus/pull/1216) merge `f4dee1490`・CI Success |
| review | architecture READY、e3/e4 READY、deslop APPROVE（blocking 0） |

fresh full CIの全体skipはClaude substrate unavailableの23 files。Bun内の個別skipは2 tests（migrationのOS依存1件、`t92.test.ts` 1件）で、failed files/assertionsはいずれも0だった。

## 失敗と是正

- Linux CIのCodex CLI不在で`Bun.spawnSync(["codex", "--version"])`がthrowした。`Bun.which("codex")` guardとspy回帰を追加し、同じPATH隔離条件を17/17 greenへ反転した。
- patch coverageでstale allowlist行を検出した。行番号を付け替えず、実測coverageが成立した2件を削除してallowlisted/uncovered 0へ閉じた。
- record PRのstale metrics削除をe4が検出した。最新mainへ`--no-ff`再接地し、metrics差分0、e3/e4 READY、CI greenを確認後にマージした。

## Live acceptance

第1回の手動取得を不採用、第2回の曖昧な成立宣言を撤回後、第3回nonce `LIVE-ACCEPT-3RD-20260718T105813Z-7129-770`をauto-pushだけで受信した。送信10:58:13Z→返信10:58:47Z（34秒）。leaderが2秒間隔でprocessを独立監視し、窓内の`inbox.sh` / `history.sh`実行0件と返信到達を10:59:28Zに確認したため、AC-4d / AC-4eはPASSである。
