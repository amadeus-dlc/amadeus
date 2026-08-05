# Scalability Design — five-harness-intent-completion

## 入力とscaling axis

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

scaling axisはIntent partition数とregistry由来cohort member数である。常駐service、global coordinator、別databaseを追加せず、短命CLIとcanonical auditを維持する。

## Intent partitioning

authorization、receipt validation、completion evidence、terminal transactionはexplicit Intent UUIDでpartitionする。別Intentのreceipt IDからtargetを逆引きせず、cross-Intent混入を拒否する。Intent間のlive scenarioは独立に進められるが、同一Intentのterminal appendだけを1 lock / CASへ直列化する。

## Cohort growth

cohort membershipは`packages/framework/harness/registry.ts`のcapabilityから解決し、harness ID順へ正規化する。現行GA fixtureはClaude Code、Codex、Cursor、OpenCode、Kimi Codeをexact oracleとし、Kiro / Kiro IDEはcapability falseのため除外する。

将来harnessはregistry row、credential-attested native adapter、生成型 / distributionを追加して参加する。Core evaluator、authorization schema、terminal transactionへharness名や件数分岐を追加しない。invalid / duplicate / empty cohortはfail-closedする。

## Backpressureとisolation

native scenarioの並行度は実行環境の既存bounded schedulerへ委ね、無制限fan-outを作らない。1 harnessのtimeout / skip / failedはそのreceiptだけを失敗させ、他harnessのvalidated receiptを破棄しない一方、全memberが揃うまでIntent completionを許可しない。

## Verification

registry順序変更、future harness fixture、cohort member追加 / 削除、複数Intent並行、1 harness timeout、duplicate validation、clone merge後の再評価を検査する。adapter追加が既存5 harnessのCore fixtureとterminal digestを分岐させないことをdrift guardで確認する。
