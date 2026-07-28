# Logical Components — U3 u3-runner-gen-plugin

上流入力(consumes 全数): business-logic-model.md、tech-stack-decisions.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md

## 論理コンポーネント

| コンポーネント | 責務 | NFR 対応 |
|---|---|---|
| compile 焼き込み(amadeus-graph.ts) | plugin 由来ノードへ判別フィールド付与(不在既定) | security-requirements.md SR-U3-1(識別の単一所有)、business-logic-model.md compile 層 |
| runner-gen write/prune 拡張 | plugin runner の生成・除去(テンプレート1定義) | reliability-requirements.md RL-U3-2/RL-U3-3、scalability-requirements.md SC-U3-1(全再生成のまま)、security-requirements.md SR-U3-2(書込面 = skills/ のみ) |
| CLI 配線(handleCompose/handleDrop) | spawnRecompile 成功後の write spawn(両側対称) | reliability-requirements.md RL-U3-1、performance-requirements.md PR-U3-1(spawn 1追加) |
| fixture/E2E | compose 済みホスト模擬での落ちる実証と閉包 | tech-stack-decisions.md TS-U3-2 |

## 依存方向

CLI 配線 → runner-gen → stage-graph.json(読取)。graph 焼き込みは compile の内部。循環なし(business-logic-model.md の3層と同一方向)。
