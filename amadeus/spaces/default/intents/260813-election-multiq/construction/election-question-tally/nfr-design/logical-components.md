# Logical Components — election-question-tally

## Input

[business-logic-model](../functional-design/business-logic-model.md)を4 pure componentsへ分ける。

## Components

| Component | Responsibility | Blast radius |
|---|---|---|
| Response Resolver | voter×question latest response | one tally invocation |
| Partition Validator | target/preserved/coverage/digest | commit前全体stop |
| Question Tally | one question counts/holds/early/late | one question |
| Result Assembler | full ordered results/lifecycle/digest | one run |

## Resource design

invocation-local Map/SetのみでO(R+C+Q+V)。cache、network、shared mutable stateなし。question tally failureをpartial successへ丸めず全runを失敗させる。

## Review

READY。question failure domainとrun atomicityを両立する。
