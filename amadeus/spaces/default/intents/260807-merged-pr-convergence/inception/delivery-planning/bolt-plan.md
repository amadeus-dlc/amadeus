# Bolt Plan — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(FR/AC/NFR)、`components`(変更面)、`unit-of-work`(単一 Unit 定義)、`unit-of-work-dependency`(依存なし・Batch 1 単独)、`unit-of-work-story-map`(スライス 1〜6 の実装順)。

## Bolt 編成

| Bolt | Unit | 内容 | ゲート |
|---|---|---|---|
| 1(唯一) | landed-report | story-map スライス 1〜6 の全実装(TDD、t481/t482 新規 + t446/t448/t450 追補 + stage 文書/docs) | **walking-skeleton gate 適用**(self-feature Mandated — Bolt 1 は単独・gated。ただし Intent Autonomy full の stage-gate/walking-skeleton は grant がカバー) |

## 実行方式

- ソロモードのため Bolt 実装は最初から git worktree 分離(`cid:code-generation:solo-bolt-worktree-required`)。ハーネスの worktree 隔離ガード下では Agent worktree isolation 経路(`cid:code-generation:c1-pcp-isolated-session-swarm-incompat` (i)〜(iv))を用いる。
- ブランチ: `bolt/landed-report`(base = 実装開始時の origin/main 最新 — tNNN 再確認を実施)。
- PR 粒度: 1 Bolt = 1 PR(team.md Way of Working)。工程記録は別途 record-sync。

## Bolt 完了条件

- 全 AC(AC-1a〜AC-4b)green + NFR-2 検証コマンド標準集合 + NFR-3 build 後追跡ファイル不変 + NFR-4 allowlist remap。
- PR 発行 → 収束(pr-convergence の自己適用は本 intent の変更が未着地のため従来スキル手順)→ 人間承認マージ(no-AI-merge)。
