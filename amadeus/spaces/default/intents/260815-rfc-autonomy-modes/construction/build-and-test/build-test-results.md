# ビルド・テスト実行結果(実測) — intent 260815-rfc-autonomy-modes

## 上流入力

- `code-generation-plan`(13 unit 分): `<record>/construction/<unit>/code-generation/code-generation-plan.md`
- `code-summary`(13 unit 分): `<record>/construction/<unit>/code-generation/code-summary.md`


測定断面: 作業ツリー = `origin/main` `e7c0515fe` + 本 intent の record 変更のみ。
`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus'` → **出力 0 行**(本ブランチはコード面を一切変更していない)。

## ビルド

| コマンド | 結果 |
|---|---|
| `bun install` | exit 0 — `Checked 116 installs across 139 packages (no changes)` |
| `bun run build` | exit 0 — claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi の 8 面で `regenerated`、続いて `promote-self: project-local self install updated` |
| ビルド後の追跡ファイル | 不変(`git status --short` に `dist/` および `.claude/` の追跡ファイルなし) |
| `bun run typecheck` | exit 0(`tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json`) |
| `bun run lint` | exit 0 — `Checked 1870 files in 579ms. No fixes applied. Found 479 warnings. Found 21 infos.`(warnings は既存ベースライン) |

## テストスイート

実行: `TEST_TIME_FACTOR=2 bash tests/run-tests.sh --ci`

```
Test files: 1060
Failed files: 2
Total assertions: 14150
Failed assertions: 5
RESULT: FAIL   (SUITE_EXIT=2)
```

test-size マトリクス(ランナー出力の転記):

| scope | small | medium | large |
|---|---|---|---|
| smoke | 0 | 16 | 0 |
| unit | 274 | 161 | 1 |
| integration | 8 | 576 | 0 |
| TOTAL | 282 | 753 | 1 |

### 失敗ファイル 1: `tests/integration/t-approve-batch-presence-guard.integration.test.ts`(4 assertion)

逐語(1件目):

```
error: setup approve failed rc=1: {"error":"Audit emission failed: OTel logs already bootstrapped for
project dir /Users/j5ik2o/orca/workspaces/amadeus/intent-3116-complete, refusing to re-bootstrap for
/private/var/folders/.../amadeus-test-tOAjU7 — invariant violation (one workspace per process)"}
```

**帰属: 本 checkout の per-clone カーソル(gitignored 外部入力)由来。本 intent の変更ではない。**

ablation の実測(`cid:build-and-test:c1-ablation-before-artifact-repro` の「許可済み入力のみを植えた ablation を先に試す」に従い、gitignored な外部入力を外して同一条件を再現):

| 条件 | コマンド | 結果 |
|---|---|---|
| `amadeus/active-space` と `amadeus/spaces/default/intents/active-intent` が存在 | `bun test tests/integration/t-approve-batch-presence-guard.integration.test.ts` | **2 pass / 4 fail** |
| 同 2 ファイルを退避(それ以外は完全に同一のツリー) | 同上 | **6 pass / 0 fail** |
| 2 ファイルを復元 | — | 復元済み |

テストファイル自身がこの失敗様式を予告している(`:180-183` 逐語): 「one-workspace-per-process: an ambient bootstrap against the checkout's own record (a copied active-intent cursor is enough) would make every emit in the fixture project refuse」。CI にはこのカーソルが存在しないため CI では発生しない。

### 失敗ファイル 2: `tests/integration/t435-intent-autonomy-production.integration.test.ts`(1 assertion)

逐語:

```
789 |     const prematureResume = run(projectDir, "amadeus-bolt.ts", ["resume-quality", "--input", resumePath]);
790 |     expect(prematureResume.status).not.toBe(0);
error: expect(received).not.toBe(expected)   Expected: not 0
(fail) Intent-scoped autonomy production path > full repairs repeated quality failures, replans once,
       and durably parks a stalled loop
```

**帰属: ファイル内テスト順序・タイミングに依存する既存の flake。本 intent の変更ではない。**

判定に用いた実測:

| 観測 | 結果 |
|---|---|
| 本ブランチのコード差分(`amadeus/` を除く) | 0 ファイル(上記) |
| 同一コードに対する `main` の CI | green(`gh run list --workflow ci.yml`、merge_group run `32230055482` / `32229861809` などが `success`) |
| 当該テスト単体(`bun test <file> -t "full repairs repeated quality failures"`) | **1 pass / 0 fail** |
| 同ファイル全体(フルスイート内・単体実行とも) | 13 pass / 1 fail(再現性あり) |
| per-clone カーソル退避後の同ファイル | 13 pass / 1 fail(カーソルは原因ではない) |

機序の所在: 判定は `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:1553-1571` の `freshHumanRetryTurn` が、最新の `REPAIR_STALLED` より **厳密に後** の `HUMAN_TURN` を探す形になっている。監査タイムスタンプは秒截断であり、テスト自身が `:335-337` で「Audit timestamps are second-truncated, so the grounding turn appended before the park only outranks the stall when no second boundary was crossed」と秒境界依存を明記している。同一ファイル内の先行テストとの相互作用でこの比較が反転する条件が本機で成立している。

