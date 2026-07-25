# Build & Test Results — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- 各 unit の `code-summary.md` — 実装者申告の検証結果を引き、conductor による独立再実行の照合対象とした。
- 各 unit の `code-generation-plan.md` — 変更面ファイル一覧を引き、ドリフト検査と型検査の網羅対象を確定した。
- 特に U3 の `code-summary.md` — `tests/complexity-gate.ts --update` による baseline 受容を差し戻して実装分解で通した経緯を引き、本ステージでは `--check` のみを実行する根拠とした。

成果物名は engine directive の `build-test-results.md` を正本とする（stage 本文の `test-results.md` 表記より優先、`cid:build-and-test:c1-engine-directive-results-name`）。

測定 ref: worktree `/Users/j5ik2o/.codex/worktrees/c179/amadeus`、ブランチ `codex/solo-standing-grants`、HEAD `b399c31c4`、merge-base（`origin/main`）`c4c9531ee`。全数値はコマンド出力からの転記（`cid:requirements-analysis:numbers-from-command-output-only`）。exit code はパイプを経由せず直接捕捉（`cid:code-generation:no-exit-capture-through-pipe`）。

## 検証コマンドの実測 exit code

| コマンド | exit code | 判定 |
|---|---:|---|
| `bun run typecheck` | 0 | PASS |
| `bun run lint` | 0 | PASS（警告 292 / info 19 は informational、エラー 0） |
| `bun tests/complexity-gate.ts --check` | 0 | PASS |
| `bun run dist:check` | 0 | PASS |
| `bun run promote:self:check` | 0 | PASS |
| `bun tests/gen-coverage-registry.ts --check` | 0 | PASS |
| `bash tests/run-tests.sh --ci` | 3 | 既知の残赤 3 件のみ（下記） |
| `git diff --check` | 0 | PASS |
| `bun audit` | 1 | 別判定（dependency audit、下記） |

出力の要点:

```
complexity gate: OK — 0 new violations, 0 regressions, baseline 59 entries (worst CCN 65), threshold 15
package --check: all harness trees in sync with packages/framework/core + harness.
promote-self --check: project-local self install is in sync
coverage registry: OK (fresh, guards green, ratchet held)
```

complexity gate は `--check` のみを実行し、`--update` による baseline 受容は行っていない（ユーザー裁定によりリファクタ解消で決着済み）。

## 全体スイート集計（`bash tests/run-tests.sh --ci` 出力からの転記）

```
Test files: 552
Failed files: 3
Total assertions: 7672
Failed assertions: 3
RESULT: FAIL
```

サイズ分布: smoke 14 / unit 284 / integration 254 / e2e 81 / other 2（TOTAL small 135 / medium 497 / large 3）、size-annotated 107/635。

### Failed files: 3 — すべて既知の残赤（Issue #1481、修正対象外）

| ファイル | 失敗テスト | assertion 実文 |
|---|---|---|
| `tests/integration/t257-status-registry-migration.test.ts` | `records complete 100-child p95, RSS pairs, growth, and provenance` | `error: cannot resolve Git ref refs/heads/codex/solo-standing-grants`（`currentGitSha` :214）。10 pass / 1 fail |
| `tests/integration/t259-guard-integration.test.ts` | `10k-row guard overhead remains bounded for all operations` | `error: Unable to resolve Git ref refs/heads/codex/solo-standing-grants`（`currentGitSha` :96）。9 pass / 1 fail |
| `tests/integration/t258-lifecycle-transaction.test.ts` | 同系 | 同機序 |

機序は各テスト内の ref 解決 helper が worktree の gitDir 側 `packed-refs` だけを見て common dir の `refs/heads/` を見ないことにあり、worktree 実行でのみ失敗する。assertion 実文まで読んで帰属を切り分けた結果、本 intent の変更面（`amadeus-grant-authorization.ts` ほか）とは無関係であり、`origin/main` 由来の既存欠陥である。`project.md` Forbidden（既存の赤を無視しない）に従い、修正はせず Issue #1481 として起票済みのまま明示的にフラグする。

