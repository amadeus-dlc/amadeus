# U001: reporting contract

## ユニット

- skill 実行時問題報告の共通契約を扱う。

## 対象要求

- R001
- R002
- R003

## 価値境界

- amadeus-* skill 実行中に見つけた問題や懸念について、現在の Intent 対象、後続 Issue 候補、報告不要の分類と最低項目を定義する。
- 現在の Intent の成果物契約へ無関係な改善を混ぜないための判断境界を扱う。
- GitHub Issue 作成は人間承認付きにし、agent は Issue 候補の提示までを標準の報告契約として扱う。

## 検証観点

- 対象 Intent の validator が pass する。
- `npm run typecheck` が pass する。
- source skill から分類基準と最低報告項目を読める。
- validator の `pass` と内容承認を混同していない。

## 未確認事項

- 内部 skill 化は、この Unit では採用せず、Construction で共通契約の重複や分岐が大きいと判断した場合だけ後続 Issue 候補にする。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-inception/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-reporting-contract/design.md)
