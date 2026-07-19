# Reliability Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 検査の信頼性(fail-closed+vacuity guard)

- 禁止語彙 grep 検査は「SKILL に語彙が混入したら必ず赤」+「正当な SKILL 本文で赤くならない」の両側を fixture で固定(business-rules.md — corpus-sweep-for-new-guards の両側実測の系譜)。検査述語自体の空文化(語彙衝突による無音素通り)は vacuity guard テストでピンする(vocabulary-collision-vacuity-guard ノルムの写像)
- 落ちる実証: BR-K1 検査述語へ規則文 fixture を注入して赤→revert の1セット(FD business-rules.md 落ちる実証節:16 の実引用+team.md falling-proof-injection-one-set 準拠。**帰属注記**: requirements.md NFR-2 の落ちる実証内包対象は FR-3b/FR-4/FR-6 に限定されており FR-8a は含まれない — 本項は FD 段で追加された検査自体の品質要求であり、要件への遡及帰属をしない(reviewer Critical 是正 — 旧記載の FR-8a 引用は捏造引用につき削除))

## 実演層の信頼性境界

- subagent 実演(ADR-6 (ii))は非決定的な LLM 実行のため CI に常設しない — flaky テストを信頼性保証に混ぜない(ADR-6 Consequences)。常設保証は機械実行器(U5 e2e)が担い、実演は受け入れ証跡1回に限定
- 可用性・observability 要求は N/A(反証可能な根拠: U6 は常駐プロセス・実行コードを持たない文書+検査ユニット)。ランタイム面は既存スタック(technology-stack.md)のテストランナーのみ
