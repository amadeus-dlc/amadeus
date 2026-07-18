# フェーズ境界検証 — Construction(test-pyramid-rebuild、#684)

上流入力(consumes 全数): inception/requirements-analysis/requirements.md, inception/application-design/{components,component-methods,decisions}.md, inception/units-generation/{unit-of-work,unit-of-work-dependency}.md, construction/U1-size-ledger/code-generation/{code-generation-plan,code-summary}.md, construction/U2-layer-spec-gate/code-generation/{code-generation-plan,code-summary}.md, construction/U3-migration-coverage/code-generation/{code-generation-plan,code-summary}.md, construction/build-and-test/{build-instructions,unit-test-instructions,integration-test-instructions,e2e-test-instructions,performance-test-instructions,security-test-instructions,build-and-test-summary,build-test-results}.md

Construction境界のトレーサビリティ検証である。本intentの完了境界は設計・計画・台帳materializeまでで、実テスト移設、runner/CI配線、tier-aware gate実装、deploymentはFR-7によりOutである。Operation全stageはscope上SKIPされている。

## ステージ状態と境界

| Construction stage | 状態 | 境界検証 |
| --- | --- | --- |
| functional-design | 完了 | U1〜U3の業務ロジック・規約・選定projectionを設計 |
| nfr-requirements | 完了 | U1〜U3の性能・security・scalability・reliability・stack要件を確定 |
| nfr-design | 完了 | NFR要件を論理componentと検証可能な契約へ具体化 |
| infrastructure-design | SKIP | runtime/IaC/deployment deltaがないrecord-only scopeのためN/A |
| code-generation | 完了 | 3 Unitのplan/summaryをmaterialize。各Unitのexecutable deltaは0 |
| build-and-test | 実測完了・ゲート前 | exact-ref再現、current回帰、coverage、static/drift検査を完了 |
| ci-pipeline | SKIP | CI配線・強制gateはFR-7でOut。未構成をPASSへ読み替えない |

## Coverage集計

| 観点 | coverage | 判定 |
| --- | ---: | --- |
| FRからConstruction成果への写像 | 7 / 7（100%） | 全FRがU1〜U3またはscope guardへ到達 |
| Unitのcode-generation必須成果 | 3 / 3 Unit、6 / 6 files（100%） | plan / summaryが全Unitに存在 |
| Build and Test canonical produces | 7 / 7（100%） | engine-resolved必須成果が全て存在 |
| Unit executable delta | 0 / 0 | N/A。実装不要をPASS数へ水増ししない |
| acceptance evidence | 7 / 7 FR（100%） | record再現、規約、budget、projection、scope guardで検証 |

## トレーサビリティ（要件 → 設計 → record → 検証）

