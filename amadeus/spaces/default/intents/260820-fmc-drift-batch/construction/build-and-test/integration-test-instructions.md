# Integration Test Instructions — 260820-fmc-drift-batch

各 unit の `code-generation-plan.md` / `code-summary.md` が宣言する境界横断面の実行手順。integration 層は filesystem / process を伴う medium test の置き場(unit allowlist 不拡張の規律)。

## 実行方法

- 個別: `bun test tests/integration/<file>...`
- 一括(integration 層): `bash tests/run-tests.sh --integration`
- フルスイート合否の正本はリモート CI(`ci-success` 集約)— ローカルは targeted 実行まで

## 対象テストと観点

| 対象 | テスト | 観点 |
|------|--------|------|
| applicability-arms(FR-ARM) | `tests/integration/t3186-tla-applicability-arms-predicate.integration.test.ts` / `t3186-tla-applicability-arms-cli.integration.test.ts`(計 42 pass 実装時実測) | tier (i) 実 corpus 逐語(PrConvergenceGate の landed 不在 finding、covered=TerminalVerdicts)、tier (ii) 合成 fixture の発火/非発火両側、defectRecurrence 閾値両側 strict、fail-closed 全様式(素通りゼロ) |
| revise-model-commit(FR-REG) | `tests/integration/t449-tla-registration.integration.test.ts` | registration committer の route 伝搬・commit 面の境界 |
| tla-authoring 面(FR-RET / FR-ARM 接続) | `tests/integration/t439-tla-authoring-cli.integration.test.ts` / `t450-tla-authoring-stage-e2e.integration.test.ts` | authoring-hold 退役後の CLI 面、pin 追随 |
| advisory 面(FR-RET) | `tests/integration/t526-advisory-handoff-stage.integration.test.ts` / `t527`(再配線済み) | advisory 経路の退役後整合 |
| docs 同期(FR-BND 逸脱申告分) | `tests/integration/t3028-sensors-docs-sync.integration.test.ts` | docs prose literal 台帳の resync |

## 横断・外部依存の扱い

- 外部サービス依存なし。tla2tools(TLC)を要する e2e は本 intent の検証対象外(既存赤の帰属は boundary-three-face の code-summary で ablation 実測済み — tla2tools 不在起因)
- クロス unit 干渉: 4 unit の write scope はソース面で非交差(生成台帳面は units-generation で書き分け済み — cid:units-generation:c4)

## 期待水準

- 触れた統合面のテストは全 green(実測は build-test-results.md に転記)
- 新規境界(applicability-arms の issue-evidence 読取り等)は fail-closed 枝を含めて green
