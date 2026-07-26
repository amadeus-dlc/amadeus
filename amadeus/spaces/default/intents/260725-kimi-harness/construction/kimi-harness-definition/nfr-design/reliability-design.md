上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — kimi-harness-definition

> 上流入力の使用箇所: reliability-requirements.md の3機構(byte-parity・t145・再生成が回復経路)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性要件を、具体的な検査・回復の設計に落とす。

## 設計

- **byte-parity guard**: `package.ts kimi --check` を必須検査とし、t145 で全 harness について自動カバーされることを確認(reliability-requirements.md §信頼性の仕組みどおり)
- **回復手順**: 破損時は正本(harness/kimi/)から `package.ts kimi` で再生成する。実効は「dist が再生成できる」ことで検証され、U5(distribution-enumeration)の `dist:check`(temp への再生成と byte-diff)がその実測となる(reliability-requirements.md §信頼性の仕組みと同じ機構)
- **loud fail**: packager の宣言ミスは既存の loud fail に委ね、静かな部分生成を許さない(business-logic-model.md §決定木)
