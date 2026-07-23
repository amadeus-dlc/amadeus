# Code Summary — fix-1294-t241-residency

上流入力(consumes 全数): requirements.md(FR-1〜4 / NFR-1〜4)、reverse-engineering/scan-notes.md、code-generation-plan.md。

## 概要

`tests/e2e/t241-election-machine-executor.test.ts`(FR-0 機械実行器、ADR-6 layer (i))を `tests/integration/` へ移設・rename し、ヘッダの「CI-resident / standing proof」自称を実行実態と一致させた(ADR-6 decisions.md:44「integration テストで固定する」への実装回復)。随伴面(ヘッダ表記・ファイル名 suffix・coverage registry pin・docs 棚卸し)を全数整合。NFR-1 再発ガードを導入(落ちる実証+corpus sweep 済み)。

## 変更 file:line 目録

| # | 種別 | file | 内容 |
|---|---|---|---|
| 1 | rename+move | `tests/e2e/t241-election-machine-executor.test.ts` → `tests/integration/t241-election-machine-executor.integration.test.ts` | e2e→integration 移設、`.integration.test.ts` suffix(兄弟慣習) |
| 2 | edit | 同上 :1-11(ヘッダ) | `// Layer: integration (...)` を追記し CI-resident 主張の根拠(integration=--ci 実行)を明示。既存の layer (i)/(ii) 説明は保持 |
| 3 | edit | `tests/unit/gen-coverage-registry.test.ts:857` | `EXPECTED_NONE_TO_CLI` pin を `e2e/t241-...test.ts` → `integration/t241-...integration.test.ts` へ更新 |
| 4 | add | `tests/integration/t257-ci-residency-marker-guard.integration.test.ts`(新規) | NFR-1 再発ガード(CI-resident 表明×非 --ci 層の検出) |

コード本体(`scripts/amadeus-election.ts`)は無変更。SCRIPT 相対パス(`../../scripts`)は e2e/integration 同深度のため不変。

## FR 別対応表

| FR | 状態 | 根拠 |
|---|---|---|
| FR-1 移設 | 済 | 目録 #1。`ls` で新在・旧不在確認 |
| FR-2a ヘッダ表記 | 済 | 目録 #2。`// Layer: integration` 追記(t236/t240 慣習) |
| FR-2b coverage registry | 済 | 目録 #3。`gen-coverage-registry.test.ts`(42 pass)+ `--check` OK。`.coverage-registry.json` は t241 非登録(covers claim なし)のため無変更 |
| FR-2c runner 実行対象 | 済 | `tests/integration/` は `--ci` の readdir スキャン(run-tests.ts:1007-1016)で自動発見。FR-3 実行痕跡で実証 |
| FR-2d suffix 慣習 | 済 | 目録 #1 の rename に同梱(`.integration.test.ts`) |
| FR-2e docs 棚卸し | 済(0 件) | 下記 docs grep 実測 |
| FR-3 常時証明の実効性 | 済 | 下記 t241 実行痕跡 |
| FR-4 size purity | 済 | `t-test-size-drift`(16 pass, exit 0)。t241 spawn+fs→medium ≤ integration MAX=medium。allowlist 変更不要(unit non-Small のみ grandfather) |

## docs/knowledge 棚卸し実測(FR-2e, cid:enumeration-completeness-review 追補 E-SDE-FD の両域 grep; measure ref: HEAD 78bce87)

- `grep -rn "t241" docs/` → **0 件**
- `grep -rn "t241|election-machine-executor|machine-executor" docs/ amadeus/spaces/default/knowledge/ .claude/knowledge/` → **0 件**
- `grep -rln "CI-resident" docs/ .claude/knowledge/` → **0 件**

→ docs/knowledge 両域に t241 個別記述なし。`docs/reference/09-testing.md` の level 記述は generic(t241 非依存)で更新不要。codekb の re-scan 記録は RE 成果物であり本 FR の docs 対象外。**docs 更新該当 0 件を記録**。

## FR-3 t241 実行痕跡(measure ref: `bash tests/run-tests.sh --ci`)

