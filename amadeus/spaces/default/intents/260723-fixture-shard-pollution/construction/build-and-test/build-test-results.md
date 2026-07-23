# Build & Test Results — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

作業ディレクトリ: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/runs/20260722-233519-0637/engineer-4`
実行断面: origin/main(#1407 fix landed)を本 worktree へマージ解消した後のツリー(マージ未コミット段階で検証 → 本 B&T コミットでマージを finalize)。

## 検証コマンド表（フルパス + exit code）

すべて上記作業ディレクトリで実行。exit code は各コマンドを直接実行(パイプ非経由)して捕捉した(cid:no-exit-capture-through-pipe)。

| コマンド | exit code | 実測メモ |
|---|---|---|
| `bun run typecheck`（`tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json`） | 0 | 型エラーなし |
| `bun run lint`（Biome check） | 0 | 既存 warning のみ（250 warnings / 17 infos、いずれも非ブロッキング）。exit 0 |
| `bun run dist:check` | 0 | `all harness trees in sync with packages/framework/core + harness.`（6 harness OK） |
| `bun run promote:self:check` | 0 | `promote-self --check: project-local self install is in sync` |
| `bash tests/run-tests.sh --ci` | 0 | `RESULT: PASS` / Test files 464 / Failed files 0 / Total assertions 6654 / Failed assertions 0 |

`run-tests.sh --ci` の派生 test-size マトリクス(集計出力の転記): TOTAL small 102 / medium 435 / large 3（smoke 0/14/0、unit 89/162/1、integration 10/188/0、e2e 3/69/2、other 0/2/0）。size-annotated 73/540。wall-clock drift 1 件(`tests/integration/t-codex-hooks-migration.test.ts` declared=medium measured=large 33.735108s)は負荷依存の計時観測であり RESULT は PASS(失敗ではない)。

## #1389 閉包の逆転確認（cid:fix-review-replays-origin-repro）

Issue #1389 の e4 再現(in-process error 駆動が ambient 実 record の audit へシャードを書く)を verbatim 逆転で実測した。

手順(scratch、実 record 非汚染):
1. fake project を scratch に生成 — `amadeus/spaces/default/intents/fake-intent/amadeus-state.md`(touch)、`amadeus/spaces/default/intents/active-intent`=`fake-intent`、`amadeus/spaces/default/intents/intents.json`(1 エントリ)、`amadeus/.amadeus-clone-id`=`fakecloneid99`、観測用 `fake-intent/audit/`(空)。
2. `CLAUDE_PROJECT_DIR=<fake> bun test tests/integration/t248-stage-contract-routing.test.ts -t "coverage-gate"` を実行。
3. fake の `audit/` にシャードが生成されないことを `find` で assert。

実測結果:
- テスト実行: `1 pass / 0 fail`（`Ran 1 test across 1 file`、exit 0）。
- **fake の audit ファイル数 = 0**（`find <fake>/amadeus/spaces/default/intents/fake-intent/audit -type f | wc -l` = 0）。
- fake 配下に `*cloneid*` シャード 0（`.amadeus-clone-id` 除く）。
- 本 worktree の実 record(`260723-fixture-shard-pollution/audit/`)へ新規 fixture/fake シャードなし(`git status --short` で確認)。

**逆転の成立**: 修正前は ambient(=fake)へシャードが漏れる(Issue #1389 e4 再現コメント)。修正後は `CLAUDE_PROJECT_DIR=fake` を ambient に設定しても fake は汚染ゼロ = 呼び出し元 projectDir(テストの temp project)へ正しく記録される。

**修正コードとの因果**（false-green でないことの接地）:
- `packages/framework/core/tools/amadeus-orchestrate.ts:229` `export function recordEngineError(message: string, projectDir?: string): void`（projectDir 引数化）。
- 同 `:186` `recordEngineError(directive.message, _handlerProjectDir);`（呼び出し元 projectDir を貫通）。
- この2行は #1407（`49927d829 fix(engine): エンジン ERROR_LOGGED を呼び出し元 projectDir へ記録し fixture シャードの実 record 汚染を封鎖する`）としてマージ済みで、本 B&T ツリーに存在する。0-shard の結果はこの修正に直接帰属する。

## CI / PR 系譜

- 対象修正 PR: **#1407**（`fix(engine): エンジン ERROR_LOGGED を呼び出し元 projectDir へ記録し fixture シャードの実 record 汚染を封鎖する`）。**マージ済み** — commit `49927d829` が origin/main から到達可能(`git log --oneline origin/main` / `git branch -r --contains 49927d829` で実測、いずれも origin/main を返す)。
- origin/main tip（実測 `git rev-parse origin/main`）: `3cd05431d`（`3cd05431d chore(metrics): record snapshot (#1409)` — #1407 の上に metrics スナップショット #1409 が積まれた状態）。
- 関連着地: `61aded8db record(marker-heading-exemption): sync ... (#1296) (#1408)`（#1296 = required-sections marker floor 免除）も同一 origin/main 系譜に着地済み。本 worktree はこの origin/main を取り込むためのマージ解消を実施した(codekb 9 + intents.json + coverage-registry の 11 ファイル、union 解消)。
- ローカル全ゲート（上表）は本マージ解消後のツリーで exit 0 / RESULT PASS。GitHub 上の #1407 はブランチ保護の必須チェックを満たして main へ着地している(main-landed = 必須 CI 通過)。

（注: 本タスク指示に記載の head `376c7fab8` は現 origin/main tip の実測値 `3cd05431d` と一致しないため、実測 SHA を正とし fabricated 展開はしない — cid:sha-no-manual-expansion。#1407 fix commit は実測 `49927d829`。）

## テスト番号衝突の解消記録

code-generation 段の回帰テストは `t257-engine-error-ambient-shard-pollution.test.ts` として作成されたが、origin/main では #1407 が **`t258-engine-error-ambient-shard-pollution.test.ts`** として着地している(`t257` は #1296 系の `t257-ci-residency-marker-guard.integration.test.ts` に割当済み — cid:code-generation:swarm-test-number-reservation)。マージ解消で内容同一(describe 内の `t257`→`t258` ラベル差のみ、`git diff HEAD:...t257 MERGE_HEAD:...t258` で実測)の重複 `t257-engine-error-*` を削除し、**t258 を正準**として採用。`tests/.coverage-registry.json` も t258 行のみを維持(t257-engine 行は drop)。マージ後の registry は `json.load` で parse OK。
