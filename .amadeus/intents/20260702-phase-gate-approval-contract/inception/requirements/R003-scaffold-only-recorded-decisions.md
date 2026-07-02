# R003 確定判断の記録による scaffold-only の許可

## 要求

`amadeus-ideation` の auto 判定で scaffold-only を許可する条件が、確定判断の記録への参照が入力に存在する場合に限定されている。

## 背景

現在の auto 判定の scaffold-only 条件は「質問不要で進められる」であり、客観基準がない。
進めたいエージェントは常に質問不要と自己判定できる。

## 受け入れ条件

- scaffold-only を許可する「確定判断の記録」として、(1) GitHub Issue の確定判断（目的、対象、対象外、受け入れ条件）、(2) Grilling Decision Trail（`grillings/Gxxx-*.md` の確定判断）、(3) Discovery Brief の確定済み判定と候補判断、の 3 種が定義されている。
- 許可条件は、入力にこれらへの参照が存在し、Ideation の判断項目（対象境界、実行制御など）がそこから導けることである。
- 確定判断の記録への参照がない入力では、auto 判定は scaffold-only を選ばない。

## 依存

なし。

## 対応する対象境界

- SC-IN-004

## 未確認事項

- なし。
