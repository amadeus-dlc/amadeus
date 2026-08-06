# Integration Test Instructions — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(integration 配置の宣言 — 実 FS 検証は integration 層)と code-summary.md(統合実測)。

## 対象スイート(integration 層 — 実 FS / 実 compose / spawn)

- t445(×2): applicability CLI / advisory 宣言供給(composed 面)
- t447: referee toolchain adapter(CI-safe surface、fake TLC port)
- t449: registration の実 FS 統合(atomic replace / TOCTOU 決定的注入 / 既存互換バイト不変 / registration-then-resolve handoff / 実 publish 失敗 arm)
- t450: authoring 工程 E2E — 要求入力 → 適用判定 → authoring → referee → レビュー → 承認 → bundle → 登録 → 既存 formal-model-check 実行 → 相関 verdict の全経路を composed runtime で spawn 駆動(temp コピーの coverage 混入なし)。fail-closed 2系(witness 欠落 halt / 承認欠落の登録拒否)込み

## 実行

`bun test tests/integration/t445-*.integration.test.ts tests/integration/t447-*.integration.test.ts tests/integration/t449-*.integration.test.ts tests/integration/t450-*.integration.test.ts --timeout=120000`

実測(U5 着地断面): 0 fail。full CI(`bash tests/run-tests.sh --ci`)は各 Bolt worktree と PR CI の両方で RESULT: PASS を実測(code-summary.md 転記、PR #2312 CI 実文)。
