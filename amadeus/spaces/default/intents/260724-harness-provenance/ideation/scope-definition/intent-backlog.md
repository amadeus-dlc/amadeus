# Intent Backlog — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## Prioritized Backlog

| 優先度 | 項目 | 根拠 |
|---|---|---|
| P1 | state/memory 記録スキーマの確定(記録先: `amadeus-state.md` 冒頭 vs 各ステージ `memory.md`、フィールド形状) | scope-document.md In Scope #1-2 |
| P1 | Claude Code の env var からの自動検出実装 | feasibility-assessment.md TC-1(実測確認済み、確実に実現可能) |
| P2 | Codex 自動検出の実機検証・実装 | feasibility-assessment.md TC-2(条件付き実現可能、実機検証が前提) |
| P3 | Cursor / OpenCode / Kiro 向け手動記入フォールバック設計・実装 | constraint-register.md TC-3、RAID R-1 |
| P3 | 監査シャードイベントへの付記の要否比較検討 | Issue #1452 本文の明示的な比較検討指定 |

## Out-of-scope バックログ(別 Issue 候補)

- Cursor / OpenCode / Kiro の恒久的な自動検出手段の確立(env var 公開の要望を各ハーネス側へフィードバックする可能性を含む) — scope-document.md Out of Scope #3
