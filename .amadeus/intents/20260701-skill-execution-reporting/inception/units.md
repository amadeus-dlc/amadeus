# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | skill 実行時問題報告の共通契約を扱う。 | R001, R002, R003 | BC001 | なし | [U001-reporting-contract.md](units/U001-reporting-contract.md) |
| U002 | 代表 skill への反映、昇格、eval 整合確認を扱う。 | R004 | BC001 | U001 | [U002-skill-adoption-verification.md](units/U002-skill-adoption-verification.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 報告契約の分類基準と最低項目が、代表 skill 反映の前提であるため。 |
| U002 | U001 | 代表 skill と eval の整合確認は、採用する報告契約を前提にするため。 |