**この 3 件以外の赤は 0 件。**

### wall-clock drift 1 件

`tests/integration/t-codex-hooks-migration.test.ts`（declared=medium / measured=large、31.57936s）。本 intent が触れていないファイルで、既存の申告済み drift。

## intent スコープのテスト（全数実行の照合付き）

path 集合は配列で保持し、実行前に全 path の実在を機械確認した（`cid:build-and-test:test-path-set-completeness`）。

```
DECLARED_PATHS=11
EXISTING_PATHS=11   (MISSING 0)
→ Ran 283 tests across 11 files. [3.03s]  283 pass / 0 fail / 924 expect()  exit 0
```

`across 11 files` が DECLARED_PATHS=11 と一致し、無音除外がないことを確認した。

| ファイル | pass | fail | expect() | 所要 |
|---|---:|---:|---:|---:|
| `tests/unit/t-solo-standing-grant-domain.test.ts` | 14 | 0 | 19 | 60ms |
| `tests/unit/t-solo-gate-transaction.test.ts` | 27 | 0 | 31 | 48ms |
| `tests/integration/t-solo-standing-grant-domain.test.ts` | 18 | 0 | 52 | 168ms |
| `tests/integration/t-solo-gate-transaction.test.ts` | 10 | 0 | 80 | 751ms |
| `tests/integration/t-solo-gate-transaction-seam.test.ts` | 9 | 0 | 31 | 78ms |
| `tests/integration/t-solo-standing-grant-harness.test.ts` | 25 | 0 | 236 | 56ms |
| `tests/integration/t-standing-grant.test.ts` | 48 | 0 | 99 | 262ms |
| `tests/unit/t111.test.ts` / `t28-audit-event-sync.test.ts` / `t81.test.ts` / `t210-adapter-mint-classifier.test.ts` | 既存回帰（audit taxonomy 78 event 受理ほか） | 0 | — | — |

（上表の個別内訳は各ファイル単体実行の出力からの転記。合計 283 は 11 ファイル一括実行の出力からの転記。）

## 性能判定（NFR / U1-PERF-02）

| 判定軸 | 基準 | 実測 |
|---|---|---|
| 訪問回数 counter（blocking） | 線形一回走査 `= E` | pass |
| wall clock（退行上限） | 100,000 event fixture で 5 秒以内 | `Ran 1 test across 1 file. [159.00ms]` |

## セキュリティ判定（2軸を分離）

`cid:build-and-test:c1-doctor-seam` に従い、対象変更の regression と repository 全体の dependency audit を別判定とする。

| 判定 | 結果 | 根拠 |
|---|---|---|
| **対象変更の security regression** | **PASS** | Grant Id substitution、route 後 revocation、cross-intent、receipt owner すり替え、forged provenance、ambiguous ID、未登録/archived 混入、duplicate receipt、team carrier 注入、他 session の presence mint/consume、非 run-stage carrier — 全 attack fixture pass、自動 approval 0 件（NFR-03 達成） |
| **repository 全体の dependency audit** | **CONDITIONAL** | `bun audit` exit 1、`12 vulnerabilities (3 high, 8 moderate, 1 low)`。全件が devDependency `@anthropic-ai/claude-agent-sdk` の推移依存。本 intent は `package.json` / `bun.lock` を変更しておらず退行ではない。範囲外の依存更新は別作業へ送る |

## 判定サマリ

- ビルド（配布物・self-install 再生成と drift 検査）: **PASS**
- 型検査・lint・complexity・coverage registry: **PASS**（全 exit 0）
- intent スコープのテスト: **PASS**（283/283、11/11 ファイル全数実行を照合）
- 全体スイート: Failed files **3** — すべて Issue #1481 の既知残赤。本変更由来の赤 **0 件**
- security regression: **PASS** / dependency audit: **CONDITIONAL**（別判定、範囲外）
