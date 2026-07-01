# Business Logic Model

## 目的

README の skill 分類と実在する `amadeus-*` skill の役割をそろえる。

## 対象 Unit

U001 README skill role alignment。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | README の Phase Skills、Cross-Cutting Support Skills、Internal Skills を棚卸しする。 | README、README.ja | README Skill Role Inventory | R001, UC001 |
| BL002 | `skills/amadeus-*` と `.agents/skills/amadeus-*` の実在一覧を分類と照合する。 | source skill 一覧、昇格先成果物一覧 | Skill Role Classification | R001, UC001 |
| BL003 | 内部 skill を公開入口ではなく workflow family として説明する。 | Skill Role Classification、README | Internal Skill Family Guidance | R001, UC001 |
| BL004 | 互換性維持対象の有無を確認し、暗黙の旧入口や alias を追加しない。 | 互換性ルール、README | Compatibility Boundary Decision | R004, UC004 |
| BL005 | README 変更後に検証入口と skill 契約への影響を確認できる状態にする。 | README 差分、検証入口 | README Consistency Evidence | R005, UC004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| README | 英語の利用者向け入口。 | R001 |
| README.ja | 日本語の利用者向け入口。 | R001 |
| `amadeus-*` skill 一覧 | source skill と昇格先成果物の実在一覧。 | R001 |
| 互換性ルール | 互換性維持対象の有無を判断する規則。 | R004 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| README Skill Role Inventory | README と実在 skill の分類確認結果。 | B001 |
| Internal Skill Family Guidance | 内部 skill を workflow family として示す説明。 | README |
| Compatibility Boundary Decision | 旧入口、旧名、alias、互換層を追加しない判断。 | B004 |

## 未確認事項

なし。
