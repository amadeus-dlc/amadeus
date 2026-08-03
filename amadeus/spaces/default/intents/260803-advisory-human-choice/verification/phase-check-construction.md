# Construction Phase Boundary Verification — advisory-human-choice

## 検証概要

- **対象intent**: `260803-advisory-human-choice`
- **対象scope**: `self-fix`
- **対象phase**: Construction → Workflow Complete（Operationは全stage SKIP）
- **検証時刻**: `2026-08-03T14:30:50Z`
- **対象HEAD**: `498c3034a78bd432dc426f9f807b79c8ae980762`
- **結果**: `PASS_WITH_BASELINE_EXCEPTIONS`
- **上流Issue**: [#2129](https://github.com/amadeus-dlc/amadeus/issues/2129)

Constructionで実行した`code-generation`と`build-and-test`の成果物、実装、テスト、Formal Model Check証跡を照合した。要件・実装・テストに変更起因の欠落、orphan、矛盾はなく、フェーズ完了条件を満たす。

## Scope適応

Minimal `self-fix`の実行計画では、Constructionのうち`code-generation`と`build-and-test`だけがEXECUTEである。`functional-design`、`nfr-requirements`、`nfr-design`、`infrastructure-design`、`ci-pipeline`、workflow stageとしての`formal-model-check`はSKIPである。

一般的なConstruction境界の「Architecture → Units → Code → Tests → CI → Infrastructure」は、存在しない成果物を補完せず次の実行鎖へ適応する。

```text
Issue #2129
  → Requirements FR-1〜FR-6 / NFR-1〜NFR-4 / AC 1〜17
  → Code Generation plan / implementation / review READY
  → Build and Test unit・integration・E2E・security
  → advisory選択に基づくlocal Formal Model Check
  → Construction phase verification
```

SKIPされたCI pipelineとinfrastructure designはorphanまたは欠落ではなく、本CLI framework self-fixで期待された不存在である。Operationも全stage SKIPのため、本境界承認後はworkflow completionへ進む。

## 実行ステージと成果物

| ステージ | 状態 | 主要成果物 | 検証 |
|---|---|---|---|
| code-generation | 承認済み | `construction/advisory-human-choice/code-generation/code-generation-plan.md`、`code-summary.md` | Architecture review Iteration 2 `READY` |
| build-and-test | 承認・完了済み | 指示書5件、summary、results | focused 184/184、静的・配布検証PASS |
| formal-model-check | workflow stageはSKIP、advisory choiceによりlocal実行 | `.amadeus-advisory-check/<instance>/manifest.json`ほか4成果物 | `NOT_DETECTED`、complete、non-partial、provenance検証済み |

宣言されたBuild and Test成果物7件はすべて実在し、`required-sections`と`upstream-coverage`の最新terminal resultがPASSである。

## Traceability Matrix

| 上流 | 実装 | テスト | Coverage |
|---|---|---|---:|
| FR-1: fail-closed hold | `amadeus-orchestrate.ts`、`amadeus-directive.ts` | `t113`、`t378`、`t381`、7 harness E2E | 4/4（100%） |
| FR-2: 人間choiceとverdict | `amadeus-advisory-choice.ts`、Formal Model Check manifest検証 | `t203`、domain/artifact tests | 6/6（100%） |
| FR-3: protected receipt | presence hook、Codex adapter、atomic side-ledger | `t203`、`t210`、domain tests | 7/7（100%） |
| FR-4: 適用面の対称性 | main / `--single` / per-unit共通guard | `t378`、`t381` | 5/5（100%） |
| FR-5: 後段実行との非代替性 | activation verdictとstage completionの分離 | `t322`、`t381` | 2/2（100%） |
| FR-6: 監査と診断 | `HUMAN_TURN`相関、side-ledger、report guard | `t203`、`t210`、direct report拒否 | 4/4（100%） |
| NFR-1〜NFR-4 | 決定的guard、fail-closed verifier、共通contract、生成投影 | focused suite、complexity、typecheck、package/promote checks | 4/4（100%） |
| Acceptance Criteria 1〜17 | `code-summary.md`のAC対応表 | unit・integration・E2E・security | 17/17（100%） |

## 承認時に検出した追加回帰

最初のBuild and Test承認入力`1`が、未クローズadvisoryの2回目の`run-now` receiptとして誤記録され、存在しないretry attemptを要求する回帰を実動作で検出した。次の3契約をテスト先行で追加し、Greenへ戻した。

1. run-now実行待ちの別gate choiceは重複receiptまたはretry attemptを作らない。
2. 検証済み`NOT_DETECTED`後のapproval `1`は重複receiptを作らない。
3. 旧adapterが検証済みattempt後に重複receiptを残していても、その検証済みattemptを無効化しない。

`DETECTED`または`HARNESS_ERROR`後のfresh retry/defer契約は維持した。実intentの`advisoryReportHoldReason(build-and-test)`は最終確認で`null`を返し、未解決holdはない。

## Build and Test検証

- focused regression: **11 files、184 tests、541 assertions、0 failure**。
- full regression: **769 files、10468 assertions**。生結果は2 assertions failure。
  - `t-codex-exec-live-helper`: 並列cleanup assertion。120秒単独再実行は**3/3 PASS**。
  - `t413-no-silent-drop-ci-adoption`: 未変更のregistry revision `fc49f8de...`が現在HEAD `498c3034...`の祖先でない既存branch topology不整合。単独再実行でも同じ1 assertionのみFAIL。
- `bun run typecheck`: PASS。
- complexity gate: 新規違反0、回帰0。
- `bun scripts/package.ts --check`: 7 harnessすべてPASS。
- `bun run promote:self:check`: PASS。
- `bun run distribution:check`: PASS。
- `bun run lint`: exit 0。既存warning 394件、info 23件、新規blocking errorなし。
- `git diff --check`: PASS。

変更に相関するfailure、skip、timeoutは0件である。2件のfull regression failureは、単独再実行と変更file照合により環境競合または既存baselineとして分離した。

## Formal Model Check

- runId: `7c93be4a-280d-4ab5-b5f3-60b46d9de24b`
- outcome: `NOT_DETECTED`
- exitCode: `0`
- complete / partial: `true / false`
- target: `specs/tla`
- spec identity: `sha256:830732792893e951de0c22c5812d76726126daba652e4a6f8e0f6821df4d42ac`
- advisory instance: `c91aea85-9c50-4d6a-a46d-c1863e5659df`

expected artifacts 4件の実在、size、SHA-256、completion marker、environment receipt、model/cfg source provenanceを検証済みである。`DETECTED`、`HARNESS_ERROR`、partial/incomplete、identity不一致を成功へ読み替える経路はない。

## Consistency・Orphan・Gap分析

- requirement without implementation: 0件。
- implementation without requirement: 0件。
- acceptance criterion without test evidence: 0件。
- unresolved advisory hold: 0件。
- unresolved BLOCKER: 0件。
- undocumented scope expansion: 0件。local manifest相関情報の追加はCode Generationで承認済みの最小スコープ例外である。
- expected absent artifacts: functional/NFR/infrastructure design、CI pipeline、Operation全stage。
- known baseline exception: `t413`のcanonical evidence revisionと作業branch履歴の不整合1件。

## Phase Boundary順序契約

`stage-protocol-governance.md`はphase verificationを最後のstage承認後に実施すると定める一方、state transitionはphase-check artifactがない承認をfail-closedで拒否する。この既知の順序不整合は[Issue #2143](https://github.com/amadeus-dlc/amadeus/issues/2143)で追跡済みである。

最初の承認遷移はstateを変更せず拒否され、人間のBuild and Test承認は消費されなかった。本成果物作成後に同じ承認reportを再試行し、engineが成果物存在確認、stage/phase完了、`PHASE_VERIFIED`、`WORKFLOW_COMPLETED`を原子的にcommitした。

## Human Approval

- [x] 最新実装・再検証後のBuild and Testをユーザーが承認。
- [x] Construction traceabilityは全要件・実装・テストを照合済み。
- [x] engineの承認report再試行により、`2026-08-03T14:33:12Z`にConstructionとworkflowを完了。

## 判定

**PASS_WITH_BASELINE_EXCEPTIONS** — 実行対象unitは実装・テスト済みで、FR 6/6、NFR 4/4、AC 17/17を完全traceした。Formal Model Checkは相関済み`NOT_DETECTED`で、未解決advisory holdはない。変更起因の品質失敗は0件であり、Construction完了およびworkflow completionへ進行できる。
