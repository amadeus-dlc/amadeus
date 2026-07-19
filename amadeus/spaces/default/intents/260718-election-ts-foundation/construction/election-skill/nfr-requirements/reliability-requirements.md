# Reliability Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 検査の信頼性(fail-closed+vacuity guard)

- 禁止語彙 grep 検査は「SKILL に語彙が混入したら必ず赤」+「正当な SKILL 本文で赤くならない」の両側を fixture で固定(business-rules.md — corpus-sweep-for-new-guards の両側実測の系譜)。検査述語自体の空文化(語彙衝突による無音素通り)は vacuity guard テストでピンする(vocabulary-collision-vacuity-guard ノルムの写像)
- 落ちる実証: 語彙注入で赤→revert の1セット(requirements.md FR-8a 受け入れ (i) の「含めた実装は落ちる実証で赤」)

## 実演層の信頼性境界

- subagent 実演(ADR-6 (ii))は非決定的な LLM 実行のため CI に常設しない — flaky テストを信頼性保証に混ぜない(ADR-6 Consequences)。常設保証は機械実行器(U5 e2e)が担い、実演は受け入れ証跡1回に限定
- 可用性・observability 要求は N/A(反証可能な根拠: U6 は常駐プロセス・実行コードを持たない文書+検査ユニット)。ランタイム面は既存スタック(technology-stack.md)のテストランナーのみ