| 要件 | 設計 / Unit | code-generation record | Build and Test証拠 | 判定 |
| --- | --- | --- | --- | --- |
| FR-1 サイズ分類台帳 | C1 / U1-size-ledger | exact ref付き442-row SizeLedger | `3917a283...` export、442 rows、5 files / 39 tests | PASS |
| FR-2 比率ガイドライン | ADR-02 / U2-layer-spec-gate | 50/45/5目標と現状gapをrecord化 | current回帰とU1 snapshotを分離、強制gate化なし | PASS |
| FR-3 tier×size規約 | ADR-01/05、C2/C3 / U2 | 4 NamedTier規約と判定IF | current全tier exit 0。[PR #1193](https://github.com/amadeus-dlc/amadeus/pull/1193) の計測軸/配置軸を維持 | PASS |
| FR-4 移設選定台帳 | ADR-03、C4 / U3-migration-coverage | 163件を68 review + 95 migrationへ全単射投影 | replay validator 163=68+95、errors 0 | PASS |
| FR-5 実行時間budget | ADR-02 / U2 | smoke 21秒、unit 128秒、integration/e2e PENDING | historical subjectとcurrent runを分離し、PENDINGを推測で埋めない | PASS |
| FR-6 #683 coverage整合 | C5 / U3 | coverage経路契約8項目 | U3 contract 8/8、combined project/patch gate PASS | PASS |
| FR-7 scope外・green維持 | 全設計/UnitのOut境界 | 全Unit executable delta 0 | 成功runのcurrent smoke/unit/integration/e2e/coverage failed 0、実移設・CI配線なし | PASS with concern |

## Build / Test実測

| 面 | 実測 | 判定 |
| --- | --- | --- |
| U3 replay | 442 ledger / 163 candidates / 68 review / 95 migration、coverage 8/8、digest `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` | PASS |
| exact-ref targeted | 5 files / 39 passed / 0 failed | PASS |
| smoke | 14 files / 343 assertions / failed 0 | PASS |
| unit | 212 files / 2,998 assertions / failed 0 | PASS |
| integration | targeted t118 19 passed / 77 assertions、full成功run 148 files / 1,945 assertions / failed 0 | PASS with timeout concern |
| E2E | 69 files / 146 assertions / failed 0 | PASS |
| combined coverage | 成功run 374 files / 5,291 assertions / failed 0 | PASS with timeout concern |
| project coverage gate | 68.8115%、baseline 40.9395%、+27.8720 percentage points | PASS |
| dirty patch gate | combined LCOV 14 / 14 covered、targeted isolated LCOV 17 / 17 covered | PASS |
| static / drift | typecheck、Biome、complexity、6 harness dist、self install再検査、`git diff --check` | PASS |

## 整合性・gap・orphan検査

- U1/U3 measurement ref `3917a283...`、U2 historical runtime subject `244a196...`、current HEAD `dccb5c35...`を別の母集団として保持し、件数やbudgetを相互流用していない。
- U3の`open-review` / `actionable=false`は承認済みscopeのfinal stateである。68件のclassification reviewが残るため95件のmigration queueは非actionableであり、実移設未実施をConstruction failureにしない。
- record-only Unitに新規application codeはなく、Architecture → Codeのcode側は0/0でN/A。すべてのrecord成果は上流設計へ遡及でき、orphanは0件。
- `.cursor` / `.opencode` self-install driftはcanonical projection再生成で解消したが、U1〜U3の成果やexecutable deltaへ帰属させていない。
- infrastructure-designとci-pipelineは承認済みscopeでSKIPである。一般的な「infrastructure designed / CI configured」を無根拠にPASSとせずN/Aとし、Operationへhandoffしない。
- 要件・設計・record・検証間に新規の矛盾、写像漏れ、無申告scope拡張はない。
- 後続のcombined coverage再確認2回で、変更境界外の`t-team-up-codex-resume.test.ts`にBun既定5秒timeoutを1件、5件観測した。対象5件は10秒の診断runで全件成功し、機能不一致は再現しなかった。timeout延長は仕様変更になるため実施せず、既知concernとして人間判断へ上げる。

## 宣言済み制約

- U2 integration/e2e budgetはPENDING。
- per-tier LCOV pathはPENDING、E2E coverageはNOT EXECUTED。combined coverageだけが実測済み。
- 専用performance test、SAST/DAST/dependency/IaC scanは適用対象がないためN/A。
- §13 learnings surfaceはcandidates 0 / parked open questions 0で完了した。文書凍結後の手動sensor verdictはauditを判定正本とし、人間によるBuild and Test Approveは未実施。

## 判定と人間確認

ConstructionのFR→設計→Unit record→検証のtraceabilityは7/7で、scope内のBuild and Testは既知timeout concern付きPASSとした。宣言済みPENDING/N/A/NOT EXECUTEDと後続timeoutを別状態として保持し、検証劇場や実装済み主張へ縮退していない。フェーズ完了は、最終成果物への手動sensor verdict確認と、timeout concernを含むBuild and Test gateの人間承認を条件とする。

- [ ] Build and Test completion approval（未実施。engine gateで人間が直接判断）
