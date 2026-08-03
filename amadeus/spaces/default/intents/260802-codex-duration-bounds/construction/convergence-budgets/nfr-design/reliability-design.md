# Reliability Design — convergence-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## State Machine

reserve→claim→confirm→finishをUnit 1 reducerへ統合する。budget消費はreserve commitで確定し、失敗／dispatch-not-startedでも戻さない。policy mismatch、canonical write failure、unknown effectはtyped refusal／safe-stopとする。

## Termination

`TerminationReasonV1Factory`がreason、budget Fact、last progress、next action、root IDを生成する。unknown code decoderはraw値を保持して新規開始を止める。audit noise regressionと全kind cap境界をproperty testする。
