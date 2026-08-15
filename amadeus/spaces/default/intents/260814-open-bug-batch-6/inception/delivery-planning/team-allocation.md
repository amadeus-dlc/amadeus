# Team Allocation — 260814-open-bug-batch-6

## 体制

ソロモード(team.md § Operating Modes)。conductor(本セッション)が amadeus-builder-agent への委譲でバッチ1の4 Bolt を並行実装し、レビューは書込不可のレビュアーサブエージェント(§12a / kiro-review 相当)が担う。engine/state の変更操作は conductor 専管(project.md)。

## 割当

| Bolt | 実装 | レビュー | worktree |
| --- | --- | --- | --- |
| B1 | amadeus-builder-agent(委譲、Opus 相当) | 独立レビュアー(読取専用) | bolt-landed-finalization |
| B2 | amadeus-builder-agent(委譲、Sonnet 相当) | 同上 | bolt-sensor-declaration |
| B3 | amadeus-builder-agent(委譲、Sonnet 相当) | 同上 | bolt-docs-sensors-sync |
| B4 | amadeus-builder-agent(委譲) | 同上 | bolt-worktree-gc |
| B5 | conductor 主導(調査)+ 是正時 builder 委譲 | 同上 | bolt-audit-sink(是正時のみ) |

- 全 Bolt を git worktree 分離で実装(solo-bolt-worktree-required)。worktree のベース・マージターゲットは main
- source-only 境界下の新規 worktree では依存インストールと `bun run build` を移設手順に含める
- PR 作成・push は push-first(commit 次第 push→PR、重い検証は CI と並列)。マージは人間承認境界
