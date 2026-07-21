# Logical Components — verification-and-ledger-closure

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Isolation boundary |
|---|---|---|
| Disposition Classifier | approved itemとevidenceを照合 | C7内部helper、new variantなし |
| Coverage Tracer | 24 itemをtest/docsへ全数trace | 23/24・partial EQUIVALENT拒否 |
| FR23 Test Placement Guard | adopted testを再著作しfilesystemをintegration-first化 | SKIP test除外 |
| FR24 Docs Guard | docs pair/namespace/6 harness/ownership/legacy pathを検査 | docs evidenceのみ |
| Same-SHA Gate Aggregator | targeted＋必須gate＋coverageを一つに集約 | stale/failed未green |
| Coverage Waiver Guard | patch未カバー0または既決waiver証拠を検査 | generic waiver拒否 |
| Transition Planner | incomplete/BLOCKED/APPLIEDのclosed unionを計画 | pure、ledger writeなし |
| Atomic Ledger Writer | BLOCKED/APPLIEDを最終operationとして記録 | idempotent、baseline規則維持 |

## Data flow

U01〜U11のEvidenceRefをDisposition ClassifierとCoverage Tracerへ渡し、24/24 TraceResultを作る。FR23 Test Placement GuardとFR24 Docs Guardの結果を含むtargeted evidenceをSame-SHA Gate Aggregatorへ渡し、Coverage Waiver GuardとともにVerificationResultを確定する。

Transition Plannerは24 disposition、VerificationResult、最終SHA、accepted terminal evidenceを評価し、incomplete不変、structured BLOCKED、三条件APPLIEDのいずれかを返す。Atomic Ledger WriterはBLOCKED/APPLIEDの場合だけ最終operationとして冪等に反映する。public seamはCoverage Tracer、Same-SHA Gate Aggregator、Transition Plannerに対応する正準3関数だけである。

## Failure domainとblast radius

- evidence欠落/partial equivalence: Coverage Tracerで停止しledgerを変更しない。
- test/docs配置違反: 各Guardのverification failureへ閉じる。
- stale/failed gate: Same-SHA Gate Aggregatorでgreen化を止める。
- invalid waiver: Coverage Waiver Guardで拒否する。
- incomplete/ambiguous evidence: Transition Plannerがno-transitionを返す。
- structured terminal failure: baseline不変のBLOCKED一件へ限定する。
- valid completion: APPLIED一件へ限定し、再実行で履歴を増やさない。

shared resourceは既存EvidenceRef、CI/coverage/docs gate、ledger、atomic writerだけである。database、network、service、queue、distributed ledger、第二writerは存在しない。

## NFR mapping

`performance-requirements.md`の有界closureはTracer/Aggregator/Planner、`security-requirements.md`のintegrityは各Guard、`scalability-requirements.md`の固定集合はTracer/Aggregator、`reliability-requirements.md`のclosed transitionはPlanner/Writer、`tech-stack-decisions.md`の既存C7 stackは全component、`business-logic-model.md`のCoverage/Verification/Ledger workflowはcomponent接続へ反映する。
