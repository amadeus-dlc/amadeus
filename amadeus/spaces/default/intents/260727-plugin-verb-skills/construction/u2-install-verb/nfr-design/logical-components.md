# Logical Components — U2 u2-install-verb

上流入力(consumes 全数): business-logic-model.md、tech-stack-decisions.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md

## 論理コンポーネント

| コンポーネント | 責務 | NFR 対応 |
|---|---|---|
| `parseInstall` | 引数検証(path 必須・flag 判定) | usage-error(exit 2)の入口 — business-logic-model.md Step 冒頭。security-requirements.md の各 SR は handleInstall 以降が所有 |
| `handleInstall` | 検分 → 衝突判定 → 配置 → compose 委譲の逐次制御(business-logic-model.md Step 1-4 のフロー所有者) | reliability-requirements.md RL-U2-1(収束表の所有者) |
| `stagingEntryState` seam | 3値判定(absent/identical/different) | scalability-requirements.md SC-U2-1(決定的全走査) |
| `copyPluginSource` seam | swap 内包の原子的配置(tmp/old 名前空間) | reliability-requirements.md RL-U2-1、security-requirements.md SR-U2-2(symlink 除外) |
| render 拡張(installed/failure:install) | 結果描画と exit code | performance-requirements.md(追加機構なし)、tech-stack-decisions.md TS-U2-2 |

## 依存方向

parseInstall → handleInstall → (stagingEntryState / copyPluginSource / 既存 compose 経路)の一方向。seam は PluginCliDeps に集約(循環なし)。
