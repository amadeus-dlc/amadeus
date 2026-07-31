# 260731-perf-ci-separation 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-31T08:20:00Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `6e7a9d701d7cf350310a047bc5b70ff18ed15272`
- Observed commit: `da51af37533c31a9c3f4ed46bf71b5b15988b0d6`
- Distance: `11 commits`（`git rev-list --count 6e7a9d701..da51af375`）
- Ancestry: `6e7a9d701` は observed の祖先（`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0）
- Scope: `self-feature` / Brownfield / single repository
- Scan mode: Developer static live-code scan → Architect 引用再確認の直列構成、テスト未実行
- Focus: perf/ベンチマーク検証を PR ブロッキング CI から分離する面の棚卸し — ランナーの tier モデルと除外フック、スイート内 perf テストと予算定数、`ci.yml` のジョブグラフとブロッキング境界、coverage 機構への波及、非ブロッキング workflow の既存様式、サイズ／residency ラチェットとの相互作用
- Delivery: Bolt 単位で PR を切り `main` へスカッシュマージ。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## Base 選定根拠

**今回も merge-base 復元を要さなかった。** 前 intent（260731-open-bug-batch-4）の observed `6e7a9d701` は `origin/main` 系譜のコミットとして記録されており、現 HEAD の祖先性が保たれている。

| 記録済み observed | 出自 intent | `git merge-base --is-ancestor <observed> HEAD` |
| --- | --- | --- |
| `6e7a9d701` | 260731-open-bug-batch-4 | **exit 0（祖先）**、距離 `11` |
| `3f73823b1` | 260730-open-bug-batch-3 | exit 0（祖先）、距離 `24` |

`cid:reverse-engineering:rescan-base-ancestry`（日付最新ではなく HEAD の祖先である observed のうち距離最小を選ぶ）に従い、距離最小かつ祖先である `6e7a9d701` を採用した。これは `cid:reverse-engineering:c2-observed-mainline-commit` が2世代連続で実践された効果であり、同 cid の採用以前に3世代連続で発生していた非祖先化と再走査の膨張は再現していない。

本 intent の observed `da51af375` も `origin/main` 系譜のコミットである（`da51af375 record: sync intent 260731-open-bug-batch-4 (4 bug fixes) with elections and §13 learning (#1834)`）。

既存成果物の履歴節に含まれる file:line は当時の observed 断面に固定されているため、参照する場合は `cid:requirements-analysis:historical-section-cite-check-at-observed` に従い当該 observed で照合する（HEAD 照合は偽陽性を生む）。

## 区間の変化

`git diff --shortstat 6e7a9d701..da51af375` = `120 files changed, 3939 insertions(+), 102 deletions(-)`（測定 ref = observed `da51af375`）。11コミット中、ソース面を触るのは4件のみで、残りは `record:` / `chore(metrics):` のスナップショット往来（#1824–#1832、#1834）。

| commit | Issue/PR | 面 | 本 intent への意味 |
| --- | --- | --- | --- |
| `7ec3e0eae` | #1800 / PR #1820 | `tests/integration/t224-upstream-v2-migration-cli.test.ts` | subprocess 終了チャネル3分類（`EXIT_CHANNEL_CASES` `:72`）と spawn 枯渇リトライ seam（`RETRYABLE_SPAWN_ERROR` `:90`、`SPAWN_RETRY_LIMIT` `:91`、`SPAWN_RETRY_BACKOFF_MS` `:92`、`runWithSpawnRetry` `:206`）。**integration tier が既に spawn 資源競合下にあることの直接証拠** |
| `20230b90d` | #1797 / PR #1822 | `tests/integration/t259-guard-corpus.test.ts`、`tests/helpers/guard-corpus-benchmark-child.ts` | 2回の逐次 child spawn を単一プロセス内の交互計測へ集約し、時間窓分離由来の偽赤を除去。予算 `}, 90_000)`（base `:125`）→ `}, 180_000)`（observed `:121`） |
| `9008141df` | #1816 / PR #1823 | `packages/framework/core/tools/amadeus-mirror-presentation.ts`、`amadeus-mirror-lifecycle.ts` | `mirrorSnapshotStatus` `:250-252` 新設。**区間内で唯一の本番 core 変更**。本 intent とは無関係 |
| `1a3087508` | #1811 / PR #1821 | `tests/integration/t-team-up-codex-resume.serial.test.ts` | fixture の safety-wait supervisor を reap。当該ファイルはローカル実測でスイート最遅（105.54s） |

付随して `tests/.coverage-patch-allowlist.json` に churn が入っている。

**`.github/`、`scripts/`、`package.json`、`tests/run-tests.ts` は区間内で無変更** — 本 intent が対象とする CI/ランナー構造は base 断面から動いていない。

## Developer Code Scan の合成結果

Developer の静的 live-code scan は Task A（差分リフレッシュ）と Task B（intent 焦点の棚卸し）の2部構成で、後者は6節（ランナーの tier 構造、perf テスト目録、`ci.yml` ジョブグラフ、coverage 機構、非ブロッキング workflow 前例、サイズ／residency ラチェット）を報告した。Architect はこれを上流入力として受け取り、判断に効く引用を observed `da51af375` で独立再実測したうえで codekb へ書いた。

## Architect Synthesis

### 判定

本 intent の実質的な対象は**スイート内 perf テスト**（`t258` / `t257` / `t259` / `t269` / `t292` / `t-plugin-stage-discovery`）に絞られる。根拠は2点。

1. **e2e tier は既に PR ブロック外** — `tests/run-tests.ts:197-202` の `case "--ci"` は `runSmoke` / `runUnit` / `runIntegration` のみを立て、`runE2e` は `--release` / `--all`（`:203-211`）にしか含まれない。
2. **mirror distribution ベンチマーク鎖は既に非ブロッキング（de jure）** — `distribution-release-gate`（`ci.yml:279`）は `ci-success`（`:648`）の `needs`（`:651-659`、8件）に含まれず、さらに GitHub ruleset `18843917`（name `main`）の required status check は **`CI Success` の1件のみ**である。

### 最強の論拠 — integration tier の3重実行

`ci.yml` の3ジョブ `tests`（`:189`）/ `coverage-head`（`:320`）/ `coverage-base`（`:395`）はいずれも `--ci` の3 tier を実行する（`package.json:19-20` により `test:ci` と `coverage:ci` の差は `--coverage` の有無のみ）。`scripts/detect-ci-changes.sh:9-32` は `tests/*` と `*.ts` を `full=true` **かつ** `coverage=true` に分類するため、テストファイルを1つ触るだけで3ジョブすべてが起動する。単発コストではなくこの多重評価が、負荷感受性のある予算を偽赤に晒す。最厳の予算は `t269-amadeus-mirror-contract-policy-performance.integration.test.ts:102` の `toBeLessThanOrEqual(1)`（ms）である。

### 分離手段ごとの波及の非対称性

| 手段 | coverage registry | project gate | patch gate | residency guard |
| --- | --- | --- | --- | --- |
| A. 実行から除外 | **不変** | 必ず低下 → baseline 再カット | 除外ファイルを指す行ピンが stale hard-fail | 不変 |
| B. tier 外へ移動 | claim が落ち `UNCOVERED` 反転 | 低下 | 同上 | 新 scope は `"other"` |
| C. job だけ分離 | 不変 | 実行有無次第 | 実行有無次第 | 不変 |

registry の宇宙が**実行ではなくディスク列挙**（`gen-coverage-registry.ts` `discoverClaims` `:771-774`、`CLAIMS_TESTS_DIR` `:74`）である点がこの非対称の源である。

### 見落としやすい副作用

`reportDynamicSizes`（`tests/run-tests.ts:952`、出力 `:984-990`）は**この invocation で実際に走ったファイル**のみを対象にする。perf テストを `--ci` から外すと drift 報告が静かに縮み、`t258` の現在の `drift=wall-clock` エントリが**修正されずに CI 出力から消える**。なお `t258-lifecycle-transaction.test.ts:2` と `t259-guard-corpus.test.ts:2` の `// @test-size medium` は `tests/lib/test-size.ts:282` の regex に一致せず、両ファイルは実質未注記である — drift を消す前にこの綴りを直すのが筋である。

## 引用再確認の結果（Architect が observed `da51af375` で独立再実測）

**所在・機序・結論は全件一致。** 相違はいずれも1〜2行のオフセットで、方針判断に影響しない。

| 対象 | Developer 報告 | Architect 実測 |
| --- | --- | --- |
| `levelFiles` | `:838-848` | **`:839-850`** |
| `runFilesPartitioned` 宣言 | `:873` | **`:875`**（`pinnedSerial` `:881`） |
| `runTier` | `:899-909` | **`:900-909`**（`effectiveParallel` `:901`） |
| `reportDynamicSizes` 宣言 | `:951` | **`:952`**（drift 出力 `:984-990`） |
| integration の excludes 呼び出し | `:1162-1166` | **`:1161-1166`** |
| `printSummary` / tests-totals 書込 | `:912-915` | **`:911` / `:913`** |

一致を確認した主要引用（verbatim 併記、`cid:requirements-analysis:verbatim-quote-with-cite`）:

- `tests/run-tests.ts:71` — `type Level = "smoke" | "unit" | "integration" | "e2e";`
- `tests/run-tests.ts:881` — `const pinnedSerial = level === "smoke" || level === "unit";`
- `tests/lib/test-size.ts:282` — `const m = raw.match(/^\s*(?:\/\/|#)\s*size:\s*(\S+)/i);`
- `tests/integration/t258-lifecycle-transaction.test.ts:491-492` — `const ARCHIVE_LATENCY_BUDGET_MS = 500;` / `const RECOVERY_LATENCY_BUDGET_MS = 750;`（timeout `:529` `}, 120_000);`）
- `tests/integration/t257-status-registry-migration.test.ts:200-201` — `const STRICT_READ_LATENCY_BUDGET_MS = 100;` / `const MIGRATION_LATENCY_BUDGET_MS = 250;`（timeout `:260`）
- `tests/integration/t259-guard-corpus.test.ts:104-105` — `expect(twoMedianMs / oneMedianMs).toBeLessThanOrEqual(2.5);` / `expect(rssMultiplier).toBeLessThanOrEqual(2.5);`（timeout `:121` `}, 180_000);`）
- `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts:33-35` — `MEASURED_RUNS = 10` / `COMPILE_LIMIT_MS = 10_000` / `CAPACITY_BYTES = 64 * 1024 * 1024`
- `.github/workflows/ci.yml:290-291` — `test "${CONTRACT_RESULT}" = "success"` / `test "${PERFORMANCE_RESULT}" = "success"`
- `tests/integration/t257-ci-residency-marker-guard.integration.test.ts:32` — `const CI_SCOPES = new Set(["smoke", "unit", "integration"]);`
- `tests/coverage-patch-gate.ts:295` — `coverage-patch-gate: STALE allowlist entries (range matches no measurable line — remove or update)`
- `packages/framework/core/tools/amadeus-mirror-presentation.ts:250-252` — `export function mirrorSnapshotStatus(snapshot: MirrorSnapshot): string { return snapshot.completionInstance === undefined ? snapshot.status : "Completed"; }`

## Scan notes の INCONCLUSIVE を解消した項目

scan notes は「branch-protection rules は working tree から確認できない — `gh api` が要る」と明記していた。Architect が `gh api repos/amadeus-dlc/amadeus/rulesets/18843917` を実行し、name `main`、required status check が **`CI Success` の1件のみ**であることを確定した（2026-07-31 実測）。これにより mirror ベンチマーク鎖の非ブロッキング性は de facto から **de jure** へ格上げされ、本 intent の対象はスイート内 perf テストに一意化された。

同じく実測で確定した2件:

- **`schedule:` トリガはリポジトリ内に存在しない**（`grep -rn '^\s*schedule:' .github/workflows/` 0 hit）。既存の非 push 起動様式は `repository_dispatch`（`metrics-maintenance.yml:3-5`）と `workflow_dispatch`（`release.yml`）の2つのみ。
- **`CI-resident` マーカーを持つファイルは2件のみ**（`t257-ci-residency-marker-guard.integration.test.ts` 自身と `t241-election-machine-executor.integration.test.ts`、`grep -rln 'CI-resident' tests/`）。perf テストは含まれないため、`tests/e2e/` への移動では residency guard は発火しない。

## 未決事項（Requirements Analysis へ送る）

1. 分離の手段 — A（実行除外）/ B（ディレクトリ移動）/ C（job 分離）で波及先が大きく異なる。
2. 分離先の実行トリガ — `schedule:` は本リポジトリ初の様式になる。既存様式は `repository_dispatch` と `workflow_dispatch`。
3. `t292` のように純アグリゲータ検証と実時間1点（`:84` `toBeLessThan(10_000)`）が同居するファイルを分割するか、丸ごと移すか。
4. mirror ベンチマーク鎖（既に非ブロッキング）を毎 PR 実行のまま残すか、トリガを絞るか。
5. 分離先が赤くなったときの気づき方 — `metrics-maintenance.yml` の loud-fail 姿勢（job 自体が可視に失敗し `$GITHUB_STEP_SUMMARY` へ tee）が参照すべき先例。

## 更新した成果物

実質更新8件 = `architecture.md`、`code-structure.md`、`code-quality-assessment.md`、`business-overview.md`、`component-inventory.md`、`api-documentation.md`、`technology-stack.md`、`dependencies.md`。加えて `reverse-engineering-timestamp.md` と本ファイル。

直前の現在断面 `260731-open-bug-batch-4`（observed `6e7a9d701`）は全成果物で履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため一切変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
