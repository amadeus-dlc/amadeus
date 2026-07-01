# Business Rules

## 目的

traceability template alignment の判断規則を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 標準 traceability template は `Construction からの追跡` を持つ。 | R001, R004 | accepted |
| BR002 | template eval は `Construction からの追跡` を期待見出しに含める。 | R004 | accepted |
| BR003 | source skill と昇格先 skill は同じ追跡表契約を説明する。 | R004 | accepted |
| BR004 | example は完了済み Construction でない場合に、完了時表の追加対象外として扱える。 | B002 | accepted |

## 例外

完了済み Construction の example で `Construction からの追跡` がない場合は、対象外にしない。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | U001 の guidance が確定している。 | B002 依存 | accepted |
| POST001 | 事後条件 | template と eval が同じ見出し契約を扱う。 | R004 | accepted |
| INV001 | 不変条件 | validator の成果物契約はこの Unit で変更しない。 | Unit Design Brief | accepted |

## 未確認事項

なし。
