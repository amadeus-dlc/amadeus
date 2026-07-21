# Reliability Design — verification-and-ledger-closure

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Closure correctness

同じitems/evidence/verification/ledgerから同じTraceResult、VerificationResult、LedgerTransitionResultを得る。24/24 evidenceが揃わない場合、partial EQUIVALENTの場合、必須gateが未実施・非0・別SHAの場合、patch coverage条件を満たさない場合はAPPLIEDを拒否する。

## Closed transition contract

transitionは三分岐だけである。

1. 単なる未完了、24 disposition・全gate green・最終SHAのいずれか欠落はledger/baseline不変とし、BLOCKEDへ分類しない。
2. 構造化`verification-failure`または`abandon`だけを反証可能根拠と対象SHA付きBLOCKEDへ計画し、baselineを不変にする。
3. 三条件成立時だけ最終SHA付きAPPLIEDを計画する。

BLOCKED/APPLIEDは既存atomic ledger writerの最終operationとして書き、同一transition再実行はno-opにする。進行中、曖昧自由文、条件欠落から新transitionを作らない。

## Verification matrix

| Scenario | Required behavior |
|---|---|
| 24/24 valid | verificationへ進む |
| 23/24・partial EQUIVALENT | completeness拒否 |
| stale/failed gate | APPLIED拒否 |
| uncovered/invalid waiver | verification拒否 |
| incomplete | ledger/baseline不変、非BLOCKED |
| structured failure/abandon | idempotent BLOCKED、baseline不変 |
| 三条件成立 | idempotent APPLIED |
| same transition再実行 | 履歴増加0 |

availability SLO、RTO/RPO、retry、replication、新failure evidence/disposition/transitionは追加しない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U12-01〜09を中心に、`performance-requirements.md`の一回closure、`security-requirements.md`のfalse green防止、`scalability-requirements.md`の固定集約、`tech-stack-decisions.md`のatomic writer、`business-logic-model.md`のLedger workflowへ対応する。
