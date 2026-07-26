上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — kimi-harness-definition

> 上流入力の使用箇所: business-logic-model.md の検証シーケンス、business-rules.md の BR-6/BR-7、requirements.md の FR-1b、technology-stack.md の drift guard 機構を根拠とする。

## 信頼性の仕組み

- **byte-parity drift guard**: `bun scripts/package.ts kimi --check` が temp 再生成との byte-diff で exit 0(requirements.md FR-1b)。生成物の陳腐化・手編集を構造的に検出する
- **t145 packaging parity**: manifest 検出により自動カバーされ、CI で常時検査される
- **回復**: 生成物はいつでも正本(harness/kimi/)から再生成できる。バックアップ・可用性の概念は不要(再生成が回復経路)

## 劣化時の振る舞い

packager の loud fail(宣言ミス時)に委ね、静かな部分生成を許さない(business-logic-model.md の決定木どおり)。
