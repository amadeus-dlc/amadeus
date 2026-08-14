# Logical Components — election-mixed-lifecycle-cli

## Input

[business-logic-model](../functional-design/business-logic-model.md)をorchestration componentsへ分ける。

## Components

| Component | Role | Failure boundary |
|---|---|---|
| Context Loader | canonical state/target snapshot | invocation |
| Directive Builder | read-only next JSON | invocation |
| Command Handlers | 9 verbs orchestration | one command |
| Transition Guard | state/run/target/digest compare | one report |
| Error Mapper | typed error→stderr/exit | one command |

## Shared resources and review

U1〜U4 portsとfilesystem lockだけを共有し、global mutable cacheなし。READY: business policyはowner unitに留まり、CLI blast radiusをorchestrationへ限定する。
