# Phase Boundary Check — Construction（260725-solo-standing-grants / Issue #1466）

検証日時: 2026-07-25 / 検証者: conductor（ソロモード、amadeus-quality-agent） / スコープ: `amadeus-feature` / Depth: Minimal / Test Strategy: Comprehensive
測定 ref: worktree `/Users/j5ik2o/.codex/worktrees/c179/amadeus`、ブランチ `codex/solo-standing-grants`、HEAD `b399c31c4`、merge-base（`origin/main`）`c4c9531ee`

本 intent の Construction 最終 EXECUTE ステージは `build-and-test` である（`ci-pipeline` は SKIP、operation phase は全 SKIP）。

## トレーサビリティ検証（requirements → design → 実装 → テスト）

| 層 | 成果物 | 実在 | 追跡 |
|---|---|---|---|
| requirements | `inception/requirements-analysis/requirements.md` | ✅ | FR-01〜26 / NFR-01〜08、Review Iteration 2 で READY |
| design（U1） | `construction/grant-authorization-domain/{functional-design,nfr-requirements,nfr-design}/` | ✅ | FR-01〜07、FR-20〜22、NFR-06 |
| design（U2） | `construction/solo-gate-transaction/{functional-design,nfr-requirements,nfr-design}/` | ✅ | FR-08〜18、FR-23、NFR-01〜04 |
| design（U3） | `construction/harness-contract-and-regression/{functional-design,nfr-requirements,nfr-design}/` | ✅ | FR-19、FR-24〜26、NFR-05、NFR-08 |
| 実装 | `construction/*/code-generation/{code-generation-plan,code-summary}.md` × 3 unit | ✅ | 実 diff（`git diff c4c9531ee HEAD`）と対応 |
| テスト | `construction/build-and-test/` 7成果物 | ✅ `ls` 実測（+ `memory.md`） | code-generation 2成果物 × 3 unit = consumes 全数を冒頭で実参照 |
| phase 境界（上流） | `verification/phase-check-inception.md` | ✅ | inception 境界 PASS（承認済み） |

### FR/NFR カバレッジの実測

| 要件群 | 検証所在 |
|---|---|
| FR-01〜05（grant lifecycle） | `tests/integration/t-standing-grant.test.ts`（48 pass）、`tests/integration/t-solo-standing-grant-domain.test.ts`（18 pass） |
| FR-06〜11（gate requirement / authorization） | `tests/unit/t-solo-standing-grant-domain.test.ts`（14 pass）、`tests/unit/t-solo-gate-transaction.test.ts`（27 pass）、`tests/integration/t-solo-gate-transaction-seam.test.ts`（9 pass） |
| FR-12〜18（commit 再検証と fallback） | `tests/integration/t-solo-gate-transaction.test.ts`（10 pass、80 expect） |
| FR-19〜23（既存 policy 保持 / per-unit） | `t-standing-grant.test.ts`（team output shape）、`t-solo-standing-grant-domain.test.ts`（policy matrix）、`t-solo-gate-transaction-seam.test.ts`（per-unit iteration を route しない） |
| FR-24〜26（harness / docs 契約） | `tests/integration/t-solo-standing-grant-harness.test.ts`（25 pass、236 expect）、`dist:check` / `promote:self:check` exit 0 |
| NFR-01〜04 | audit 増分・reservation 一回性・決定的 clock/revocation seam・typed fallback の各 fixture（上記 integration 群） |
| NFR-05〜08 | 既存 suite 非退行、`typecheck` exit 0、`gen-coverage-registry --check` exit 0、drift 検査 exit 0 |

NFR-07（各 FR に最低1 test trace）は上表で充足。各 FR の逐語 trace は U3 の `code-summary.md` § Step 8 の全数 trace 表が所有する。

## ゲート・レビューの整合

- **walking-skeleton**: `amadeus-state.md` の `Skeleton Stance: on`。`amadeus-feature` の最初の Construction gate は human-only として扱われ、要件 FR-21 の適用行列どおり。
- **code-generation §12a reviewer**（`amadeus-architecture-reviewer-agent`）: iteration 1 verdict **NOT-READY**（Critical 1 / Major 2 / Minor 3）。Critical 1（未 consume の `minted` reservation が host session の `HUMAN_TURN` を恒久抑止する）を含む全指摘を是正し、`origin/main`（92 コミット前進）を `--no-ff` で再接地したうえで **READY** を得てゲート承認済み（HEAD `b399c31c4`、直前コミット `76b2be658` が当該修正）。
- **落ちる実証**: Critical 1 の是正について、修正のみを退避した pre-fix 面で `1 fail / 8 pass`（`Expected: 4 / Received: 1`、exit 1）→ 復元後 `9 pass / 0 fail`（exit 0）を実測済み。
- **無申告逸脱**: なし。OpenCode / Kiro IDE の native identity adapter 未実装は 2026-07-25 のユーザー裁定で明示的にスコープ外化され、`code-summary.md` に裁定として記録されている。complexity baseline も `--update` 受容を差し戻し、ユーザー裁定どおり実装分解で `--check` を通した。

