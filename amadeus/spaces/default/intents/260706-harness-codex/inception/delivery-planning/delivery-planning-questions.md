# Delivery Planning Questions — 260706-harness-codex

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（単一 unit、規模 S）、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

計画の残論点は Bolt 分割 1 問のみ。自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. Bolt 分割

- A. 単一 Bolt（B001 = FR-1〜FR-6 の直列パイプライン全体）。walking skeleton stance が on の場合は B001 自体が skeleton となり、その PR は人間承認必須（merge は元々人間のため運用は不変）
- B. 2 Bolt（B001 = skeleton として 1 skill 分の end-to-end + harness/codex 文書、B002 = 残り skill の展開）
- C. その他
- X. Other (please specify)

[Answer]: A（単一 Bolt）。規模 S の直列パイプラインで、B の分割は同一手順の反復を 2 PR に割るだけで検証の独立性が増えない（FR-1 の全件照合は最初から全 skill 分を行うため、部分展開に自然な境界がない）。PR は 1 本で受け入れ条件 4 行がそのまま PR の完了条件になる。自己判断（理由付き）。
