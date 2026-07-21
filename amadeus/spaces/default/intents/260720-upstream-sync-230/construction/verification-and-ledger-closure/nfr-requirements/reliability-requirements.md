# Reliability Requirements — verification-and-ledger-closure

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、evidence completeness、same-SHA verification、closed transition、idempotencyを信頼性境界とする。

## Correctness scenarios

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U12-01 | 24/24 valid evidence | 全itemをtraceし、次のverification判定へ進む。 |
| REL-U12-02 | 23/24またはpartial EQUIVALENT | completeness/EQUIVALENTを拒否する。 |
| REL-U12-03 | gate未実施・非0・古いSHA | greenへせずAPPLIEDを拒否する。 |
| REL-U12-04 | patch uncovered lineあり/証拠なしwaiver | verificationを拒否する。 |
| REL-U12-05 | 単なる未完了・三条件欠落 | APPLIEDを拒否し、ledger bytes/baseline不変、BLOCKEDへ分類しない。 |
| REL-U12-06 | 構造化`verification-failure` | failure gate/command、観測結果、対象SHA付きBLOCKEDを冪等計画しbaseline不変。 |
| REL-U12-07 | 構造化`abandon` | 明示主体、理由、対象SHA付きBLOCKEDを冪等計画しbaseline不変。 |
| REL-U12-08 | 三条件成立 | 最終SHA付きAPPLIEDを計画する。 |
| REL-U12-09 | 同一BLOCKED/APPLIED再実行 | no-opで履歴を増やさない。 |

## Closed transition contract

transitionは次の三分岐だけである。(a)単なる未完了または24 disposition・全必須gate green・最終SHAのいずれか欠落はledger/baseline不変、(b)accepted terminal evidenceである構造化`verification-failure`/`abandon`だけを反証可能根拠付きBLOCKEDへ計画しbaseline不変、(c)三条件成立時だけAPPLIED。曖昧な自由文や進行中をBLOCKEDへ分類しない。BLOCKED/APPLIEDは既存atomic writerを再利用する。

## Determinism・observability

- 同一items/evidence/verification/ledgerから同一TraceResult、VerificationResult、LedgerTransitionResultを得る。
- ledger writeは最終operationで、機能成果物を変更しない。
- 新failure evidence、disposition、transition、audit event、metrics backend、retentionを追加しない。

## Verification gate

completeness、same-SHA、accepted terminal evidence、idempotency、integration-first、docs pair/legacy path fixturesと全repository gateを同一最終SHAで通す。local lcov patch追加行未カバー0または既決waiver証拠を必須とする。

## トレーサビリティ

REL-U12-01〜09は`business-rules.md`のBR-U12-01〜13、`business-logic-model.md`のVerification scenarios、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
