# Bolt Plan — 260706-harness-codex（Issue #552 Phase 1）

## 上流入力

[unit-of-work.md](../units-generation/unit-of-work.md)（u001-harness-codex、規模 S、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)（FR 直接割り当て）、[team-practices.md](../practices-discovery/team-practices.md)。

## Bolt 一覧

| Bolt ID | 対象 unit | 内容 | 完了条件 |
|---|---|---|---|
| B001-harness-codex | u001-harness-codex | FR-1（fresh clone 純正性検証）→ FR-2（写像表）→ FR-3（yaml 追加）→ FR-4（harness/codex 2 文書）→ FR-6.5（scanRoots 追加）→ FR-5（promote 昇格）→ FR-6（検証一式） | requirements.md の受け入れ条件 4 行がすべて充足し、Bolt PR が人間により merge される |

## Walking Skeleton の扱い

steering に stance 規定なし = scope-dependent（practices-discovery 記録済み）。feature scope のエンジン既定は skeleton on のため、B001 が walking skeleton を兼ねる（単一 Bolt のため「最薄の end-to-end スライス」= Bolt 全体）。walking skeleton の Bolt PR は人間承認必須（team.md）だが、merge は元々人間が行うため運用は不変。stance の正式分類は Construction 最初の Bolt gate（gate: unresolved）で report する。

## 実行様式

- 単一 worktree（engineer4）で直列実行（team.md の直列化規定）。
- Bolt worktree の fork / merge が必要な規模ではない（docs + 設定ファイル。エンジンの bolt start --worktree は使わない判断を Construction で確認）。
