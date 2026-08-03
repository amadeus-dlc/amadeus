# Scalability Design — convergence-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Subject Index

BudgetSubject keyをroot／kind／subjectのcanonical encoderで作り、6 kindをclosed registryへ置く。foldでMapを一度構築し、1／100／1,000 subjectでreserve latencyを線形全scanにしない。

## Configuration

`BudgetPolicyResolver`がglobal→space→intentを解決し、hard cap超過を拒否する。初回snapshot後はreloadしても既存subjectを変更せず、7 harnessへ同一versionを生成する。
