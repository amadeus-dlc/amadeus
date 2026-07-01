# Business Rules

## 目的

公開 phase skill への採用規則と検証境界を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 初期対象は `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` に限定する。 | R004, UC003 | accepted |
| BR002 | 公開 phase skill は、起動時判断で U001 の decision review 規則を同じ意味で参照する。 | R004, UC003 | accepted |
| BR003 | `guided` は人間判断が必要な不明瞭ノードを確認するために使い、decision review は質問候補を選ぶ。 | R003, R004, UC002 | accepted |
| BR004 | `repair` は成果物構造の補修に限定し、人間判断が必要な不明瞭ノードの代替にしない。 | R002, R004 | accepted |
| BR005 | validator は構造検出、evaluator は品質評価、Skill Contract は入力証拠と境界情報として扱う。 | R005, UC003 | accepted |
| BR006 | Discovery、Event Storming、Steering への初期一括適用はこの Intent の対象外にする。 | R004, B002 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| evaluator の本格実装が必要になった。 | 初期 Construction に混ぜず、後続 Issue 候補として報告する。 | R005, B003 |
| source skill と昇格先 skill に同期差分が残る。 | B002 の完了条件を満たさない。 | R004 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | U001 の decision review outcome と handoff 契約が定義されている。 | B002 依存 | accepted |
| POST001 | 事後条件 | 対象の公開 phase skill が同じ decision review 規則を参照できる。 | R004 | accepted |
| POST002 | 事後条件 | Skill Contract、validator、evaluator、eval と decision review の境界を説明できる。 | R005 | accepted |
| INV001 | 不変条件 | validator の `pass` を内容承認として扱わない。 | R005 | accepted |
| INV002 | 不変条件 | Discovery、Event Storming、Steering への初期一括適用はしない。 | R004 | accepted |

## 未確認事項

なし。
