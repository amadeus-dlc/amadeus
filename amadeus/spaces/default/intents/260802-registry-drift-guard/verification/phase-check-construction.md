# Phase Check — Construction（260802-registry-drift-guard）

上流入力: `requirements.md`、`code-generation-plan.md`、`code-summary.md`、`build-instructions.md`、`unit-test-instructions.md`、`integration-test-instructions.md`、`performance-test-instructions.md`、`security-test-instructions.md`、`build-and-test-summary.md`、`build-test-results.md`

検証日時: 2026-08-02T23:47:57Z。`self-fix`スコープでは`build-and-test`がConstructionの最終EXECUTEステージであり、Operationは全ステージSKIPのため、本書はworkflow完了前のphase boundary検証である。

## 実行ステージと成果物

| ステージ | 状態 | 成果物・実装 | 検証 |
|---|---|---|---|
| code-generation | approved | plan／summary各1点、core tool・schema・state、docs、CI detector、unit／integration test、7 dist＋5 self face | focused 206 pass／0 fail、typecheck／lint／package check green。Architecture reviewは2回とも通常promotion制約によりNOT-READYだったが、制約を明示してユーザーが承認 |
| build-and-test | 本phase-check後にapprove | 宣言7成果物すべて実在、非0 byte、H2を各2個以上保持 | 修正後`test:ci` 753 files／10,171 assertions／0 fail、適合センサー14/14 PASSED |

functional-design、nfr-requirements、nfr-design、infrastructure-design、ci-pipeline、formal-model-checkはscope gridによりSKIP。専用CI pipelineを新設せず、既存`detect-ci-changes.sh`からfull CIへ到達させる方針はRequirementsで承認済みである。

## 要件 → 実装 → テストのトレーサビリティ

| 要件 | 実装 | 検証 | 判定 |
|---|---|---|---|
| FR-1 CLI verb parity | `amadeus-registry-drift.ts`、`amadeus-state.ts` | dispatch／`Valid:` 33件一致、dispatch-only／phantom／empty／duplicate tamper | PASS |
| FR-2 stage field parity | `ACCEPTED_STAGE_FIELDS`、emitter marker、authoritative spec、英日reference | schema／emitter／spec／EN／JA 25件一致 | PASS |
| FR-3 `when`契約 | schema由来registryと3文書 | supportedに存在、reserved表に0件 | PASS |
| FR-4 reusable guard seam | pure extractor／comparator | unit 6 cases、live integration 4 cases | PASS |
| FR-5 docs-only CI到達性 | `scripts/detect-ci-changes.sh` | 英日対象pathは`full=true`、無関係docsは`full=false` | PASS |
| FR-6 配布面同期 | package／promotion生成経路 | package check 7/7、core self face DIFFERS／MISSING 0 | PASS |
| Acceptance 7 通常promotion | `bun run promote:self:check` | 既存・保護対象plugin overlay 31 ORPHANでexit 1 | KNOWN FAIL |

[Issue #2037](https://github.com/amadeus-dlc/amadeus/issues/2037)のnarrative Field reference全面追加はRequirementsどおりOut of scopeであり、孤児実装ではない。変更台帳にあるsource、docs、tests、生成面はFR-1〜FR-6へすべて対応し、要件に紐づかない今回由来の実装はない。

## 品質・センサー・非機能確認

- repository-native CI: 753 files、10,171 assertions、failed files 0、failed assertions 0。
- 初回CIが検出した新規integration testの`size: small`誤宣言は`medium`へ訂正し、狙い撃ち20 testsと全体CIを再実行してgreen。
- static／build: typecheck、lint、coverage registry freshness、7-harness package check、`git diff --check`はすべてexit 0。
- sensors: 7宣言成果物へrequired-sections／upstream-coverageを発火し、最新14件はすべて`SENSOR_PASSED`。type-checkはTS成果物非該当、answer-evidenceはquestions成果物非該当。
- §13 learnings: `E-260803-BT-S13-Z0`でchoice 1「0件で可」を2-0、GoA favor 2／against 0で採用。既存size drift guardの正常な適用実例であり、新規practice／sensorの重複永続化は行わない。
- performance: 定量性能NFRと新規runtime workloadがないためN/A。
- security: attack surfaceとdependency追加がないため専用scanはN/A。fail-closed tamper、lint、typecheck、dependency差分なしを確認。
- E2E: 新規利用者journeyがないため専用追加はN/A。既存repository E2Eは`test:ci`で実行し、substrate不在の既定24 filesのみskip。

## 既知例外と境界判定

通常`promote:self:check`は、作業開始前から存在し変更禁止とした`.codex/skills/amadeus-*`の31件ORPHANでexit 1となる。保護対象を削除せず、隔離checkを通常checkの代替にもしていないため、Acceptance 7は厳密には未充足である。この例外はCode Generationの2回のArchitecture reviewとユーザー承認で明示済みであり、Build and Testでも未解消のまま再提示する。

判定は **PASS WITH KNOWN EXCEPTION**。FR-1〜FR-6、build、static、focused、全体CI、センサーは閉包した。最終承認では、通常promotion checkの31件ORPHANを既知例外として保持したままworkflowを完了するかを人間が裁定する。
