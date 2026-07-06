# Bolt Plan — 260706-journal-logger（Issue #557）

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（u001-journal-logger、規模 M、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## Bolt 一覧

| Bolt ID | 対象 unit | 内容 | 完了条件 |
|---|---|---|---|
| B001-journal-logger | u001-journal-logger | FR-1（契約 doc）→ FR-2（validator eval RED → 実装 → promote）→ FR-4（#556 移行 = 契約形式の最初の実データ）→ FR-3（手順書 + 役割 prompt）→ FR-5（チェックリスト）→ 検証一式（NFR-1） | requirements.md の受け入れ条件表（Issue 4 条件、うち 2〜3 は合否基準納品）がすべて充足し、Bolt PR が人間により merge される |

## Walking Skeleton の扱い

steering に stance 規定なし = scope-dependent（practices-discovery 記録済み）。feature scope のエンジン既定は skeleton on のため、B001 が walking skeleton を兼ねる（単一 Bolt = 最薄の end-to-end スライスは Bolt 全体）。walking skeleton の Bolt PR は人間承認必須（team.md）。stance の正式分類は Construction 最初の Bolt gate（gate: unresolved）で report する。前例（260706-harness-codex）では同条件で Bolt gate が auto 委任外の人間個別確認となった。

## 実行様式

- 単一 worktree（engineer4）で直列実行。Bolt worktree（bolt start --worktree）は規模 M の docs + validator 拡張に対し過剰のため使わない（前例と同判断。Construction で最終確認）。
- validator の TDD は dev-scripts ルールに従い、eval の RED 確認を記録する。