対応方針: 本 intent のスコープを膨張させないため本 intent では修正しない。Issue 起票の可否は承認ゲートで人間へ諮る(未起票であることを明記する)。

## 台帳 drift(実測)

| 台帳 | 検査 | 結果 |
|---|---|---|
| `amadeus/spaces/default/specs/tla/model-map.json` の実装ハッシュピン | 各 `entries[].implPath` の sha256 を再計算して `entries[].sha256` と照合(4 モデル・計 13 エントリ) | 全件 MATCH |
| `model-completeness` センサー | `bun .claude/tools/amadeus-sensor.ts fire model-completeness --stage formal-model-check --output-path amadeus/spaces/default/specs/tla/model-map.json` | `SENSOR_PASSED`(audit seq 105-106) |

## 形式検証(handoff ステージ `formal-model-check` の実測)

`bun .claude/plugins/formal-model-check/tools/run-model-check.ts --model <tla> --cfg <cfg> --out <repo 外>` を登録 4 モデルへ個別に実行(`cid:formal-model-check:c2` に従い CI 受入経路の `run-model-check-ci.ts` は使わない)。

| モデル | outcome | exitCode | runId |
|---|---|---|---|
| BoltPrAttestationGate | NOT_DETECTED | 0 | `9dd237cc-1a43-45a2-afa5-ebe2c6ce0422` |
| FormalElection | NOT_DETECTED | 0 | `4de4fca8-a3ad-4cd6-9588-7b32f44f24c6` |
| MirrorLifecycle | NOT_DETECTED | 0 | `658092e3-2fc3-4713-9d01-57ef1434d1d1` |
| PrConvergenceGate | NOT_DETECTED | 0 | `20e2b446-3533-4cb1-bdb4-7e49c2533630` |

検査完了後にステージ本文 Step 4 の `plugin-activation.ts record .claude` を実行し、advisory は `{"verdict":{"kind":"no-hold"}}` へ遷移した。

## 実装 PR の配送検証(実測)

13 unit の実装 PR は本断面の祖先として着地済み。各 PR の state / mergedAt / mergeCommit は `gh pr view <n> --json state,mergedAt,mergeCommit` で取得し、merge commit が HEAD の祖先であることを `git merge-base --is-ancestor <mergeCommit> HEAD`(全件 exit 0)で確認した。

| unit | PR | merge commit | mergedAt |
|---|---|---|---|
| d6-investigation | #3117 | `acbf30bc2` | 2026-08-15T22:51:53Z |
| grant-ceremony | #3118 | `215855ea7` | 2026-08-15T23:43:42Z |
| merge-provenance | #3119 | `6ff43b4ca` | 2026-08-16T01:04:13Z |
| presence-detection | #3121 | `c08de4d77` | 2026-08-16T02:06:13Z |
| recommendation-core | #3122 | `56af74d10` | 2026-08-16T03:35:05Z |
| s13-zero | #3124 | `61f939d50` | 2026-08-16T05:10:45Z |
| completion-report | #3128 | `182fbe60c` | 2026-08-16T07:37:45Z |
| waiting-interruption | #3130 | `c5789486f` | 2026-08-16T09:14:34Z |
| config-visibility | #3132 | `d00103a64` | 2026-08-16T10:08:46Z |
| presence-closure | #3134 | `2f5a8040f` | 2026-08-16T08:40:30Z |
| interactive-carveout | #3137 | `751619451` | 2026-08-16T10:27:03Z |
| docs-norms | #3139 | `3e1c6a19e` | 2026-08-16T10:52:53Z |
| semi-authority-projection | #3146 | `5aab4b893` | 2026-08-16T12:51:44Z |

各 unit の `pr-convergence-report.md` は本セッションで現行 CLI の merged arm により merge 事実へ再 attest 済みで、`pr-convergence-report-format` センサーは 13/13 で code-generation スコープの `SENSOR_PASSED` を実測した。

## 検証の正本について(訂正)

本ステージの起草時、conductor は「本ブランチは record 面のみでコード差分が 0 ファイルのため、ローカルフルスイートを検証の正本としてよい」と解したが、§13 選挙 E-260819-RFC0001-BT-S13 の両票が独立にこの前提を反証した。committed record を入力として走る blocking テストが実在する — `tests/integration/t517-question-budget-sensor.integration.test.ts:350-351` は `amadeus/spaces/default/intents` 配下の全 `*-questions.md` を再帰走査する(逐語 `const INTENTS = join(REPO_ROOT, "amadeus", "spaces", "default", "intents");` と `everyQuestionFile(INTENTS, files)`、本起草時に実読で確認)。`t514-nfr-budget-sensor` / `t461-subagent-stats` も同 corpus を読む。既存則 `cid:code-generation:c1-question-budget-corpus` が同じ非対称を記録している。

したがって record-only の変更こそ CI 固有の情報を持つ。本ステージのローカル実測は補助であり、merge-ready の正本は record checkpoint PR に対する必須 CI の green とする(`cid:ci-pipeline:strict-up-to-date-before-merge`)。上記のローカル結果は CI green を代替しない。
