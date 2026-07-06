# Team Allocation — 260706-journal-logger

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（u001-journal-logger、規模 M、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 割り当て

| 役割 | 担当 | 責務 |
|---|---|---|
| Bolt 実施 | engineer4 | B001 の実装・検証・draft PR・監視（pr-gate-discipline.md 準拠） |
| gate 承認中継 | leader | auto 委任経路（B001 Bolt gate は walking skeleton のため人間個別確認の見込み = 前例） |
| レビュー | amadeus-*-reviewer-agent（subagent）+ 必要に応じ reviewer（Codex）直接依頼 | 独立レビュー |
| 初回起動 + 運用検証 | 人間 / leader | 手順書 + チェックリストに従う（本 Intent 完了後） |
| merge / #556 クローズ | 人間 | 従来どおり |

approval-handoff Q1（engineer4 単独継続）の確定どおり。
