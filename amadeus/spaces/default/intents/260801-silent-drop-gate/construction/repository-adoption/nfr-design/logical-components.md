# Logical Components — repository-adoption

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、U1〜U3の成果をrepository、CI、distributionへ接続する。U4はscanner、identity、ratchet、runtime mutationを再実装しない。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 所有しないもの |
| --- | --- | --- | --- |
| LC-RA-01 | `EvidencePromotionCoordinator` | pre／post censusからclassification、approval、candidateまで一方向に順序付け | U1 evidence algorithm、canonical write |
| LC-RA-02 | `ApprovalReviewAdapter` | U1 audit authority／verifierへclassification receiptを接続 | caller指定audit root、audit write |
| LC-RA-03 | `BaselinePromotionManifest` | review対象candidate、bootstrap、initial exemption、digestを提示 | 自動promotion capability |
| LC-RA-04 | `BaseRevisionResolver` | eventから唯一のfull base SHAを選択 | HEAD／merge-base fallback |
| LC-RA-05 | `BaseObjectMaterializer` | object確認最大2、欠落時literal fetch最大1 | finding単位Git、別remote |
| LC-RA-06 | `BlockingGateStep` | GNU deadline下でroot gateを1回起動しexitを保持 | gate algorithm、stdout再分類 |
| LC-RA-07 | `RepositoryCapacityHarness` | 隔離R0／R2／R4 fixtureとU1公開receipt照合 | identity codec、production checkout変更 |
| LC-RA-08 | `CapacityFixtureReceiptRegistry` | scale別U1生成identity／base・current ledger exact bytesをversion管理 | identity再計算、任意fixture入力 |
| LC-RA-09 | `ColdWarmMeasurementHarness` | 5 workspace slot×cold/warmのcanonical receiptを生成・照合 | sample欠落補完、別revision混入 |
| LC-RA-10 | `RequiredAcceptanceReceiptRegistry` | schema versionごとの必須ID exact setとrevision bindingを所有 | caller指定required list |
| LC-RA-11 | `AcceptanceReceiptAggregator` | registry exact setとの全単射からoverall statusを計算 | raw artifact複製、未実行補完、空集合green |
| LC-RA-12 | `DistributionProjectionVerifier` | package apply、promotion apply、両drift checkを順序実行 | generated直接編集 |
| LC-RA-13 | `WorkflowStructureGuard` | lint job内step位置、timeout、permission、禁止fallbackを構造検査 | CI実行algorithm |

## Interface契約

```text
EvidencePromotionCoordinator.prepare(preRevision, postRevision, newOutputPaths):
  raw-pre + raw-post + classification-required

ApprovalReviewAdapter.approve(raw, classification):
  U1 ApprovalAuditAuthority/Verifier -> approved-evidence | rejected

BaselinePromotionManifest.build(approvedPre, approvedPost):
  reviewable(B0, bootstrap, initialExemption, provenanceDigests)
  | rejected(FP | not-shrink-only | unexpected-identity)

BaseRevisionResolver.resolve(event):
  full-sha | invalid

BaseObjectMaterializer.ensureCommit(fullSha):
  present | fetched-and-present | blocking-failure

BlockingGateStep.run(fullSha):
  exit(0 | 1 | 2 | 124 | 137 | other-nonzero)

ColdWarmMeasurementHarness.measure(slots=0..4):
  canonical schema-v1 receipt with exact cold/warm pair per slot

RequiredAcceptanceReceiptRegistry.expected(schemaVersion=1, revision):
  closed set of 23 (id, version, revision) keys

AcceptanceReceiptAggregator.evaluate(actualReceipts, registry):
  green only on exact-set bijection and every receipt passing
  missing | extra | duplicate | wrong-version | wrong-revision -> red
```

canonical ledger promotionはcomponent methodではなくhuman-reviewed repository changeである。`EvidencePromotionCoordinator` はU1 public commandだけを呼び、schema、identity、ratchetを内部へ取り込まない。

## 依存方向

```text
EvidencePromotionCoordinator
  -> U1 census-evidence
  -> ApprovalReviewAdapter -> U1 approve-evidence + audit verifier
  -> U1 baseline-candidate
  -> BaselinePromotionManifest -> human repository review

BlockingGateStep
  -> BaseRevisionResolver
  -> BaseObjectMaterializer -> GitProcessPort
  -> U1 root no-silent-drop CLI

RepositoryCapacityHarness
  -> CapacityFixtureReceiptRegistry
  -> isolated Git base/head workspace with exact ledger bytes
  -> U1 public CLI/receipts
ColdWarmMeasurementHarness -> five isolated fresh workspaces -> U1 root CLI
DistributionProjectionVerifier
  -> bun scripts/package.ts
  -> bun run promote:self
  -> package/promote check commands
WorkflowStructureGuard -> .github/workflows/ci.yml
AcceptanceReceiptAggregator
  -> RequiredAcceptanceReceiptRegistry
  -> exact revision-bound receipt set
```

## Failure domainとblast radius

| failure domain | 影響 | 封じ込め |
| --- | --- | --- |
| evidence／approval | 当該promotion chain | 次段／canonical write 0 |
| base resolution／fetch | 当該CI step | gate未実行、blocking failure |
| gate violation／error／hang | lint job | nonzeroを保持、他algorithmへ波及させない |
| capacity fixture | acceptance | scale別reviewed receipt不一致でgate前停止、production checkout／ledger不変 |
| receipt aggregation | final status | closed registryとの欠落／余剰／重複をredにし空集合green禁止 |
| package／promotion drift | release全体 | verified statusを拒否、手修正禁止 |

## Resource ownership

immutable evidence pathはU1 new-output-only writer、canonical ledgerはhuman repository change、Git childはBaseObjectMaterializer、deadline childはBlockingGateStep、隔離workspaceとscale別ledger materializationはcapacity harness＋fixture registry、measurement receiptはColdWarmMeasurementHarness、generated projectionはpackager／promoterが所有する。新規service、database、credential、artifact storeを作らない。

対話開発ではHerdrを利用できるが、pane／workspace IDをevidence identityへ含めない。tmuxもHerdrもruntime、CI、capacity、approvalの依存ではない。

## 後続への引渡し

Code GenerationはU4 wiring、fixture、report、workflow guardを実装し、U1〜U3のcanonical interfacesを消費する。Build and Testはfocused／full regression、cold／warm、R0／R2／R4、event fixture、hang、distribution driftを実行し、全receiptの論理積を最終gateへ渡す。
