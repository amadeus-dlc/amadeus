# 260810-test-time-factor リバースエンジニアリング

## 観測点

- Date: `2026-08-10T14:26:50Z`
- Base commit: `7b9391be2db4fad791d637293ea442d5a1462bac`
- Observed commit: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: CI の能力差に合わせ、テストの基準 timeout/wait を `TEST_TIME_FACTOR` で乗算する設計
- Scan mode: Developer のリポジトリ全体スキャンと Architect の差分 synthesis
- Diff: 16 commits、非 record 部分64 files、`+3,371/-590`

## 観測結果

1. `TEST_TIME_FACTOR` / `testTimeFactor` の実装上の出現は0件。現在は本 intent 記録にのみ出現する。
2. `tests/lib/run-tests-args.ts` は既定 `30_000ms`、上限 `300_000ms` を固定し、`tests/run-tests.ts` が解決値を全 child へ `--timeout` として渡す。
3. `.github/workflows/ci.yml` の通常 test と coverage head/base、`pbt.yml` の固定30秒、`release.yml` の `test:ci` はいずれも係数を注入しない。
4. 明示 bun:test timeout は約555箇所/94ファイル。runner 既定の修正だけでは内部の timeout/wait は伸びない。
5. `tests/integration/t145-state-lock-concurrency.test.ts` の `Bun.sleep(1500)`、`tests/e2e/t-ide-kiro-checkpoint.serial.test.ts` の8秒 settle、`tests/harness/tui-drive.ts` と `tests/harness/kiro-ide-driver.ts` の deadline/poll/settle は CI 負荷に依存する高優先候補である。
6. `AMADEUS_TEST_TIMEOUT` は live model/driver の明示 override であり、係数との二重乗算を避ける必要がある。

## 実装候補境界

- 正本候補: `tests/lib/test-time-factor.ts`
- 契約候補: 未指定は `1`、有限の正値のみ受理、`scaleTestTime(baseMs)` で基準ミリ秒を乗算
- 必須配線候補: runner 既定/明示値、CI/coverage/PBT/release の env、既知の負荷依存 wait
- 対象外候補: 本番 timeout、perf wall-clock 閾値、timeout 発火用 slow fixture、時計境界だけを跨ぐ sleep

## リスクと未決定事項

- 不正な係数を fallback `1` にすると CI の設定誤りが無音化する。loud reject が安全側である。
- `--test-timeout-ms` を基準値として係数化するか、最終 override とするかは requirements-analysis で固定が必要。
- `.github/workflows/ci.yml` の変更は `tests/fixtures/formal-verif-ci-baseline.sha256` の基準値を更新する。
- stage が参照する `.codex/amadeus-common/templates/re-artifacts.md` は存在せず、正準 source `packages/framework/core/knowledge/amadeus-developer-agent/re-artifacts.md` で代替した。本 intent の対象外 FOLLOW-UP である。
