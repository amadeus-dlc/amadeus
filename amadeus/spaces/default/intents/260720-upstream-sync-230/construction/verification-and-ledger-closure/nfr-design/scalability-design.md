# Scalability Design — verification-and-ledger-closure

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Fixed closure set

本Unitのscalabilityはservice scalingではなく、approved 24 item、全Unit evidence、必須gate、docs検査を決定的に集約する能力である。24 itemを固定集合として扱い、各itemへ最低1つのtest/docs evidenceを対応付ける。Unit/evidence数が増えても判定集合、順序、closed unionを変えない。

## Verification batch

targeted evidence、typecheck、lint、dist、promote、full CI、coverageを同一最終SHAの一つのVerificationResultへ束ねる。evidence store、coverage index、consumer別判定を複製しない。ledgerへ渡すtransitionは全集約後の一件だけである。

| Dimension | Boundary |
|---|---|
| disposition | approved 24 item全数 |
| evidence | itemごとにtest/docs 1件以上 |
| verification | 必須gateを同一SHAへ集約 |
| ledger | 最終transition一件 |

## Capacity verification

24/24、23/24、evidenceなし、partial EQUIVALENT、各gate単独failure、別SHA、BLOCKED/APPLIED再実行をtable-drivenに対照する。動的item、partial closure、parallel writer、第二evidence database、new capacity thresholdは追加しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U12-01〜04を中心に、`performance-requirements.md`の有界集約、`security-requirements.md`のevidence integrity、`reliability-requirements.md`のidempotency、`tech-stack-decisions.md`の既存toolchain、`business-logic-model.md`のTrace/Phase workflowへ対応する。
