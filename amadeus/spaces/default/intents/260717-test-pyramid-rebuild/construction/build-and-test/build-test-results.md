上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Build / Test Results — test-pyramid-rebuild

## 実行環境

- 実行日: 2026-07-18
- current HEAD: `dccb5c35f26724514630af79ff785599fc124616`
- Bun: 1.3.13
- Test Strategy: Comprehensive
- current worktree回帰とexact-ref exportを分離。U1/U3 measurement refは`3917a283a953165866170d235d3dc25ad2fd3643`、U2 historical runtime subjectは`244a196795f8b23192ed54dc1221b75d0c8e8f44`

## Build結果

| command | exit | 結果 |
| --- | ---: | --- |
| `bun run typecheck` | 0 | PASS。型エラー0 |
| `bun run lint` | 0 | PASS。既存206 warnings / 16 infosを報告、新規diff finding 0 |
| `bun tests/complexity-gate.ts --check` | 0 | PASS。new violations 0、regressions 0、baseline 43、worst 65。既存warn-bandは情報として保持 |
| `bun run dist:check` | 0 | PASS。claude / codex / cursor / kiro / kiro-ide / opencodeの6 harnessが正本と同期 |
| `bun run promote:self:check` | 1 → 0 | 初回は`.cursor` / `.opencode` drift。`bun run promote:self`で生成投影を修復後、再検査PASS |
| `git diff --check` | 0 | PASS。末尾空白・conflict markerなし |

## Test結果

| test面 | exit | files / assertions | failed | skipped | 状態 |
| --- | ---: | --- | ---: | --- | --- |
| U3 replay validator | 0 | 442 ledger / 163 candidates / 68 review / 95 migration | 0 errors | N/A | PASS。coverage契約8/8、EvidencePayload digest不変 |
| exact-ref targeted | 0 | 5 files / 39 passed | 0 | 0 | PASS。current worktreeを証拠へ代用していない |
| smoke | 0 | 14 files / 343 assertions | 0 | runner最終集計ではassertion-level N/A | PASS |
| unit | 0 | 212 files / 2,998 assertions | 0 | runner最終集計ではassertion-level N/A | PASS |
| integration targeted t118 | 0 | 1 file / 19 passed / 77 assertions | 0 | 0 | PASS。resume `1` / `Resume` round-tripとin-process LCOV carrierを含む |
| integration full | 0 | 148 files / 1,945 assertions | 0 | runner最終集計ではassertion-level N/A | 成功runはPASS。後続の既定5秒timeoutはFailure detailsへ分離 |
| e2e | 0 | 69 files / 146 assertions | 0 | runner最終集計ではassertion-level N/A | PASS |
| combined coverage | 0 | 374 files / 5,291 assertions | 0 | runner最終集計ではassertion-level N/A | 成功runはPASS。E2Eはこの母集団外 |

## Failure details

- 成功したcombined coverage runは374 files / 5,291 assertions / failed 0。後続再確認2回では、変更境界外の`t-team-up-codex-resume.test.ts`だけがBun既定5秒timeoutでそれぞれ1件、5件失敗した。
- 最初のtimeout対象は単独runで2.34秒PASS。次の5件は既定5秒で2件PASS / 3件timeout、診断用`--timeout 10000`では5件すべてPASSした。機能assertionの不一致は再現せず、既定timeout下の実行時間不安定性として未解消のまま保持する。
- U2 historical integrationの2 files / 5 assertions失敗、integration 24 files skip、E2E 33 files skipはref `244a196...`の比較情報に限定し、current結果の免責や事前入力に使っていない。
- Build verificationの初回`promote:self:check`だけが失敗した。差分は`.cursor/tools/amadeus-orchestrate.ts`と`.opencode/tools/amadeus-orchestrate.ts`のcanonical projection driftに限定され、`bun run promote:self`後の再検査で解消した。
- [PR #1193](https://github.com/amadeus-dlc/amadeus/pull/1193) の2軸契約に従い、実FS/subprocess resume round-tripの重複unit caseを除き、`tests/integration/t118.test.ts`を配置上の正本とした。これはU1〜U3のrecord成果をapplication code実装へ拡張する変更ではない。
- timeout赤は成功runへ上書きせず、本節へ全attemptを分離記録した。outlier除外、historical件数への置換、timeout閾値の変更は行っていない。

## Coverage結果

- combined `coverage:ci`: 374 files / 5,291 assertions / failed 0。
- project coverage gate: 68.8115%。baseline 40.9395%に対して+27.8720 percentage points、PASS。
- combined LCOVに対するdirty patch coverage gate: 14 / 14 covered、PASS。targeted isolated LCOVでも17 / 17 coveredを確認した。
- U3 coverage contract: 8 / 8、PASS。これはcode line coverageと別の証拠完全性契約である。
- per-tier LCOV pathはPENDING。E2Eは現行`coverage:ci`でNOT EXECUTEDであり、combined値へ含めない。

## Performance / Security判定

- 専用performance testはN/A。current tier runの成功をU2 budget更新やservice SLO達成へ昇格させない。
- 新規SAST/DAST/dependency/IaC scanはN/A。U3 replay validatorによるrecord証拠完全性だけを実行し、脆弱性scanのPASSとは表現しない。

## Gate前の手続き

- §13 learnings surfaceはcandidates 0 / parked open questions 0で完了した。
- 宣言sensorは本書を含む最終成果物の凍結後に手動fireし、auditの`SENSOR_PASSED/FAILED`を判定正本とする。
- Build and Testの人間Approveは未実施。本書は承認済みを主張しない。
