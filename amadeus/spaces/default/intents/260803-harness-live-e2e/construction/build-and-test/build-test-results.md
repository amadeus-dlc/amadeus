# Build and Test Results

## 対象

5 Unitの `code-generation-plan.md` / `code-summary.md` を統合したdetached実装スタックを対象とする。U05 cherry-pick競合ではClaude SDKとClaude TUIのregistry、journey、runbook記述を両方保持した。

## Build Results

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | PASS |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS（exit 0、既存complexity warning 392件・info 23件） |
| `bun scripts/package.ts --check` | PASS（8 harness tree同期） |
| `bun run promote:self:check` | PASS |
| `bun tests/harness/live-e2e/project-matrix.ts check` | PASS |
| `git diff --check` | PASS |

## Test Results

| Suite | Passed | Skipped | Failed | Status |
|---|---:|---:|---:|---|
| U04/U05 conflict integration regression | 37 | 2 | 0 | PASS |
| 全live-E2E focused suite（18 files） | 76 | 4 | 0 | PASS |
| size guard + runbook placement regression | 18 | 0 | 0 | PASS |
| Repository CI suite（793 files） | 10,587 assertions | — | 0 | PASS |

宣言センサーは7成果物へ `required-sections` / `upstream-coverage` を各1回手動発火し、auditで **14 SENSOR_PASSED / 0 SENSOR_FAILED** を確認した。`type-check`はTypeScript/TSX成果物なし、`answer-evidence`はquestions成果物なしのためfilter非該当。

focused suiteの4件のSKIPはCodex、Claude print、Claude SDK、Claude TUIのlive opt-in未設定によるstrict gateで、preflight/scratch/model前に終端した。Repository CIでもAWS credential検証失敗とClaude substrate不在によりlive SDK/substrate testを明示SKIPしたが、offline contractとfake adapterは全て実行した。

## Failures and Coverage

初回CIとログ保存再実行はいずれも1ファイル失敗だった。ログ保存再実行で `tests/unit/t-live-e2e-runbook.test.ts` がfilesystemを読むため `medium > unit max small` となる配置違反を特定した。テストを `tests/integration/t-live-e2e-runbook.test.ts` へ移動し、size guardと移動後testを18 pass / 0 failで再確認した後、Repository CIを再実行して **793 files / 10,587 assertions / 0 fail** を得た。

coverageはrepository既存gateへ委ね、単純な行数目標ではなくFR/NFR、境界リスク、baseline green、stable mutant redを合格根拠とした。未解決failure、BLOCKER、未申告逸脱はない。
