# Build and Test Summary — advisory-human-choice

## 上流成果物

- `construction/advisory-human-choice/code-generation/code-generation-plan.md`
- `construction/advisory-human-choice/code-generation/code-summary.md`

上記で実装されたadvisory checkpoint、protected receipt、Formal Model Check成果物相関、7 harness projectionをBuild and Testの対象とする。

## Test Strategy

active stateの`Comprehensive`を適用する。unit、integration、E2Eを必須層とし、human-choice偽造防止にsecurity testを適用する。明示的な性能NFRがないため、performanceは適用性評価とtimeout観測に限定する。

## 生成した指示書

- `build-instructions.md`
- `unit-test-instructions.md`
- `integration-test-instructions.md`
- `performance-test-instructions.md`
- `security-test-instructions.md`

## 実行状況

Build、focused test、full regression、projection drift、Formal Model Checkの実測結果を`build-test-results.md`へ記録した。承認時に発見した重複`run-now` receipt回帰も追加修正し、変更固有の検証は全件PASSした。最終full regressionは769 files、10468 assertionsを実行し、単独再実行で解消した並列cleanup競合1件と、未変更のbranch topology不整合1件を除いてPASSした。

## Readiness

- **Build-ready**: Yes
- **Test-ready**: Yes
- **Deployment-ready**: 本intentはCLI frameworkのself-fixであり、人間のBuild and Test承認後にYesとする。

## 検証結果

- focused regression: 11 files、184 tests、541 assertions、全件PASS。
- full regression: 769 files、10468 assertions。変更相関failureは0件。
- typecheck、complexity、package projection、self promotion、distribution、whitespaceは全件PASS。
- Formal Model Check: runId `7c93be4a-280d-4ab5-b5f3-60b46d9de24b`、`NOT_DETECTED`、complete、non-partial、provenance相関済み。
- security: protected receipt writerを2経路に限定し、偽造・再利用・stale identity・不完全model-check成果物を拒否するnegative testがPASS。
- 成果物センサー: 7成果物すべてでrequired-sectionsとupstream-coverageの最新結果がPASS。
- §13: 学習候補0件を選挙`E-260803-AHC-BT-S13-Z0`で2/2票により確認し、記録・検証済み。

## 既知の制約

- `tests/integration/t413-no-silent-drop-ci-adoption.test.ts`は、現在のHEADの祖先でないcanonical evidence revisionを要求して1 assertionが失敗する。testとregistryは未変更であり、本変更範囲外のbaseline exceptionとして`build-test-results.md`へ証拠を記録した。
- `tests/integration/t-codex-exec-live-helper.test.ts`はfull regression並列実行で一時directory cleanup assertionが1回失敗したが、同一fileの単独再実行は3/3 PASSした。
- lintはexit 0で、既存warning 394件とinfo 23件を報告する。新規blocking errorはない。
