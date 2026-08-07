# Logical Components — landed-report

上流入力(consumes 全数): `business-logic-model`(`construction/landed-report/functional-design/business-logic-model.md` — evaluate 改訂フロー・landed 経路・sensor 対応表を設計前提として消費)。nfr-requirements 系 5 consumes は scope self-feature の実行構成で nfr-requirements ステージが SKIP のため設計どおり不在(requirements.md の NFR-1〜4 が正本)。

## 論理構成(実装配置)

| 論理部品 | 配置 | 新設/拡張 |
|---|---|---|
| PrLifecycleState / LandedFacts / EvaluatedVerdict(labeledVerdict / landedVerdict) | plugins/pr-convergence/tools/pr-convergence-predicate.ts | 新設(evaluateConvergence はバイト不変) |
| RawPrState 拡張 + PR_STATE_QUERY 拡張 | plugins/pr-convergence/tools/pr-convergence-gh-runner.ts | 拡張 |
| resolvePrLifecycle + primed + landed 分岐 + ConvergenceReport landed variant + renderReport landed 節 | plugins/pr-convergence/tools/pr-convergence-cli.ts | 拡張 |
| checkLanded + kind 閉集合拡張 | packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts | 拡張 |

## テスト配置(fs/integration 規律)

- t481(unit): predicate 純関数のみ — 実 FS 非接触(`cid:code-generation:fs-tests-integration-first` の unit 側)。
- t482(integration): runCli + scripted GhSpawn + 一時 record dir(実 FS)— integration 層へ配置。
- t450 追補(integration): 既存配置を踏襲。
