# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | Git Branching Policy へ統合条件、単位、命名、記録項目を追記する。 | U001 | [design.md](units/U001-pr-consolidation-contract/design.md) | なし | [B001-policy-consolidation-rules.md](bolts/B001-policy-consolidation-rules.md) |
| B002 | development.md の整合を確認し、必要な補正を行う。 | U001 | [design.md](units/U001-pr-consolidation-contract/design.md) | B001 | [B002-development-doc-alignment.md](bolts/B002-development-doc-alignment.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 統合条件の定義が、整合確認の前提であるため。 |
| B002 | B001 | 整合確認は、確定した条件文言と突き合わせるため。 |
