# Code Summary — unit: lifecycle-guard-runtime

- Intent: 260813-lifecycle-guard-runtime(Issue #2771)/ 実装: Bolt worktree `bolt/lifecycle-guard-runtime`(base `8b6089275`)9 コミット → conductor ブランチへ merge 取込 + `bun run build` 再実行済み / PR: [amadeus-dlc/amadeus#2986](https://github.com/amadeus-dlc/amadeus/pull/2986)

## 変更ファイル(`git diff --stat 8b6089275..bolt/lifecycle-guard-runtime` 転記)

- `packages/framework/core/tools/amadeus-lifecycle-guard.ts`(新設 232 行)
- `packages/framework/core/tools/amadeus-state.ts`(+565/-)、`amadeus-utility.ts`(+202/-)
- `docs/reference/26-lifecycle-guard-runtime.md` / `.ja.md`(新設、00-overview 索引 2 面)
- `tests/unit/t2771-lifecycle-guard-runtime.test.ts`(17 tests)、`tests/integration/t2771-lifecycle-guard-{census,checkpoints,regression}.integration.test.ts`(8+30+6 tests)、`t511` seam 更新
- `tests/.coverage-patch-allowlist.json`(-2 エントリ: adapter 化で in-process 到達可能になった process-exit 免除)
- `amadeus/spaces/default/specs/tla/model-map.json`(PrConvergenceGate impl-only pin 更新)
- 計 14 files / +2509 / -229

## 主要実装判断(要点)

- verdict 全フィールドを production 消費(共通レンダラ `formatGuardRefusal` で拒否文言バイト一致)
- audit disposition(`error-logged`/`none`)が die/error vs refuseWithoutAudit/awaitCompletion 分岐を駆動(G15 保存)
- receipt 機構(`guardAllowed`/`guardReceipt`)で adapter 解決値を commit 経路へ受け渡し(二重計算なし)
- 信頼区分はレジストリ所有権 + blocking-sensor adapter で表現(trust フィールド不採用 — AUTO_DECIDED `cbd40080`)
- model-map impl-only 更新は AUTO_DECIDED `3fe86a60` で追認
- `verifyStageArtifacts`/`verifyBlockingSensors` は adapter へ分解・削除(二重実装なし)、chokepoint 2 関数は存続

## テストと検証(bolt worktree head `f6b291e4a` 実測)

- TDD: 各 slice Red 実測 → Green。census/regression は注入→赤→revert の落ちる実証済み(残渣 0 を grep 確認)
- `bash tests/run-tests.sh --ci`: PASS(990 files / 13341 assertions / 0 fail)
- typecheck / lint / build(追跡ファイル不変)/ source-only / distribution / coverage-registry / complexity / no-silent-drop: すべて exit 0
- 帰属切り分け: 初回赤 17 ファイルは base 同条件再現(全 PASS)との集合差で全件自変更由来と確定し 3 系統で是正

## 計画からの逸脱

- なし(12 Steps 全完了)。裁定 2 件(model-map / trust 表現)は AUTO_DECIDED として記録済み。

## 申し送り

- Patch Coverage Gate / Project Coverage Gate / plugin-conformance-e2e は CI でのみ確定 — PR #2986 の CI 実測は pr-convergence 段で確認
- G9 fail-open の別 Issue 起票判断は build-and-test 段(§14 経路)
