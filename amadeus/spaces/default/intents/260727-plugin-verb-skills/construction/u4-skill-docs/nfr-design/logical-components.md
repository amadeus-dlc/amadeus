# Logical Components — U4 u4-skill-docs

上流入力(consumes 全数): business-logic-model.md、tech-stack-decisions.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md

## 論理コンポーネント

| コンポーネント | 責務 | NFR 対応 |
|---|---|---|
| SKILL.md 正本 | ガード付き導線(status first → 説明 → 固定 verb)。markdown のみで追加依存なし | security-requirements.md SR-U4-1/SR-U4-2、tech-stack-decisions.md TS-U4-1、business-logic-model.md Step 1-3 |
| 投影配線(3系統×7面) | 正本のバイト同一配布 | reliability-requirements.md RL-U4-1、tech-stack-decisions.md TS-U4-2 |
| docs 入口節(19-plugins EN/JA) | 3系統入口+面区別の案内 | scalability-requirements.md SC-U4-1(count-free 導出形) |
| スキル検査テスト | 存在+マーカー不含+7面投影の機械固定 | reliability-requirements.md RL-U4-2、performance-requirements.md(追加負荷なし) |

## 依存方向

正本 → 投影(生成のみ)。docs はすべての面確定後に固定(循環なし)。
