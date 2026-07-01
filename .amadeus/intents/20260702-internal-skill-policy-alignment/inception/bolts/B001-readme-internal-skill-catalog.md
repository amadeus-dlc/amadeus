# B001: README 内部 skill 一覧

## 概要

README の Internal Skills 一覧と内部 skill 分類を整合させる。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-internal-skill-policy-alignment/design.md)

## 完了条件

- `README.md` と `README.ja.md` の Internal Skills 一覧が対応している。
- Issue #284 に列挙された内部 skill を確認している。
- Issue #284 に列挙されていない `amadeus-*` 内部 skill 候補を確認している。
- `amadeus-validator` を Internal Skills に移すか、横断的補助 skill に残すかの判断が記録されている。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `README.ja.md` | 未確認 | なし | 未確認 |

## 未確認事項

- README の Internal Skills に、Issue #284 に列挙されていない内部 skill をどこまで含めるか。
