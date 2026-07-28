# Reliability Design — U4 u4-skill-docs

上流入力(consumes 全数): reliability-requirements.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

RL-U4-1/RL-U4-2(reliability-requirements.md)の実現:
- 投影完全性は dist:check / promote:self:check(business-logic-model.md 投影フローの終端検査)— 手動チェックリストで代替しない
- スキル検査テスト(t258 前例様式): SKILL.md の存在・両マーカー不含・7面投影の3 assert(tech-stack-decisions.md TS-U4-2 の配線実在を機械固定)

## 境界確認

- テストは既存 unit ランナー内(performance-requirements.md N/A 維持)。検査対象は静的ファイルのみ(security-requirements.md SR-U4-1 の固定 verb 原則に依存しない、scalability-requirements.md の規模非依存)
