# Security Design — U4 u4-skill-docs

上流入力(consumes 全数): security-requirements.md、performance-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

SR-U4-1/SR-U4-2(security-requirements.md)の実現:
- Canonical command contract 節(business-logic-model.md Step 3)に許容形を text fence で全列挙し、スキル本文に「列挙外を組み立てない」を明記
- drop / install --force の実行前に不可逆性・置換の影響を提示する文面を Step 2 節へ固定
- 両マーカー不含(reliability-requirements.md RL-U4-2 の検査テストで機械固定、tech-stack-decisions.md TS-U4-1 の markdown のみ)

## 境界確認

- performance-requirements.md / scalability-requirements.md の N/A に影響する機構なし
