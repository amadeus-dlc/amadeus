# Logical Components — reference-plugin-and-guides

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Isolation boundary |
|---|---|---|
| Test-pro Authoring Source | 必要最小manifest/stage/seam/fragmentを提供 | canonical一件、実装logic非複製 |
| U01 Validator Adapter | 既存schemaでsourceを検証 | 第二parser/APIなし |
| U09 Projection Adapter | 6 package面とbundleを生成 | generated非正本 |
| U10 Lifecycle Adapter | inspect/compose/doctor/dropを実行 | 既存ownership/atomicity再利用 |
| Package Matrix Verifier | 6面全数を検査 | self-install成功の代替にしない |
| Self-install Matrix Verifier | closed 4面を検査 | kiro系昇格なし |
| Tracked-tree Guard | success/failure前後bytesを比較 | temp root分離、一時物0 |
| Guide Author | Amadeus path、supported lifecycle、no-clobber、failure不変、record-owned drop、local/temp検証、6対4、deferredを記録 | upstream文面コピーなし |
| U12 Evidence Handoff | items 21–22 evidenceを渡す | ledger遷移なし |

## Data flow

Test-pro Authoring SourceをU01 Validator Adapterへ渡し、受理済みsourceをU09 Projection Adapterが6面へ投影する。U10 Lifecycle Adapterがtemp hostでcompose、compile/sensor、doctor、drop、再検証を実行する。Package Matrix VerifierとSelf-install Matrix Verifierは同じsourceから別々の期待集合を検査する。

Tracked-tree Guardはlifecycleのsuccess/failure前後を比較し、宣言外差分と一時物を検出する。Guide Authorは同じsupported lifecycle、no-clobber、failure不変、record-owned drop、local/temp検証、6対4、deferred境界を利用者向けに記録し、U12 Evidence Handoffがtest/docs evidenceだけを次ownerへ渡す。

## Guide verification

Guide Authorの出力は、Amadeus path/namespace、supported lifecycle、no-clobber、failure時三面不変、record-owned drop、local/temp verification、6 package対4 self-install、deferred一覧を必須checklistとして検証する。no-clobberとrecord-owned dropはU10 Lifecycle Adapterの意味を変えず、local/temp手順はTracked-tree Guardによる一時物0の証拠へ接続する。必須面の欠落またはdeferred面のsupported表現はdocs evidence failureとする。

## Failure domainとblast radius

- validation/projection failure: temp repository内へ封じ、tracked sourceを不変にする。
- compose/drop failure: U10三面transactionへ封じ、unrelated host bytesを維持する。
- matrix mismatch: 対象matrixだけをfailureとし、6/4を混同しない。
- cleanup mismatch: Tracked-tree Guardがclosure failureとして検出する。
- guide drift: deferredをsupported化せず、既存contractへ照合する。

shared resourceはcanonical source、temp repository/host、既存U01/U09/U10 seamだけである。database、network、service、new runtime API、fixture fleetは存在しない。

## NFR mapping

`performance-requirements.md`のminimal E2EはSource/Adapters、`security-requirements.md`のintegrityはTracked-tree Guard/Guide、`scalability-requirements.md`の6/4はMatrix Verifiers、`reliability-requirements.md`のclosureはLifecycle Adapter/Evidence Handoff、`tech-stack-decisions.md`の既存pipelineは全Adapter、`business-logic-model.md`のFixture/E2E/Guideはcomponent接続へ反映する。