## 検証結果（全数値はコマンド出力からの転記）

| 検証 | exit | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | PASS |
| `bun run lint` | 0 | PASS（874 files、warnings 292 / infos 19、エラー 0） |
| `bun tests/complexity-gate.ts --check` | 0 | `0 new violations, 0 regressions, baseline 59 entries (worst CCN 65), threshold 15` |
| `bun run dist:check` | 0 | 全 harness ツリー同期 |
| `bun run promote:self:check` | 0 | self-install 同期 |
| `bun tests/gen-coverage-registry.ts --check` | 0 | `fresh, guards green, ratchet held` |
| `git diff --check` | 0 | PASS |
| `bash tests/run-tests.sh --ci` | 3 | Test files 552 / **Failed files 3** / Total assertions 7672 / Failed assertions 3 |
| intent スコープ 11 ファイル | 0 | 283 pass / 0 fail / 924 expect、`across 11 files` を DECLARED_PATHS=11 と照合 |
| `bun audit` | 1 | 12 vulnerabilities（3 high / 8 moderate / 1 low）— 別判定 |

## センサー

`build-and-test` 宣言センサー 4 種を全 7 成果物へ手動発火した。verdict は audit 行で判定（fire の exit code では読まない）。

| センサー | 結果 |
|---|---|
| `required-sections` | 7/7 発火、SENSOR_PASSED |
| `upstream-coverage` | 7/7 発火、SENSOR_PASSED |
| `type-check` | matches-rejection（filter `**/*.{ts,tsx}`、本ステージは md 成果物のみ生成） |
| `answer-evidence` | matches-rejection（filter `**/*-questions.md`、本ステージは questions 成果物を持たない） |

SENSOR_PASSED 836 → 850（+14 = 2 センサー × 7 成果物）、**SENSOR_FAILED 153 → 153（増分 0）**。FAILED 時のみ生成される detail finding ディレクトリ `.amadeus-sensors/build-and-test/` は不在で、これと整合する。

## 既知の非退行事項（修正対象外として明示）

1. **Issue #1481**（既知の残赤 3 件）: `tests/integration/t257-status-registry-migration.test.ts`、`t258-lifecycle-transaction.test.ts`、`t259-guard-integration.test.ts`。assertion 実文は `cannot resolve Git ref refs/heads/codex/solo-standing-grants`（`currentGitSha` :214 / :96）で、各テスト内の ref 解決 helper が worktree の gitDir 側 `packed-refs` だけを見て common dir の `refs/heads/` を見ないことによる。worktree 実行でのみ失敗し、本 intent の変更面とは無関係。`project.md` Forbidden に従い隠さず明示的にフラグする。**この 3 件以外の赤は 0 件。**
2. **dependency advisory 12 件**: 全件が devDependency `@anthropic-ai/claude-agent-sdk` の推移依存。本 intent は `package.json` / `bun.lock` を変更していない（`git diff --name-only c4c9531ee HEAD -- package.json bun.lock` が空）。範囲外の依存更新は別作業へ送る。
3. **wall-clock drift 1 件**: `tests/integration/t-codex-hooks-migration.test.ts`（declared=medium / measured=large、31.57936s）。本 intent が触れていないファイル。

## Verdict

**PASS（conditional）** — requirements → design → 実装 → テストのトレーサビリティは全層で成立し、blocking gate（typecheck / lint / complexity / dist / self-install / coverage registry）はすべて exit 0。intent スコープのテストは 283/283 green。全体スイートの Failed files 3 は Issue #1481 の既知残赤に限定され、本変更由来の赤は 0 件である。dependency audit の CONDITIONAL は範囲外事項として分離し、対象変更の security regression 判定（PASS）を取り消さない。

上記 3 件の非退行事項を明示的に保持したうえで、Construction phase の完了とワークフローの終了へ進行可能。
