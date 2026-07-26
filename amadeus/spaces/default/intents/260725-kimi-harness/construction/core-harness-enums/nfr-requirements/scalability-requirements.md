上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Scalability Requirements — core-harness-enums

> 上流入力の使用箇所: business-rules.md の BR-1(編集は定数のみ)と business-logic-model.md の swarm resolve 分岐(fan-out 規模は conductor 側の既存制御)を根拠とする。

## 対象の概要

本 Unit は定数への追加で、スケールの概念を持たない。

## 判定と基準

**N/A**(存在しない対象)。ハーネス数の規模増は自動検出の構造に吸収され(business-rules.md BR-1 の編集点は定数のみ)、swarm の fan-out 規模は既存の conductor 側の波制御に従う(business-logic-model.md §swarm resolve — adapter 側に新機構なし)。
