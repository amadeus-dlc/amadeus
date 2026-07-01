# Business Rules

## 目的

skill-forge 確認契約の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | skill-forge 確認は、trigger description、skill 本文、eval、Codex metadata、昇格先成果物を分けて扱う。 | R002, UC002 | accepted |
| BR002 | Codex metadata が存在しない場合は、無条件に新規生成せず、必要性を判断する。 | R002 | accepted |
| BR003 | source skill と昇格先成果物は別の確認対象として扱う。 | R003, UC003 | accepted |
| BR004 | 昇格が必要な場合は、リポジトリの昇格手順を使う。 | R003 | accepted |
| BR005 | README 更新後は、必要な validator または text contract で整合を確認する。 | R005, UC004 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| eval workflow が高コストで現在 Intent の目的を超える。 | 後続 Issue 候補として報告し、現在 Intent では静的 review と検証入口確認に留める。 | R002 |
| source skill と昇格先成果物に想定外の差分がある。 | 昇格手順または後続 Intent 候補として扱う。 | R003 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 skill の分類と確認範囲を説明できる。 | R002 | accepted |
| PRE002 | 事前条件 | source skill と昇格先成果物を分けて参照できる。 | R003 | accepted |
| POST001 | 事後条件 | 実行した確認観点と未実行の確認観点を説明できる。 | R002 | accepted |
| POST002 | 事後条件 | README と skill 契約の整合確認結果を記録できる。 | R005 | accepted |
| INV001 | 不変条件 | README だけを更新して昇格先成果物の確認を省略しない。 | R003, R005 | accepted |

## 未確認事項

なし。
