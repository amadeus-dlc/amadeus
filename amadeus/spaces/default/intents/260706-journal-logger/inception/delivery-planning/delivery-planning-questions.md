# Delivery Planning Questions — 260706-journal-logger

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（u001-journal-logger、規模 M、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

計画の残論点は Bolt 分割 1 問。自己判断（理由付き。多体連携の小さな構造判断、Deviations にも記録）で確定し、gate の人間承認で確定する。

## Q1. Bolt 分割

- A. 単一 Bolt（B001 = FR-1〜FR-5 の直列パイプライン全体）。walking skeleton stance が on の場合は B001 が skeleton となり PR は人間承認必須（merge は元々人間のため運用不変）
- B. 2 Bolt（B001 = 契約 + validator、B002 = 手順書 + 移行 + チェックリスト）
- C. その他
- X. Other (please specify)

[Answer]: A（単一 Bolt）。規模 M でも FR-1（形式の正）が全納品物の前提であり、B の分割境界（契約 + validator / 文書群）は B002 が B001 の形式定義に完全依存して並行の便益がなく、PR 2 本に割る根拠が薄い。受け入れ条件表がそのまま単一 PR の完了条件になる。自己判断（理由付き）。