`/tmp/ci.out` より verbatim:
```
4606:=== START t241-election-machine-executor.integration.test.ts ===
4654:--- PASS: t241-election-machine-executor.integration.test.ts ---
4655:=== DONE t241-election-machine-executor.integration.test.ts (PASS) ===
```
→ t241 が `--ci`(integration 層)で実際に実行され PASS。「CI-resident/standing proof」主張が実行実態と一致した(表明×実態の乖離を解消)。t257 ガードも同 --ci で実行:
```
4863:=== START t257-ci-residency-marker-guard.integration.test.ts ===
4870:--- PASS: t257-ci-residency-marker-guard.integration.test.ts ===
```
suite 全体: `Test files: 463 / Failed files: 0 / Failed assertions: 0 / RESULT: PASS`。

## NFR-1 判断: 再発ガード導入(**導入した**)

- **判断根拠**: size-purity guard は e2e への spawn テスト配置を許容(e2e MAX=large)し、「CI-resident 表明を持つテストが --ci 非実行層(e2e)に置かれる」欠陥クラスを構造的に検出しない真の gap。マーカー `CI-resident` は tests/ 全域で fix 前 t241 単独(corpus sweep 実測)= 一意・greppable、write⇔check 対称の低コスト guard が成立。
- **実装**: `t257-ci-residency-marker-guard.integration.test.ts`。全 `tests/**/*.test.ts` を走査し、`CI-resident` マーカーを含むファイルの scope が `--ci` 実行集合(smoke/unit/integration)であること(= e2e でないこと)を assert。fs 走査→medium→integration 配置(fs-tests-integration-first / E-MTR-CG)。マーカーは runtime 合成(`CI-${"resident"}`)で述語の自己一致ノイズを回避。
- **落ちる実証**(Mandated / cid:falling-proof-injection-one-set + falling-proof-no-stash 準拠、注入→revert を不可分1セットで実施):
  - `tests/e2e/t237-...test.ts:1` へ一時マーカー注入 → t257 **exit 1**、offender を verbatim 特定:
    `tests/e2e/t237-election-walking-skeleton.test.ts: claims CI-resident but scope=e2e is not in --ci`
  - Edit で注入を exact 除去 → `git diff --stat tests/e2e/t237-...` 空(HEAD 一致復元)→ t257 **exit 0**。
- **既存 corpus 全数 sweep**(cid:corpus-sweep-for-new-guards): fix 後の marker 保持ファイル = `t241`(integration)+ `t257`(guard 自身の doc コメント、integration)。両者とも --ci 層 → 正当な既存データで **green**(偽赤ゼロ)。in-test 述語 self-test(合成 e2e パスで flag、integration/非マーカーで clear)も併載。

## NFR-4 CI 予算(measure ref: 単体実行)

- t241 単体: `Ran 2 tests across 1 file. [1.73s]`
- t257 単体: `Ran 2 tests across 1 file. [64.00ms]`
- 増分合計 ≈ 1.8s、申告閾値 +60s(RE 基準 265s に対し約 +23%)を大きく下回る。**gate 申告不要**(fail 条件でもない)。

## 検証コマンド + 実測 exit code

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | tsc --noEmit ×2 |
| `bun run lint` | 0 | biome。警告は既存 complexity(packages/framework/core/hooks 等)のみ、変更 test 3ファイルに診断 0 |
| `bun test tests/integration/t241-election-machine-executor.integration.test.ts` | 0 | 2 pass |
| `bun test tests/integration/t257-ci-residency-marker-guard.integration.test.ts` | 0 | 2 pass |
| `bun test tests/unit/t-test-size-drift.test.ts` | 0 | 16 pass(FR-4 purity/ratchet) |
| `bun test tests/unit/gen-coverage-registry.test.ts` | 0 | 42 pass(FR-2b pin) |
| `bun tests/gen-coverage-registry.ts --check` | 0 | `coverage registry: OK (fresh, guards green, ratchet held)` |
| `bash tests/run-tests.sh --ci` | 0 | RESULT: PASS / 463 files / 0 fail(FR-3・NFR-2、t241+t257 実行) |
| `bun run dist:check` | 0 | all harness trees in sync(NFR-3 非交差) |
| `bun run promote:self:check` | 0 | project-local self install in sync(NFR-3 非交差) |

（t257 falling-proof 注入時のみ `bun test t257` = exit 1、revert 後 exit 0 を上記 NFR-1 に記載）

## NFR-3 非交差確認

変更は `tests/` 4ファイルのみ(2 rename/edit + 1 registry pin + 1 新規 guard)。`packages/framework/`・`dist/`・self-install 非交差を dist:check / promote:self:check(いずれも exit 0)で実測確認。

## 逸脱

なし。要件・設計(ADR-6)どおり integration 移設で完遂。実装中に逸脱の必要は生じなかった。
