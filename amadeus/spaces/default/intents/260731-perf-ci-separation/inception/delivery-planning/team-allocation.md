# Team Allocation — 260731-perf-ci-separation

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md

## 体制(ソロモード)

- **conductor(本セッション)**: 全 Bolt の実装ディスパッチ・§12a レビュー起動・ゲート執行・PR 収束(j5ik2o-gh-pr-converge-loop)
- **builder**: Bolt ごとに worktree 分離の subagent(unit-of-work.md の Unit 規模 — 最大 +195 行/Bolt — は単一 builder で十分)
- **reviewer**: §12a 宣言 reviewer(code-generation は amadeus-quality/architecture 系 — engine 指令に従う)。自己実装の自己レビュー禁止は subagent 分離で担保
- **ユーザー**: 全ステージゲート承認・walking-skeleton gate(Bolt 1)・PR マージ承認(no-AI-merge)

## 割当原則

- 直列 4 Bolt のため並行割当なし(unit-of-work-dependency.md の DAG)
- Bolt 間で builder コンテキストは引き継がない(fresh subagent + FR/design 焼き込みプロンプト — cid:code-generation:c1-parallel-degrade-batch の非適用形: 本 intent は full stage 構成で directive は engine 解決)
