# Build and Test Summary — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 実行計画

- [x] Step 1: Code Generation成果物、Standard戦略、NFRを読み、検証対象を確定
- [x] Step 2: build instructionsを生成
- [x] Step 3: unit / integration test instructionsを生成
- [x] Step 4: performance / security test instructionsをNFRに基づき生成
- [x] Step 5: build・typecheck・lint・drift guardを実行
- [x] Step 6: unit testsを実行
- [x] Step 7: integration testsとCI profileを実行
- [x] Step 8: performance構造検証とsecurity/dependency検証を実行
- [x] Step 9: stage sensorsを実行
- [x] Step 10: 実測結果とreadinessを確定

## Test inventory

| 種別 | 対象 | 状態 |
|---|---|---|
| Build | typecheck、lint、6 dist、4 self-install、registry、complexity | PASS |
| Unit | unit t269、t144、t100 | PASS — 26/26 |
| Integration | integration t269、t270、CI profile | PASS — focused 12/12、全体で未解消failure 0 |
| Performance | PERF-1〜PERF-6の構造制約 | PASS |
| Security | fail-closed、5面raw leak、dependency audit | PASS（既存transitive advisoryは分離記録） |

## Coverage expectations

単一 Unit `harness-provenance` の FR-1〜FR-4、NFR-1〜NFR-2、PERF-1〜PERF-6、SEC-1〜SEC-5を test IDと実測コマンドへtraceする。固定coverage percentageを新設せず、既存 coverage registry / ratchetを維持する。

## Readiness

- Build-ready: Yes
- Test-ready: Yes — focused 38/38、全体CIで検出した2件のtest metadata不整合も是正・再検証済み
- Deployment-ready: Build/Test観点ではYes。CI Pipeline stageの実行・承認は未実施

## 制約

本stageはdeploymentを実行しない。HTTP service、DB、IaCがないため、DAST・load test・IaC scanは非該当とする。

全体CIは2回実行し、いずれも517 files / 7,221 assertions中、同じ2件だけが失敗した。原因は新規testのCLI-spawner手動ラチェット未登録と、process境界testをUnitへ置いたtest-size purity違反であり、製品コードの失敗ではない。2回の上限後は該当testをUnit/Integrationへ分離し、失敗したguardを含むfocused 58 assertionsを全件PASSとして再検証した。AWS認証情報期限切れによりClaude substrateのlive SDK testは既定どおりskipされた。

stage sensorsは required-sections 7件、upstream-coverage 7件、type-check 5件、answer-evidence 1件の計20件を実行し、全件PASSした。
