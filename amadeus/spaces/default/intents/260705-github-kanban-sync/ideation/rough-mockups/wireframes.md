# Wireframes — kanban board（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)

この board の列とカスタムフィールドの初期構築は、intent-backlog.md の P2（kanban-sync-manual）が担う。ここで定義する構成が P2 の構築仕様の入力になる。

## Board 全体（Projects v2 の Board view）

```
┌─ Amadeus Intents ──────────────────────────────────────────────────────────────────┐
│ [Board view]  Filter: -is:archived                                                 │
│                                                                                    │
│ Awaiting Approval   Ideation        Inception       Construction     Done         │
│ ┌───────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│ │260705-github- │  │260706-xxx  │  │            │  │260705-eng- │  │260704-v2-  │ │
│ │kanban-sync    │  │            │  │            │  │validator-  │  │parity-     │ │
│ │───────────────│  │            │  │            │  │gap         │  │completion  │ │
│ │⏳ gate: scope- │  │            │  │            │  │            │  │            │ │
│ │definition     │  │            │  │            │  │            │  │ (auto-     │ │
│ │👤 claude      │  │            │  │            │  │            │  │  archive)  │ │
│ │🖥 mac-studio  │  │            │  │            │  │            │  │            │ │
│ └───────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

- 列は Awaiting Approval、Ideation、Inception、Construction、Operation、Done の 6 個（Operation は図では省略）。
- 承認待ちゲート（`[?]`、または `BOLT_COMPLETED` / `PHASE_VERIFIED` 未記録の滞留）を持つ Intent は、phase 列ではなく Awaiting Approval に置く（rough-mockups-questions.md Q1 = A）。
- completed の Intent は Done に置き、auto-archive で整理する（Should）。

## カード詳細（item を開いたとき）

```
┌─ 260705-github-kanban-sync ────────────────────────────┐
│ 本文:                                                   │
│   Issue: #470（リンク）                                  │
│   scope: feature                                        │
│   worktree: .claude/worktrees/claude+issue-470-...      │
│   current stage: scope-definition [?]                   │
│                                                         │
│ カスタムフィールド:                                       │
│   Status(列):    Awaiting Approval                       │
│   Agent:         claude（branch prefix / Active Agent）  │
│   Host:          j5ik2o-mac-studio-lan（audit shard 由来）│
│   Worktree:      claude+issue-470-...（末尾セグメント）    │
│   Scope:         feature                                 │
│   Stage:         scope-definition                        │
│   Issue:         #470                                    │
│   Synced At:     2026-07-05T02:20:00Z（鮮度）             │
└─────────────────────────────────────────────────────────┘
```

- Worktree と Issue もカスタムフィールドとして持つ（scope-document.md の Must「カードフィールド（担当エージェント、ホスト、worktree、scope、Issue）」に対応）。Issue リンクは本文にも記載する。

## 横断一覧（Table view の併用）

複数 Intent の worktree / Issue / Agent を開かずに比較する動線は、同じ project の **Table view** で満たす（全カスタムフィールドが列として並ぶ）。
Board view はカード表面の表示フィールド設定で Agent / Host / Stage / Synced At を出し、詳細比較は Table view に切り替える。
どちらも Projects v2 の標準機能であり、追加実装は不要である。

## アクセシビリティ注記

本 Intent は新規 UI を実装せず、表示は GitHub Projects v2 の既存 UI（見出し構造、ランドマーク、キーボード操作）に全面的に依拠する。独自のアクセシビリティ対応は対象外である。

- タイトルは dirName（Q2 = A）。
- Synced At（鮮度）は sync 実行時刻。古ければ鏡が遅延していると分かる（feasibility Q4）。
- フィールドは sync が全上書きする。board 側での手編集は次回 sync で上書きされる（一方向鏡）。
