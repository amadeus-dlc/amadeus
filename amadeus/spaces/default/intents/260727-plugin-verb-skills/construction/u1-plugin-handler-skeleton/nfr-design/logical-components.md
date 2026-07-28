# Logical Components — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): business-logic-model.md、tech-stack-decisions.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md

## 論理コンポーネント

| コンポーネント | 責務 | NFR 対応 |
|---|---|---|
| `case "plugin"` 分岐 | rest の切り出しと handlePluginDelegate 呼出しのみ | performance-requirements.md PR-U1-1(薄さ) |
| `handlePluginDelegate(rest, deps)` | 配列構成 → deps.spawn → exit 伝播(business-logic-model.md の一本道) | reliability-requirements.md RL-U1-1、security-requirements.md SR-U1-1 |
| `PluginDelegateDeps` | spawn seam(既定 = Bun.spawnSync ラッパー) | tech-stack-decisions.md TS-U1-2(unit 被覆) |
| usage 3面(die/HELP_TEXT_TAIL/t67) | 文言同期のみ | scalability-requirements.md(規模機構なしの確認対象外) |

## 依存方向

case → handlePluginDelegate → deps.spawn の一方向。逆依存・循環なし。
