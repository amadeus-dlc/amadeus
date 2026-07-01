# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | skill 実行時問題報告の共通契約を source skill に定義する。 | U001 | [design.md](units/U001-reporting-contract/design.md) | なし | [B001-reporting-contract-definition.md](bolts/B001-reporting-contract-definition.md) |
| B002 | 代表 skill の昇格と eval 整合確認を行う。 | U002 | [design.md](units/U002-skill-adoption-verification/design.md) | B001 | [B002-representative-skill-adoption.md](bolts/B002-representative-skill-adoption.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 共通契約の定義が代表 skill 反映の前提であるため。 |
| B002 | B001 | 昇格先 skill と eval は、source skill に定義した契約を基準に確認するため。 |
