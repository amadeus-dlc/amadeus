上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Build and Test Summary — test-pyramid-rebuild

## 全体状態

Build & Testの実測は、承認済みscope内で既知の時間制約concern付きPASSとした。U1〜U3のexecutable deltaは0件であり、U1/U3のexact-ref record再現とcurrent worktree回帰を分離して検証した。成功runではcurrentのsmoke、unit、integration、E2Eがすべてexit 0、combined coverageはfailed 0で、project coverage gateとdirty patch gateもPASSした。

同じcombined coverageの後続再確認2回では、変更境界外の`t-team-up-codex-resume.test.ts`だけがBun既定5秒timeoutで1件、次に5件失敗した。対象5件は10秒の診断runで全件成功し、機能assertionの不一致ではなく実行時間制約へ帰属した。赤を成功runへ上書きせず、既定timeoutの不安定性をゲート判断対象として保持する。

Build verificationでproject-local self installの`.cursor` / `.opencode` driftを検出し、canonical projectionを再生成して再検査PASSとした。この修復は既存worktreeの生成投影同期であり、U1〜U3のrecord-only成果やexecutable deltaには数えない。

## 実行前提

- current HEAD: `dccb5c35f26724514630af79ff785599fc124616`
- runtime: Bun 1.3.13、既存`node_modules/`とrepository設定を使用
- Test Strategy: Comprehensive
- U1/U3 exact measurement ref: `3917a283a953165866170d235d3dc25ad2fd3643`
- U2 historical runtime subject: `244a196795f8b23192ed54dc1221b75d0c8e8f44`。current結果へ混合しない

## テスト種別inventory

| 種別 | instruction | 適用 |
| --- | --- | --- |
| Build / static / drift | `build-instructions.md` | PASS。typecheck、Biome、complexity、6 harness dist、self install、diff check |
| Smoke / unit | `unit-test-instructions.md` | PASS。14 files / 343 assertions、212 files / 2,998 assertions |
| Integration | `integration-test-instructions.md` | PASS。targeted t118は19 pass / 77 assertions、fullは148 files / 1,945 assertions |
| E2E | `e2e-test-instructions.md` | PASS。69 files / 146 assertions |
| Combined coverage | `build-test-results.md` | 成功runはPASS。374 files / 5,291 assertions、failed 0。後続再確認のtimeout concernは別記 |
| Performance | `performance-test-instructions.md` | 専用testはN/A。tier runは回帰として実行し、budgetへ昇格しない |
| Security | `security-test-instructions.md` | 実行型scanはN/A。U3証拠完全性validatorはPASS |

## Unit別coverage期待

| Unit | executable delta | 検証anchor | readiness条件 |
| --- | ---: | --- | --- |
| U1 SizeLedger | 0 | exact ref、442 rows、5 files / 39 tests | record再現PASS |
| U2 policy/budget | 0 | current tier全run exit 0、21/128/PENDING/PENDINGの非縮退 | historical subjectとcurrentを分離してPASS |
| U3 migration/coverage | 0 | digest、163=68+95、coverage 8/8 | validator PASS、payload不変 |

## Readiness評価

- build-ready: PASS。最終static/drift/diff検査はexit 0。
- test-ready: PASS with concern。scope内のexact-ref再現、current 4 tier、combined coverageの成功runはfailed 0。後続再確認の既定5秒timeoutは未解消。
- gate-ready: §13 learnings surfaceはcandidates 0 / parked 0で完了。文書凍結後の手動sensor verdictはauditを判定正本とし、人間によるApproveは未実施。
- deployment-ready: 本intentは実移設・CI配線・deploymentをOutとしておりN/A。

## 既知の制約と状態分離

- U3は承認済みscopeどおり`open-review` / `actionable=false`であり、`classification-review` 68件と`retier-to-integration` 95件を可視化する。実移設未実施は本intentの失敗ではない。
- per-tier LCOV pathはPENDING、E2E coverageはNOT EXECUTED。combined coverageだけを実測済みPASSとする。
- U2のintegration/e2e時間budgetはPENDING。current tierの成功や単発wall timeから数値を補完しない。
- 専用performance testと実行型security scanは、runtime/dependency/attack surface deltaがないためN/A。未実施をPASSへ読み替えない。
- `t-team-up-codex-resume.test.ts`は同一コードで全体成功runと後続timeout runの両方を観測した。timeout延長は仕様変更になるため実施せず、人間ゲートで既知concernとして判断する。

## 成果物命名

engineのresolved produce `build-test-results.md`を唯一の結果正本とする。stage proseに残る旧称`test-results.md`は重複生成しない。
