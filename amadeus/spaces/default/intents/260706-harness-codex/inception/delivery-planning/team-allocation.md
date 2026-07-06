# Team Allocation — 260706-harness-codex

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 割り当て

| 役割 | 担当 | 責務 |
|---|---|---|
| Bolt 実施 | engineer4（本セッション） | B001 の実装・検証・PR 作成・監視（pr-gate-discipline.md 準拠） |
| gate 承認中継 | leader | auto 委任経路の中継承認、4 イベント受領 |
| レビュー | amadeus-*-reviewer-agent（subagent） + 必要に応じ reviewer（Codex）直接依頼 | 成果物の独立レビュー |
| 接触面 | engineer3（#554）、engineer1 | 非接触確定済み（協議記録あり）。変化があれば都度ピア確認 |
| merge | 人間（Maintainer） | Bolt PR の承認と merge |

approval-handoff Q1（engineer4 単独継続）の確定どおり。追加の要員・引き継ぎは不要。
